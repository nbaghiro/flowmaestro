import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { BufferClient } from "../client/BufferClient";
import { BufferProfileIdSchema } from "../schemas";
import type { BufferPendingUpdatesResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Pending Updates operation schema
 */
export const getPendingUpdatesSchema = z.object({
    profileId: BufferProfileIdSchema,
    page: z.number().int().min(1).optional().describe("Page number (default: 1)"),
    count: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of updates per page (max: 100)")
});

export type GetPendingUpdatesParams = z.infer<typeof getPendingUpdatesSchema>;

/**
 * Get Pending Updates operation definition
 */
export const getPendingUpdatesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getPendingUpdates",
            name: "Get Pending Updates",
            description: "Get queued/pending updates for a Buffer profile",
            category: "updates",
            inputSchema: getPendingUpdatesSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Buffer", err: error },
            "Failed to create getPendingUpdatesOperation"
        );
        throw new Error(
            `Failed to create getPendingUpdates operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get pending updates operation
 */
export async function executeGetPendingUpdates(
    client: BufferClient,
    params: GetPendingUpdatesParams
): Promise<OperationResult> {
    try {
        const response = (await client.getPendingUpdates(params.profileId, {
            page: params.page,
            count: params.count
        })) as BufferPendingUpdatesResponse;

        return {
            success: true,
            data: {
                total: response.total,
                updates: response.updates.map((update) => ({
                    id: update.id,
                    text: update.text,
                    textFormatted: update.text_formatted,
                    profileId: update.profile_id,
                    service: update.profile_service,
                    status: update.status,
                    scheduledAt: update.scheduled_at
                        ? new Date(update.scheduled_at * 1000).toISOString()
                        : undefined,
                    dueAt: update.due_at ? new Date(update.due_at * 1000).toISOString() : undefined,
                    createdAt: new Date(update.created_at * 1000).toISOString(),
                    media: update.media
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get pending updates",
                retryable: true
            }
        };
    }
}
