import chalk from "chalk";
import { get, post, type PaginatedResponse, type ApiResponse } from "../../api-client";
import { isAuthenticated } from "../../config";
import { getGlobalOptions } from "../../index";
import { handleError, AuthenticationError } from "../../utils/errors";
import {
    output,
    formatDate,
    formatStatus,
    printSuccess,
    printKeyValue,
    type TableColumn
} from "../../utils/output";
import { withSpinner } from "../../utils/spinner";
import type { Command } from "commander";

interface Trigger {
    id: string;
    workflow_id: string;
    name: string;
    trigger_type: string;
    enabled: boolean;
    last_triggered_at?: string;
    trigger_count: number;
    created_at: string;
    updated_at: string;
}

interface ExecuteResponse {
    execution_id: string;
    workflow_id: string;
    trigger_id: string;
    status: string;
    inputs: Record<string, unknown>;
}

const TRIGGER_COLUMNS: TableColumn[] = [
    { key: "id", header: "ID", width: 38 },
    { key: "name", header: "Name", width: 25 },
    { key: "trigger_type", header: "Type", width: 12 },
    {
        key: "enabled",
        header: "Enabled",
        width: 10,
        formatter: (v) => (v ? chalk.green("Yes") : chalk.gray("No"))
    },
    { key: "trigger_count", header: "Runs", width: 8 },
    {
        key: "last_triggered_at",
        header: "Last Run",
        width: 15,
        formatter: (v) => (v ? formatDate(new Date(String(v))) : "-")
    }
];

export function registerTriggersCommand(program: Command): void {
    const triggersCmd = program.command("triggers").description("Manage workflow triggers");

    triggersCmd
        .command("list")
        .alias("ls")
        .description("List all triggers")
        .option("-w, --workflow <id>", "Filter by workflow ID")
        .option("-p, --page <number>", "Page number", "1")
        .option("--per-page <number>", "Items per page", "20")
        .action(async (options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                let url = `/api/v1/triggers?page=${options.page}&per_page=${options.perPage}`;
                if (options.workflow) {
                    url += `&workflow_id=${options.workflow}`;
                }

                const response = await withSpinner(
                    "Fetching triggers...",
                    () => get<PaginatedResponse<Trigger>>(url),
                    { successText: (r) => `Found ${r.data.length} triggers` }
                );

                output(response.data, {
                    format: globalOpts.output,
                    columns: TRIGGER_COLUMNS
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

    triggersCmd
        .command("run <id>")
        .description("Execute a trigger")
        .option("-i, --inputs <json>", "Inputs as JSON string")
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
                }

                const response = await withSpinner(
                    "Executing trigger...",
                    () =>
                        post<ApiResponse<ExecuteResponse>>(`/api/v1/triggers/${id}/execute`, {
                            inputs
                        }),
                    { successText: "Trigger executed" }
                );

                printSuccess("Trigger executed successfully!");
                console.log();
                printKeyValue("Execution ID", response.data.execution_id);
                printKeyValue("Workflow ID", response.data.workflow_id);
                printKeyValue("Status", formatStatus(response.data.status));

                console.log();
                console.log(chalk.gray("Monitor execution with:"));
                console.log(chalk.cyan(`  fm executions get ${response.data.execution_id}`));
                console.log(chalk.cyan(`  fm executions watch ${response.data.execution_id}`));
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });
}
