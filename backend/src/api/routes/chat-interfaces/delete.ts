import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("ChatInterfaceRoutes");

export async function deleteChatInterfaceRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const chatInterfaceRepo = new ChatInterfaceRepository();
            const { id } = request.params as { id: string };
            const userId = request.user!.id;

            try {
                const deleted = await chatInterfaceRepo.softDelete(id, userId);

                if (!deleted) {
                    return reply.status(404).send({
                        success: false,
                        error: "Chat interface not found"
                    });
                }

                logger.info({ chatInterfaceId: id, userId }, "Chat interface deleted");

                return reply.send({
                    success: true,
                    message: "Chat interface deleted successfully"
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error deleting chat interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
