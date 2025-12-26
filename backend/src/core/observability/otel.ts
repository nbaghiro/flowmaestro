/**
 * OpenTelemetry SDK Initialization for GCP Observability
 *
 * Exports traces to Cloud Trace and metrics to Cloud Monitoring
 * via the native OTLP endpoint (telemetry.googleapis.com).
 *
 * @see https://cloud.google.com/trace/docs/setup/nodejs-ot
 * @see https://docs.cloud.google.com/stackdriver/docs/reference/telemetry/overview
 */

import { credentials } from "@grpc/grpc-js";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import {
    SEMRESATTRS_SERVICE_NAME,
    SEMRESATTRS_SERVICE_VERSION,
    SEMRESATTRS_CLOUD_PROVIDER,
    SEMRESATTRS_CLOUD_PLATFORM
} from "@opentelemetry/semantic-conventions";
import { createServiceLogger } from "../logging";

const logger = createServiceLogger("otel");

/** GCP's native OTLP endpoint (recommended as of Sep 2025) */
const GCP_OTLP_ENDPOINT = "telemetry.googleapis.com:443";

/** SDK instance for cleanup on shutdown */
let sdk: NodeSDK | null = null;

export interface OTelConfig {
    /** Service name for resource identification */
    serviceName: string;
    /** Service version */
    serviceVersion?: string;
    /** Whether to enable OTel (defaults to true in production) */
    enabled?: boolean;
    /** Metric export interval in milliseconds (default: 60000) */
    metricExportIntervalMs?: number;
}

/**
 * Initialize OpenTelemetry SDK with GCP Cloud Trace and Cloud Monitoring exporters.
 *
 * Uses Application Default Credentials (ADC) for authentication:
 * - In GKE: Uses Workload Identity automatically
 * - Locally: Uses `gcloud auth application-default login` or GOOGLE_APPLICATION_CREDENTIALS
 *
 * Required IAM roles for the service account:
 * - roles/cloudtrace.agent (Cloud Trace Writer)
 * - roles/monitoring.metricWriter (Cloud Monitoring Writer)
 * - roles/logging.logWriter (Cloud Logging Writer)
 */
export function initializeOTel(config: OTelConfig): NodeSDK {
    const {
        serviceName,
        serviceVersion = "1.0.0",
        enabled = process.env.NODE_ENV === "production",
        metricExportIntervalMs = 60000
    } = config;

    // Skip initialization if disabled
    if (!enabled) {
        logger.info("OpenTelemetry disabled, skipping initialization");
        return null as unknown as NodeSDK;
    }

    logger.info(
        { serviceName, serviceVersion, endpoint: GCP_OTLP_ENDPOINT },
        "Initializing OpenTelemetry with GCP OTLP endpoint"
    );

    // Trace exporter - uses ADC automatically via gRPC
    const traceExporter = new OTLPTraceExporter({
        url: `https://${GCP_OTLP_ENDPOINT}`,
        credentials: credentials.createSsl()
    });

    // Metrics exporter
    const metricExporter = new OTLPMetricExporter({
        url: `https://${GCP_OTLP_ENDPOINT}`,
        credentials: credentials.createSsl()
    });

    // Resource attributes for service identification
    const resource = resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
        [SEMRESATTRS_CLOUD_PROVIDER]: "gcp",
        [SEMRESATTRS_CLOUD_PLATFORM]: "gcp_kubernetes_engine",
        // Add environment for filtering in GCP Console
        "deployment.environment": process.env.NODE_ENV || "development"
    });

    sdk = new NodeSDK({
        resource,
        spanProcessor: new BatchSpanProcessor(traceExporter, {
            // Batch config for efficient export
            maxQueueSize: 2048,
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5000
        }),
        metricReader: new PeriodicExportingMetricReader({
            exporter: metricExporter,
            exportIntervalMillis: metricExportIntervalMs
        })
    });

    sdk.start();
    logger.info("OpenTelemetry SDK started");

    return sdk;
}

/**
 * Shutdown OpenTelemetry SDK gracefully.
 * Should be called during application shutdown to flush pending telemetry.
 */
export async function shutdownOTel(): Promise<void> {
    if (sdk) {
        logger.info("Shutting down OpenTelemetry SDK");
        await sdk.shutdown();
        sdk = null;
        logger.info("OpenTelemetry SDK shutdown complete");
    }
}

/**
 * Check if OpenTelemetry is initialized and enabled
 */
export function isOTelEnabled(): boolean {
    return sdk !== null;
}
