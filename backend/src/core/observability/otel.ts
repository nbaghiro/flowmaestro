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
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { createServiceLogger } from "../logging";

const logger = createServiceLogger("otel");

/** GCP's native OTLP endpoint (recommended as of Sep 2025) */
const GCP_OTLP_ENDPOINT = "telemetry.googleapis.com:443";

/** SDK instance for cleanup on shutdown */
let sdk: NodeSDK | null = null;

/**
 * Decide whether OTel export should run.
 *
 * `OTEL_ENABLED=true|false` is explicit and wins. When it is unset, export runs
 * only in production, which is the historical behavior on GKE. Hosted platforms
 * without GCP credentials set `OTEL_ENABLED=false`.
 */
export function resolveOTelEnabled(): boolean {
    const flag = (process.env.OTEL_ENABLED || "").trim().toLowerCase();
    if (flag === "true" || flag === "1") {
        return true;
    }
    if (flag === "false" || flag === "0") {
        return false;
    }
    return process.env.NODE_ENV === "production";
}

/**
 * OTLP gRPC endpoint. `OTEL_EXPORTER_OTLP_ENDPOINT` overrides the GCP default,
 * with or without a scheme.
 */
function resolveOTelEndpoint(): string {
    const override = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "").trim();
    if (!override) {
        return `https://${GCP_OTLP_ENDPOINT}`;
    }
    return /^[a-z]+:\/\//i.test(override) ? override : `https://${override}`;
}

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
        enabled = resolveOTelEnabled(),
        metricExportIntervalMs = 60000
    } = config;

    // Skip initialization if disabled
    if (!enabled) {
        logger.info("OpenTelemetry disabled, skipping initialization");
        return null as unknown as NodeSDK;
    }

    const endpoint = resolveOTelEndpoint();

    logger.info(
        { serviceName, serviceVersion, endpoint },
        "Initializing OpenTelemetry with OTLP endpoint"
    );

    // Trace exporter - uses ADC automatically via gRPC
    const traceExporter = new OTLPTraceExporter({
        url: endpoint,
        credentials: credentials.createSsl()
    });

    // Metrics exporter
    const metricExporter = new OTLPMetricExporter({
        url: endpoint,
        credentials: credentials.createSsl()
    });

    // Resource attributes for service identification
    const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: serviceVersion,
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
