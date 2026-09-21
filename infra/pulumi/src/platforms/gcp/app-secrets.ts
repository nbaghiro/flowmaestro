import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import {
    secretDefinitions,
    type DeploymentTarget,
    type SecretCategory,
    type SecretDefinition
} from "../../app/secrets";
import { infrastructureConfig, resourceName } from "../../utils/config";
import { cluster, kubeconfig } from "./gke-cluster";

export { secretDefinitions };
export type { DeploymentTarget, SecretCategory, SecretDefinition };

// =============================================================================
// Create Kubernetes Provider
// =============================================================================

const kubeProvider = new k8s.Provider(resourceName("k8s-provider-secrets"), {
    kubeconfig: kubeconfig
});

// =============================================================================
// Create GCP Secret Manager Secrets (Empty - Values added separately)
// =============================================================================
// These secrets are created empty by Pulumi. Values are added via setup-secrets-gcp.sh.
//
// IMPORTANT: If secrets already exist in GCP, you need to import them first:
//   ./infra/scripts/import-secrets-to-pulumi.sh
//
// This script generates `pulumi import` commands to adopt existing secrets.

const gcpSecrets: { [name: string]: gcp.secretmanager.Secret } = {};

for (const secretDef of secretDefinitions) {
    const gcpSecretName = `flowmaestro-app-${secretDef.name}`;
    const pulumiResourceName = resourceName(`app-secret-${secretDef.name}`);

    const secret = new gcp.secretmanager.Secret(
        pulumiResourceName,
        {
            secretId: gcpSecretName,
            project: infrastructureConfig.project,
            replication: {
                auto: {}
            },
            labels: {
                app: infrastructureConfig.appName,
                environment: infrastructureConfig.environment,
                category: secretDef.category,
                managed_by: "pulumi"
            }
        },
        {
            // Protect against accidental deletion
            protect: true,
            // If we delete from Pulumi, don't delete from GCP
            retainOnDelete: true
        }
    );

    gcpSecrets[secretDef.name] = secret;
}

// =============================================================================
// Group Secrets by Category for ExternalSecrets
// =============================================================================

interface CategoryGroup {
    secrets: SecretDefinition[];
    k8sSecretName: string;
}

const secretsByCategory: { [key in SecretCategory]?: CategoryGroup } = {};

for (const secretDef of secretDefinitions) {
    if (!secretsByCategory[secretDef.category]) {
        secretsByCategory[secretDef.category] = {
            secrets: [],
            k8sSecretName: `${secretDef.category}-secrets`
        };
    }
    secretsByCategory[secretDef.category]!.secrets.push(secretDef);
}

// =============================================================================
// Create K8s ExternalSecrets (one per category)
// =============================================================================

const externalSecrets: { [category: string]: k8s.apiextensions.CustomResource } = {};

for (const [category, group] of Object.entries(secretsByCategory)) {
    if (!group || group.secrets.length === 0) continue;

    // Build the data array for ExternalSecret
    const data = group.secrets.map((secretDef) => ({
        secretKey: secretDef.envVar,
        remoteRef: {
            key: `flowmaestro-app-${secretDef.name}`
        }
    }));

    const externalSecret = new k8s.apiextensions.CustomResource(
        resourceName(`external-secret-${category}`),
        {
            apiVersion: "external-secrets.io/v1beta1",
            kind: "ExternalSecret",
            metadata: {
                name: group.k8sSecretName,
                namespace: "flowmaestro"
            },
            spec: {
                refreshInterval: "1h",
                secretStoreRef: {
                    name: "gcp-secret-manager",
                    kind: "ClusterSecretStore"
                },
                target: {
                    name: group.k8sSecretName,
                    creationPolicy: "Owner",
                    deletionPolicy: "Merge", // Skip missing secrets instead of failing
                    template: {
                        type: "Opaque"
                    }
                },
                data: data
            }
        },
        {
            provider: kubeProvider,
            dependsOn: [cluster]
        }
    );

    externalSecrets[category] = externalSecret;
}

// =============================================================================
// Helper: Get secrets for a specific deployment
// =============================================================================

export function getSecretsForDeployment(deployment: DeploymentTarget): SecretDefinition[] {
    return secretDefinitions.filter((s) => s.deployments.includes(deployment));
}

// =============================================================================
// Helper: Get K8s secret references for a deployment
// =============================================================================

export interface K8sSecretRef {
    envVar: string;
    secretName: string;
    secretKey: string;
    optional: boolean;
}

export function getK8sSecretRefsForDeployment(deployment: DeploymentTarget): K8sSecretRef[] {
    const secrets = getSecretsForDeployment(deployment);
    return secrets.map((s) => ({
        envVar: s.envVar,
        secretName: `${s.category}-secrets`,
        secretKey: s.envVar,
        optional: !s.required
    }));
}

// =============================================================================
// Exports
// =============================================================================

// Export secret definitions as JSON for scripts to consume
export const appSecretsOutputs = {
    // Full definitions for scripts
    definitions: pulumi.output(JSON.stringify(secretDefinitions, null, 2)),

    // Simple list of GCP secret names
    gcpSecretNames: pulumi.output(secretDefinitions.map((s) => `flowmaestro-app-${s.name}`)),

    // Secrets grouped by deployment target
    apiSecrets: pulumi.output(getSecretsForDeployment("api")),
    workerSecrets: pulumi.output(getSecretsForDeployment("worker")),

    // K8s secret refs for deployment env injection
    apiK8sSecretRefs: pulumi.output(getK8sSecretRefsForDeployment("api")),
    workerK8sSecretRefs: pulumi.output(getK8sSecretRefsForDeployment("worker")),

    // Categories created
    categories: pulumi.output(Object.keys(secretsByCategory)),

    // Number of secrets
    count: secretDefinitions.length
};
