/**
 * Example 02: Streaming Workflow Execution
 *
 * This example demonstrates real-time execution tracking using Server-Sent Events (SSE):
 * 1. Execute a workflow
 * 2. Stream execution events in real-time
 * 3. Display progress as nodes complete
 *
 * Run: npx tsx 02-streaming-execution.ts
 */

import "dotenv/config";
import { FlowMaestroClient } from "@flowmaestro/sdk";
import type { ExecutionEvent } from "@flowmaestro/sdk";

// Configuration from environment
const API_KEY = process.env.FLOWMAESTRO_API_KEY!;
const BASE_URL = process.env.FLOWMAESTRO_BASE_URL;
const WORKFLOW_ID = process.env.WORKFLOW_ID!;

// Progress bar helper
function progressBar(current: number, total: number, width: number = 30): string {
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    return `[${"=".repeat(filled)}${" ".repeat(empty)}] ${current}/${total}`;
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

    console.log("FlowMaestro Streaming Execution Example\n");
    console.log("=".repeat(50));

    try {
        // Step 1: Execute the workflow
        console.log("\n1. Starting workflow execution...");
        const { data: execution } = await client.workflows.execute(WORKFLOW_ID, {
            inputs: {
                name: "Jane Smith",
                email: "jane@example.com"
            }
        });
        console.log(`   Execution ID: ${execution.execution_id}`);

        // Step 2: Stream execution events
        console.log("\n2. Streaming events (real-time):\n");

        let nodeCount = 0;
        let completedNodes = 0;
        const startTime = Date.now();

        // Using async iterator for cleaner code
        for await (const event of client.executions.streamIterator(execution.execution_id)) {
            displayEvent(event);

            // Track node progress
            if (event.type === "node:started") {
                nodeCount++;
            } else if (event.type === "node:completed") {
                completedNodes++;
                if (nodeCount > 0) {
                    console.log(`   Progress: ${progressBar(completedNodes, nodeCount)}`);
                }
            }

            // Check for terminal events
            if (isTerminalEvent(event)) {
                break;
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n   Total time: ${duration}s`);

        // Step 3: Fetch final execution state
        console.log("\n3. Final execution state:");
        const { data: finalState } = await client.executions.get(execution.execution_id);
        console.log(`   Status: ${finalState.status}`);

        if (finalState.outputs) {
            console.log("   Outputs:", JSON.stringify(finalState.outputs, null, 2));
        }

        console.log("\n" + "=".repeat(50));
        console.log("Streaming example completed!");
    } catch (error) {
        console.error("\nError:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

function displayEvent(event: ExecutionEvent): void {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
    const icon = getEventIcon(event.type);

    switch (event.type) {
        case "connected":
            console.log(`   ${timestamp} ${icon} Connected to execution stream`);
            break;

        case "execution:started":
            console.log(`   ${timestamp} ${icon} Execution started`);
            break;

        case "execution:progress":
            if (event.progress !== undefined) {
                console.log(`   ${timestamp} ${icon} Progress: ${event.progress}%`);
            }
            break;

        case "node:started":
            console.log(
                `   ${timestamp} ${icon} Node started: ${event.node_id} (${event.node_type || "unknown"})`
            );
            break;

        case "node:completed":
            console.log(`   ${timestamp} ${icon} Node completed: ${event.node_id}`);
            break;

        case "node:failed":
            console.log(`   ${timestamp} ${icon} Node failed: ${event.node_id} - ${event.error}`);
            break;

        case "execution:completed":
            console.log(`   ${timestamp} ${icon} Execution completed successfully`);
            break;

        case "execution:failed":
            console.log(`   ${timestamp} ${icon} Execution failed: ${event.error}`);
            break;

        case "execution:cancelled":
            console.log(`   ${timestamp} ${icon} Execution cancelled`);
            break;

        default:
            console.log(`   ${timestamp} ${icon} ${event.type}`);
    }
}

function getEventIcon(type: string): string {
    const icons: Record<string, string> = {
        connected: "[*]",
        "execution:started": "[>]",
        "execution:progress": "[~]",
        "node:started": "[+]",
        "node:completed": "[v]",
        "node:failed": "[x]",
        "execution:completed": "[V]",
        "execution:failed": "[X]",
        "execution:cancelled": "[-]"
    };
    return icons[type] || "[?]";
}

function isTerminalEvent(event: ExecutionEvent): boolean {
    return (
        event.type === "execution:completed" ||
        event.type === "execution:failed" ||
        event.type === "execution:cancelled"
    );
}

main();
