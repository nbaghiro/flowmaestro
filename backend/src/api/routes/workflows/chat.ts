import { randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import { WorkflowChatService } from "../../../services/WorkflowChatService";
import { authMiddleware, validateRequest } from "../../middleware";
import { chatRequestSchema, type ChatRequest } from "../../schemas/chat-schemas";
import { emitChatEvent } from "./chat-stream";

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
                console.log(
                    "[Chat Route] Received chat request from user:",
                    request.user!.id,
                    "- Action:",
                    body.action
                );

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
                                    console.log(
                                        `[Chat] First token received for execution ${executionId}`
                                    );
                                }
                                emitChatEvent(executionId, "token", token);
                            },
                            onComplete: (response) => {
                                const duration = firstTokenTime ? Date.now() - firstTokenTime : 0;
                                console.log(
                                    `[Chat] Completed execution ${executionId}: ${tokenCount} tokens in ${duration}ms`
                                );
                                emitChatEvent(executionId, "complete", response);
                            },
                            onError: (error: Error) => {
                                emitChatEvent(executionId, "error", error.message);
                            }
                        }
                    )
                    .catch((error) => {
                        console.error("[Chat Route] Background processing error:", error);
                        const message =
                            error instanceof Error ? error.message : "Failed to process chat";
                        emitChatEvent(executionId, "error", message);
                    });
            } catch (error) {
                console.error("[Chat Route] Error initiating chat:", error);

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
