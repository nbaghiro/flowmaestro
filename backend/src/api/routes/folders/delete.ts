import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";

const logger = createServiceLogger("FolderRoutes");

export async function deleteFolderRoute(fastify: FastifyInstance) {
    fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
        const folderRepo = new FolderRepository();
        const workspaceId = request.workspace!.id;
        const { id } = request.params;

        try {
            // Check folder exists and belongs to workspace
            const folder = await folderRepo.findByIdAndWorkspaceId(id, workspaceId);
            if (!folder) {
                return reply.status(404).send({
                    success: false,
                    error: "Folder not found"
                });
            }

            // Delete folder (items will be moved to root)
            const deleted = await folderRepo.deleteInWorkspace(id, workspaceId);

            if (!deleted) {
                return reply.status(500).send({
                    success: false,
                    error: "Failed to delete folder"
                });
            }

            logger.info({ folderId: id, workspaceId }, "Folder deleted");

            return reply.send({
                success: true,
                message: "Folder deleted. Items have been moved to root level."
            });
        } catch (error) {
            logger.error({ workspaceId, folderId: id, error }, "Error deleting folder");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
