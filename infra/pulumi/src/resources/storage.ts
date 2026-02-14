import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { infrastructureConfig, resourceName, resourceLabels } from "../utils/config";

// Note: Frontend and marketing are served from Kubernetes, not Cloud Storage
// This file creates buckets for user-uploaded files and assets

// =============================================================================
// Service Account for GCS Storage Access
// =============================================================================
// This service account is used for GCS storage operations.
// - In GKE: Use Workload Identity (bind to K8s service account)
// - For local dev: Download a key file and set GOOGLE_APPLICATION_CREDENTIALS
//
// To create a key for local development:
//   gcloud iam service-accounts keys create ~/.config/gcloud/flowmaestro-storage-key.json \
//       --iam-account=$(pulumi stack output storageServiceAccountEmail)

export const storageServiceAccount = new gcp.serviceaccount.Account(resourceName("storage-sa"), {
    accountId: resourceName("storage-sa"),
    displayName: "FlowMaestro Storage Service Account",
    description: "Service account for GCS storage operations (local dev and production)"
});

// Create bucket for user uploads (icons, covers, images for interfaces)
export const uploadsBucket = new gcp.storage.Bucket(resourceName("uploads"), {
    name: `${resourceName("uploads")}-${infrastructureConfig.project}`,
    location: infrastructureConfig.region,
    uniformBucketLevelAccess: true,
    versioning: {
        enabled: true
    },
    lifecycleRules: [
        {
            action: {
                type: "Delete"
            },
            condition: {
                numNewerVersions: 3
            }
        }
    ],
    cors: [
        {
            origins: [
                `https://api.${infrastructureConfig.domain}`,
                `https://app.${infrastructureConfig.domain}`,
                `https://${infrastructureConfig.domain}`,
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:5173"
            ],
            methods: ["GET", "POST", "PUT", "DELETE"],
            responseHeaders: ["Content-Type", "Content-Length"],
            maxAgeSeconds: 3600
        }
    ],
    labels: resourceLabels()
});

// Make uploads bucket publicly readable (for icons, covers, images)
// This requires the org policy constraint/iam.allowedPolicyMemberDomains to allow allUsers
new gcp.storage.BucketIAMMember(
    resourceName("uploads-public-read"),
    {
        bucket: uploadsBucket.name,
        role: "roles/storage.objectViewer",
        member: "allUsers"
    },
    { dependsOn: [uploadsBucket] }
);

// Create bucket for workflow execution artifacts
export const artifactsBucket = new gcp.storage.Bucket(resourceName("artifacts"), {
    name: `${resourceName("artifacts")}-${infrastructureConfig.project}`,
    location: infrastructureConfig.region,
    uniformBucketLevelAccess: true,
    lifecycleRules: [
        {
            action: {
                type: "Delete"
            },
            condition: {
                age: 90 // Delete artifacts older than 90 days
            }
        }
    ],
    labels: resourceLabels()
});

// Create bucket for interface documents (form submissions and chat attachments)
export const interfaceDocsBucket = new gcp.storage.Bucket(resourceName("interface-docs"), {
    name: `${resourceName("interface-docs")}-${infrastructureConfig.project}`,
    location: infrastructureConfig.region,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: "enforced",
    versioning: {
        enabled: true // Enable versioning for document recovery
    },
    lifecycleRules: [
        {
            action: {
                type: "Delete"
            },
            condition: {
                // Keep last 5 versions of each file
                numNewerVersions: 5
            }
        },
        {
            action: {
                type: "Delete"
            },
            condition: {
                // Delete temporary files after 7 days
                age: 7,
                matchesPrefixes: ["temp/"]
            }
        }
    ],
    cors: [
        {
            // Production origins
            origins: [
                `https://api.${infrastructureConfig.domain}`,
                `https://app.${infrastructureConfig.domain}`,
                `https://${infrastructureConfig.domain}`
            ],
            methods: ["GET", "POST", "PUT", "DELETE"],
            responseHeaders: ["Content-Type", "Content-Length"],
            maxAgeSeconds: 3600
        },
        {
            // Development origins - allows local development to access GCS directly
            origins: ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
            methods: ["GET"],
            responseHeaders: ["Content-Type", "Content-Length"],
            maxAgeSeconds: 3600
        }
    ],
    labels: resourceLabels()
});

// Create bucket for knowledge base documents
export const knowledgeDocsBucket = new gcp.storage.Bucket(resourceName("knowledge-docs"), {
    name: `${resourceName("knowledge-docs")}-${infrastructureConfig.project}`,
    location: infrastructureConfig.region,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: "enforced",
    versioning: {
        enabled: true // Enable versioning for document recovery
    },
    lifecycleRules: [
        {
            action: {
                type: "Delete"
            },
            condition: {
                // Keep last 5 versions of each file
                numNewerVersions: 5
            }
        },
        {
            action: {
                type: "Delete"
            },
            condition: {
                // Delete temporary files after 7 days
                age: 7,
                matchesPrefixes: ["temp/"]
            }
        }
    ],
    cors: [
        {
            // Production origins
            origins: [
                `https://api.${infrastructureConfig.domain}`,
                `https://app.${infrastructureConfig.domain}`,
                `https://${infrastructureConfig.domain}`
            ],
            methods: ["GET", "POST", "PUT", "DELETE"],
            responseHeaders: ["Content-Type", "Content-Length"],
            maxAgeSeconds: 3600
        },
        {
            // Development origins - allows local development to access GCS directly
            origins: ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
            methods: ["GET"],
            responseHeaders: ["Content-Type", "Content-Length"],
            maxAgeSeconds: 3600
        }
    ],
    labels: resourceLabels()
});

// =============================================================================
// IAM Bindings for Storage Service Account
// =============================================================================
// Grant Storage Object Admin role on all buckets

new gcp.storage.BucketIAMMember(
    resourceName("storage-sa-uploads"),
    {
        bucket: uploadsBucket.name,
        role: "roles/storage.objectAdmin",
        member: pulumi.interpolate`serviceAccount:${storageServiceAccount.email}`
    },
    { dependsOn: [uploadsBucket, storageServiceAccount] }
);

new gcp.storage.BucketIAMMember(
    resourceName("storage-sa-artifacts"),
    {
        bucket: artifactsBucket.name,
        role: "roles/storage.objectAdmin",
        member: pulumi.interpolate`serviceAccount:${storageServiceAccount.email}`
    },
    { dependsOn: [artifactsBucket, storageServiceAccount] }
);

new gcp.storage.BucketIAMMember(
    resourceName("storage-sa-knowledge-docs"),
    {
        bucket: knowledgeDocsBucket.name,
        role: "roles/storage.objectAdmin",
        member: pulumi.interpolate`serviceAccount:${storageServiceAccount.email}`
    },
    { dependsOn: [knowledgeDocsBucket, storageServiceAccount] }
);

new gcp.storage.BucketIAMMember(
    resourceName("storage-sa-interface-docs"),
    {
        bucket: interfaceDocsBucket.name,
        role: "roles/storage.objectAdmin",
        member: pulumi.interpolate`serviceAccount:${storageServiceAccount.email}`
    },
    { dependsOn: [interfaceDocsBucket, storageServiceAccount] }
);

// Note: For GKE deployments, the k8s-sa (defined in gke-cluster.ts) already has
// storage permissions via Workload Identity. This storage-sa is primarily for
// local development where a key file is needed to avoid RAPT token expiration.

// =============================================================================
// Service Account Key for Local Development
// =============================================================================
// Create a key for the storage service account and store it in Secret Manager.
// This allows the sync-secrets-local.sh script to pull the key automatically.

export const storageServiceAccountKey = new gcp.serviceaccount.Key(resourceName("storage-sa-key"), {
    serviceAccountId: storageServiceAccount.name
});

// Store the key in Secret Manager for easy retrieval during local development
const storageKeySecret = new gcp.secretmanager.Secret(resourceName("storage-sa-key"), {
    secretId: resourceName("storage-sa-key"),
    replication: {
        auto: {}
    },
    labels: {
        app: "flowmaestro",
        environment: infrastructureConfig.environment,
        purpose: "local-development"
    }
});

new gcp.secretmanager.SecretVersion(resourceName("storage-sa-key-version"), {
    secret: storageKeySecret.id,
    // The privateKey is base64-encoded, decode it for storage
    secretData: storageServiceAccountKey.privateKey.apply((key) =>
        Buffer.from(key, "base64").toString("utf-8")
    )
});

// Export storage outputs
export const storageOutputs = {
    uploadsBucketName: uploadsBucket.name,
    uploadsBucketUrl: uploadsBucket.url,
    artifactsBucketName: artifactsBucket.name,
    artifactsBucketUrl: artifactsBucket.url,
    knowledgeDocsBucketName: knowledgeDocsBucket.name,
    knowledgeDocsBucketUrl: knowledgeDocsBucket.url,
    interfaceDocsBucketName: interfaceDocsBucket.name,
    interfaceDocsBucketUrl: interfaceDocsBucket.url,
    storageServiceAccountEmail: storageServiceAccount.email,
    storageServiceAccountName: storageServiceAccount.name
};
