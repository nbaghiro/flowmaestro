import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { infrastructureConfig, resourceName } from "../utils/config";
import { cluster, kubeconfig } from "./gke-cluster";

// Create Kubernetes provider using the cluster's kubeconfig
const kubeProvider = new k8s.Provider(resourceName("k8s-provider-eso"), {
    kubeconfig: kubeconfig
});

// Create namespace for External Secrets Operator
const esoNamespace = new k8s.core.v1.Namespace(
    resourceName("eso-namespace"),
    {
        metadata: {
            name: "external-secrets-system"
        }
    },
    { provider: kubeProvider, dependsOn: [cluster] }
);

// Create GCP Service Account for ESO
const esoServiceAccount = new gcp.serviceaccount.Account(resourceName("eso-sa"), {
    accountId: `${infrastructureConfig.appName}-eso`,
    displayName: "External Secrets Operator Service Account",
    description: "Service account used by External Secrets Operator to access Secret Manager"
});

// Grant Secret Manager accessor role to ESO service account
new gcp.projects.IAMMember(resourceName("eso-sa-secret-accessor"), {
    project: infrastructureConfig.project,
    role: "roles/secretmanager.secretAccessor",
    member: pulumi.interpolate`serviceAccount:${esoServiceAccount.email}`
});

// Create Kubernetes Service Account for ESO with Workload Identity binding
const esoK8sServiceAccount = new k8s.core.v1.ServiceAccount(
    resourceName("eso-k8s-sa"),
    {
        metadata: {
            name: "external-secrets-operator",
            namespace: esoNamespace.metadata.name,
            annotations: {
                "iam.gke.io/gcp-service-account": esoServiceAccount.email
            }
        }
    },
    { provider: kubeProvider, dependsOn: [esoNamespace] }
);

// Bind GCP Service Account to K8s Service Account using Workload Identity
new gcp.serviceaccount.IAMBinding(resourceName("eso-workload-identity-binding"), {
    serviceAccountId: esoServiceAccount.name,
    role: "roles/iam.workloadIdentityUser",
    members: [
        pulumi.interpolate`serviceAccount:${infrastructureConfig.project}.svc.id.goog[${esoNamespace.metadata.name}/${esoK8sServiceAccount.metadata.name}]`
    ]
});

// Install External Secrets Operator via Helm
const esoRelease = new k8s.helm.v3.Release(
    resourceName("eso"),
    {
        name: "external-secrets",
        namespace: esoNamespace.metadata.name,
        chart: "external-secrets",
        version: "0.9.11", // Stable version, update as needed
        repositoryOpts: {
            repo: "https://charts.external-secrets.io"
        },
        values: {
            // Use Workload Identity for GCP auth
            serviceAccount: {
                create: false,
                name: esoK8sServiceAccount.metadata.name
            },
            // Install CRDs
            installCRDs: true,
            // Resource requests/limits
            resources: {
                requests: {
                    cpu: "100m",
                    memory: "128Mi"
                },
                limits: {
                    cpu: "500m",
                    memory: "512Mi"
                }
            },
            // Enable webhook for validation
            webhook: {
                port: 9443
            },
            // Logging
            logLevel: "info",
            logFormat: "json"
        },
        skipAwait: false
    },
    {
        provider: kubeProvider,
        dependsOn: [esoNamespace, esoK8sServiceAccount]
    }
);

// =============================================================================
// ClusterSecretStore for GCP Secret Manager
// =============================================================================
// This creates the ClusterSecretStore that allows ExternalSecrets in any namespace
// to fetch secrets from GCP Secret Manager using Workload Identity authentication.

const clusterSecretStore = new k8s.apiextensions.CustomResource(
    resourceName("cluster-secret-store"),
    {
        apiVersion: "external-secrets.io/v1beta1",
        kind: "ClusterSecretStore",
        metadata: {
            name: "gcp-secret-manager",
            annotations: {
                // Allow Pulumi to manage this resource even if it was modified by kubectl
                "pulumi.com/patchForce": "true"
            }
        },
        spec: {
            provider: {
                gcpsm: {
                    projectID: infrastructureConfig.project,
                    auth: {
                        workloadIdentity: {
                            clusterLocation: infrastructureConfig.region,
                            clusterName: `${infrastructureConfig.appName}-cluster`,
                            serviceAccountRef: {
                                name: esoK8sServiceAccount.metadata.name,
                                namespace: esoNamespace.metadata.name
                            }
                        }
                    }
                }
            }
        }
    },
    {
        provider: kubeProvider,
        dependsOn: [esoRelease, esoK8sServiceAccount]
    }
);

// Export ESO outputs
export const esoOutputs = {
    namespace: esoNamespace.metadata.name,
    serviceAccountName: esoK8sServiceAccount.metadata.name,
    gcpServiceAccountEmail: esoServiceAccount.email,
    releaseName: esoRelease.name,
    releaseStatus: esoRelease.status,
    clusterSecretStoreName: clusterSecretStore.metadata.name
};
