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

                // Ensure junction tables exist
                await folderRepo.ensureJunctionTablesExist();

                // Get junction table configuration
                const junctionConfig = folderRepo.getJunctionTableConfig(body.itemType);
                if (!junctionConfig) {
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

                let movedCount = 0;

                if (body.folderId !== null) {
                    // Add items to folder (many-to-many: items can be in multiple folders)
                    const folder = await folderRepo.findByIdAndUserId(body.folderId, userId);
                    if (!folder) {
                        return reply.status(404).send({
                            success: false,
                            error: "Folder not found"
                        });
                    }

                    // Insert into junction table, ignoring conflicts (item already in folder)
                    const insertPlaceholders = body.itemIds
                        .map((_, i) => `($1, $${i + 2})`)
                        .join(", ");
                    const insertQuery = `
                        INSERT INTO flowmaestro.${junctionConfig.tableName} (folder_id, ${junctionConfig.itemIdColumn})
                        VALUES ${insertPlaceholders}
                        ON CONFLICT (folder_id, ${junctionConfig.itemIdColumn}) DO NOTHING
                    `;
                    const insertResult = await db.query(insertQuery, [
                        body.folderId,
                        ...body.itemIds
                    ]);
                    movedCount = insertResult.rowCount || 0;
                } else {
                    // Remove items from folder(s)
                    const sourceFolderId = body.sourceFolderId;

                    if (sourceFolderId) {
                        // Remove from specific folder only
                        const sourceFolder = await folderRepo.findByIdAndUserId(
                            sourceFolderId,
                            userId
                        );
                        if (!sourceFolder) {
                            return reply.status(404).send({
                                success: false,
                                error: "Source folder not found"
                            });
                        }

                        const deletePlaceholders = body.itemIds
                            .map((_, i) => `$${i + 2}`)
                            .join(", ");
                        const deleteQuery = `
                            DELETE FROM flowmaestro.${junctionConfig.tableName}
                            WHERE folder_id = $1 AND ${junctionConfig.itemIdColumn} IN (${deletePlaceholders})
                        `;
                        const deleteResult = await db.query(deleteQuery, [
                            sourceFolderId,
                            ...body.itemIds
                        ]);
                        movedCount = deleteResult.rowCount || 0;
                    } else {
                        // Remove from all folders (when no sourceFolderId specified)
                        const deletePlaceholders = body.itemIds
                            .map((_, i) => `$${i + 1}`)
                            .join(", ");
                        const deleteQuery = `
                            DELETE FROM flowmaestro.${junctionConfig.tableName}
                            WHERE ${junctionConfig.itemIdColumn} IN (${deletePlaceholders})
                        `;
                        const deleteResult = await db.query(deleteQuery, body.itemIds);
                        movedCount = deleteResult.rowCount || 0;
                    }
                }

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
