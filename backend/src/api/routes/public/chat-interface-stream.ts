import { FastifyPluginAsync } from "fastify";
import { ThreadStreamingEvent } from "@flowmaestro/shared";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { ChatInterfaceSessionRepository } from "../../../storage/repositories/ChatInterfaceSessionRepository";

const chatInterfaceSessionRepo = new ChatInterfaceSessionRepository();

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
