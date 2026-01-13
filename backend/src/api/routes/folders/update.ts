import { FastifyInstance } from "fastify";
import type { UpdateFolderInput } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";

const logger = createServiceLogger("FolderRoutes");

const MAX_NAME_LENGTH = 100;

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
};

export async function updateFolderRoute(fastify: FastifyInstance) {
    fastify.patch<{ Params: { id: string } }>("/:id", async (request, reply) => {
        const folderRepo = new FolderRepository();
        const workspaceId = request.workspace!.id;
        const { id } = request.params;
        const body = request.body as UpdateFolderInput;

        try {
            // Check folder exists and belongs to workspace
            const existingFolder = await folderRepo.findByIdAndWorkspaceId(id, workspaceId);
            if (!existingFolder) {
                return reply.status(404).send({
                    success: false,
                    error: "Folder not found"
                });
            }

            // Determine target parent (use existing if not changing)
            const targetParentId =
                body.parentId !== undefined ? body.parentId || null : existingFolder.parent_id;

            // Validate name if provided
            if (body.name !== undefined) {
                if (body.name.trim().length === 0) {
                    return reply.status(400).send({
                        success: false,
                        error: "Folder name cannot be empty"
                    });
                }

                if (body.name.length > MAX_NAME_LENGTH) {
                    return reply.status(400).send({
                        success: false,
                        error: `Folder name must be ${MAX_NAME_LENGTH} characters or less`
                    });
                }

                // Check name availability if name or parent changed
                const nameChanged =
                    body.name.trim().toLowerCase() !== existingFolder.name.toLowerCase();
                const parentChanged = targetParentId !== existingFolder.parent_id;

                if (nameChanged || parentChanged) {
                    const isAvailable = await folderRepo.isNameAvailableInWorkspace(
                        body.name.trim(),
                        workspaceId,
                        targetParentId,
                        id
                    );
                    if (!isAvailable) {
                        const parentContext = targetParentId
                            ? " in this folder"
                            : " at the root level";
                        return reply.status(400).send({
                            success: false,
                            error: `A folder named '${body.name}' already exists${parentContext}`
                        });
                    }
                }
            }

            // Validate color if provided (must be valid hex format)
            if (body.color && !isValidHexColor(body.color)) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid folder color. Must be a valid hex color (e.g., #6366f1)"
                });
            }

            // Handle folder move if parentId is being changed
            let updatedFolder = existingFolder;
            if (body.parentId !== undefined && body.parentId !== existingFolder.parent_id) {
                const movedFolder = await folderRepo.moveFolderInWorkspace(
                    id,
                    workspaceId,
                    body.parentId
                );
                if (!movedFolder) {
                    return reply.status(404).send({
                        success: false,
                        error: "Folder not found"
                    });
                }
                updatedFolder = movedFolder;
            }

            // Update other fields if provided
            if (
                body.name !== undefined ||
                body.color !== undefined ||
                body.position !== undefined
            ) {
                const result = await folderRepo.updateInWorkspace(id, workspaceId, {
                    name: body.name?.trim(),
                    color: body.color?.toLowerCase(),
                    position: body.position
                });
                if (result) {
                    updatedFolder = result;
                }
            }

            if (!updatedFolder) {
                return reply.status(404).send({
                    success: false,
                    error: "Folder not found"
                });
            }

            // Get item counts
            const itemCounts = await folderRepo.getItemCounts(id);

            logger.info({ folderId: id, workspaceId }, "Folder updated");

            return reply.send({
                success: true,
                data: {
                    id: updatedFolder.id,
                    userId: updatedFolder.user_id,
                    name: updatedFolder.name,
                    color: updatedFolder.color,
                    position: updatedFolder.position,
                    parentId: updatedFolder.parent_id,
                    depth: updatedFolder.depth,
                    path: updatedFolder.path,
                    createdAt: updatedFolder.created_at,
                    updatedAt: updatedFolder.updated_at,
                    itemCounts
                }
            });
        } catch (error) {
            logger.error({ workspaceId, folderId: id, body, error }, "Error updating folder");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
