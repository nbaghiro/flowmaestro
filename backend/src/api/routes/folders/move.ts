import { FastifyInstance } from "fastify";
import type { MoveItemsToFolderInput, FolderResourceType } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { db } from "../../../storage/database";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FolderRoutes");

// Map resource types to table names
const RESOURCE_TABLE_MAP: Record<FolderResourceType, string> = {
    workflow: "workflows",
    agent: "agents",
    "form-interface": "form_interfaces",
    "chat-interface": "chat_interfaces",
    "knowledge-base": "knowledge_bases"
};

export async function moveItemsToFolderRoute(fastify: FastifyInstance) {
    fastify.post(
        "/move",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const folderRepo = new FolderRepository();
            const userId = request.user!.id;
            const body = request.body as MoveItemsToFolderInput;

            try {
                // Validate required fields
                if (!body.itemIds || body.itemIds.length === 0) {
                    return reply.status(400).send({
                        success: false,
                        error: "At least one item ID is required"
                    });
                }

                if (!body.itemType) {
                    return reply.status(400).send({
                        success: false,
                        error: "Item type is required"
                    });
                }

                // Validate item type
                const tableName = RESOURCE_TABLE_MAP[body.itemType];
                if (!tableName) {
                    return reply.status(400).send({
                        success: false,
                        error: `Invalid item type: ${body.itemType}`
                    });
                }

                // If folderId is provided, verify it exists and belongs to user
                if (body.folderId !== null) {
                    const folder = await folderRepo.findByIdAndUserId(body.folderId, userId);
                    if (!folder) {
                        return reply.status(404).send({
                            success: false,
                            error: "Folder not found"
                        });
                    }
                }

                // Update items
                // Use parameterized query with array of IDs
                const placeholders = body.itemIds.map((_, i) => `$${i + 3}`).join(", ");
                const query = `
                    UPDATE flowmaestro.${tableName}
                    SET folder_id = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $2 AND id IN (${placeholders}) AND deleted_at IS NULL
                `;

                const values = [body.folderId, userId, ...body.itemIds];
                const result = await db.query(query, values);

                const movedCount = result.rowCount || 0;

                logger.info(
                    {
                        userId,
                        folderId: body.folderId,
                        itemType: body.itemType,
                        itemIds: body.itemIds,
                        movedCount
                    },
                    "Items moved to folder"
                );

                return reply.send({
                    success: true,
                    data: {
                        movedCount,
                        folderId: body.folderId
                    }
                });
            } catch (error) {
                logger.error({ userId, body, error }, "Error moving items to folder");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
