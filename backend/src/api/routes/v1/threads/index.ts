import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { AgentExecutionRepository } from "../../../../storage/repositories/AgentExecutionRepository";
import { AgentRepository } from "../../../../storage/repositories/AgentRepository";
import { ThreadRepository } from "../../../../storage/repositories/ThreadRepository";
import { getTemporalClient } from "../../../../temporal/client";
import { requireScopes } from "../../../middleware/scope-checker";
import { sendSuccess, sendNotFound, sendError } from "../response-helpers";
import type { ThreadMessage } from "../../../../storage/models/AgentExecution";

const logger = createServiceLogger("PublicApiThreads");

// Constants for polling
const DEFAULT_POLL_INTERVAL_MS = 500;
const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes

/**
 * Public API v1 - Threads routes.
 */
export async function threadsV1Routes(fastify: FastifyInstance): Promise<void> {
    // GET /api/v1/threads/:id - Get thread by ID
    fastify.get<{ Params: { id: string } }>(
        "/:id",
        {
            preHandler: [requireScopes("threads:read")]
        },
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const threadId = request.params.id;

            const threadRepo = new ThreadRepository();
            const thread = await threadRepo.findByIdAndWorkspaceId(threadId, workspaceId);

            if (!thread) {
                return sendNotFound(reply, "Thread", threadId);
            }

            return sendSuccess(reply, {
                id: thread.id,
                agent_id: thread.agent_id,
                title: thread.title,
                status: thread.status,
                created_at: thread.created_at.toISOString(),
                updated_at: thread.updated_at.toISOString(),
                last_message_at: thread.last_message_at?.toISOString() || null
            });
        }
    );

    // GET /api/v1/threads/:id/messages - Get thread messages
    fastify.get<{ Params: { id: string } }>(
        "/:id/messages",
        {
            preHandler: [requireScopes("threads:read")]
        },
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const threadId = request.params.id;

            const threadRepo = new ThreadRepository();
            const thread = await threadRepo.findByIdAndWorkspaceId(threadId, workspaceId);

            if (!thread) {
                return sendNotFound(reply, "Thread", threadId);
            }

            // Get messages from the agent execution repository
            const executionRepo = new AgentExecutionRepository();
            const messages = await executionRepo.getMessagesByThread(threadId);

            const publicMessages = messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                tool_calls: m.tool_calls,
                created_at: m.created_at.toISOString()
            }));

            return sendSuccess(reply, { messages: publicMessages });
        }
    );

    // DELETE /api/v1/threads/:id - Delete thread
    fastify.delete<{ Params: { id: string } }>(
        "/:id",
        {
            preHandler: [requireScopes("threads:write")]
        },
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const userId = request.apiKeyUserId!;
            const workspaceId = request.apiKeyWorkspaceId!;
            const threadId = request.params.id;

            const threadRepo = new ThreadRepository();
            const thread = await threadRepo.findByIdAndWorkspaceId(threadId, workspaceId);

            if (!thread) {
                return sendNotFound(reply, "Thread", threadId);
            }

            const deleted = await threadRepo.delete(threadId);

            if (!deleted) {
                return sendError(reply, 500, "internal_error", "Failed to delete thread");
            }

            logger.info({ threadId, userId }, "Thread deleted via public API");

            return sendSuccess(reply, { id: threadId, deleted: true });
        }
    );

    // POST /api/v1/threads/:id/messages - Send message to thread
    fastify.post<{
        Params: { id: string };
        Body: { content: string; stream?: boolean; timeout?: number };
    }>(
        "/:id/messages",
        {
            preHandler: [requireScopes("agents:execute", "threads:write")]
        },
        async (
            request: FastifyRequest<{
                Params: { id: string };
                Body: { content: string; stream?: boolean; timeout?: number };
            }>,
            reply: FastifyReply
        ) => {
            const userId = request.apiKeyUserId!;
            const workspaceId = request.apiKeyWorkspaceId!;
            const threadId = request.params.id;
            const { content, stream = false, timeout = DEFAULT_TIMEOUT_MS } = request.body || {};

            if (!content || typeof content !== "string") {
                return sendError(reply, 400, "validation_error", "Message content is required");
            }

            const threadRepo = new ThreadRepository();
            const agentRepo = new AgentRepository();
            const executionRepo = new AgentExecutionRepository();

            // Get thread and verify workspace access
            const thread = await threadRepo.findByIdAndWorkspaceId(threadId, workspaceId);
            if (!thread) {
                return sendNotFound(reply, "Thread", threadId);
            }

            // Get the agent associated with this thread
            const agent = await agentRepo.findById(thread.agent_id);
            if (!agent) {
                return sendError(reply, 500, "internal_error", "Agent not found for thread");
            }

            // For streaming, redirect to SSE endpoint
            if (stream) {
                return sendError(
                    reply,
                    501,
                    "not_implemented",
                    "Streaming messages not yet implemented in public API. Use stream=false."
                );
            }

            try {
                // Load existing messages from thread to preserve full history
                const existingMessages = await executionRepo.getMessagesByThread(threadId);
                const threadMessages: ThreadMessage[] = existingMessages.map((msg) => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    tool_calls: msg.tool_calls || undefined,
                    tool_name: msg.tool_name || undefined,
                    tool_call_id: msg.tool_call_id || undefined,
                    timestamp: msg.created_at
                }));

                // Create execution record linked to thread
                const execution = await executionRepo.create({
                    agent_id: agent.id,
                    user_id: userId,
                    thread_id: threadId,
                    status: "running",
                    thread_history: threadMessages,
                    iterations: 0
                });

                // Start Temporal workflow
                const client = await getTemporalClient();
                await client.workflow.start("agentOrchestratorWorkflow", {
                    taskQueue: "flowmaestro-orchestrator",
                    workflowId: execution.id,
                    args: [
                        {
                            executionId: execution.id,
                            agentId: agent.id,
                            userId,
                            threadId,
                            initialMessage: content
                        }
                    ]
                });

                logger.info(
                    { executionId: execution.id, threadId, agentId: agent.id, userId },
                    "Started agent execution via public API"
                );

                // Poll for completion
                const startTime = Date.now();
                const effectiveTimeout = Math.min(timeout, DEFAULT_TIMEOUT_MS);

                while (Date.now() - startTime < effectiveTimeout) {
                    const currentExecution = await executionRepo.findById(execution.id);

                    if (!currentExecution) {
                        return sendError(reply, 500, "internal_error", "Execution not found");
                    }

                    if (currentExecution.status === "completed") {
                        // Get the latest messages from this execution
                        const messages = await executionRepo.getMessages(execution.id);

                        // Find the last assistant message
                        const assistantMessages = messages.filter((m) => m.role === "assistant");
                        const lastAssistantMessage =
                            assistantMessages[assistantMessages.length - 1];

                        // Update thread's last_message_at
                        await threadRepo.update(threadId, {
                            last_message_at: new Date()
                        });

                        return sendSuccess(reply, {
                            execution_id: execution.id,
                            thread_id: threadId,
                            status: "completed",
                            message: lastAssistantMessage
                                ? {
                                      role: lastAssistantMessage.role,
                                      content: lastAssistantMessage.content,
                                      tool_calls: lastAssistantMessage.tool_calls,
                                      created_at: lastAssistantMessage.created_at.toISOString()
                                  }
                                : null,
                            iterations: currentExecution.iterations,
                            tool_calls_count: currentExecution.tool_calls_count
                        });
                    }

                    if (currentExecution.status === "failed") {
                        return sendError(
                            reply,
                            500,
                            "execution_failed",
                            currentExecution.error || "Agent execution failed"
                        );
                    }

                    // Wait before next poll
                    await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_INTERVAL_MS));
                }

                // Timeout - return the execution ID so the user can poll manually
                return sendError(
                    reply,
                    408,
                    "timeout",
                    `Execution did not complete within ${effectiveTimeout}ms. ` +
                        `Use GET /api/v1/threads/${threadId}/messages to check for new messages.`
                );
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : "Failed to send message";
                logger.error({ error, threadId, userId }, "Failed to send message to thread");
                return sendError(reply, 500, "internal_error", errorMsg);
            }
        }
    );
}
