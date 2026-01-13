import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";

const logger = createServiceLogger("ChatInterfaceRoutes");

export async function duplicateChatInterfaceRoute(fastify: FastifyInstance) {
    fastify.post("/:id/duplicate", async (request, reply) => {
        const chatInterfaceRepo = new ChatInterfaceRepository();
        const { id } = request.params as { id: string };
        const workspaceId = request.workspace!.id;

        try {
            // Check if chat interface exists in workspace
            const existing = await chatInterfaceRepo.findByIdAndWorkspaceId(id, workspaceId);
            if (!existing) {
                return reply.status(404).send({
                    success: false,
                    error: "Chat interface not found"
                });
            }

            const chatInterface = await chatInterfaceRepo.duplicateByWorkspaceId(id, workspaceId);

            if (!chatInterface) {
                return reply.status(500).send({
                    success: false,
                    error: "Failed to duplicate chat interface"
                });
            }

            logger.info(
                { originalId: id, newId: chatInterface.id, workspaceId },
                "Chat interface duplicated"
            );

            return reply.status(201).send({
                success: true,
                data: chatInterface
            });
        } catch (error) {
            logger.error({ id, workspaceId, error }, "Error duplicating chat interface");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
