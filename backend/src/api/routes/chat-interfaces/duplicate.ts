import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("ChatInterfaceRoutes");

export async function duplicateChatInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/duplicate",
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

                const chatInterface = await chatInterfaceRepo.duplicate(id, userId);

                if (!chatInterface) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to duplicate chat interface"
                    });
                }

                logger.info(
                    { originalId: id, newId: chatInterface.id, userId },
                    "Chat interface duplicated"
                );

                return reply.status(201).send({
                    success: true,
                    data: chatInterface
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error duplicating chat interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
