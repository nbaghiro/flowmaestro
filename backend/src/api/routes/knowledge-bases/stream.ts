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
import { createServiceLogger } from "../../../core/logging";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { createSSEHandler } from "../../../services/sse";
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

            // Create SSE handler with CORS headers
            // Use request origin directly - security is handled by JWT auth
            const origin = request.headers.origin || "*";

            const sse = createSSEHandler(request, reply, {
                keepAliveInterval: 15000,
                headers: {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true"
                }
            });

            // Track event handlers for cleanup
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
            sse.onDisconnect(() => {
                logger.info({ knowledgeBaseId }, "Client disconnected from KB stream");
                unsubscribeAll();
            });

            // Subscribe to document events - filter by knowledgeBaseId
            subscribe("document:processing", (data) => {
                if (data.knowledgeBaseId === knowledgeBaseId) {
                    sse.sendEvent("document:processing", {
                        documentId: data.documentId,
                        documentName: data.documentName,
                        timestamp: data.timestamp
                    });
                }
            });

            subscribe("document:completed", (data) => {
                if (data.knowledgeBaseId === knowledgeBaseId) {
                    sse.sendEvent("document:completed", {
                        documentId: data.documentId,
                        chunkCount: data.chunkCount,
                        timestamp: data.timestamp
                    });
                }
            });

            subscribe("document:failed", (data) => {
                if (data.knowledgeBaseId === knowledgeBaseId) {
                    sse.sendEvent("document:failed", {
                        documentId: data.documentId,
                        error: data.error,
                        timestamp: data.timestamp
                    });
                }
            });

            // Send initial connected event
            sse.sendEvent("connected", {
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
