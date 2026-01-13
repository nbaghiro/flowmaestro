import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";

const logger = createServiceLogger("ChatInterfaceRoutes");

export async function unpublishChatInterfaceRoute(fastify: FastifyInstance) {
    fastify.post("/:id/unpublish", async (request, reply) => {
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

            // Already draft
            if (existing.status === "draft") {
                return reply.send({
                    success: true,
                    data: existing,
                    message: "Chat interface is already a draft"
                });
            }

            const chatInterface = await chatInterfaceRepo.unpublishByWorkspaceId(id, workspaceId);

            if (!chatInterface) {
                return reply.status(500).send({
                    success: false,
                    error: "Failed to unpublish chat interface"
                });
            }

            logger.info({ chatInterfaceId: id, workspaceId }, "Chat interface unpublished");

            return reply.send({
                success: true,
                data: chatInterface
            });
        } catch (error) {
            logger.error({ id, workspaceId, error }, "Error unpublishing chat interface");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
