import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";

const logger = createServiceLogger("FolderRoutes");

export async function getFolderRoute(fastify: FastifyInstance) {
    fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
        const folderRepo = new FolderRepository();
        const workspaceId = request.workspace!.id;
        const { id } = request.params;

        try {
            const folder = await folderRepo.findByIdAndWorkspaceId(id, workspaceId);

            if (!folder) {
                return reply.status(404).send({
                    success: false,
                    error: "Folder not found"
                });
            }

            // Get item counts
            const itemCounts = await folderRepo.getItemCounts(id);

            return reply.send({
                success: true,
                data: {
                    id: folder.id,
                    userId: folder.user_id,
                    name: folder.name,
                    color: folder.color,
                    position: folder.position,
                    parentId: folder.parent_id,
                    depth: folder.depth,
                    path: folder.path,
                    createdAt: folder.created_at,
                    updatedAt: folder.updated_at,
                    itemCounts
                }
            });
        } catch (error) {
            logger.error({ workspaceId, folderId: id, error }, "Error getting folder");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
