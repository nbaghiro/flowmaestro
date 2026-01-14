import chalk from "chalk";
import { get } from "../api-client";
import { isAuthenticated, loadCredentials, loadConfig } from "../config";
import { getGlobalOptions } from "../index";
import { handleError, AuthenticationError } from "../utils/errors";
import { printKeyValue, printSection } from "../utils/output";
import { withSpinner } from "../utils/spinner";
import type { Command } from "commander";

interface UserResponse {
    data: {
        id: string;
        email: string;
        name?: string;
        avatar_url?: string;
        created_at: string;
    };
}

interface WorkspaceResponse {
    data: {
        id: string;
        name: string;
        type: string;
        category: string;
        role: string;
    };
}

export function registerWhoamiCommand(program: Command): void {
    program
        .command("whoami")
        .description("Display current user and workspace information")
        .action(async () => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const credentials = loadCredentials();
                const config = loadConfig();

                printSection("Authentication");

                if (credentials.apiKey) {
                    printKeyValue("Method", "API Key");
                    printKeyValue("Key", maskApiKey(credentials.apiKey));
                } else if (credentials.accessToken) {
                    printKeyValue("Method", "OAuth");
                    if (credentials.expiresAt) {
                        const expiresIn = credentials.expiresAt - Date.now();
                        if (expiresIn > 0) {
                            const hours = Math.floor(expiresIn / (1000 * 60 * 60));
                            const minutes = Math.floor(
                                (expiresIn % (1000 * 60 * 60)) / (1000 * 60)
                            );
                            printKeyValue("Token expires in", `${hours}h ${minutes}m`);
                        } else {
                            printKeyValue("Token", chalk.yellow("Expired (will refresh)"));
                        }
                    }
                }

                try {
                    const user = await withSpinner(
                        "Fetching user info...",
                        () => get<UserResponse>("/api/auth/me"),
                        { successText: "User info retrieved" }
                    );

                    printSection("User");
                    printKeyValue("ID", user.data.id);
                    printKeyValue("Email", user.data.email);
                    if (user.data.name) {
                        printKeyValue("Name", user.data.name);
                    }
                } catch (error) {
                    if (credentials.apiKey) {
                        console.log(
                            chalk.gray("\nNote: User info not available with API key auth.")
                        );
                    } else {
                        throw error;
                    }
                }

                printSection("Configuration");
                printKeyValue("API URL", config.apiUrl);

                if (config.currentWorkspace) {
                    try {
                        const workspace = await get<WorkspaceResponse>(
                            `/api/workspaces/${config.currentWorkspace}`
                        );
                        printKeyValue("Workspace", `${workspace.data.name} (${workspace.data.id})`);
                        printKeyValue("Role", workspace.data.role);
                    } catch {
                        printKeyValue("Workspace ID", config.currentWorkspace);
                        printKeyValue("Workspace", chalk.yellow("(unable to fetch details)"));
                    }
                } else {
                    printKeyValue("Workspace", chalk.gray("Not set"));
                }

                printKeyValue("Output format", config.defaultOutputFormat);

                console.log();
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });
}

function maskApiKey(key: string): string {
    if (key.length <= 12) {
        return "***";
    }
    return key.slice(0, 12) + "..." + key.slice(-4);
}
