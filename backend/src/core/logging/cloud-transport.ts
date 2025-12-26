/**
 * Google Cloud Logging Transport for Pino
 *
 * Provides a Pino-compatible transport that writes logs to Google Cloud Logging.
 * Falls back to stdout in development for pino-pretty compatibility.
 */

import { Logging, Log, Entry } from "@google-cloud/logging";

// Pino log level to Cloud Logging severity mapping
const SEVERITY_MAP: Record<string, string> = {
    trace: "DEBUG",
    debug: "DEBUG",
    info: "INFO",
    warn: "WARNING",
    error: "ERROR",
    fatal: "CRITICAL"
};

// Pino numeric levels to string levels
const LEVEL_NAMES: Record<number, string> = {
    10: "trace",
    20: "debug",
    30: "info",
    40: "warn",
    50: "error",
    60: "fatal"
};

export interface CloudLoggingConfig {
    projectId: string;
    logName: string;
    serviceName: string;
    serviceVersion: string;
    enabled: boolean;
}

/**
 * Cloud Logging writer class
 * Handles batched writes to Google Cloud Logging
 */
export class CloudLoggingWriter {
    private logging: Logging | null = null;
    private log: Log | null = null;
    private config: CloudLoggingConfig;
    private buffer: Entry[] = [];
    private flushTimeout: NodeJS.Timeout | null = null;
    private readonly batchSize = 100;
    private readonly flushIntervalMs = 1000;

    constructor(config: CloudLoggingConfig) {
        this.config = config;

        if (config.enabled && config.projectId) {
            this.logging = new Logging({ projectId: config.projectId });
            this.log = this.logging.log(config.logName);
        }
    }

    /**
     * Write a log entry to Cloud Logging
     */
    write(data: Record<string, unknown>): void {
        if (!this.log || !this.config.enabled) {
            // If Cloud Logging is disabled, output to stdout for GKE to forward
            process.stdout.write(JSON.stringify(data) + "\n");
            return;
        }

        const level = LEVEL_NAMES[data.level as number] || "info";
        const severity = SEVERITY_MAP[level] || "INFO";

        // Build Cloud Logging metadata
        const metadata = {
            severity,
            resource: {
                type: "global",
                labels: {
                    project_id: this.config.projectId
                }
            },
            labels: {
                service: this.config.serviceName,
                version: this.config.serviceVersion
            }
        };

        // Extract trace context for correlation
        const traceId = data.traceId as string | undefined;
        if (traceId) {
            (metadata as Record<string, unknown>).trace =
                `projects/${this.config.projectId}/traces/${traceId}`;
        }

        // Build labels object
        const labels: Record<string, string> = {
            service: this.config.serviceName,
            version: this.config.serviceVersion
        };
        if (data.traceId) labels.traceId = String(data.traceId);
        if (data.requestId) labels.requestId = String(data.requestId);
        if (data.userId) labels.userId = String(data.userId);
        if (data.spanId) labels.spanId = String(data.spanId);

        // Build the log entry payload
        const payload: Record<string, unknown> = {
            message: data.msg || data.message || "",
            timestamp: data.time
                ? new Date(data.time as number).toISOString()
                : new Date().toISOString(),
            "logging.googleapis.com/labels": labels
        };

        // Copy additional fields excluding Pino internals
        const excludeKeys = new Set(["level", "time", "pid", "hostname", "msg", "message", "v"]);
        for (const [key, value] of Object.entries(data)) {
            if (!excludeKeys.has(key)) {
                payload[key] = value;
            }
        }

        // Add error reporting fields for error-level logs
        if (level === "error" || level === "fatal") {
            payload["@type"] =
                "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent";
            payload.serviceContext = {
                service: this.config.serviceName,
                version: this.config.serviceVersion
            };

            // Include stack trace if available
            if (data.err && typeof data.err === "object") {
                const err = data.err as Record<string, unknown>;
                if (err.stack) {
                    payload.stack_trace = err.stack;
                }
            }
        }

        const entry = this.log.entry(metadata, payload);
        this.buffer.push(entry);

        // Flush if buffer is full
        if (this.buffer.length >= this.batchSize) {
            this.flush();
        } else if (!this.flushTimeout) {
            // Schedule a flush
            this.flushTimeout = setTimeout(() => this.flush(), this.flushIntervalMs);
        }
    }

    /**
     * Flush buffered logs to Cloud Logging
     */
    async flush(): Promise<void> {
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = null;
        }

        if (this.buffer.length === 0 || !this.log) {
            return;
        }

        const entries = this.buffer;
        this.buffer = [];

        try {
            await this.log.write(entries);
        } catch (error) {
            // Log to stderr so we don't lose the error
            process.stderr.write(`[CloudLogging] Failed to write logs: ${error}\n`);
            // Also write the entries to stdout as fallback
            for (const entry of entries) {
                process.stdout.write(JSON.stringify(entry.data) + "\n");
            }
        }
    }

    /**
     * Close the writer and flush remaining logs
     */
    async close(): Promise<void> {
        await this.flush();
    }
}

/**
 * Create a Pino destination that writes to Cloud Logging
 */
export function createCloudLoggingDestination(config: CloudLoggingConfig) {
    const writer = new CloudLoggingWriter(config);

    // Return a writable-like object for Pino
    return {
        write(data: string): void {
            try {
                const parsed = JSON.parse(data);
                writer.write(parsed);
            } catch {
                // If we can't parse, just write to stdout
                process.stdout.write(data);
            }
        },
        async flush(): Promise<void> {
            await writer.flush();
        },
        async close(): Promise<void> {
            await writer.close();
        }
    };
}

// Export singleton writer instance
let globalWriter: CloudLoggingWriter | null = null;

export function initializeCloudLogging(config: CloudLoggingConfig): CloudLoggingWriter {
    if (!globalWriter) {
        globalWriter = new CloudLoggingWriter(config);
    }
    return globalWriter;
}

export function getCloudLoggingWriter(): CloudLoggingWriter | null {
    return globalWriter;
}

export async function shutdownCloudLogging(): Promise<void> {
    if (globalWriter) {
        await globalWriter.close();
        globalWriter = null;
    }
}
