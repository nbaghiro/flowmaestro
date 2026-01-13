import { FastifyInstance } from "fastify";
import type { MoveFolderInput } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";

const logger = createServiceLogger("FolderRoutes");

export async function moveFolderRoute(fastify: FastifyInstance) {
    fastify.post<{ Params: { id: string } }>("/:id/move", async (request, reply) => {
        const folderRepo = new FolderRepository();
        const workspaceId = request.workspace!.id;
        const { id } = request.params;
        const body = request.body as Partial<MoveFolderInput>;

        try {
            // Verify folder exists and belongs to workspace
            const folder = await folderRepo.findByIdAndWorkspaceId(id, workspaceId);
            if (!folder) {
                return reply.status(404).send({
                    success: false,
                    error: "Folder not found"
                });
            }

            // newParentId can be null (move to root) or a folder ID
            const newParentId = body.newParentId === undefined ? null : body.newParentId;

            // Move folder
            const movedFolder = await folderRepo.moveFolderInWorkspace(
                id,
                workspaceId,
                newParentId
            );

            if (!movedFolder) {
                return reply.status(404).send({
                    success: false,
                    error: "Folder not found"
                });
            }

            // Get item counts
            const itemCounts = await folderRepo.getItemCounts(id);

            logger.info({ folderId: id, workspaceId, newParentId }, "Folder moved");

            return reply.send({
                success: true,
                data: {
                    id: movedFolder.id,
                    userId: movedFolder.user_id,
                    name: movedFolder.name,
                    color: movedFolder.color,
                    position: movedFolder.position,
                    parentId: movedFolder.parent_id,
                    depth: movedFolder.depth,
                    path: movedFolder.path,
                    createdAt: movedFolder.created_at,
                    updatedAt: movedFolder.updated_at,
                    itemCounts
                }
            });
        } catch (error) {
            logger.error({ workspaceId, folderId: id, body, error }, "Error moving folder");

            // Return user-friendly error for known error cases
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isUserError =
                errorMessage.includes("descendant") ||
                errorMessage.includes("depth") ||
                errorMessage.includes("not found");

            return reply.status(isUserError ? 400 : 500).send({
                success: false,
                error: errorMessage
            });
        }
    });
}
