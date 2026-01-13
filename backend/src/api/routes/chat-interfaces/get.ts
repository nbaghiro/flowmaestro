import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";

const logger = createServiceLogger("ChatInterfaceRoutes");

export async function getChatInterfaceRoute(fastify: FastifyInstance) {
    fastify.get("/:id", async (request, reply) => {
        const chatInterfaceRepo = new ChatInterfaceRepository();
        const { id } = request.params as { id: string };
        const workspaceId = request.workspace!.id;

        try {
            const chatInterface = await chatInterfaceRepo.findByIdAndWorkspaceId(id, workspaceId);

            if (!chatInterface) {
                return reply.status(404).send({
                    success: false,
                    error: "Chat interface not found"
                });
            }

            return reply.send({
                success: true,
                data: chatInterface
            });
        } catch (error) {
            logger.error({ id, workspaceId, error }, "Error getting chat interface");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
