import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { infrastructureConfig, resourceName } from "../utils/config";

/**
 * Google Cloud Logging Infrastructure for FlowMaestro
 *
 * This module configures:
 * - Custom log buckets with retention policies
 * - Log sinks for routing error logs
 * - Log exclusions for cost optimization
 * - IAM permissions for logging
 */

// =============================================================================
// Log Buckets
// =============================================================================

/**
 * Application logs bucket with 30-day retention (cost-optimized)
 */
export const applicationLogBucket = new gcp.logging.ProjectBucketConfig(
    resourceName("app-logs-bucket"),
    {
        project: infrastructureConfig.project,
        location: "global",
        bucketId: "flowmaestro-app-logs",
        retentionDays: 30,
        description: "FlowMaestro application logs with 30-day retention"
    }
);

/**
 * Error logs bucket with 90-day retention
 */
export const errorLogBucket = new gcp.logging.ProjectBucketConfig(
    resourceName("error-logs-bucket"),
    {
        project: infrastructureConfig.project,
        location: "global",
        bucketId: "flowmaestro-error-logs",
        retentionDays: 90,
        description: "FlowMaestro error logs with 90-day retention for debugging"
    }
);

// =============================================================================
// Log Sinks
// =============================================================================

/**
 * Sink to route error logs to the error log bucket
 */
export const errorLogSink = new gcp.logging.ProjectSink(
    resourceName("error-log-sink"),
    {
        name: "flowmaestro-error-sink",
        project: infrastructureConfig.project,
        destination: pulumi.interpolate`logging.googleapis.com/projects/${infrastructureConfig.project}/locations/global/buckets/flowmaestro-error-logs`,
        filter: `resource.type="k8s_container" AND resource.labels.namespace_name="flowmaestro" AND severity>="ERROR"`,
        uniqueWriterIdentity: true
    },
    {
        dependsOn: [errorLogBucket]
    }
);

// =============================================================================
// Log Exclusions (Cost Optimization)
// =============================================================================

/**
 * Exclude debug-level logs in production to reduce storage costs
 * This exclusion is disabled in non-production environments
 */
export const debugLogExclusion = new gcp.logging.ProjectExclusion(
    resourceName("debug-exclusion"),
    {
        name: "flowmaestro-debug-exclusion",
        project: infrastructureConfig.project,
        description: "Exclude debug-level logs in production to reduce costs",
        filter: `resource.type="k8s_container" AND resource.labels.namespace_name="flowmaestro" AND severity="DEBUG"`,
        disabled: infrastructureConfig.environment !== "production"
    }
);

/**
 * Exclude health check logs to reduce noise
 */
export const healthCheckExclusion = new gcp.logging.ProjectExclusion(
    resourceName("healthcheck-exclusion"),
    {
        name: "flowmaestro-healthcheck-exclusion",
        project: infrastructureConfig.project,
        description: "Exclude health check endpoint logs to reduce noise",
        filter: `resource.type="k8s_container" AND resource.labels.namespace_name="flowmaestro" AND httpRequest.requestUrl=~"/health"`
    }
);

// =============================================================================
// Log-based Metrics (for alerting)
// =============================================================================

/**
 * Metric for counting error logs
 */
export const errorLogMetric = new gcp.logging.Metric(
    resourceName("error-count-metric"),
    {
        name: "flowmaestro-error-count",
        project: infrastructureConfig.project,
        description: "Count of error-level logs from FlowMaestro",
        filter: `resource.type="k8s_container" AND resource.labels.namespace_name="flowmaestro" AND severity>="ERROR"`,
        metricDescriptor: {
            metricKind: "DELTA",
            valueType: "INT64",
            unit: "1",
            displayName: "FlowMaestro Error Count"
        }
    }
);

/**
 * Metric for counting workflow execution errors
 */
export const workflowErrorMetric = new gcp.logging.Metric(
    resourceName("workflow-error-metric"),
    {
        name: "flowmaestro-workflow-errors",
        project: infrastructureConfig.project,
        description: "Count of workflow execution errors",
        filter: `resource.type="k8s_container" AND resource.labels.namespace_name="flowmaestro" AND severity>="ERROR" AND jsonPayload.executionId!=""`,
        metricDescriptor: {
            metricKind: "DELTA",
            valueType: "INT64",
            unit: "1",
            displayName: "FlowMaestro Workflow Errors",
            labels: [
                {
                    key: "workflowName",
                    valueType: "STRING",
                    description: "Name of the workflow that failed"
                }
            ]
        },
        labelExtractors: {
            workflowName: "EXTRACT(jsonPayload.workflowName)"
        }
    }
);

/**
 * Metric for frontend errors
 */
export const frontendErrorMetric = new gcp.logging.Metric(
    resourceName("frontend-error-metric"),
    {
        name: "flowmaestro-frontend-errors",
        project: infrastructureConfig.project,
        description: "Count of frontend errors reported via log ingestion",
        filter: `resource.type="k8s_container" AND resource.labels.namespace_name="flowmaestro" AND jsonPayload.source="frontend" AND severity>="ERROR"`,
        metricDescriptor: {
            metricKind: "DELTA",
            valueType: "INT64",
            unit: "1",
            displayName: "FlowMaestro Frontend Errors"
        }
    }
);

// =============================================================================
// Exports
// =============================================================================

export const loggingConfig = {
    applicationBucketId: applicationLogBucket.bucketId,
    errorBucketId: errorLogBucket.bucketId,
    errorSinkName: errorLogSink.name,
    errorMetricName: errorLogMetric.name
};
