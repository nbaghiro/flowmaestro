import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FolderRoutes");

export async function deleteFolderRoute(fastify: FastifyInstance) {
    fastify.delete<{ Params: { id: string } }>(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const folderRepo = new FolderRepository();
            const userId = request.user!.id;
            const { id } = request.params;

            try {
                // Check folder exists and belongs to user
                const folder = await folderRepo.findByIdAndUserId(id, userId);
                if (!folder) {
                    return reply.status(404).send({
                        success: false,
                        error: "Folder not found"
                    });
                }

                // Delete folder (items will be moved to root)
                const deleted = await folderRepo.delete(id, userId);

                if (!deleted) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to delete folder"
                    });
                }

                logger.info({ folderId: id, userId }, "Folder deleted");

                return reply.send({
                    success: true,
                    message: "Folder deleted. Items have been moved to root level."
                });
            } catch (error) {
                logger.error({ userId, folderId: id, error }, "Error deleting folder");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
