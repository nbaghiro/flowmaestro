import { FastifyInstance } from "fastify";
import type { ExtensionAgentChatResponse, PageContext } from "@flowmaestro/shared";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";
import { getTemporalClient } from "../../../temporal/client";
import { authMiddleware, workspaceContextMiddleware } from "../../middleware";
import type { ThreadMessage } from "../../../storage/models/AgentExecution";

interface RequestBody {
    agentId: string;
    threadId?: string;
    message: string;
    pageContext?: PageContext;
    includePageContext: boolean;
}

export async function agentChatRoute(fastify: FastifyInstance) {
    fastify.post<{ Body: RequestBody }>(
        "/agent-chat",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const { agentId, threadId, message, pageContext, includePageContext } = request.body;
            const workspaceId = request.workspace?.id;
            const userId = request.user?.id;

            if (!workspaceId || !userId) {
                return reply.status(400).send({
                    success: false,
                    error: "Authentication and workspace context required"
                });
            }

            if (!agentId) {
                return reply.status(400).send({
                    success: false,
                    error: "agentId is required"
                });
            }

            if (!message) {
                return reply.status(400).send({
                    success: false,
                    error: "message is required"
                });
            }

            const agentRepo = new AgentRepository();
            const threadRepo = new ThreadRepository();
            const executionRepo = new AgentExecutionRepository();

            // Get agent
            const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);

            if (!agent) {
                return reply.status(404).send({
                    success: false,
                    error: "Agent not found"
                });
            }

            // Get or create thread
            let currentThreadId = threadId;
            if (!currentThreadId) {
                const thread = await threadRepo.create({
                    user_id: userId,
                    workspace_id: workspaceId,
                    agent_id: agentId,
                    title: message.substring(0, 100),
                    metadata: {
                        source: "browser_extension",
                        url: pageContext?.url ?? null,
                        pageTitle: pageContext?.title ?? null
                    }
                });
                currentThreadId = thread.id;
            } else {
                // Verify thread exists and belongs to workspace
                const existingThread = await threadRepo.findByIdAndWorkspaceId(
                    currentThreadId,
                    workspaceId
                );
                if (!existingThread) {
                    return reply.status(404).send({
                        success: false,
                        error: "Thread not found"
                    });
                }
                if (existingThread.agent_id !== agentId) {
                    return reply.status(400).send({
                        success: false,
                        error: "Thread belongs to a different agent"
                    });
                }
            }

            // Build message content with page context
            let fullMessage = message;
            if (includePageContext && pageContext) {
                const contextParts: string[] = [];

                if (pageContext.title) {
                    contextParts.push(`Page Title: ${pageContext.title}`);
                }
                if (pageContext.url) {
                    contextParts.push(`Page URL: ${pageContext.url}`);
                }
                if (pageContext.text) {
                    // Truncate text to reasonable size
                    const truncatedText =
                        pageContext.text.length > 10000
                            ? pageContext.text.substring(0, 10000) + "..."
                            : pageContext.text;
                    contextParts.push(`Page Content:\n${truncatedText}`);
                }

                if (contextParts.length > 0) {
                    fullMessage = `[Context from current web page]\n${contextParts.join("\n\n")}\n\n[User Message]\n${message}`;
                }
            }

            // Load existing messages from thread to preserve full thread history
            let threadMessages: ThreadMessage[] = [];
            if (threadId) {
                const messages = await executionRepo.getMessagesByThread(currentThreadId);
                threadMessages = messages.map((msg) => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    tool_calls: msg.tool_calls || undefined,
                    tool_name: msg.tool_name || undefined,
                    tool_call_id: msg.tool_call_id || undefined,
                    timestamp: msg.created_at
                }));
            }

            // Create execution record
            const execution = await executionRepo.create({
                agent_id: agentId,
                user_id: userId,
                thread_id: currentThreadId,
                status: "running",
                thread_history: threadMessages,
                iterations: 0,
                metadata: {
                    source: "browser_extension",
                    pageUrl: pageContext?.url ?? null,
                    pageTitle: pageContext?.title ?? null
                }
            });

            try {
                // Start Temporal workflow
                const temporalClient = await getTemporalClient();

                await temporalClient.workflow.start("agentOrchestratorWorkflow", {
                    taskQueue: "flowmaestro-orchestrator",
                    workflowId: execution.id,
                    args: [
                        {
                            executionId: execution.id,
                            agentId,
                            userId,
                            threadId: currentThreadId,
                            initialMessage: fullMessage,
                            workspaceId
                        }
                    ]
                });

                const response: ExtensionAgentChatResponse = {
                    executionId: execution.id,
                    threadId: currentThreadId,
                    status: "started"
                };

                return reply.send({
                    success: true,
                    data: response
                });
            } catch (error) {
                // Update execution status to failed
                await executionRepo.update(execution.id, {
                    status: "failed",
                    error: error instanceof Error ? error.message : "Failed to start agent"
                });

                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to start agent"
                });
            }
        }
    );
}
