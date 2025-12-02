import * as gcp from "@pulumi/gcp";
import { infrastructureConfig } from "../utils/config";

/**
 * Enable Google Cloud APIs for FlowMaestro
 *
 * This module enables all Google Cloud APIs required for FlowMaestro infrastructure
 * and integrations. APIs are not disabled on destroy to prevent accidental service disruption.
 *
 * Previously these were enabled manually via deploy.sh, but Pulumi management provides
 * better infrastructure-as-code practices and state tracking.
 */

// =============================================================================
// Infrastructure APIs (required for core FlowMaestro infrastructure)
// =============================================================================

// Compute Engine - Required for GKE nodes
export const computeApi = new gcp.projects.Service("compute-api", {
    service: "compute.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Kubernetes Engine - Required for GKE clusters
export const containerApi = new gcp.projects.Service("container-api", {
    service: "container.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Cloud SQL Admin - Required for PostgreSQL databases
export const sqlAdminApi = new gcp.projects.Service("sqladmin-api", {
    service: "sqladmin.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Memorystore for Redis - Required for Redis caching
export const redisApi = new gcp.projects.Service("redis-api", {
    service: "redis.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Artifact Registry - Required for Docker image storage
export const artifactRegistryApi = new gcp.projects.Service("artifactregistry-api", {
    service: "artifactregistry.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Service Networking - Required for VPC peering (Cloud SQL, Redis)
export const serviceNetworkingApi = new gcp.projects.Service("servicenetworking-api", {
    service: "servicenetworking.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Cloud Resource Manager - Required for project-level operations
export const cloudResourceManagerApi = new gcp.projects.Service("cloudresourcemanager-api", {
    service: "cloudresourcemanager.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// IAM - Required for service accounts and permissions
export const iamApi = new gcp.projects.Service("iam-api", {
    service: "iam.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Cloud Monitoring - Required for metrics and dashboards
export const monitoringApi = new gcp.projects.Service("monitoring-api", {
    service: "monitoring.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Cloud Logging - Required for log aggregation
export const loggingApi = new gcp.projects.Service("logging-api", {
    service: "logging.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Secret Manager - Required for secrets storage
export const secretManagerApi = new gcp.projects.Service("secretmanager-api", {
    service: "secretmanager.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Cloud Storage - Required for file uploads and artifacts
export const storageApi = new gcp.projects.Service("storage-api", {
    service: "storage.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// =============================================================================
// Integration APIs (for FlowMaestro integrations)
// =============================================================================

// Google Sheets API - Required for Google Sheets integration
export const sheetsApi = new gcp.projects.Service("sheets-api", {
    service: "sheets.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Google Drive API - Useful for file operations alongside Sheets
export const driveApi = new gcp.projects.Service("drive-api", {
    service: "drive.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Google Calendar API - Required for Google Calendar integration
export const calendarApi = new gcp.projects.Service("calendar-api", {
    service: "calendar-json.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Gmail API - Required for Gmail integration
export const gmailApi = new gcp.projects.Service("gmail-api", {
    service: "gmail.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// Vertex AI API - Required for Google Gemini LLM integration
export const vertexAiApi = new gcp.projects.Service("vertexai-api", {
    service: "aiplatform.googleapis.com",
    project: infrastructureConfig.project,
    disableOnDestroy: false
});

// =============================================================================
// Exports
// =============================================================================

export const apiOutputs = {
    // Infrastructure APIs
    computeApiEnabled: computeApi.service,
    containerApiEnabled: containerApi.service,
    sqlAdminApiEnabled: sqlAdminApi.service,
    redisApiEnabled: redisApi.service,
    artifactRegistryApiEnabled: artifactRegistryApi.service,
    serviceNetworkingApiEnabled: serviceNetworkingApi.service,
    cloudResourceManagerApiEnabled: cloudResourceManagerApi.service,
    iamApiEnabled: iamApi.service,
    monitoringApiEnabled: monitoringApi.service,
    loggingApiEnabled: loggingApi.service,
    secretManagerApiEnabled: secretManagerApi.service,
    storageApiEnabled: storageApi.service,

    // Integration APIs
    sheetsApiEnabled: sheetsApi.service,
    driveApiEnabled: driveApi.service,
    calendarApiEnabled: calendarApi.service,
    gmailApiEnabled: gmailApi.service,
    vertexAiApiEnabled: vertexAiApi.service
};
