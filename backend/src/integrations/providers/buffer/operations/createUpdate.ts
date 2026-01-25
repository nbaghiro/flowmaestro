import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { BufferClient } from "../client/BufferClient";
import {
    BufferProfileIdSchema,
    BufferTextSchema,
    BufferMediaSchema,
    BufferScheduledAtSchema,
    BufferNowSchema,
    BufferTopSchema
} from "../schemas";
import type { BufferUpdateResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Update operation schema
 */
export const createUpdateSchema = z.object({
    profileIds: z.array(BufferProfileIdSchema).min(1).describe("Array of profile IDs to post to"),
    text: BufferTextSchema,
    media: BufferMediaSchema,
    scheduledAt: BufferScheduledAtSchema,
    now: BufferNowSchema,
    top: BufferTopSchema
});

export type CreateUpdateParams = z.infer<typeof createUpdateSchema>;

/**
 * Create Update operation definition
 */
export const createUpdateOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createUpdate",
            name: "Create Update",
            description: "Create a new scheduled post in Buffer",
            category: "updates",
            inputSchema: createUpdateSchema,
            inputSchemaJSON: toJSONSchema(createUpdateSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Buffer", err: error }, "Failed to create createUpdateOperation");
        throw new Error(
            `Failed to create createUpdate operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create update operation
 */
export async function executeCreateUpdate(
    client: BufferClient,
    params: CreateUpdateParams
): Promise<OperationResult> {
    try {
        const response = (await client.createUpdate({
            profile_ids: params.profileIds,
            text: params.text,
            media: params.media,
            scheduled_at: params.scheduledAt,
            now: params.now,
            top: params.top
        })) as BufferUpdateResponse;

        // Buffer returns updates array when posting to multiple profiles
        const updates = response.updates || (response.update ? [response.update] : []);

        return {
            success: true,
            data: {
                message: response.message || "Update created successfully",
                updates: updates.map((update) => ({
                    id: update.id,
                    text: update.text,
                    profileId: update.profile_id,
                    service: update.profile_service,
                    status: update.status,
                    scheduledAt: update.scheduled_at
                        ? new Date(update.scheduled_at * 1000).toISOString()
                        : undefined,
                    createdAt: new Date(update.created_at * 1000).toISOString()
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create update",
                retryable: true
            }
        };
    }
}
