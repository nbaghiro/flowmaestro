/**
 * Example 03: Batch Processing
 *
 * This example demonstrates how to process multiple items through a workflow:
 * 1. Read data from a CSV file (or array)
 * 2. Execute workflows concurrently with rate limiting
 * 3. Track progress and collect results
 *
 * Run: npx tsx 03-batch-processing.ts
 */

import "dotenv/config";
import { FlowMaestroClient, RateLimitError } from "@flowmaestro/sdk";

// Configuration from environment
const API_KEY = process.env.FLOWMAESTRO_API_KEY!;
const BASE_URL = process.env.FLOWMAESTRO_BASE_URL;
const WORKFLOW_ID = process.env.WORKFLOW_ID!;

// Batch processing configuration
const CONCURRENCY = 5; // Max concurrent executions
const RETRY_DELAY = 1000; // Delay before retry on rate limit (ms)
const MAX_RETRIES = 3; // Max retries per item

// Sample data (replace with CSV parsing in production)
const sampleData = [
    { name: "Alice Johnson", email: "alice@example.com", department: "Engineering" },
    { name: "Bob Smith", email: "bob@example.com", department: "Marketing" },
    { name: "Carol Williams", email: "carol@example.com", department: "Sales" },
    { name: "David Brown", email: "david@example.com", department: "Engineering" },
    { name: "Eva Martinez", email: "eva@example.com", department: "Support" },
    { name: "Frank Lee", email: "frank@example.com", department: "Marketing" },
    { name: "Grace Chen", email: "grace@example.com", department: "Engineering" },
    { name: "Henry Davis", email: "henry@example.com", department: "Sales" }
];

interface BatchItem {
    index: number;
    data: Record<string, unknown>;
    executionId?: string;
    status: "pending" | "running" | "completed" | "failed";
    result?: Record<string, unknown>;
    error?: string;
    retries: number;
}

async function main() {
    // Validate configuration
    if (!API_KEY || API_KEY === "fm_live_your_api_key_here") {
        console.error("Error: Please set FLOWMAESTRO_API_KEY in your .env file");
        process.exit(1);
    }
    if (!WORKFLOW_ID || WORKFLOW_ID === "wf_your_workflow_id") {
        console.error("Error: Please set WORKFLOW_ID in your .env file");
        process.exit(1);
    }

    const client = new FlowMaestroClient({
        apiKey: API_KEY,
        baseUrl: BASE_URL
    });

    console.log("FlowMaestro Batch Processing Example\n");
    console.log("=".repeat(50));
    console.log(`Processing ${sampleData.length} items with concurrency of ${CONCURRENCY}\n`);

    // Initialize batch items
    const items: BatchItem[] = sampleData.map((data, index) => ({
        index,
        data,
        status: "pending",
        retries: 0
    }));

    const results = await processBatch(client, items);

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("BATCH PROCESSING SUMMARY\n");

    const completed = results.filter((r) => r.status === "completed").length;
    const failed = results.filter((r) => r.status === "failed").length;

    console.log(`Total items:  ${results.length}`);
    console.log(`Completed:    ${completed}`);
    console.log(`Failed:       ${failed}`);
    console.log(`Success rate: ${((completed / results.length) * 100).toFixed(1)}%`);

    // Show failed items
    const failedItems = results.filter((r) => r.status === "failed");
    if (failedItems.length > 0) {
        console.log("\nFailed items:");
        for (const item of failedItems) {
            console.log(`  - Item ${item.index}: ${item.error}`);
        }
    }

    // Show sample results
    const completedItems = results.filter((r) => r.status === "completed").slice(0, 3);
    if (completedItems.length > 0) {
        console.log("\nSample results (first 3):");
        for (const item of completedItems) {
            console.log(`  - Item ${item.index}: ${JSON.stringify(item.result)}`);
        }
    }
}

async function processBatch(client: FlowMaestroClient, items: BatchItem[]): Promise<BatchItem[]> {
    const queue = [...items];
    const running: Promise<void>[] = [];
    const startTime = Date.now();

    // Progress display
    const updateProgress = () => {
        const completed = items.filter((i) => i.status === "completed").length;
        const failed = items.filter((i) => i.status === "failed").length;
        const runningCount = items.filter((i) => i.status === "running").length;
        const pending = items.filter((i) => i.status === "pending").length;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        process.stdout.write(
            `\rProgress: ${completed + failed}/${items.length} | ` +
                `Running: ${runningCount} | Pending: ${pending} | ` +
                `Elapsed: ${elapsed}s    `
        );
    };

    // Process queue with concurrency limit
    while (queue.length > 0 || running.length > 0) {
        // Start new items up to concurrency limit
        while (queue.length > 0 && running.length < CONCURRENCY) {
            const item = queue.shift()!;
            const promise = processItem(client, item).finally(() => {
                const index = running.indexOf(promise);
                if (index > -1) running.splice(index, 1);
                updateProgress();
            });
            running.push(promise);
            item.status = "running";
            updateProgress();
        }

        // Wait for at least one to complete
        if (running.length > 0) {
            await Promise.race(running);
        }
    }

    console.log("\n"); // New line after progress
    return items;
}

async function processItem(client: FlowMaestroClient, item: BatchItem): Promise<void> {
    try {
        // Execute workflow
        const { data: execution } = await client.workflows.execute(WORKFLOW_ID, {
            inputs: item.data
        });
        item.executionId = execution.execution_id;

        // Wait for completion
        const result = await client.executions.waitForCompletion(execution.execution_id, {
            pollInterval: 1000,
            timeout: 60000 // 1 minute per item
        });

        if (result.status === "completed") {
            item.status = "completed";
            item.result = result.outputs || undefined;
        } else {
            item.status = "failed";
            item.error = result.error || "Unknown error";
        }
    } catch (error) {
        // Handle rate limiting with retry
        if (error instanceof RateLimitError && item.retries < MAX_RETRIES) {
            item.retries++;
            const delay = RETRY_DELAY * Math.pow(2, item.retries - 1); // Exponential backoff
            await sleep(delay);
            return processItem(client, item); // Retry
        }

        item.status = "failed";
        item.error = error instanceof Error ? error.message : "Unknown error";
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
