/**
 * Knowledge Base Stream Route
 *
 * SSE endpoint for real-time document processing updates.
 * GET /api/knowledge-bases/:id/stream
 *
 * Subscribes to Redis events for the knowledge base and forwards them to the client.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { config } from "../../../core/config";
import { createServiceLogger } from "../../../core/logging";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { KnowledgeBaseRepository } from "../../../storage/repositories";
import { authMiddleware, validateParams, NotFoundError, UnauthorizedError } from "../../middleware";

const logger = createServiceLogger("KBStreamRoute");

const kbIdParamSchema = z.object({
    id: z.string().uuid()
});

interface StreamKBParams {
    id: string;
}

export async function streamKnowledgeBaseRoute(fastify: FastifyInstance): Promise<void> {
    fastify.get<{
        Params: StreamKBParams;
    }>(
        "/:id/stream",
        {
            preHandler: [authMiddleware, validateParams(kbIdParamSchema)]
        },
        async (
            request: FastifyRequest<{
                Params: StreamKBParams;
            }>,
            reply: FastifyReply
        ) => {
            const knowledgeBaseRepository = new KnowledgeBaseRepository();
            const { id: knowledgeBaseId } = request.params;
            const userId = request.user!.id;

            // Verify knowledge base exists and user has access
            const knowledgeBase = await knowledgeBaseRepository.findById(knowledgeBaseId);

            if (!knowledgeBase) {
                throw new NotFoundError("Knowledge base not found");
            }

            if (knowledgeBase.user_id !== userId) {
                throw new UnauthorizedError("Not authorized to stream this knowledge base");
            }

            logger.info({ knowledgeBaseId, userId }, "SSE connection established for KB");

            // Set up SSE headers
            const origin = request.headers.origin;
            const corsOrigin =
                origin && config.cors.origin.includes(origin) ? origin : config.cors.origin[0];

            reply.raw.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no", // Disable nginx buffering
                "Access-Control-Allow-Origin": corsOrigin,
                "Access-Control-Allow-Credentials": "true"
            });

            // Track if client disconnected
            let clientDisconnected = false;

            // Keep connection alive
            const keepAliveInterval = setInterval(() => {
                if (!clientDisconnected) {
                    try {
                        reply.raw.write(": keepalive\n\n");
                    } catch {
                        clientDisconnected = true;
                        clearInterval(keepAliveInterval);
                    }
                }
            }, 15000);

            // Helper function to send SSE event
            const sendEvent = (event: string, data: Record<string, unknown>): void => {
                if (clientDisconnected) return;

                const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                try {
                    reply.raw.write(message);
                } catch (error) {
                    logger.error({ event, error }, "Error writing SSE event");
                    clientDisconnected = true;
                }
            };

            // Subscribe to KB document events for this knowledge base
            const eventHandlers: Array<{
                channel: string;
                handler: (data: Record<string, unknown>) => void;
            }> = [];

            const subscribe = (
                eventType: string,
                handler: (data: Record<string, unknown>) => void
            ): void => {
                const channel = `kb:events:${eventType}`;
                logger.debug({ channel, knowledgeBaseId }, "Subscribing to channel");
                eventHandlers.push({ channel, handler });
                redisEventBus.subscribe(channel, (event: unknown) => {
                    const eventData = event as Record<string, unknown>;
                    handler(eventData);
                });
            };

            const unsubscribeAll = (): void => {
                logger.debug({ knowledgeBaseId }, "Unsubscribing from all channels");
                eventHandlers.forEach(({ channel, handler }) => {
                    redisEventBus.unsubscribe(channel, handler);
                });
            };

            // Handle client disconnect
            request.raw.on("close", () => {
                logger.info({ knowledgeBaseId }, "Client disconnected from KB stream");
                clientDisconnected = true;
                clearInterval(keepAliveInterval);
                unsubscribeAll();
            });

            request.raw.on("error", (error) => {
                logger.error({ knowledgeBaseId, error }, "Request error in KB stream");
                clientDisconnected = true;
                clearInterval(keepAliveInterval);
                unsubscribeAll();
            });

            // Subscribe to document events - filter by knowledgeBaseId
            subscribe("document:processing", (data) => {
                if (data.knowledgeBaseId === knowledgeBaseId) {
                    sendEvent("document:processing", {
                        documentId: data.documentId,
                        documentName: data.documentName,
                        timestamp: data.timestamp
                    });
                }
            });

            subscribe("document:completed", (data) => {
                if (data.knowledgeBaseId === knowledgeBaseId) {
                    sendEvent("document:completed", {
                        documentId: data.documentId,
                        chunkCount: data.chunkCount,
                        timestamp: data.timestamp
                    });
                }
            });

            subscribe("document:failed", (data) => {
                if (data.knowledgeBaseId === knowledgeBaseId) {
                    sendEvent("document:failed", {
                        documentId: data.documentId,
                        error: data.error,
                        timestamp: data.timestamp
                    });
                }
            });

            // Send initial connected event
            sendEvent("connected", {
                knowledgeBaseId,
                message: "Connected to knowledge base stream"
            });

            logger.info({ knowledgeBaseId }, "KB stream handler initialized, waiting for events");

            // Return a promise that never resolves to keep connection open
            // The connection will be closed when:
            // 1. Client disconnects
            // 2. Server shuts down
            return new Promise(() => {});
        }
    );
}
