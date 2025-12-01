import path from "path";
import { Worker, NativeConnection } from "@temporalio/worker";
import { initializeSpanService } from "../../core/tracing";
import { redisEventBus } from "../../services/events/RedisEventBus";
import { db } from "../../storage/database";
import * as activities from "../activities";

/**
 * Orchestrator Worker
 *
 * Temporal worker that processes workflow executions, checkpoints,
 * and user input workflows.
 */
async function run() {
    // Initialize SpanService for observability
    initializeSpanService({
        pool: db.getPool(),
        batchSize: 10,
        flushIntervalMs: 5000
    });
    console.log("✅ SpanService initialized for worker");

    // Connect to Redis for cross-process event communication
    try {
        await redisEventBus.connect();
        console.log("✅ Worker connected to Redis for event publishing");
    } catch (error) {
        console.error("❌ Failed to connect to Redis:", error);
        console.warn("⚠️  Workflow events will not be published");
    }

    // Connect to Temporal with retry logic for DNS resolution
    let connection;
    const maxRetries = 10;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempting to connect to Temporal (attempt ${attempt}/${maxRetries})...`);
            connection = await NativeConnection.connect({
                address: process.env.TEMPORAL_ADDRESS || "localhost:7233"
            });
            console.log("✅ Connected to Temporal successfully");
            break;
        } catch (error) {
            if (attempt === maxRetries) {
                console.error("❌ Failed to connect to Temporal after max retries");
                throw error;
            }
            const delay = baseDelay * Math.pow(2, attempt - 1);
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(
                `⚠️  Failed to connect (attempt ${attempt}/${maxRetries}): ${errorMessage}`
            );
            console.log(`   Retrying in ${delay}ms...`);
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
        ? path.resolve(__dirname, "../workflows.bundle.ts")
        : path.resolve(__dirname, "../workflows.bundle.js");

    console.log(`Loading workflows from: ${workflowsPath}`);

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

    console.log("🚀 Orchestrator worker starting...");
    console.log("   Task Queue: flowmaestro-orchestrator");
    console.log(`   Temporal Address: ${process.env.TEMPORAL_ADDRESS || "localhost:7233"}`);

    // Graceful shutdown handler
    const signals = ["SIGINT", "SIGTERM"];
    signals.forEach((signal) => {
        process.on(signal, async () => {
            console.log(`\nReceived ${signal}, shutting down worker...`);
            worker.shutdown();
            await redisEventBus.disconnect();
            process.exit(0);
        });
    });

    // Run the worker
    await worker.run();
}

run().catch((err) => {
    console.error("Worker failed:", err);
    process.exit(1);
});
