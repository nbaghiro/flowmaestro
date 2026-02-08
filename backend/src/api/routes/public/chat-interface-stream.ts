import { FastifyPluginAsync } from "fastify";
import { ThreadStreamingEvent } from "@flowmaestro/shared";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { ChatInterfaceSessionRepository } from "../../../storage/repositories/ChatInterfaceSessionRepository";

const chatInterfaceSessionRepo = new ChatInterfaceSessionRepository();
const agentExecutionRepo = new AgentExecutionRepository();

export const publicChatInterfaceStreamRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{
        Params: { slug: string; token: string };
    }>("/:slug/sessions/:token/stream", async (request, reply) => {
        const { slug, token } = request.params;

        // 1. Validate session
        const session = await chatInterfaceSessionRepo.findBySlugAndToken(slug, token);
        if (!session) {
            return reply.status(404).send({ error: "Session not found" });
        }

        // 2. Thread may not exist yet (created on first message)
        // If no thread yet, return 202 Accepted - client should retry after sending first message
        if (!session.threadId) {
            return reply.status(202).send({
                status: "pending",
                message: "No active thread yet. Send a message first, then connect to stream."
            });
        }

        const threadId = session.threadId;

        // 3. Set SSE headers
        const origin = request.headers.origin || "*";
        reply.raw.setHeader("Content-Type", "text/event-stream");
        reply.raw.setHeader("Cache-Control", "no-cache");
        reply.raw.setHeader("Connection", "keep-alive");
        reply.raw.setHeader("Access-Control-Allow-Origin", origin);
        reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
        reply.raw.flushHeaders();

        // 4. Send initial connection event
        reply.raw.write(`data: ${JSON.stringify({ type: "connection:established" })}\n\n`);

        // 4.5. Replay any messages that might have been missed due to race condition
        // This handles the case where the agent completes before SSE connects
        try {
            const messages = await agentExecutionRepo.getMessagesByThread(threadId);
            // Find the most recent user message and check if there's an assistant response after it
            let lastUserMessageIndex = -1;
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === "user") {
                    lastUserMessageIndex = i;
                    break;
                }
            }

            // If there are assistant messages after the last user message, replay them
            if (lastUserMessageIndex >= 0 && lastUserMessageIndex < messages.length - 1) {
                const missedMessages = messages.slice(lastUserMessageIndex + 1);
                for (const msg of missedMessages) {
                    if (msg.role === "assistant" && msg.content) {
                        const executionId = msg.execution_id || "";
                        const timestamp = Date.now();

                        // Send the full content as a token event
                        const tokenEvent: ThreadStreamingEvent = {
                            type: "agent:token",
                            token: msg.content,
                            timestamp,
                            executionId
                        };
                        reply.raw.write(`data: ${JSON.stringify(tokenEvent)}\n\n`);

                        // Send completion event
                        const completeEvent: ThreadStreamingEvent = {
                            type: "agent:execution:completed",
                            executionId,
                            timestamp,
                            threadId,
                            status: "completed",
                            finalMessage: msg.content,
                            iterations: 1
                        };
                        reply.raw.write(`data: ${JSON.stringify(completeEvent)}\n\n`);

                        request.log.info(
                            { threadId, messageId: msg.id },
                            "Replayed missed assistant message on SSE connect"
                        );
                    }
                }
            }
        } catch (replayError) {
            request.log.warn(
                { err: replayError, threadId },
                "Failed to replay missed messages (continuing with live stream)"
            );
        }

        // 5. Start keepalive heartbeat (15s interval to prevent proxy timeouts)
        const keepaliveInterval = setInterval(() => {
            if (!reply.raw.destroyed) {
                reply.raw.write(":keepalive\n\n");
            }
        }, 15000);

        // 6. Subscribe to Redis events for this thread
        const handleEvent = (event: ThreadStreamingEvent) => {
            // Check if connection is still open
            if (reply.raw.destroyed) {
                return;
            }

            try {
                const data = JSON.stringify(event);
                reply.raw.write(`data: ${data}\n\n`);
            } catch (error) {
                request.log.error({ err: error, threadId }, "Failed to write SSE event");
            }
        };

        try {
            await redisEventBus.subscribeToThread(threadId, handleEvent);
            request.log.info({ threadId }, "Client subscribed to thread stream");

            // 7. Keep connection open and handle cleanup on disconnect
            // Return a promise that resolves when the client disconnects
            return new Promise<void>((resolve) => {
                request.raw.on("close", () => {
                    request.log.info({ threadId }, "Client disconnected from thread stream");
                    clearInterval(keepaliveInterval);
                    redisEventBus
                        .unsubscribeFromThread(threadId, handleEvent)
                        .catch((err: unknown) => {
                            request.log.error(
                                { err, threadId },
                                "Failed to unsubscribe from Redis"
                            );
                        });
                    resolve();
                });
            });
        } catch (error) {
            request.log.error({ err: error }, "Failed to setup SSE subscription");
            // If headers sent, we can't send status code.
            // Just close stream.
            reply.raw.end();
        }
    });
};
