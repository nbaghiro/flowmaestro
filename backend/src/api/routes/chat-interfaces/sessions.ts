import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";
import { ChatInterfaceSessionRepository } from "../../../storage/repositories/ChatInterfaceSessionRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("ChatInterfaceRoutes");

export async function listChatInterfaceSessionsRoute(fastify: FastifyInstance) {
    // List sessions for a chat interface
    fastify.get(
        "/:id/sessions",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const chatInterfaceRepo = new ChatInterfaceRepository();
            const sessionRepo = new ChatInterfaceSessionRepository();
            const { id } = request.params as { id: string };
            const userId = request.user!.id;
            const query = request.query as {
                limit?: string;
                offset?: string;
                status?: "active" | "ended" | "expired";
            };

            try {
                // Check if chat interface exists and belongs to user
                const chatInterface = await chatInterfaceRepo.findById(id, userId);
                if (!chatInterface) {
                    return reply.status(404).send({
                        success: false,
                        error: "Chat interface not found"
                    });
                }

                const limit = query.limit ? parseInt(query.limit) : 50;
                const offset = query.offset ? parseInt(query.offset) : 0;

                const { sessions, total } = await sessionRepo.findByInterfaceId(id, {
                    limit,
                    offset,
                    status: query.status
                });

                const page = Math.floor(offset / limit) + 1;
                const hasMore = offset + sessions.length < total;

                return reply.send({
                    success: true,
                    data: {
                        items: sessions,
                        total,
                        page,
                        pageSize: limit,
                        hasMore
                    }
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error listing chat interface sessions");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );

    // Get session details with stats
    fastify.get(
        "/:id/sessions/:sessionId",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const chatInterfaceRepo = new ChatInterfaceRepository();
            const sessionRepo = new ChatInterfaceSessionRepository();
            const { id, sessionId } = request.params as { id: string; sessionId: string };
            const userId = request.user!.id;

            try {
                // Check if chat interface exists and belongs to user
                const chatInterface = await chatInterfaceRepo.findById(id, userId);
                if (!chatInterface) {
                    return reply.status(404).send({
                        success: false,
                        error: "Chat interface not found"
                    });
                }

                const session = await sessionRepo.findById(sessionId);
                if (!session || session.interfaceId !== id) {
                    return reply.status(404).send({
                        success: false,
                        error: "Session not found"
                    });
                }

                return reply.send({
                    success: true,
                    data: session
                });
            } catch (error) {
                logger.error(
                    { id, sessionId, userId, error },
                    "Error getting chat interface session"
                );
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );

    // Get session statistics
    fastify.get(
        "/:id/stats",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const chatInterfaceRepo = new ChatInterfaceRepository();
            const sessionRepo = new ChatInterfaceSessionRepository();
            const { id } = request.params as { id: string };
            const userId = request.user!.id;
            const query = request.query as { hours?: string };

            try {
                // Check if chat interface exists and belongs to user
                const chatInterface = await chatInterfaceRepo.findById(id, userId);
                if (!chatInterface) {
                    return reply.status(404).send({
                        success: false,
                        error: "Chat interface not found"
                    });
                }

                const hours = query.hours ? parseInt(query.hours) : 24;
                const stats = await sessionRepo.getSessionStats(id, hours);

                return reply.send({
                    success: true,
                    data: {
                        ...stats,
                        period: `${hours}h`,
                        chatInterface: {
                            id: chatInterface.id,
                            name: chatInterface.name,
                            sessionCount: chatInterface.sessionCount,
                            messageCount: chatInterface.messageCount
                        }
                    }
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error getting chat interface stats");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
