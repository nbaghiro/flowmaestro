import chalk from "chalk";
import { get, type PaginatedResponse } from "../api-client";
import { setConfigValue, getConfigValue, isAuthenticated } from "../config";
import { getGlobalOptions } from "../index";
import { handleError, AuthenticationError } from "../utils/errors";
import { output, formatStatus, printSuccess, type TableColumn } from "../utils/output";
import { select } from "../utils/prompt";
import { withSpinner } from "../utils/spinner";
import type { Command } from "commander";

interface Workspace {
    id: string;
    name: string;
    type: string;
    category: string;
    role: string;
    created_at: string;
}

const WORKSPACE_COLUMNS: TableColumn[] = [
    { key: "id", header: "ID", width: 38 },
    { key: "name", header: "Name", width: 30 },
    { key: "type", header: "Type", width: 12 },
    { key: "category", header: "Category", width: 12 },
    {
        key: "role",
        header: "Your Role",
        width: 12,
        formatter: (v) => formatStatus(String(v))
    }
];

export function registerWorkspaceCommand(program: Command): void {
    const workspaceCmd = program.command("workspace").alias("ws").description("Manage workspaces");

    workspaceCmd
        .command("list")
        .alias("ls")
        .description("List all workspaces you have access to")
        .action(async () => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const response = await withSpinner(
                    "Fetching workspaces...",
                    () => get<PaginatedResponse<Workspace>>("/api/workspaces"),
                    { successText: `Found ${0} workspaces` }
                );

                const currentWorkspace = getConfigValue("currentWorkspace");
                const workspaces = response.data.map((ws) => ({
                    ...ws,
                    name:
                        ws.id === currentWorkspace
                            ? `${ws.name} ${chalk.green("(current)")}`
                            : ws.name
                }));

                output(workspaces, {
                    format: globalOpts.output,
                    columns: WORKSPACE_COLUMNS
                });
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    workspaceCmd
        .command("use [id]")
        .description("Switch to a different workspace")
        .action(async (id?: string) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                let workspaceId = id;

                if (!workspaceId) {
                    const response = await withSpinner(
                        "Fetching workspaces...",
                        () => get<PaginatedResponse<Workspace>>("/api/workspaces"),
                        { successText: "Workspaces loaded" }
                    );

                    if (response.data.length === 0) {
                        console.log(chalk.yellow("No workspaces found."));
                        return;
                    }

                    const currentWorkspace = getConfigValue("currentWorkspace");

                    workspaceId = await select({
                        message: "Select a workspace:",
                        choices: response.data.map((ws) => ({
                            name: ws.id === currentWorkspace ? `${ws.name} (current)` : ws.name,
                            value: ws.id,
                            description: `${ws.type} - ${ws.role}`
                        })),
                        default: currentWorkspace
                    });
                }

                const workspace = await withSpinner(
                    "Verifying workspace...",
                    () =>
                        get<{ data: Workspace }>(`/api/workspaces/${workspaceId}`, {
                            workspace: workspaceId
                        }),
                    { successText: "Workspace verified" }
                );

                setConfigValue("currentWorkspace", workspaceId);
                printSuccess(`Switched to workspace: ${workspace.data.name}`);
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    workspaceCmd
        .command("current")
        .description("Show current workspace")
        .action(async () => {
            const globalOpts = getGlobalOptions();

            try {
                const currentWorkspace = getConfigValue("currentWorkspace");

                if (!currentWorkspace) {
                    console.log(chalk.yellow("No workspace selected."));
                    console.log(chalk.gray("Run 'fm workspace use' to select a workspace."));
                    return;
                }

                if (!isAuthenticated()) {
                    console.log(`Workspace ID: ${currentWorkspace}`);
                    console.log(chalk.gray("(Not authenticated - cannot fetch workspace details)"));
                    return;
                }

                try {
                    const response = await withSpinner(
                        "Fetching workspace...",
                        () => get<{ data: Workspace }>(`/api/workspaces/${currentWorkspace}`),
                        { successText: "Workspace loaded" }
                    );

                    output([response.data], {
                        format: globalOpts.output,
                        columns: WORKSPACE_COLUMNS
                    });
                } catch {
                    console.log(`Workspace ID: ${currentWorkspace}`);
                    console.log(chalk.yellow("(Unable to fetch workspace details)"));
                }
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    workspaceCmd
        .command("clear")
        .description("Clear the current workspace selection")
        .action(() => {
            setConfigValue("currentWorkspace", undefined as unknown as string);
            printSuccess("Workspace selection cleared.");
        });
}
