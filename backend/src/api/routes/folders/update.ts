import { FastifyInstance } from "fastify";
import type { UpdateFolderInput } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FolderRoutes");

const MAX_NAME_LENGTH = 100;

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
};

export async function updateFolderRoute(fastify: FastifyInstance) {
    fastify.patch<{ Params: { id: string } }>(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const folderRepo = new FolderRepository();
            const userId = request.user!.id;
            const { id } = request.params;
            const body = request.body as UpdateFolderInput;

            try {
                // Check folder exists and belongs to user
                const existingFolder = await folderRepo.findByIdAndUserId(id, userId);
                if (!existingFolder) {
                    return reply.status(404).send({
                        success: false,
                        error: "Folder not found"
                    });
                }

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

                    // Check name availability if name changed
                    if (body.name.trim().toLowerCase() !== existingFolder.name.toLowerCase()) {
                        const isAvailable = await folderRepo.isNameAvailable(
                            body.name.trim(),
                            userId,
                            id
                        );
                        if (!isAvailable) {
                            return reply.status(400).send({
                                success: false,
                                error: `A folder named '${body.name}' already exists`
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

                // Update folder
                const updatedFolder = await folderRepo.update(id, userId, {
                    name: body.name?.trim(),
                    color: body.color?.toLowerCase(),
                    position: body.position
                });

                if (!updatedFolder) {
                    return reply.status(404).send({
                        success: false,
                        error: "Folder not found"
                    });
                }

                // Get item counts
                const itemCounts = await folderRepo.getItemCounts(id);

                logger.info({ folderId: id, userId }, "Folder updated");

                return reply.send({
                    success: true,
                    data: {
                        id: updatedFolder.id,
                        userId: updatedFolder.user_id,
                        name: updatedFolder.name,
                        color: updatedFolder.color,
                        position: updatedFolder.position,
                        createdAt: updatedFolder.created_at,
                        updatedAt: updatedFolder.updated_at,
                        itemCounts
                    }
                });
            } catch (error) {
                logger.error({ userId, folderId: id, body, error }, "Error updating folder");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
