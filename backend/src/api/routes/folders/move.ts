import { FastifyInstance } from "fastify";
import type { MoveItemsToFolderInput, FolderResourceType } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { db } from "../../../storage/database";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";

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
    fastify.post("/move", async (request, reply) => {
        const folderRepo = new FolderRepository();
        const workspaceId = request.workspace!.id;
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

            // Verify items exist and belong to workspace
            const placeholders = body.itemIds.map((_, i) => `$${i + 1}`).join(", ");
            const verifyQuery = `
                SELECT id FROM flowmaestro.${tableName}
                WHERE workspace_id = $${body.itemIds.length + 1} AND id IN (${placeholders})
                ${tableName === "knowledge_bases" ? "" : "AND deleted_at IS NULL"}
            `;
            const verifyResult = await db.query(verifyQuery, [...body.itemIds, workspaceId]);

            if (verifyResult.rows.length !== body.itemIds.length) {
                return reply.status(400).send({
                    success: false,
                    error: "One or more items not found or do not belong to workspace"
                });
            }

            // Validate folderId is provided (not null)
            if (body.folderId === null || body.folderId === undefined) {
                return reply.status(400).send({
                    success: false,
                    error: "Folder ID is required"
                });
            }

            // Add items to folder (add folder_id to folder_ids array)
            const folder = await folderRepo.findByIdAndWorkspaceId(body.folderId, workspaceId);
            if (!folder) {
                return reply.status(404).send({
                    success: false,
                    error: "Folder not found"
                });
            }

            // Add folder_id to folder_ids array if not already present
            const updatePlaceholders = body.itemIds.map((_, i) => `$${i + 2}`).join(", ");
            const updateQuery = `
                UPDATE flowmaestro.${tableName}
                SET folder_ids = CASE
                    WHEN $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) THEN folder_ids
                    ELSE array_append(COALESCE(folder_ids, ARRAY[]::UUID[]), $1)
                END,
                updated_at = CURRENT_TIMESTAMP
                WHERE id IN (${updatePlaceholders})
                ${tableName === "knowledge_bases" ? "" : "AND deleted_at IS NULL"}
            `;
            const updateResult = await db.query(updateQuery, [body.folderId, ...body.itemIds]);
            const movedCount = updateResult.rowCount || 0;

            logger.info(
                {
                    workspaceId,
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
            logger.error({ workspaceId, body, error }, "Error moving items to folder");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
