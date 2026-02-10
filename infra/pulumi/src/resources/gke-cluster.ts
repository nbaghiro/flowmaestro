import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { infrastructureConfig, resourceName, resourceLabels } from "../utils/config";
import { network, subnet } from "./networking";
import { knowledgeDocsBucket, uploadsBucket, artifactsBucket } from "./storage";

// Create GKE cluster (Autopilot or Standard mode based on config)
export const cluster = new gcp.container.Cluster(
    resourceName("cluster"),
    {
        name: resourceName("cluster"),
        location: infrastructureConfig.region,

        // Enable Autopilot mode (if false, uses Standard mode with node pools)
        enableAutopilot: infrastructureConfig.gkeAutopilot,

        // For Standard mode: remove default node pool (we create our own)
        // These settings are ignored in Autopilot mode
        ...(infrastructureConfig.gkeAutopilot
            ? {}
            : {
                  removeDefaultNodePool: true,
                  initialNodeCount: 1 // Required but removed immediately
              }),

        // Network configuration
        network: network.name,
        subnetwork: subnet.name,

        // IP allocation policy for VPC-native cluster
        ipAllocationPolicy: {
            clusterSecondaryRangeName: "pods",
            servicesSecondaryRangeName: "services"
        },

        // Private cluster configuration
        // When gkePrivateNodes=false, nodes get public IPs and Cloud NAT is not needed (~$140/mo savings)
        privateClusterConfig: infrastructureConfig.gkePrivateNodes
            ? {
                  enablePrivateNodes: true,
                  enablePrivateEndpoint: false, // Allow public access to control plane
                  masterIpv4CidrBlock: "172.16.0.0/28"
              }
            : {
                  enablePrivateNodes: false,
                  enablePrivateEndpoint: false
              },

        // Master authorized networks (optional - can restrict control plane access)
        masterAuthorizedNetworksConfig: {
            cidrBlocks: [
                {
                    displayName: "All",
                    cidrBlock: "0.0.0.0/0"
                }
            ]
        },

        // Workload Identity for GKE
        workloadIdentityConfig: {
            workloadPool: `${infrastructureConfig.project}.svc.id.goog`
        },

        // Release channel for automatic upgrades
        releaseChannel: {
            channel: "REGULAR"
        },

        // Maintenance window
        maintenancePolicy: {
            dailyMaintenanceWindow: {
                startTime: "03:00"
            }
        },

        // Addons
        addonsConfig: {
            httpLoadBalancing: {
                disabled: false
            },
            horizontalPodAutoscaling: {
                disabled: false
            },
            gcePersistentDiskCsiDriverConfig: {
                enabled: true
            }
        },

        // Logging and monitoring
        loggingService: "logging.googleapis.com/kubernetes",
        monitoringService: "monitoring.googleapis.com/kubernetes",

        // Resource labels
        resourceLabels: resourceLabels(),

        // Enable binary authorization (optional security feature)
        binaryAuthorization: {
            evaluationMode: "DISABLED" // Set to "PROJECT_SINGLETON_POLICY_ENFORCE" for stricter security
        },

        // Security posture
        securityPostureConfig: {
            mode: "BASIC"
        },

        // Allow cluster deletion (needed for switching modes)
        deletionProtection: false
    },
    {
        // Protect against accidental deletion in production
        protect: infrastructureConfig.environment === "production"
    }
);

// =============================================================================
// Service Account for Kubernetes Workloads
// =============================================================================
// This service account is used by both:
// - Node pools (in Standard mode) for node-level permissions
// - Pods (via Workload Identity) for workload-level permissions

export const k8sServiceAccount = new gcp.serviceaccount.Account(resourceName("k8s-sa"), {
    accountId: resourceName("k8s-sa"),
    displayName: "FlowMaestro Kubernetes Service Account",
    description: "Service account for FlowMaestro workloads in GKE"
});

// =============================================================================
// Node Pool (Standard Mode Only)
// =============================================================================
// Create a managed node pool when running in Standard mode.
// In Autopilot mode, nodes are fully managed by Google.

export const nodePool = !infrastructureConfig.gkeAutopilot
    ? new gcp.container.NodePool(
          resourceName("node-pool"),
          {
              name: resourceName("node-pool"),
              cluster: cluster.name,
              location: infrastructureConfig.region,

              // Node count (can be overridden by autoscaling)
              nodeCount: infrastructureConfig.gkeNodeCount,

              // Autoscaling configuration
              autoscaling: {
                  minNodeCount: 1,
                  maxNodeCount: 3 // Scale up to 3 nodes if needed
              },

              // Node configuration
              nodeConfig: {
                  machineType: infrastructureConfig.gkeNodeMachineType,
                  diskSizeGb: infrastructureConfig.gkeNodeDiskSizeGb,
                  diskType: "pd-standard", // Standard persistent disk (cheaper than SSD)

                  // Use the GKE service account for Workload Identity
                  serviceAccount: k8sServiceAccount.email,
                  oauthScopes: ["https://www.googleapis.com/auth/cloud-platform"],

                  // Enable Workload Identity on nodes
                  workloadMetadataConfig: {
                      mode: "GKE_METADATA"
                  },

                  // Shielded instance config for security
                  shieldedInstanceConfig: {
                      enableSecureBoot: true,
                      enableIntegrityMonitoring: true
                  },

                  // Labels
                  labels: resourceLabels(),

                  // Taints (none by default - all workloads can schedule here)
                  taints: []
              },

              // Management configuration
              management: {
                  autoRepair: true,
                  autoUpgrade: true
              },

              // Upgrade settings
              upgradeSettings: {
                  maxSurge: 1,
                  maxUnavailable: 0 // Zero-downtime upgrades
              }
          },
          { dependsOn: [cluster, k8sServiceAccount] }
      )
    : undefined;

// =============================================================================
// IAM Roles for Service Account
// =============================================================================

// Grant necessary IAM roles to the service account
// Cloud SQL Client
new gcp.projects.IAMMember(resourceName("k8s-sa-cloudsql"), {
    project: infrastructureConfig.project,
    role: "roles/cloudsql.client",
    member: pulumi.interpolate`serviceAccount:${k8sServiceAccount.email}`
});

// Secret Manager Secret Accessor
new gcp.projects.IAMMember(resourceName("k8s-sa-secrets"), {
    project: infrastructureConfig.project,
    role: "roles/secretmanager.secretAccessor",
    member: pulumi.interpolate`serviceAccount:${k8sServiceAccount.email}`
});

// Cloud Trace Agent (for OpenTelemetry span export)
new gcp.projects.IAMMember(resourceName("k8s-sa-cloudtrace"), {
    project: infrastructureConfig.project,
    role: "roles/cloudtrace.agent",
    member: pulumi.interpolate`serviceAccount:${k8sServiceAccount.email}`
});

// Cloud Monitoring Metrics Writer (for OpenTelemetry metrics export)
new gcp.projects.IAMMember(resourceName("k8s-sa-monitoring"), {
    project: infrastructureConfig.project,
    role: "roles/monitoring.metricWriter",
    member: pulumi.interpolate`serviceAccount:${k8sServiceAccount.email}`
});

// Cloud Logging Writer (for structured logging)
new gcp.projects.IAMMember(resourceName("k8s-sa-logging"), {
    project: infrastructureConfig.project,
    role: "roles/logging.logWriter",
    member: pulumi.interpolate`serviceAccount:${k8sServiceAccount.email}`
});

// Grant Storage Object Admin role on all GCS buckets

// Knowledge docs bucket - for knowledge base documents
new gcp.storage.BucketIAMMember(
    resourceName("k8s-sa-knowledge-docs-storage"),
    {
        bucket: knowledgeDocsBucket.name,
        role: "roles/storage.objectAdmin",
        member: pulumi.interpolate`serviceAccount:${k8sServiceAccount.email}`
    },
    { dependsOn: [knowledgeDocsBucket] }
);

// Uploads bucket - for user uploads (icons, covers, images)
new gcp.storage.BucketIAMMember(
    resourceName("k8s-sa-uploads-storage"),
    {
        bucket: uploadsBucket.name,
        role: "roles/storage.objectAdmin",
        member: pulumi.interpolate`serviceAccount:${k8sServiceAccount.email}`
    },
    { dependsOn: [uploadsBucket] }
);

// Artifacts bucket - for workflow execution artifacts
new gcp.storage.BucketIAMMember(
    resourceName("k8s-sa-artifacts-storage"),
    {
        bucket: artifactsBucket.name,
        role: "roles/storage.objectAdmin",
        member: pulumi.interpolate`serviceAccount:${k8sServiceAccount.email}`
    },
    { dependsOn: [artifactsBucket] }
);

// Allow Kubernetes service account to impersonate GCP service account
// This binding requires the GKE cluster to exist first (creates the workload identity pool)
new gcp.serviceaccount.IAMBinding(
    resourceName("k8s-sa-workload-identity"),
    {
        serviceAccountId: k8sServiceAccount.name,
        role: "roles/iam.workloadIdentityUser",
        members: [
            pulumi.interpolate`serviceAccount:${infrastructureConfig.project}.svc.id.goog[flowmaestro/flowmaestro-sa]`
        ]
    },
    { dependsOn: [cluster] }
);

// Get kubeconfig for the cluster
export const kubeconfig = pulumi
    .all([cluster.name, cluster.endpoint, cluster.masterAuth])
    .apply(([name, endpoint, masterAuth]) => {
        const context = `gke_${infrastructureConfig.project}_${infrastructureConfig.region}_${name}`;
        return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${masterAuth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: gke-gcloud-auth-plugin
      installHint: Install gke-gcloud-auth-plugin for use with kubectl by following
        https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl#install_plugin
      provideClusterInfo: true
`;
    });

// Export cluster outputs
export const clusterOutputs = {
    clusterName: cluster.name,
    clusterEndpoint: cluster.endpoint,
    clusterCaCertificate: cluster.masterAuth.apply((auth) => auth.clusterCaCertificate),
    kubeconfig: kubeconfig,
    serviceAccountEmail: k8sServiceAccount.email,
    // Node pool info (Standard mode only)
    nodePoolName: nodePool?.name,
    isAutopilot: infrastructureConfig.gkeAutopilot
};
