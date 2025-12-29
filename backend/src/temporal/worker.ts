// Set timezone to UTC before any other imports or operations
// This prevents timezone mismatches between Node.js and PostgreSQL
process.env.TZ = "UTC";

import http from "http";
import os from "os";
import path from "path";
import { createWorkerLogger } from "../core/logging";
import { initializeOTel, shutdownOTel } from "../core/observability";
import { createOTelActivityInterceptor } from "./activities/interceptors";
import { createRuntimeLogger } from "./core";

const logger = createWorkerLogger("flowmaestro-worker");

/**
 * Orchestrator Worker
 *
 * Temporal worker that processes workflow executions, checkpoints,
 * and user input workflows.
 */
async function run() {
    // Configure Temporal Runtime BEFORE using Worker/NativeConnection
    // Must use dynamic import to ensure Runtime.install() runs first
    const { Runtime, Worker, NativeConnection, DefaultLogger } = await import("@temporalio/worker");

    // Create runtime logger that routes all Temporal logs through pino
    const runtimeLogger = createRuntimeLogger(DefaultLogger, { baseLogger: logger });
    Runtime.install({ logger: runtimeLogger });

    // Dynamic imports for modules that depend on Temporal
    const { config } = await import("../core/config");
    const { redisEventBus } = await import("../services/events/RedisEventBus");
    const activities = await import("./activities");

    // Initialize OpenTelemetry SDK (exports to GCP Cloud Trace/Monitoring)
    initializeOTel({
        serviceName: "flowmaestro-worker",
        serviceVersion: "1.0.0",
        enabled: process.env.NODE_ENV === "production"
    });
    logger.info("OpenTelemetry SDK initialized");

    // Connect to Redis for cross-process event communication
    try {
        await redisEventBus.connect();
        logger.info("Worker connected to Redis for event publishing");
    } catch (error) {
        logger.error({ err: error }, "Failed to connect to Redis");
        logger.warn("Workflow events will not be published");
    }

    // Connect to Temporal with retry logic for DNS resolution
    let connection;
    const maxRetries = 10;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.info({ attempt, maxRetries }, "Attempting to connect to Temporal");
            connection = await NativeConnection.connect({
                address: config.temporal.address
            });
            logger.info("Connected to Temporal successfully");
            break;
        } catch (error) {
            if (attempt === maxRetries) {
                logger.error({ err: error }, "Failed to connect to Temporal after max retries");
                throw error;
            }
            const delay = baseDelay * Math.pow(2, attempt - 1);
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn(
                { attempt, maxRetries, error: errorMessage, retryDelayMs: delay },
                "Failed to connect to Temporal, retrying"
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    if (!connection) {
        throw new Error("Failed to establish Temporal connection");
    }

    // Resolve workflows path - use absolute path
    // When running with tsx (dev), use .ts; when built, use .js
    const isDev = __filename.endsWith(".ts");
    const workflowsPath = isDev
        ? path.resolve(__dirname, "./workflows.bundle.ts")
        : path.resolve(__dirname, "./workflows.bundle.js");

    logger.info({ workflowsPath }, "Loading workflows");

    // Generate worker identity for debugging in Temporal UI
    const workerIdentity = `orchestrator-${process.env.HOSTNAME || os.hostname()}-${process.pid}`;

    // Import task queue config
    const { TASK_QUEUES } = await import("./core");

    // Create worker
    const worker = await Worker.create({
        connection,
        namespace: "default",
        taskQueue: TASK_QUEUES.ORCHESTRATOR,
        workflowsPath,
        activities,
        identity: workerIdentity,
        maxConcurrentActivityTaskExecutions: 10,
        maxConcurrentWorkflowTaskExecutions: 10,
        // Grace period for in-flight activities to complete during shutdown
        shutdownGraceTime: "30 seconds",
        // Sticky queue timeout for workflow caching performance
        stickyQueueScheduleToStartTimeout: "10 seconds",
        // Add bundler options for TypeScript
        bundlerOptions: {
            ignoreModules: ["uuid"]
        },
        // Activity interceptors for OTel tracing
        interceptors: {
            activity: [createOTelActivityInterceptor]
        }
    });

    logger.info(
        {
            taskQueue: TASK_QUEUES.ORCHESTRATOR,
            temporalAddress: config.temporal.address,
            workerIdentity
        },
        "Orchestrator worker starting"
    );

    // Health check HTTP server for Kubernetes liveness/readiness probes
    const healthPort = parseInt(process.env.WORKER_HEALTH_PORT || "9090", 10);
    let isReady = true; // Track readiness state

    const healthServer: http.Server = http.createServer((req, res) => {
        if (req.url === "/health") {
            // Liveness probe - returns 200 if the process is running
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "healthy", identity: workerIdentity }));
        } else if (req.url === "/ready") {
            // Readiness probe - returns 200 if connected to Temporal
            if (isReady) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: "ready", identity: workerIdentity }));
            } else {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: "not ready", identity: workerIdentity }));
            }
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    healthServer.listen(healthPort, () => {
        logger.info({ healthPort }, "Health check server started");
    });

    // Graceful shutdown handler
    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
    signals.forEach((signal) => {
        process.on(signal, async () => {
            logger.info({ signal }, "Received shutdown signal, initiating graceful shutdown");

            // Mark as not ready immediately to stop receiving new traffic
            isReady = false;

            try {
                // Close health check server
                await new Promise<void>((resolve) => healthServer.close(() => resolve()));
                logger.info("Health check server closed");

                // Await worker shutdown - allows in-flight activities to complete
                await worker.shutdown();
                logger.info("Worker shutdown complete");

                // Close Temporal connection
                await connection.close();
                logger.info("Temporal connection closed");

                // Disconnect from Redis
                await redisEventBus.disconnect();
                logger.info("Redis disconnected");

                // Shutdown OpenTelemetry (flushes pending telemetry)
                await shutdownOTel();
                logger.info("OpenTelemetry SDK shutdown");

                process.exit(0);
            } catch (error) {
                logger.error({ err: error }, "Error during shutdown");
                process.exit(1);
            }
        });
    });

    // Run the worker
    await worker.run();
}

run().catch((err) => {
    logger.error({ err }, "Worker failed");
    process.exit(1);
});
