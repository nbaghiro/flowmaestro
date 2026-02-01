import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { BufferClient } from "../client/BufferClient";
import { BufferUpdateIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Delete Update operation schema
 */
export const deleteUpdateSchema = z.object({
    updateId: BufferUpdateIdSchema
});

export type DeleteUpdateParams = z.infer<typeof deleteUpdateSchema>;

/**
 * Delete Update operation definition
 */
export const deleteUpdateOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deleteUpdate",
            name: "Delete Update",
            description: "Delete a scheduled post from Buffer",
            category: "updates",
            inputSchema: deleteUpdateSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Buffer", err: error }, "Failed to create deleteUpdateOperation");
        throw new Error(
            `Failed to create deleteUpdate operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete update operation
 */
export async function executeDeleteUpdate(
    client: BufferClient,
    params: DeleteUpdateParams
): Promise<OperationResult> {
    try {
        const response = (await client.deleteUpdate(params.updateId)) as { success: boolean };

        return {
            success: true,
            data: {
                deleted: response.success,
                updateId: params.updateId,
                message: "Update deleted successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete update",
                retryable: true
            }
        };
    }
}
