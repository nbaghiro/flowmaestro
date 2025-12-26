import { randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { WorkflowChatService } from "../../../services/WorkflowChatService";
import { authMiddleware, validateRequest } from "../../middleware";
import { chatRequestSchema, type ChatRequest } from "../../schemas/chat-schemas";
import { emitChatEvent } from "./chat-stream";

const logger = createServiceLogger("ChatRoute");

const chatService = new WorkflowChatService();

export async function chatRoute(fastify: FastifyInstance) {
    fastify.post(
        "/chat",
        {
            preHandler: [authMiddleware, validateRequest(chatRequestSchema)]
        },
        async (request, reply) => {
            const body = request.body as ChatRequest;

            try {
                logger.info({
                    userId: request.user!.id,
                    action: body.action
                }, "Received chat request");

                // Generate execution ID
                const executionId = randomUUID();

                // Return execution ID immediately
                reply.status(200).send({
                    success: true,
                    data: { executionId }
                });

                // Process chat in background with streaming callbacks
                let tokenCount = 0;
                let firstTokenTime: number | null = null;

                chatService
                    .processChat(
                        body.action,
                        body.message,
                        body.context,
                        body.conversationHistory || [],
                        body.connectionId,
                        body.model,
                        {
                            onToken: (token: string) => {
                                tokenCount++;
                                if (tokenCount === 1) {
                                    firstTokenTime = Date.now();
                                    logger.info({ executionId }, "First token received");
                                }
                                emitChatEvent(executionId, "token", token);
                            },
                            onComplete: (response) => {
                                const duration = firstTokenTime ? Date.now() - firstTokenTime : 0;
                                logger.info({
                                    executionId,
                                    tokenCount,
                                    durationMs: duration
                                }, "Completed execution");
                                emitChatEvent(executionId, "complete", response);
                            },
                            onError: (error: Error) => {
                                emitChatEvent(executionId, "error", error.message);
                            }
                        }
                    )
                    .catch((error) => {
                        logger.error({ executionId, error }, "Background processing error");
                        const message =
                            error instanceof Error ? error.message : "Failed to process chat";
                        emitChatEvent(executionId, "error", message);
                    });
            } catch (error) {
                logger.error({ error }, "Error initiating chat");

                const message = error instanceof Error ? error.message : "Failed to initiate chat";

                return reply.status(500).send({
                    success: false,
                    error: {
                        message,
                        code: "CHAT_INITIATION_FAILED"
                    }
                });
            }
        }
    );
}
