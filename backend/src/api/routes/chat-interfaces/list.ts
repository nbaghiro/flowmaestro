import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("ChatInterfaceRoutes");

export async function listChatInterfacesRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const chatInterfaceRepo = new ChatInterfaceRepository();
            const userId = request.user!.id;
            const query = request.query as {
                limit?: string;
                offset?: string;
                agentId?: string;
            };

            try {
                // If filtering by agent, use specific method
                if (query.agentId) {
                    const chatInterfaces = await chatInterfaceRepo.findByAgentId(
                        query.agentId,
                        userId
                    );
                    return reply.send({
                        success: true,
                        data: {
                            items: chatInterfaces,
                            total: chatInterfaces.length,
                            page: 1,
                            pageSize: chatInterfaces.length,
                            hasMore: false
                        }
                    });
                }

                // Standard pagination
                const limit = query.limit ? parseInt(query.limit) : 50;
                const offset = query.offset ? parseInt(query.offset) : 0;

                const { chatInterfaces, total } = await chatInterfaceRepo.findByUserId(userId, {
                    limit,
                    offset
                });

                const page = Math.floor(offset / limit) + 1;
                const hasMore = offset + chatInterfaces.length < total;

                return reply.send({
                    success: true,
                    data: {
                        items: chatInterfaces,
                        total,
                        page,
                        pageSize: limit,
                        hasMore
                    }
                });
            } catch (error) {
                logger.error({ userId, error }, "Error listing chat interfaces");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
