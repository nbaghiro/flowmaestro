// Set timezone to UTC before any other imports or operations
// This prevents timezone mismatches between Node.js and PostgreSQL
process.env.TZ = "UTC";

import path from "path";
import { createWorkerLogger } from "../core/logging";

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
    const { Runtime, Worker, NativeConnection } = await import("@temporalio/worker");

    Runtime.install({
        logger: {
            trace: (message: string, meta?: Record<string, unknown>) =>
                logger.trace({ ...meta, component: "temporal-sdk" }, message),
            debug: (message: string, meta?: Record<string, unknown>) =>
                logger.debug({ ...meta, component: "temporal-sdk" }, message),
            info: (message: string, meta?: Record<string, unknown>) =>
                logger.info({ ...meta, component: "temporal-sdk" }, message),
            warn: (message: string, meta?: Record<string, unknown>) =>
                logger.warn({ ...meta, component: "temporal-sdk" }, message),
            error: (message: string, meta?: Record<string, unknown>) =>
                logger.error({ ...meta, component: "temporal-sdk" }, message),
            log: (level: string, message: string, meta?: Record<string, unknown>) => {
                const logMeta = { ...meta, component: "temporal-sdk" };
                switch (level) {
                    case "TRACE":
                        logger.trace(logMeta, message);
                        break;
                    case "DEBUG":
                        logger.debug(logMeta, message);
                        break;
                    case "INFO":
                        logger.info(logMeta, message);
                        break;
                    case "WARN":
                        logger.warn(logMeta, message);
                        break;
                    case "ERROR":
                        logger.error(logMeta, message);
                        break;
                    default:
                        logger.info(logMeta, message);
                }
            }
        }
    });

    // Dynamic imports for modules that depend on Temporal
    const { config } = await import("../core/config");
    const { initializeSpanService } = await import("../core/tracing");
    const { redisEventBus } = await import("../services/events/RedisEventBus");
    const { db } = await import("../storage/database");
    const activities = await import("./activities");
    // Initialize SpanService for observability
    initializeSpanService({
        pool: db.getPool(),
        batchSize: 10,
        flushIntervalMs: 5000
    });
    logger.info("SpanService initialized for worker");

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

    // Create worker
    const worker = await Worker.create({
        connection,
        namespace: "default",
        taskQueue: "flowmaestro-orchestrator",
        workflowsPath,
        activities,
        maxConcurrentActivityTaskExecutions: 10,
        maxConcurrentWorkflowTaskExecutions: 10,
        // Add bundler options for TypeScript
        bundlerOptions: {
            ignoreModules: ["uuid", "pg", "redis", "fastify"]
        }
    });

    logger.info(
        {
            taskQueue: "flowmaestro-orchestrator",
            temporalAddress: config.temporal.address
        },
        "Orchestrator worker starting"
    );

    // Graceful shutdown handler
    const signals = ["SIGINT", "SIGTERM"];
    signals.forEach((signal) => {
        process.on(signal, async () => {
            logger.info({ signal }, "Received shutdown signal, shutting down worker");
            worker.shutdown();
            await redisEventBus.disconnect();
            process.exit(0);
        });
    });

    // Run the worker
    await worker.run();
}

run().catch((err) => {
    logger.error({ err }, "Worker failed");
    process.exit(1);
});
