import chalk from "chalk";
import { get, post, type PaginatedResponse, type ApiResponse } from "../../api-client";
import { isAuthenticated } from "../../config";
import { getGlobalOptions } from "../../index";
import { handleError, AuthenticationError } from "../../utils/errors";
import {
    output,
    formatDate,
    printSuccess,
    printSection,
    printKeyValue,
    type TableColumn
} from "../../utils/output";
import { dynamicPrompts, type DynamicPrompt } from "../../utils/prompt";
import { withSpinner } from "../../utils/spinner";
import type { Command } from "commander";

interface Workflow {
    id: string;
    name: string;
    description?: string;
    version: number;
    created_at: string;
    updated_at: string;
}

interface WorkflowDetail extends Workflow {
    inputs?: Record<
        string,
        {
            type: string;
            label: string;
            required: boolean;
            description?: string;
            default?: unknown;
        }
    >;
}

interface ExecuteResponse {
    execution_id: string;
    workflow_id: string;
    status: string;
    inputs: Record<string, unknown>;
}

const WORKFLOW_COLUMNS: TableColumn[] = [
    { key: "id", header: "ID", width: 38 },
    { key: "name", header: "Name", width: 30 },
    { key: "version", header: "Version", width: 10 },
    {
        key: "updated_at",
        header: "Updated",
        width: 15,
        formatter: (v) => (v ? formatDate(new Date(String(v))) : "-")
    }
];

export function registerWorkflowsCommand(program: Command): void {
    const workflowsCmd = program
        .command("workflows")
        .alias("wf")
        .description("Manage and execute workflows");

    workflowsCmd
        .command("list")
        .alias("ls")
        .description("List all workflows")
        .option("-p, --page <number>", "Page number", "1")
        .option("--per-page <number>", "Items per page", "20")
        .action(async (options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const response = await withSpinner(
                    "Fetching workflows...",
                    () =>
                        get<PaginatedResponse<Workflow>>(
                            `/api/v1/workflows?page=${options.page}&per_page=${options.perPage}`
                        ),
                    { successText: (r) => `Found ${r.data.length} workflows` }
                );

                output(response.data, {
                    format: globalOpts.output,
                    columns: WORKFLOW_COLUMNS
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

    workflowsCmd
        .command("get <id>")
        .description("Get workflow details")
        .action(async (id: string) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const response = await withSpinner(
                    "Fetching workflow...",
                    () => get<ApiResponse<WorkflowDetail>>(`/api/v1/workflows/${id}`),
                    { successText: "Workflow loaded" }
                );

                const workflow = response.data;

                if (globalOpts.output === "json" || globalOpts.output === "yaml") {
                    output(workflow, { format: globalOpts.output });
                    return;
                }

                printSection("Workflow Details");
                printKeyValue("ID", workflow.id);
                printKeyValue("Name", workflow.name);
                printKeyValue("Description", workflow.description || chalk.gray("(none)"));
                printKeyValue("Version", workflow.version);
                printKeyValue("Created", formatDate(new Date(workflow.created_at)));
                printKeyValue("Updated", formatDate(new Date(workflow.updated_at)));

                if (workflow.inputs && Object.keys(workflow.inputs).length > 0) {
                    printSection("Inputs");
                    for (const [inputId, inputDef] of Object.entries(workflow.inputs)) {
                        const required = inputDef.required ? chalk.red("*") : "";
                        const defaultVal = inputDef.default
                            ? chalk.gray(` (default: ${JSON.stringify(inputDef.default)})`)
                            : "";
                        console.log(
                            `  ${chalk.cyan(inputDef.label || inputId)}${required}: ${inputDef.type}${defaultVal}`
                        );
                        if (inputDef.description) {
                            console.log(chalk.gray(`    ${inputDef.description}`));
                        }
                    }
                }

                console.log();
                console.log(chalk.gray(`Run 'fm workflows run ${id}' to execute this workflow.`));
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    workflowsCmd
        .command("run <id>")
        .description("Execute a workflow")
        .option("-i, --inputs <json>", "Inputs as JSON string")
        .option("--wait", "Wait for execution to complete")
        .option("--watch", "Stream execution events after starting")
        .action(async (id: string, options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                let inputs: Record<string, unknown> = {};

                if (options.inputs) {
                    try {
                        inputs = JSON.parse(options.inputs);
                    } catch {
                        throw new Error('Invalid JSON for inputs. Use -i \'{"key": "value"}\'');
                    }
                } else {
                    const workflow = await withSpinner(
                        "Loading workflow...",
                        () => get<ApiResponse<WorkflowDetail>>(`/api/v1/workflows/${id}`),
                        { successText: "Workflow loaded" }
                    );

                    if (workflow.data.inputs && Object.keys(workflow.data.inputs).length > 0) {
                        console.log();
                        console.log(chalk.bold(`Running workflow: ${workflow.data.name}`));
                        console.log();

                        const prompts: DynamicPrompt[] = [];

                        for (const [inputId, inputDef] of Object.entries(workflow.data.inputs)) {
                            const promptType = mapInputType(inputDef.type);
                            prompts.push({
                                name: inputId,
                                type: promptType,
                                message: inputDef.label || inputId,
                                required: inputDef.required,
                                default: inputDef.default
                            });
                        }

                        inputs = await dynamicPrompts(prompts);
                    }
                }

                console.log();
                const response = await withSpinner(
                    "Starting execution...",
                    () =>
                        post<ApiResponse<ExecuteResponse>>(`/api/v1/workflows/${id}/execute`, {
                            inputs
                        }),
                    { successText: "Execution started" }
                );

                const executionId = response.data.execution_id;

                printSuccess(`Execution started: ${executionId}`);
                console.log();

                if (options.watch) {
                    console.log(chalk.gray("Tip: Use 'fm executions watch' to stream events"));
                    console.log(chalk.cyan(`Run: fm executions watch ${executionId}`));
                } else if (options.wait) {
                    console.log(chalk.gray("Waiting for execution to complete..."));
                    console.log(chalk.cyan(`Run: fm executions get ${executionId}`));
                } else {
                    console.log(chalk.gray("Monitor execution with:"));
                    console.log(chalk.cyan(`  fm executions get ${executionId}`));
                    console.log(chalk.cyan(`  fm executions watch ${executionId}`));
                }
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });
}

function mapInputType(type: string): "input" | "password" | "confirm" | "select" | "number" {
    switch (type.toLowerCase()) {
        case "number":
        case "integer":
            return "number";
        case "boolean":
            return "confirm";
        case "password":
        case "secret":
            return "password";
        default:
            return "input";
    }
}
