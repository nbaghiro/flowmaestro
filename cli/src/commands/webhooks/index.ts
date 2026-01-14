import chalk from "chalk";
import { get, post, del, type PaginatedResponse, type ApiResponse } from "../../api-client";
import { isAuthenticated } from "../../config";
import { getGlobalOptions } from "../../index";
import { handleError, AuthenticationError } from "../../utils/errors";
import {
    output,
    formatDate,
    printSuccess,
    printSection,
    printKeyValue,
    printWarning,
    type TableColumn
} from "../../utils/output";
import { input, confirm, multiSelect } from "../../utils/prompt";
import { withSpinner } from "../../utils/spinner";
import type { Command } from "commander";

interface Webhook {
    id: string;
    name: string;
    url: string;
    events: string[];
    headers?: Record<string, string>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface WebhookCreate extends Webhook {
    secret: string;
}

interface TestResponse {
    success: boolean;
    status_code: number;
    message: string;
    error?: string;
}

const WEBHOOK_COLUMNS: TableColumn[] = [
    { key: "id", header: "ID", width: 38 },
    { key: "name", header: "Name", width: 20 },
    { key: "url", header: "URL", width: 30 },
    {
        key: "is_active",
        header: "Active",
        width: 10,
        formatter: (v) => (v ? chalk.green("Yes") : chalk.gray("No"))
    },
    {
        key: "events",
        header: "Events",
        width: 15,
        formatter: (v) => (Array.isArray(v) ? String(v.length) : "-")
    }
];

const AVAILABLE_EVENTS = [
    { name: "execution:started", value: "execution:started", description: "Workflow started" },
    {
        name: "execution:completed",
        value: "execution:completed",
        description: "Workflow completed"
    },
    { name: "execution:failed", value: "execution:failed", description: "Workflow failed" },
    { name: "trigger:executed", value: "trigger:executed", description: "Trigger executed" },
    { name: "workflow:created", value: "workflow:created", description: "Workflow created" },
    { name: "workflow:updated", value: "workflow:updated", description: "Workflow updated" }
];

export function registerWebhooksCommand(program: Command): void {
    const webhooksCmd = program.command("webhooks").description("Manage webhooks");

    webhooksCmd
        .command("list")
        .alias("ls")
        .description("List all webhooks")
        .option("-p, --page <number>", "Page number", "1")
        .option("--per-page <number>", "Items per page", "20")
        .action(async (options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const response = await withSpinner(
                    "Fetching webhooks...",
                    () =>
                        get<PaginatedResponse<Webhook>>(
                            `/api/v1/webhooks?page=${options.page}&per_page=${options.perPage}`
                        ),
                    { successText: (r) => `Found ${r.data.length} webhooks` }
                );

                output(response.data, {
                    format: globalOpts.output,
                    columns: WEBHOOK_COLUMNS
                });
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    webhooksCmd
        .command("get <id>")
        .description("Get webhook details")
        .action(async (id: string) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const response = await withSpinner(
                    "Fetching webhook...",
                    () => get<ApiResponse<Webhook>>(`/api/v1/webhooks/${id}`),
                    { successText: "Webhook loaded" }
                );

                const webhook = response.data;

                if (globalOpts.output === "json" || globalOpts.output === "yaml") {
                    output(webhook, { format: globalOpts.output });
                    return;
                }

                printSection("Webhook Details");
                printKeyValue("ID", webhook.id);
                printKeyValue("Name", webhook.name);
                printKeyValue("URL", webhook.url);
                printKeyValue("Active", webhook.is_active ? chalk.green("Yes") : chalk.gray("No"));
                printKeyValue("Created", formatDate(new Date(webhook.created_at)));
                printKeyValue("Updated", formatDate(new Date(webhook.updated_at)));

                printSection("Events");
                for (const event of webhook.events) {
                    console.log(`  ${chalk.cyan("•")} ${event}`);
                }

                if (webhook.headers && Object.keys(webhook.headers).length > 0) {
                    printSection("Custom Headers");
                    for (const [key, value] of Object.entries(webhook.headers)) {
                        printKeyValue(`  ${key}`, value);
                    }
                }
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    webhooksCmd
        .command("create")
        .description("Create a new webhook")
        .action(async () => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                console.log();
                console.log(chalk.bold("Create New Webhook"));
                console.log();

                const name = await input({
                    message: "Webhook name:",
                    validate: (v) => (v.trim() ? true : "Name is required")
                });

                const url = await input({
                    message: "Webhook URL:",
                    validate: (v) => {
                        if (!v.trim()) return "URL is required";
                        try {
                            new URL(v);
                            return true;
                        } catch {
                            return "Invalid URL";
                        }
                    }
                });

                const events = await multiSelect({
                    message: "Select events to subscribe to:",
                    choices: AVAILABLE_EVENTS
                });

                if (events.length === 0) {
                    printWarning("No events selected. Webhook will not receive any notifications.");
                    const proceed = await confirm({
                        message: "Continue anyway?",
                        default: false
                    });
                    if (!proceed) {
                        console.log(chalk.gray("Cancelled."));
                        return;
                    }
                }

                const response = await withSpinner(
                    "Creating webhook...",
                    () =>
                        post<ApiResponse<WebhookCreate>>("/api/v1/webhooks", {
                            name,
                            url,
                            events
                        }),
                    { successText: "Webhook created" }
                );

                printSuccess("Webhook created successfully!");
                console.log();
                printKeyValue("ID", response.data.id);
                printKeyValue("Secret", chalk.yellow(response.data.secret));
                console.log();
                printWarning(
                    "Save the secret now - it will not be shown again. Use it to verify webhook signatures."
                );
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    webhooksCmd
        .command("delete <id>")
        .description("Delete a webhook")
        .option("-f, --force", "Skip confirmation prompt")
        .action(async (id: string, options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                if (!options.force) {
                    const proceed = await confirm({
                        message: `Are you sure you want to delete webhook ${id}?`,
                        default: false
                    });

                    if (!proceed) {
                        console.log(chalk.gray("Cancelled."));
                        return;
                    }
                }

                await withSpinner("Deleting webhook...", () => del(`/api/v1/webhooks/${id}`), {
                    successText: "Webhook deleted"
                });

                printSuccess(`Webhook ${id} has been deleted.`);
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    webhooksCmd
        .command("test <id>")
        .description("Send a test webhook")
        .action(async (id: string) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const response = await withSpinner(
                    "Sending test webhook...",
                    () => post<ApiResponse<TestResponse>>(`/api/v1/webhooks/${id}/test`),
                    {
                        successText: (r) =>
                            r.data.success
                                ? "Test webhook sent successfully"
                                : "Test webhook failed"
                    }
                );

                const result = response.data;

                if (result.success) {
                    printSuccess("Test webhook delivered successfully!");
                    printKeyValue("Status Code", result.status_code);
                } else {
                    printWarning("Test webhook failed");
                    printKeyValue("Status Code", result.status_code);
                    if (result.error) {
                        printKeyValue("Error", result.error);
                    }
                }
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });
}
