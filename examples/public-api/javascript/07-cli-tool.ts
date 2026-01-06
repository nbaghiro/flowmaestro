/**
 * Example 07: CLI Tool
 *
 * This example demonstrates building a command-line workflow runner:
 * 1. List available workflows
 * 2. Select and configure a workflow
 * 3. Execute with custom inputs
 * 4. Display results
 *
 * Run: npx tsx 07-cli-tool.ts [command] [options]
 *
 * Commands:
 *   list                    List all workflows
 *   get <workflow_id>       Get workflow details
 *   run <workflow_id>       Execute a workflow
 *   status <execution_id>   Get execution status
 *   cancel <execution_id>   Cancel an execution
 */

import "dotenv/config";
import * as readline from "readline";
import { FlowMaestroClient, NotFoundError } from "@flowmaestro/sdk";

// Configuration
const API_KEY = process.env.FLOWMAESTRO_API_KEY!;
const BASE_URL = process.env.FLOWMAESTRO_BASE_URL;

// Colors for terminal output
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
};

function color(text: string, c: keyof typeof colors): string {
    return `${colors[c]}${text}${colors.reset}`;
}

async function main() {
    // Validate configuration
    if (!API_KEY || API_KEY === "fm_live_your_api_key_here") {
        console.error(color("Error: Please set FLOWMAESTRO_API_KEY in your .env file", "red"));
        process.exit(1);
    }

    const client = new FlowMaestroClient({
        apiKey: API_KEY,
        baseUrl: BASE_URL
    });

    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    const arg1 = args[1];

    console.log(color("\nFlowMaestro CLI\n", "bright"));

    try {
        switch (command) {
            case "list":
                await listWorkflows(client);
                break;

            case "get":
                if (!arg1) {
                    console.error("Usage: get <workflow_id>");
                    process.exit(1);
                }
                await getWorkflow(client, arg1);
                break;

            case "run":
                if (!arg1) {
                    console.error("Usage: run <workflow_id>");
                    process.exit(1);
                }
                await runWorkflow(client, arg1);
                break;

            case "status":
                if (!arg1) {
                    console.error("Usage: status <execution_id>");
                    process.exit(1);
                }
                await getStatus(client, arg1);
                break;

            case "cancel":
                if (!arg1) {
                    console.error("Usage: cancel <execution_id>");
                    process.exit(1);
                }
                await cancelExecution(client, arg1);
                break;

            case "help":
            case "--help":
            case "-h":
                showHelp();
                break;

            default:
                if (command) {
                    console.error(`Unknown command: ${command}\n`);
                }
                showHelp();
                break;
        }
    } catch (error) {
        if (error instanceof NotFoundError) {
            console.error(color(`Not found: ${error.message}`, "red"));
        } else if (error instanceof Error) {
            console.error(color(`Error: ${error.message}`, "red"));
        }
        process.exit(1);
    }
}

function showHelp(): void {
    console.log("Usage: npx tsx 07-cli-tool.ts <command> [options]\n");
    console.log("Commands:");
    console.log("  list                    List all workflows");
    console.log("  get <workflow_id>       Get workflow details");
    console.log("  run <workflow_id>       Execute a workflow interactively");
    console.log("  status <execution_id>   Get execution status");
    console.log("  cancel <execution_id>   Cancel a running execution");
    console.log("  help                    Show this help message\n");
    console.log("Examples:");
    console.log("  npx tsx 07-cli-tool.ts list");
    console.log("  npx tsx 07-cli-tool.ts run wf_abc123");
    console.log("  npx tsx 07-cli-tool.ts status exec_xyz789\n");
}

async function listWorkflows(client: FlowMaestroClient): Promise<void> {
    console.log(color("Workflows:", "cyan"));
    console.log("-".repeat(60));

    const { data: workflows, pagination } = await client.workflows.list({ per_page: 50 });

    if (workflows.length === 0) {
        console.log("No workflows found.");
        return;
    }

    for (const wf of workflows) {
        console.log(`\n${color(wf.name, "bright")} ${color(`(${wf.id})`, "dim")}`);
        if (wf.description) {
            console.log(`  ${wf.description}`);
        }
        console.log(`  Version: ${wf.version} | Updated: ${formatDate(wf.updated_at)}`);
    }

    console.log(`\n${"-".repeat(60)}`);
    console.log(`Total: ${pagination?.total_count ?? workflows.length} workflows`);
}

async function getWorkflow(client: FlowMaestroClient, workflowId: string): Promise<void> {
    const { data: wf } = await client.workflows.get(workflowId);

    console.log(color("Workflow Details:", "cyan"));
    console.log("-".repeat(60));
    console.log(`Name:        ${color(wf.name, "bright")}`);
    console.log(`ID:          ${wf.id}`);
    console.log(`Version:     ${wf.version}`);
    console.log(`Description: ${wf.description || "N/A"}`);
    console.log(`Created:     ${formatDate(wf.created_at)}`);
    console.log(`Updated:     ${formatDate(wf.updated_at)}`);

    if (wf.inputs && Object.keys(wf.inputs).length > 0) {
        console.log(`\n${color("Inputs:", "cyan")}`);
        for (const [key, input] of Object.entries(wf.inputs)) {
            const required = input.required ? color("*", "red") : "";
            console.log(`  ${key}${required}: ${input.type}`);
            if (input.description) {
                console.log(`    ${color(input.description, "dim")}`);
            }
        }
        console.log(`\n  ${color("*", "red")} = required`);
    }
}

async function runWorkflow(client: FlowMaestroClient, workflowId: string): Promise<void> {
    // Get workflow to understand inputs
    const { data: wf } = await client.workflows.get(workflowId);

    console.log(`Running: ${color(wf.name, "bright")}\n`);

    // Collect inputs interactively
    const inputs: Record<string, unknown> = {};

    if (wf.inputs && Object.keys(wf.inputs).length > 0) {
        console.log(color("Enter inputs (press Enter for default):", "cyan"));

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        for (const [key, input] of Object.entries(wf.inputs)) {
            const required = input.required ? " (required)" : "";
            const prompt = `  ${key}${required}: `;

            const value = await new Promise<string>((resolve) => {
                rl.question(prompt, resolve);
            });

            if (value.trim()) {
                // Try to parse as JSON for complex types
                try {
                    inputs[key] = JSON.parse(value);
                } catch {
                    inputs[key] = value;
                }
            } else if (input.required) {
                console.error(color(`Error: ${key} is required`, "red"));
                rl.close();
                process.exit(1);
            }
        }

        rl.close();
    }

    // Execute
    console.log(color("\nStarting execution...", "yellow"));
    const { data: execution } = await client.workflows.execute(workflowId, { inputs });
    console.log(`Execution ID: ${execution.execution_id}`);

    // Stream progress
    console.log(color("\nProgress:", "cyan"));

    for await (const event of client.executions.streamIterator(execution.execution_id)) {
        const time = new Date().toLocaleTimeString();

        switch (event.type) {
            case "execution:started":
                console.log(`  [${time}] ${color("Started", "green")}`);
                break;
            case "node:started":
                console.log(`  [${time}] Running: ${event.node_id}`);
                break;
            case "node:completed":
                console.log(`  [${time}] ${color("Done", "green")}: ${event.node_id}`);
                break;
            case "node:failed":
                console.log(`  [${time}] ${color("Failed", "red")}: ${event.node_id}`);
                break;
            case "execution:completed":
                console.log(`  [${time}] ${color("Completed!", "green")}`);
                break;
            case "execution:failed":
                console.log(`  [${time}] ${color("Failed!", "red")}`);
                break;
        }

        if (
            event.type === "execution:completed" ||
            event.type === "execution:failed" ||
            event.type === "execution:cancelled"
        ) {
            break;
        }
    }

    // Get final result
    const { data: result } = await client.executions.get(execution.execution_id);

    console.log(color("\nResult:", "cyan"));
    console.log(`  Status: ${formatStatus(result.status)}`);

    if (result.outputs && Object.keys(result.outputs).length > 0) {
        console.log("  Outputs:");
        for (const [key, value] of Object.entries(result.outputs)) {
            const displayValue = typeof value === "object" ? JSON.stringify(value) : value;
            console.log(`    ${key}: ${displayValue}`);
        }
    }

    if (result.error) {
        console.log(`  ${color("Error:", "red")} ${result.error}`);
    }
}

async function getStatus(client: FlowMaestroClient, executionId: string): Promise<void> {
    const { data: exec } = await client.executions.get(executionId);

    console.log(color("Execution Status:", "cyan"));
    console.log("-".repeat(60));
    console.log(`ID:       ${exec.id}`);
    console.log(`Workflow: ${exec.workflow_id}`);
    console.log(`Status:   ${formatStatus(exec.status)}`);
    console.log(`Created:  ${formatDate(exec.created_at)}`);

    if (exec.started_at) {
        console.log(`Started:  ${formatDate(exec.started_at)}`);
    }
    if (exec.completed_at) {
        console.log(`Completed: ${formatDate(exec.completed_at)}`);
    }

    if (exec.inputs && Object.keys(exec.inputs).length > 0) {
        console.log(`\n${color("Inputs:", "dim")}`);
        console.log(JSON.stringify(exec.inputs, null, 2));
    }

    if (exec.outputs && Object.keys(exec.outputs).length > 0) {
        console.log(`\n${color("Outputs:", "dim")}`);
        console.log(JSON.stringify(exec.outputs, null, 2));
    }

    if (exec.error) {
        console.log(`\n${color("Error:", "red")} ${exec.error}`);
    }
}

async function cancelExecution(client: FlowMaestroClient, executionId: string): Promise<void> {
    console.log(`Cancelling execution ${executionId}...`);
    const { data: exec } = await client.executions.cancel(executionId);
    console.log(`Status: ${formatStatus(exec.status)}`);
}

function formatDate(isoString: string | undefined): string {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString();
}

function formatStatus(status: string): string {
    const statusColors: Record<string, keyof typeof colors> = {
        pending: "yellow",
        running: "blue",
        completed: "green",
        failed: "red",
        cancelled: "dim"
    };
    return color(status, statusColors[status] || "reset");
}

main();
