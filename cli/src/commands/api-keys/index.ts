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
import { input, confirm, multiSelect, select } from "../../utils/prompt";
import { withSpinner } from "../../utils/spinner";
import type { Command } from "commander";

interface ApiKey {
    id: string;
    name: string;
    key_prefix: string;
    scopes: string[];
    last_used_at?: string;
    expires_at?: string;
    created_at: string;
}

interface ApiKeyCreate extends ApiKey {
    key: string;
}

interface ScopesResponse {
    scopes: Array<{
        name: string;
        description: string;
    }>;
    bundles: Array<{
        name: string;
        description: string;
        scopes: string[];
    }>;
}

const API_KEY_COLUMNS: TableColumn[] = [
    { key: "id", header: "ID", width: 38 },
    { key: "name", header: "Name", width: 25 },
    { key: "key_prefix", header: "Key Prefix", width: 15 },
    {
        key: "scopes",
        header: "Scopes",
        width: 10,
        formatter: (v) => (Array.isArray(v) ? String(v.length) : "-")
    },
    {
        key: "last_used_at",
        header: "Last Used",
        width: 15,
        formatter: (v) => (v ? formatDate(new Date(String(v))) : "Never")
    },
    {
        key: "expires_at",
        header: "Expires",
        width: 15,
        formatter: (v) => (v ? formatDate(new Date(String(v))) : "Never")
    }
];

export function registerApiKeysCommand(program: Command): void {
    const apiKeysCmd = program.command("api-keys").alias("keys").description("Manage API keys");

    apiKeysCmd
        .command("list")
        .alias("ls")
        .description("List all API keys")
        .action(async () => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const response = await withSpinner(
                    "Fetching API keys...",
                    () => get<PaginatedResponse<ApiKey>>("/api/keys"),
                    { successText: (r) => `Found ${r.data.length} API keys` }
                );

                output(response.data, {
                    format: globalOpts.output,
                    columns: API_KEY_COLUMNS
                });
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    apiKeysCmd
        .command("create")
        .description("Create a new API key")
        .action(async () => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                console.log();
                console.log(chalk.bold("Create New API Key"));
                console.log();

                const name = await input({
                    message: "API key name:",
                    validate: (v) => (v.trim() ? true : "Name is required")
                });

                const scopesResponse = await withSpinner(
                    "Loading available scopes...",
                    () => get<ApiResponse<ScopesResponse>>("/api/keys/scopes"),
                    { successText: "Scopes loaded" }
                );

                const scopeData = scopesResponse.data;

                const scopeMethod = await select({
                    message: "How would you like to configure scopes?",
                    choices: [
                        {
                            name: "Use a preset bundle",
                            value: "bundle",
                            description: "Pre-configured scope combinations"
                        },
                        {
                            name: "Select individual scopes",
                            value: "individual",
                            description: "Fine-grained control"
                        }
                    ]
                });

                let scopes: string[] = [];

                if (scopeMethod === "bundle") {
                    const bundle = await select({
                        message: "Select a scope bundle:",
                        choices: scopeData.bundles.map((b) => ({
                            name: b.name,
                            value: b.name,
                            description: b.description
                        }))
                    });

                    const selectedBundle = scopeData.bundles.find((b) => b.name === bundle);
                    if (selectedBundle) {
                        scopes = selectedBundle.scopes;
                    }
                } else {
                    scopes = await multiSelect({
                        message: "Select scopes:",
                        choices: scopeData.scopes.map((s) => ({
                            name: s.name,
                            value: s.name,
                            description: s.description
                        }))
                    });
                }

                if (scopes.length === 0) {
                    printWarning("No scopes selected. The API key will have no permissions.");
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
                    "Creating API key...",
                    () =>
                        post<ApiResponse<ApiKeyCreate>>("/api/keys", {
                            name,
                            scopes
                        }),
                    { successText: "API key created" }
                );

                console.log();
                printSuccess("API key created successfully!");
                console.log();
                printSection("API Key Details");
                printKeyValue("ID", response.data.id);
                printKeyValue("Name", response.data.name);
                console.log();
                console.log(chalk.bold.yellow("API Key:"));
                console.log(chalk.cyan(response.data.key));
                console.log();
                printWarning("Save this key now - it will not be shown again!");

                printSection("Scopes");
                for (const scope of response.data.scopes) {
                    console.log(`  ${chalk.cyan("•")} ${scope}`);
                }
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    apiKeysCmd
        .command("revoke <id>")
        .description("Revoke an API key")
        .option("-f, --force", "Skip confirmation prompt")
        .action(async (id: string, options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                if (!options.force) {
                    const proceed = await confirm({
                        message: `Are you sure you want to revoke API key ${id}? This action cannot be undone.`,
                        default: false
                    });

                    if (!proceed) {
                        console.log(chalk.gray("Cancelled."));
                        return;
                    }
                }

                await withSpinner("Revoking API key...", () => del(`/api/keys/${id}`), {
                    successText: "API key revoked"
                });

                printSuccess(`API key ${id} has been revoked.`);
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });
}
