import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { BufferClient } from "../client/BufferClient";
import { BufferUpdateIdSchema } from "../schemas";
import type { BufferUpdate } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Update operation schema
 */
export const getUpdateSchema = z.object({
    updateId: BufferUpdateIdSchema
});

export type GetUpdateParams = z.infer<typeof getUpdateSchema>;

/**
 * Get Update operation definition
 */
export const getUpdateOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getUpdate",
            name: "Get Update",
            description: "Get details of a specific Buffer update/post",
            category: "updates",
            inputSchema: getUpdateSchema,
            inputSchemaJSON: toJSONSchema(getUpdateSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Buffer", err: error }, "Failed to create getUpdateOperation");
        throw new Error(
            `Failed to create getUpdate operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get update operation
 */
export async function executeGetUpdate(
    client: BufferClient,
    params: GetUpdateParams
): Promise<OperationResult> {
    try {
        const update = (await client.getUpdate(params.updateId)) as BufferUpdate;

        return {
            success: true,
            data: {
                id: update.id,
                text: update.text,
                textFormatted: update.text_formatted,
                profileId: update.profile_id,
                service: update.profile_service,
                status: update.status,
                scheduledAt: update.scheduled_at
                    ? new Date(update.scheduled_at * 1000).toISOString()
                    : undefined,
                sentAt: update.sent_at ? new Date(update.sent_at * 1000).toISOString() : undefined,
                dueAt: update.due_at ? new Date(update.due_at * 1000).toISOString() : undefined,
                createdAt: new Date(update.created_at * 1000).toISOString(),
                media: update.media
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get update",
                retryable: true
            }
        };
    }
}
