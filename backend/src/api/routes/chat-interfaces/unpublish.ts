import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("ChatInterfaceRoutes");

export async function unpublishChatInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/unpublish",
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

                // Already draft
                if (existing.status === "draft") {
                    return reply.send({
                        success: true,
                        data: existing,
                        message: "Chat interface is already a draft"
                    });
                }

                const chatInterface = await chatInterfaceRepo.unpublish(id, userId);

                if (!chatInterface) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to unpublish chat interface"
                    });
                }

                logger.info({ chatInterfaceId: id, userId }, "Chat interface unpublished");

                return reply.send({
                    success: true,
                    data: chatInterface
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error unpublishing chat interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
