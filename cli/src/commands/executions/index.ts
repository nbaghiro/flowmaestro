import chalk from "chalk";
import { EventSource } from "eventsource";
import { get, post, type PaginatedResponse, type ApiResponse } from "../../api-client";
import {
    isAuthenticated,
    loadCredentials,
    getEffectiveApiKey,
    getEffectiveApiUrl
} from "../../config";
import { getGlobalOptions } from "../../index";
import { handleError, AuthenticationError } from "../../utils/errors";
import {
    output,
    formatDate,
    formatStatus,
    formatDuration,
    printSuccess,
    printSection,
    printKeyValue,
    outputJson,
    type TableColumn
} from "../../utils/output";
import { confirm } from "../../utils/prompt";
import { withSpinner } from "../../utils/spinner";
import type { Command } from "commander";

interface Execution {
    id: string;
    workflow_id: string;
    status: string;
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    error?: string;
    started_at?: string;
    completed_at?: string;
    created_at: string;
    duration_ms?: number;
}

interface ExecutionEvent {
    execution_id: string;
    type: string;
    status?: string;
    node_id?: string;
    node_label?: string;
    outputs?: Record<string, unknown>;
    error?: string;
    timestamp: string;
}

const EXECUTION_COLUMNS: TableColumn[] = [
    { key: "id", header: "ID", width: 38 },
    { key: "workflow_id", header: "Workflow", width: 20 },
    {
        key: "status",
        header: "Status",
        width: 12,
        formatter: (v) => formatStatus(String(v))
    },
    {
        key: "duration_ms",
        header: "Duration",
        width: 12,
        formatter: (v) => (v ? formatDuration(Number(v)) : "-")
    },
    {
        key: "created_at",
        header: "Created",
        width: 15,
        formatter: (v) => (v ? formatDate(new Date(String(v))) : "-")
    }
];

export function registerExecutionsCommand(program: Command): void {
    const executionsCmd = program
        .command("executions")
        .alias("exec")
        .description("Manage workflow executions");

    executionsCmd
        .command("list")
        .alias("ls")
        .description("List executions")
        .option("-w, --workflow <id>", "Filter by workflow ID")
        .option("-s, --status <status>", "Filter by status")
        .option("-p, --page <number>", "Page number", "1")
        .option("--per-page <number>", "Items per page", "20")
        .action(async (options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                let url = `/api/v1/executions?page=${options.page}&per_page=${options.perPage}`;
                if (options.workflow) {
                    url += `&workflow_id=${options.workflow}`;
                }
                if (options.status) {
                    url += `&status=${options.status}`;
                }

                const response = await withSpinner(
                    "Fetching executions...",
                    () => get<PaginatedResponse<Execution>>(url),
                    { successText: (r) => `Found ${r.data.length} executions` }
                );

                output(response.data, {
                    format: globalOpts.output,
                    columns: EXECUTION_COLUMNS
                });

                if (globalOpts.output === "table" && response.pagination.total_pages > 1) {
                    console.log(
                        chalk.gray(
                            `\nPage ${response.pagination.page} of ${response.pagination.total_pages} ` +
                                `(${response.pagination.total_count} total)`
                        )
                    );
                }
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    executionsCmd
        .command("get <id>")
        .description("Get execution details")
        .action(async (id: string) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const response = await withSpinner(
                    "Fetching execution...",
                    () => get<ApiResponse<Execution>>(`/api/v1/executions/${id}`),
                    { successText: "Execution loaded" }
                );

                const exec = response.data;

                if (globalOpts.output === "json" || globalOpts.output === "yaml") {
                    output(exec, { format: globalOpts.output });
                    return;
                }

                printSection("Execution Details");
                printKeyValue("ID", exec.id);
                printKeyValue("Workflow ID", exec.workflow_id);
                printKeyValue("Status", formatStatus(exec.status));

                if (exec.started_at) {
                    printKeyValue("Started", formatDate(new Date(exec.started_at)));
                }
                if (exec.completed_at) {
                    printKeyValue("Completed", formatDate(new Date(exec.completed_at)));
                }
                if (exec.duration_ms) {
                    printKeyValue("Duration", formatDuration(exec.duration_ms));
                }

                if (exec.error) {
                    printSection("Error");
                    console.log(chalk.red(exec.error));
                }

                if (exec.inputs && Object.keys(exec.inputs).length > 0) {
                    printSection("Inputs");
                    outputJson(exec.inputs);
                }

                if (exec.outputs && Object.keys(exec.outputs).length > 0) {
                    printSection("Outputs");
                    outputJson(exec.outputs);
                }
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    executionsCmd
        .command("watch <id>")
        .description("Stream execution events in real-time")
        .action(async (id: string) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const baseUrl = getEffectiveApiUrl();
                let url = `${baseUrl}/api/v1/executions/${id}/events`;

                const apiKey = getEffectiveApiKey();
                const credentials = loadCredentials();

                if (apiKey) {
                    url += `?api_key=${encodeURIComponent(apiKey)}`;
                } else if (credentials.accessToken) {
                    url += `?token=${encodeURIComponent(credentials.accessToken)}`;
                }

                console.log();
                console.log(chalk.bold(`Watching execution ${id}...`));
                console.log(chalk.gray("━".repeat(50)));
                console.log();

                const nodeStates: Map<
                    string,
                    { label: string; status: string; duration?: number }
                > = new Map();

                const eventSource = new EventSource(url);

                const cleanup = (): void => {
                    eventSource.close();
                };

                process.on("SIGINT", () => {
                    cleanup();
                    console.log();
                    console.log(chalk.gray("Stopped watching."));
                    process.exit(0);
                });

                eventSource.onmessage = (event: MessageEvent) => {
                    try {
                        const data = JSON.parse(event.data) as ExecutionEvent;
                        handleExecutionEvent(data, nodeStates, globalOpts.output === "json");
                    } catch {
                        console.log(chalk.gray(`Event: ${event.data}`));
                    }
                };

                eventSource.addEventListener("connected", () => {
                    console.log(chalk.green("Connected to event stream"));
                    console.log();
                });

                eventSource.addEventListener("execution:completed", (event: MessageEvent) => {
                    try {
                        const data = JSON.parse(event.data) as ExecutionEvent;
                        console.log();
                        console.log(chalk.green("✓ Execution completed successfully"));
                        if (data.outputs) {
                            printSection("Outputs");
                            outputJson(data.outputs);
                        }
                    } catch {
                        console.log(chalk.green("✓ Execution completed"));
                    }
                    cleanup();
                    process.exit(0);
                });

                eventSource.addEventListener("execution:failed", (event: MessageEvent) => {
                    try {
                        const data = JSON.parse(event.data) as ExecutionEvent;
                        console.log();
                        console.log(chalk.red("✗ Execution failed"));
                        if (data.error) {
                            console.log(chalk.red(`Error: ${data.error}`));
                        }
                    } catch {
                        console.log(chalk.red("✗ Execution failed"));
                    }
                    cleanup();
                    process.exit(1);
                });

                eventSource.addEventListener("execution:cancelled", () => {
                    console.log();
                    console.log(chalk.yellow("⚠ Execution cancelled"));
                    cleanup();
                    process.exit(0);
                });

                eventSource.onerror = () => {
                    console.error(chalk.red("Connection error"));
                    cleanup();
                    process.exit(1);
                };
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    executionsCmd
        .command("cancel <id>")
        .description("Cancel a running execution")
        .option("-f, --force", "Skip confirmation prompt")
        .action(async (id: string, options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                if (!options.force) {
                    const proceed = await confirm({
                        message: `Are you sure you want to cancel execution ${id}?`,
                        default: false
                    });

                    if (!proceed) {
                        console.log(chalk.gray("Cancelled."));
                        return;
                    }
                }

                await withSpinner(
                    "Cancelling execution...",
                    () => post(`/api/v1/executions/${id}/cancel`),
                    { successText: "Execution cancelled" }
                );

                printSuccess(`Execution ${id} has been cancelled.`);
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });
}

function handleExecutionEvent(
    event: ExecutionEvent,
    nodeStates: Map<string, { label: string; status: string; duration?: number }>,
    jsonOutput: boolean
): void {
    if (jsonOutput) {
        outputJson(event);
        return;
    }

    const timestamp = chalk.gray(new Date(event.timestamp).toLocaleTimeString());

    switch (event.type) {
        case "execution:started":
            console.log(`${timestamp} ${chalk.blue("▸")} Execution started`);
            break;

        case "execution:progress":
            if (event.status) {
                console.log(`${timestamp} ${chalk.blue("▸")} Progress: ${event.status}`);
            }
            break;

        case "node:started":
            if (event.node_id) {
                nodeStates.set(event.node_id, {
                    label: event.node_label || event.node_id,
                    status: "running"
                });
                console.log(
                    `${timestamp} ${chalk.yellow("▸")} ${event.node_label || event.node_id} - running...`
                );
            }
            break;

        case "node:completed":
            if (event.node_id) {
                nodeStates.set(event.node_id, {
                    label: event.node_label || event.node_id,
                    status: "completed"
                });
                console.log(
                    `${timestamp} ${chalk.green("✓")} ${event.node_label || event.node_id} - completed`
                );
            }
            break;

        case "node:failed":
            if (event.node_id) {
                nodeStates.set(event.node_id, {
                    label: event.node_label || event.node_id,
                    status: "failed"
                });
                console.log(
                    `${timestamp} ${chalk.red("✗")} ${event.node_label || event.node_id} - failed`
                );
                if (event.error) {
                    console.log(chalk.red(`    Error: ${event.error}`));
                }
            }
            break;

        default:
            console.log(`${timestamp} ${chalk.gray("▸")} ${event.type}`);
    }
}
