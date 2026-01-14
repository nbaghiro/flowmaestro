import chalk from "chalk";
import { get, del, type ApiResponse } from "../../api-client";
import { isAuthenticated } from "../../config";
import { getGlobalOptions } from "../../index";
import { handleError, AuthenticationError } from "../../utils/errors";
import { output, formatDate, printSection, printKeyValue, printSuccess } from "../../utils/output";
import { confirm } from "../../utils/prompt";
import { withSpinner } from "../../utils/spinner";
import type { Command } from "commander";

interface Thread {
    id: string;
    agent_id: string;
    title?: string;
    status: string;
    created_at: string;
    updated_at: string;
    last_message_at?: string;
}

interface Message {
    id: string;
    role: string;
    content: string;
    tool_calls?: Array<{
        id: string;
        name: string;
    }>;
    created_at: string;
}

interface ThreadMessages {
    messages: Message[];
}

export function registerThreadsCommand(program: Command): void {
    const threadsCmd = program.command("threads").description("Manage agent conversation threads");

    threadsCmd
        .command("get <id>")
        .description("Get thread details and messages")
        .action(async (id: string) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                const [threadResponse, messagesResponse] = await Promise.all([
                    withSpinner("Fetching thread...", () =>
                        get<ApiResponse<Thread>>(`/api/v1/threads/${id}`)
                    ),
                    get<ApiResponse<ThreadMessages>>(`/api/v1/threads/${id}/messages`)
                ]);

                const thread = threadResponse.data;
                const messages = messagesResponse.data.messages;

                if (globalOpts.output === "json" || globalOpts.output === "yaml") {
                    output({ ...thread, messages }, { format: globalOpts.output });
                    return;
                }

                printSection("Thread Details");
                printKeyValue("ID", thread.id);
                printKeyValue("Agent ID", thread.agent_id);
                printKeyValue("Title", thread.title || chalk.gray("(none)"));
                printKeyValue("Status", thread.status);
                printKeyValue("Created", formatDate(new Date(thread.created_at)));
                if (thread.last_message_at) {
                    printKeyValue("Last Message", formatDate(new Date(thread.last_message_at)));
                }

                if (messages.length > 0) {
                    printSection(`Messages (${messages.length})`);
                    console.log();

                    for (const msg of messages) {
                        const roleColor = msg.role === "user" ? chalk.cyan : chalk.green;
                        const roleLabel = msg.role === "user" ? "You" : "Agent";

                        console.log(
                            `${roleColor(roleLabel)} ${chalk.gray(`(${formatDate(new Date(msg.created_at))})`)}`
                        );
                        console.log(msg.content);

                        if (msg.tool_calls && msg.tool_calls.length > 0) {
                            console.log(
                                chalk.gray(
                                    `  [Tools: ${msg.tool_calls.map((t) => t.name).join(", ")}]`
                                )
                            );
                        }

                        console.log();
                    }
                } else {
                    console.log(chalk.gray("\nNo messages in this thread."));
                }
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });

    threadsCmd
        .command("delete <id>")
        .description("Delete a thread")
        .option("-f, --force", "Skip confirmation prompt")
        .action(async (id: string, options) => {
            const globalOpts = getGlobalOptions();

            try {
                if (!isAuthenticated()) {
                    throw new AuthenticationError();
                }

                if (!options.force) {
                    const proceed = await confirm({
                        message: `Are you sure you want to delete thread ${id}?`,
                        default: false
                    });

                    if (!proceed) {
                        console.log(chalk.gray("Cancelled."));
                        return;
                    }
                }

                await withSpinner("Deleting thread...", () => del(`/api/v1/threads/${id}`), {
                    successText: "Thread deleted"
                });

                printSuccess(`Thread ${id} has been deleted.`);
            } catch (error) {
                handleError(error, globalOpts.verbose);
            }
        });
}
