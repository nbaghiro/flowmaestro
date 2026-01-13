import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";

const logger = createServiceLogger("FolderRoutes");

export async function getFolderChildrenRoute(fastify: FastifyInstance) {
    fastify.get<{ Params: { id: string } }>("/:id/children", async (request, reply) => {
        const folderRepo = new FolderRepository();
        const workspaceId = request.workspace!.id;
        const { id } = request.params;

        try {
            // Verify folder exists and belongs to workspace
            const folder = await folderRepo.findByIdAndWorkspaceId(id, workspaceId);
            if (!folder) {
                return reply.status(404).send({
                    success: false,
                    error: "Folder not found"
                });
            }

            const children = await folderRepo.getChildrenInWorkspace(id, workspaceId);

            return reply.send({
                success: true,
                data: children
            });
        } catch (error) {
            logger.error({ workspaceId, folderId: id, error }, "Error getting folder children");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
