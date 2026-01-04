import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("ChatInterfaceRoutes");

export async function publishChatInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/publish",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const chatInterfaceRepo = new ChatInterfaceRepository();
            const { id } = request.params as { id: string };
            const userId = request.user!.id;

            try {
                // Check if chat interface exists
                const existing = await chatInterfaceRepo.findById(id, userId);
                if (!existing) {
                    return reply.status(404).send({
                        success: false,
                        error: "Chat interface not found"
                    });
                }

                // Already published
                if (existing.status === "published") {
                    return reply.send({
                        success: true,
                        data: existing,
                        message: "Chat interface is already published"
                    });
                }

                const chatInterface = await chatInterfaceRepo.publish(id, userId);

                if (!chatInterface) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to publish chat interface"
                    });
                }

                logger.info({ chatInterfaceId: id, userId }, "Chat interface published");

                return reply.send({
                    success: true,
                    data: chatInterface
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error publishing chat interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
