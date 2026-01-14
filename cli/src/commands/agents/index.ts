import * as readline from "readline";
import chalk from "chalk";
import { get, post, type PaginatedResponse, type ApiResponse } from "../../api-client";
import { isAuthenticated } from "../../config";
import { getGlobalOptions } from "../../index";
import { handleError, AuthenticationError } from "../../utils/errors";
import {
    output,
    formatDate,
    printSection,
    printKeyValue,
    type TableColumn
} from "../../utils/output";
import { withSpinner, startSpinner, stopSpinner } from "../../utils/spinner";
import type { Command } from "commander";

interface Agent {
    id: string;
    name: string;
    description?: string;
    model: string;
    provider: string;
    created_at: string;
    updated_at: string;
}

interface AgentDetail extends Agent {
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    available_tools?: Array<{
        id: string;
        name: string;
        description?: string;
        type: string;
    }>;
}

interface Thread {
    id: string;
    agent_id: string;
    status: string;
    created_at: string;
}

interface Message {
    role: string;
    content: string;
    tool_calls?: Array<{
        id: string;
        name: string;
        arguments: Record<string, unknown>;
    }>;
    created_at: string;
}

interface SendMessageResponse {
    execution_id: string;
    thread_id: string;
    status: string;
    message: Message;
    iterations: number;
    tool_calls_count: number;
}

const AGENT_COLUMNS: TableColumn[] = [
    { key: "id", header: "ID", width: 38 },
    { key: "name", header: "Name", width: 25 },
    { key: "model", header: "Model", width: 20 },
    { key: "provider", header: "Provider", width: 12 },
    {
        key: "updated_at",
        header: "Updated",
        width: 15,
        formatter: (v) => (v ? formatDate(new Date(String(v))) : "-")
    }
];

export function registerAgentsCommand(program: Command): void {
    const agentsCmd = program.command("agents").description("Manage and interact with agents");

    agentsCmd
        .command("list")
        .alias("ls")
        .description("List all agents")
        .option("-p, --page <number>", "Page number", "1")
        .option("--per-page <number>", "Items per page", "20")
        .action(async (options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const response = await withSpinner(
                    "Fetching agents...",
                    () =>
                        get<PaginatedResponse<Agent>>(
                            `/api/v1/agents?page=${options.page}&per_page=${options.perPage}`
                        ),
                    { successText: (r) => `Found ${r.data.length} agents` }
                );

                output(response.data, {
                    format: globalOpts.output,
                    columns: AGENT_COLUMNS
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

    agentsCmd
        .command("get <id>")
        .description("Get agent details")
        .action(async (id: string) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const response = await withSpinner(
                    "Fetching agent...",
                    () => get<ApiResponse<AgentDetail>>(`/api/v1/agents/${id}`),
                    { successText: "Agent loaded" }
                );

                const agent = response.data;

                if (globalOpts.output === "json" || globalOpts.output === "yaml") {
                    output(agent, { format: globalOpts.output });
                    return;
                }

                printSection("Agent Details");
                printKeyValue("ID", agent.id);
                printKeyValue("Name", agent.name);
                printKeyValue("Description", agent.description || chalk.gray("(none)"));
                printKeyValue("Model", agent.model);
                printKeyValue("Provider", agent.provider);

                if (agent.temperature !== undefined) {
                    printKeyValue("Temperature", agent.temperature);
                }
                if (agent.max_tokens !== undefined) {
                    printKeyValue("Max Tokens", agent.max_tokens);
                }

                printKeyValue("Created", formatDate(new Date(agent.created_at)));
                printKeyValue("Updated", formatDate(new Date(agent.updated_at)));

                if (agent.available_tools && agent.available_tools.length > 0) {
                    printSection("Available Tools");
                    for (const tool of agent.available_tools) {
                        console.log(`  ${chalk.cyan(tool.name)} ${chalk.gray(`(${tool.type})`)}`);
                        if (tool.description) {
                            console.log(chalk.gray(`    ${tool.description}`));
                        }
                    }
                }

                console.log();
                console.log(chalk.gray(`Run 'fm agents chat ${id}' to start a conversation.`));
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    agentsCmd
        .command("chat <id>")
        .description("Start an interactive chat session with an agent")
        .option("-t, --thread <id>", "Resume an existing thread")
        .action(async (id: string, options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const agent = await withSpinner(
                    "Loading agent...",
                    () => get<ApiResponse<AgentDetail>>(`/api/v1/agents/${id}`),
                    { successText: "Agent loaded" }
                );

                let threadId = options.thread;

                if (!threadId) {
                    const threadResponse = await withSpinner(
                        "Creating new thread...",
                        () => post<ApiResponse<Thread>>(`/api/v1/agents/${id}/threads`),
                        { successText: "Thread created" }
                    );
                    threadId = threadResponse.data.id;
                }

                console.log();
                console.log(chalk.bold(`Chat with "${agent.data.name}"`));
                console.log(chalk.gray(`Thread: ${threadId}`));
                console.log(chalk.gray("Type 'exit' to end, '/clear' to start new thread"));
                console.log(chalk.gray("─".repeat(50)));
                console.log();

                await runInteractiveChat(id, threadId, agent.data.name);
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });
}

async function runInteractiveChat(
    agentId: string,
    initialThreadId: string,
    agentName: string
): Promise<void> {
    let threadId = initialThreadId;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const prompt = (): void => {
        rl.question(chalk.cyan("You: "), async (input) => {
            const trimmed = input.trim();

            if (!trimmed) {
                prompt();
                return;
            }

            if (trimmed.toLowerCase() === "exit") {
                console.log();
                console.log(chalk.gray("Goodbye!"));
                rl.close();
                process.exit(0);
            }

            if (trimmed === "/clear") {
                try {
                    const threadResponse = await post<ApiResponse<Thread>>(
                        `/api/v1/agents/${agentId}/threads`
                    );
                    threadId = threadResponse.data.id;
                    console.log();
                    console.log(chalk.gray(`Started new thread: ${threadId}`));
                    console.log();
                } catch (_error) {
                    console.error(chalk.red("Failed to create new thread"));
                }
                prompt();
                return;
            }

            if (trimmed === "/thread") {
                console.log(chalk.gray(`Current thread: ${threadId}`));
                prompt();
                return;
            }

            try {
                startSpinner("Thinking...");

                const response = await post<ApiResponse<SendMessageResponse>>(
                    `/api/v1/threads/${threadId}/messages`,
                    {
                        content: trimmed,
                        stream: false,
                        timeout: 120000
                    }
                );

                stopSpinner();

                console.log();
                console.log(chalk.green(`${agentName}: `) + response.data.message.content);

                if (
                    response.data.message.tool_calls &&
                    response.data.message.tool_calls.length > 0
                ) {
                    console.log(
                        chalk.gray(
                            `  [Used ${response.data.tool_calls_count} tool(s) in ${response.data.iterations} iteration(s)]`
                        )
                    );
                }

                console.log();
            } catch (error) {
                stopSpinner();
                console.log();
                if (error instanceof Error) {
                    console.error(chalk.red(`Error: ${error.message}`));
                } else {
                    console.error(chalk.red("An error occurred"));
                }
                console.log();
            }

            prompt();
        });
    };

    prompt();

    await new Promise<void>((resolve) => {
        rl.on("close", resolve);
    });
}
