/**
 * Example 01: Basic Workflow Execution
 *
 * This example demonstrates the most common use case:
 * 1. Execute a workflow with inputs
 * 2. Wait for completion using polling
 * 3. Retrieve the results
 *
 * Run: npx tsx 01-basic-workflow.ts
 */

import "dotenv/config";
import { FlowMaestroClient } from "@flowmaestro/sdk";

// Configuration from environment
const API_KEY = process.env.FLOWMAESTRO_API_KEY!;
const BASE_URL = process.env.FLOWMAESTRO_BASE_URL;
const WORKFLOW_ID = process.env.WORKFLOW_ID!;

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

    // Initialize the client
    const client = new FlowMaestroClient({
        apiKey: API_KEY,
        baseUrl: BASE_URL
    });

    console.log("FlowMaestro Basic Workflow Execution Example\n");
    console.log("=".repeat(50));

    try {
        // Step 1: Get workflow details to understand required inputs
        console.log("\n1. Fetching workflow details...");
        const { data: workflow } = await client.workflows.get(WORKFLOW_ID);
        console.log(`   Workflow: ${workflow.name}`);
        console.log(`   Description: ${workflow.description || "N/A"}`);

        if (workflow.inputs) {
            console.log("   Required inputs:");
            for (const [key, input] of Object.entries(workflow.inputs)) {
                console.log(`     - ${key}: ${input.type}${input.required ? " (required)" : ""}`);
            }
        }

        // Step 2: Execute the workflow
        console.log("\n2. Executing workflow...");
        const { data: execution } = await client.workflows.execute(WORKFLOW_ID, {
            inputs: {
                // Replace these with actual inputs for your workflow
                name: "John Doe",
                email: "john@example.com"
            }
        });
        console.log(`   Execution ID: ${execution.execution_id}`);
        console.log(`   Status: ${execution.status}`);

        // Step 3: Wait for completion using polling
        console.log("\n3. Waiting for completion...");
        const startTime = Date.now();

        const result = await client.executions.waitForCompletion(execution.execution_id, {
            pollInterval: 1000, // Poll every 1 second
            timeout: 120000 // Timeout after 2 minutes
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`   Completed in ${duration}s`);

        // Step 4: Display results
        console.log("\n4. Results:");
        console.log(`   Status: ${result.status}`);

        if (result.status === "completed") {
            console.log("   Outputs:");
            if (result.outputs) {
                for (const [key, value] of Object.entries(result.outputs)) {
                    const displayValue =
                        typeof value === "object" ? JSON.stringify(value, null, 2) : value;
                    console.log(`     ${key}: ${displayValue}`);
                }
            } else {
                console.log("     (no outputs)");
            }
        } else if (result.status === "failed") {
            console.log(`   Error: ${result.error}`);
        }

        console.log("\n" + "=".repeat(50));
        console.log("Example completed successfully!");
    } catch (error) {
        console.error("\nError:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

main();
