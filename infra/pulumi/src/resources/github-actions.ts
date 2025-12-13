import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { infrastructureConfig } from "../utils/config";
import { iamApi } from "./google-apis";

/**
 * GitHub Actions Workload Identity Federation
 *
 * This module creates the resources needed for GitHub Actions to authenticate
 * with GCP using Workload Identity Federation (no service account keys needed).
 *
 * Resources created:
 * - Workload Identity Pool
 * - Workload Identity Provider (OIDC)
 * - Service Account for GitHub Actions
 * - IAM bindings for GKE and Artifact Registry access
 *
 * Usage:
 * 1. Set githubRepo config: pulumi config set githubRepo "owner/repo-name"
 * 2. Run pulumi up
 * 3. Add outputs to GitHub repository variables
 */

// Get optional GitHub repo config
const config = new pulumi.Config();
const githubRepo = config.get("githubRepo"); // Format: "owner/repo-name"

// Only create resources if githubRepo is configured
const isEnabled = githubRepo !== undefined && githubRepo !== "";

// =============================================================================
// Workload Identity Pool
// =============================================================================

const workloadIdentityPool = isEnabled
    ? new gcp.iam.WorkloadIdentityPool(
          "github-actions-pool",
          {
              workloadIdentityPoolId: `${infrastructureConfig.appName}-github-pool`,
              project: infrastructureConfig.project,
              displayName: "GitHub Actions Pool",
              description: "Workload Identity Pool for GitHub Actions CI/CD"
          },
          { dependsOn: [iamApi] }
      )
    : undefined;

// =============================================================================
// Workload Identity Provider (OIDC)
// =============================================================================

const workloadIdentityProvider =
    isEnabled && workloadIdentityPool
        ? new gcp.iam.WorkloadIdentityPoolProvider("github-actions-provider", {
              workloadIdentityPoolId: workloadIdentityPool.workloadIdentityPoolId,
              workloadIdentityPoolProviderId: "github-provider",
              project: infrastructureConfig.project,
              displayName: "GitHub Provider",
              description: "OIDC provider for GitHub Actions",
              attributeMapping: {
                  "google.subject": "assertion.sub",
                  "attribute.actor": "assertion.actor",
                  "attribute.repository": "assertion.repository",
                  "attribute.repository_owner": "assertion.repository_owner",
                  "attribute.ref": "assertion.ref"
              },
              attributeCondition: `assertion.repository == "${githubRepo}"`,
              oidc: {
                  issuerUri: "https://token.actions.githubusercontent.com"
              }
          })
        : undefined;

// =============================================================================
// Service Account for GitHub Actions
// =============================================================================

const githubActionsServiceAccount = isEnabled
    ? new gcp.serviceaccount.Account(
          "github-actions-sa",
          {
              accountId: "github-actions",
              project: infrastructureConfig.project,
              displayName: "GitHub Actions Service Account",
              description: "Service account for GitHub Actions CI/CD deployments"
          },
          { dependsOn: [iamApi] }
      )
    : undefined;

// =============================================================================
// IAM Bindings - Grant permissions to Service Account
// =============================================================================

// GKE Developer - allows deploying to GKE clusters
const _gkeBinding =
    isEnabled && githubActionsServiceAccount
        ? new gcp.projects.IAMMember("github-actions-gke-binding", {
              project: infrastructureConfig.project,
              role: "roles/container.developer",
              member: pulumi.interpolate`serviceAccount:${githubActionsServiceAccount.email}`
          })
        : undefined;

// Artifact Registry Writer - allows pushing Docker images
const _artifactRegistryBinding =
    isEnabled && githubActionsServiceAccount
        ? new gcp.projects.IAMMember("github-actions-artifact-registry-binding", {
              project: infrastructureConfig.project,
              role: "roles/artifactregistry.writer",
              member: pulumi.interpolate`serviceAccount:${githubActionsServiceAccount.email}`
          })
        : undefined;

// Storage Admin - allows managing GCS buckets (for builds, caches)
const _storageBinding =
    isEnabled && githubActionsServiceAccount
        ? new gcp.projects.IAMMember("github-actions-storage-binding", {
              project: infrastructureConfig.project,
              role: "roles/storage.admin",
              member: pulumi.interpolate`serviceAccount:${githubActionsServiceAccount.email}`
          })
        : undefined;

// =============================================================================
// Workload Identity User Binding
// Allows GitHub Actions to impersonate the service account
// =============================================================================

const _workloadIdentityUserBinding =
    isEnabled && githubActionsServiceAccount && workloadIdentityPool
        ? new gcp.serviceaccount.IAMMember("github-actions-workload-identity-binding", {
              serviceAccountId: githubActionsServiceAccount.name,
              role: "roles/iam.workloadIdentityUser",
              member: pulumi.interpolate`principalSet://iam.googleapis.com/${workloadIdentityPool.name}/attribute.repository/${githubRepo}`
          })
        : undefined;

// =============================================================================
// Outputs
// =============================================================================

export const githubActionsOutputs = {
    // Whether GitHub Actions integration is enabled
    enabled: isEnabled,

    // GitHub repository configured
    githubRepo: githubRepo || "",

    // Workload Identity Provider - use this in GitHub workflow
    // Format: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
    workloadIdentityProvider: workloadIdentityProvider
        ? workloadIdentityProvider.name
        : pulumi.output(""),

    // Service Account email - use this in GitHub workflow
    serviceAccountEmail: githubActionsServiceAccount
        ? githubActionsServiceAccount.email
        : pulumi.output(""),

    // Pool ID for reference
    poolId: workloadIdentityPool ? workloadIdentityPool.workloadIdentityPoolId : pulumi.output(""),

    // Instructions for GitHub setup
    setupInstructions: isEnabled
        ? pulumi.interpolate`
GitHub Actions Workload Identity configured for: ${githubRepo}

Add these variables to your GitHub repository (Settings > Secrets and variables > Actions > Variables):

  GCP_PROJECT_ID: ${infrastructureConfig.project}
  GCP_REGION: ${infrastructureConfig.region}
  GCP_WORKLOAD_IDENTITY_PROVIDER: ${workloadIdentityProvider?.name || ""}
  GCP_SERVICE_ACCOUNT: ${githubActionsServiceAccount?.email || ""}

Then use in your workflow:
  - uses: google-github-actions/auth@v2
    with:
      workload_identity_provider: \${{ vars.GCP_WORKLOAD_IDENTITY_PROVIDER }}
      service_account: \${{ vars.GCP_SERVICE_ACCOUNT }}
`
        : pulumi.output(`
GitHub Actions integration not configured.
To enable, set the githubRepo config:
  pulumi config set githubRepo "owner/repo-name"
`)
};
