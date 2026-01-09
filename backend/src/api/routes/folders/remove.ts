import { FastifyInstance } from "fastify";
import type { RemoveItemsFromFolderInput, FolderResourceType } from "@flowmaestro/shared";
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

export async function removeItemsFromFolderRoute(fastify: FastifyInstance) {
    fastify.post(
        "/remove",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const folderRepo = new FolderRepository();
            const userId = request.user!.id;
            const body = request.body as RemoveItemsFromFolderInput;

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

                // Verify items exist and belong to user
                const placeholders = body.itemIds.map((_, i) => `$${i + 1}`).join(", ");
                const verifyQuery = `
                    SELECT id FROM flowmaestro.${tableName}
                    WHERE user_id = $${body.itemIds.length + 1} AND id IN (${placeholders})
                    ${tableName === "knowledge_bases" ? "" : "AND deleted_at IS NULL"}
                `;
                const verifyResult = await db.query(verifyQuery, [...body.itemIds, userId]);

                if (verifyResult.rows.length !== body.itemIds.length) {
                    return reply.status(400).send({
                        success: false,
                        error: "One or more items not found or do not belong to user"
                    });
                }

                let removedCount = 0;

                // Remove items from folder(s)
                const folderId = body.folderId;

                if (folderId) {
                    // Remove from specific folder only
                    const folder = await folderRepo.findByIdAndUserId(folderId, userId);
                    if (!folder) {
                        return reply.status(404).send({
                            success: false,
                            error: "Folder not found"
                        });
                    }

                    // Remove specific folder_id from folder_ids array
                    const updatePlaceholders = body.itemIds.map((_, i) => `$${i + 2}`).join(", ");
                    const updateQuery = `
                        UPDATE flowmaestro.${tableName}
                        SET folder_ids = array_remove(COALESCE(folder_ids, ARRAY[]::UUID[]), $1::UUID),
                        updated_at = CURRENT_TIMESTAMP
                        WHERE id IN (${updatePlaceholders})
                        ${tableName === "knowledge_bases" ? "" : "AND deleted_at IS NULL"}
                    `;
                    const updateResult = await db.query(updateQuery, [folderId, ...body.itemIds]);
                    removedCount = updateResult.rowCount || 0;
                } else {
                    // Remove from all folders (clear folder_ids array)
                    const updatePlaceholders = body.itemIds.map((_, i) => `$${i + 1}`).join(", ");
                    const updateQuery = `
                        UPDATE flowmaestro.${tableName}
                        SET folder_ids = ARRAY[]::UUID[], updated_at = CURRENT_TIMESTAMP
                        WHERE id IN (${updatePlaceholders})
                        ${tableName === "knowledge_bases" ? "" : "AND deleted_at IS NULL"}
                    `;
                    const updateResult = await db.query(updateQuery, body.itemIds);
                    removedCount = updateResult.rowCount || 0;
                }

                logger.info(
                    {
                        userId,
                        folderId: body.folderId,
                        itemType: body.itemType,
                        itemIds: body.itemIds,
                        removedCount
                    },
                    "Items removed from folder"
                );

                return reply.send({
                    success: true,
                    data: {
                        removedCount,
                        folderId: body.folderId
                    }
                });
            } catch (error) {
                logger.error({ userId, body, error }, "Error removing items from folder");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
