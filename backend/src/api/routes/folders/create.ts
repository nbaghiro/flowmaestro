import { FastifyInstance } from "fastify";
import type { CreateFolderInput } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";

const logger = createServiceLogger("FolderRoutes");

// Max folder name length
const MAX_NAME_LENGTH = 100;

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
};

export async function createFolderRoute(fastify: FastifyInstance) {
    fastify.post("/", async (request, reply) => {
        const folderRepo = new FolderRepository();
        const body = request.body as CreateFolderInput;
        const userId = request.user!.id;
        const workspaceId = request.workspace!.id;

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

            // Normalize parentId (empty string or undefined -> null)
            const parentId = body.parentId || null;

            // Check name availability within the same parent folder
            const isAvailable = await folderRepo.isNameAvailableInWorkspace(
                body.name.trim(),
                workspaceId,
                parentId
            );
            if (!isAvailable) {
                const parentContext = parentId ? " in this folder" : " at the root level";
                return reply.status(400).send({
                    success: false,
                    error: `A folder named '${body.name}' already exists${parentContext}`
                });
            }

            // Create folder
            const folder = await folderRepo.create({
                user_id: userId,
                workspace_id: workspaceId,
                name: body.name.trim(),
                color: body.color?.toLowerCase(),
                parent_id: parentId
            });

            logger.info({ folderId: folder.id, workspaceId, parentId }, "Folder created");

            return reply.status(201).send({
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
            logger.error({ workspaceId, body, error }, "Error creating folder");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
