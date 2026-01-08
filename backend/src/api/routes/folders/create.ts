import { FastifyInstance } from "fastify";
import type { CreateFolderInput } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FolderRoutes");

// Max folder name length
const MAX_NAME_LENGTH = 100;

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
};

export async function createFolderRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const folderRepo = new FolderRepository();
            const body = request.body as CreateFolderInput;
            const userId = request.user!.id;

            try {
                // Validate required fields
                if (!body.name || body.name.trim().length === 0) {
                    return reply.status(400).send({
                        success: false,
                        error: "Folder name is required"
                    });
                }

                // Validate name length
                if (body.name.length > MAX_NAME_LENGTH) {
                    return reply.status(400).send({
                        success: false,
                        error: `Folder name must be ${MAX_NAME_LENGTH} characters or less`
                    });
                }

                // Validate color if provided (must be valid hex format)
                if (body.color && !isValidHexColor(body.color)) {
                    return reply.status(400).send({
                        success: false,
                        error: "Invalid folder color. Must be a valid hex color (e.g., #6366f1)"
                    });
                }

                // Check name availability (case-insensitive)
                const isAvailable = await folderRepo.isNameAvailable(body.name.trim(), userId);
                if (!isAvailable) {
                    return reply.status(400).send({
                        success: false,
                        error: `A folder named '${body.name}' already exists`
                    });
                }

                // Create folder
                const folder = await folderRepo.create({
                    user_id: userId,
                    name: body.name.trim(),
                    color: body.color?.toLowerCase()
                });

                logger.info({ folderId: folder.id, userId }, "Folder created");

                return reply.status(201).send({
                    success: true,
                    data: {
                        id: folder.id,
                        userId: folder.user_id,
                        name: folder.name,
                        color: folder.color,
                        position: folder.position,
                        createdAt: folder.created_at,
                        updatedAt: folder.updated_at,
                        itemCounts: {
                            workflows: 0,
                            agents: 0,
                            formInterfaces: 0,
                            chatInterfaces: 0,
                            knowledgeBases: 0,
                            total: 0
                        }
                    }
                });
            } catch (error) {
                logger.error({ userId, body, error }, "Error creating folder");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
