import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse } from "../types";

/**
 * Delete Activity Parameters
 */
export const deleteActivitySchema = z.object({
    id: z.number().int().describe("The activity ID to delete")
});

export type DeleteActivityParams = z.infer<typeof deleteActivitySchema>;

/**
 * Operation Definition
 */
export const deleteActivityOperation: OperationDefinition = {
    id: "deleteActivity",
    name: "Delete Activity",
    description: "Delete an activity",
    category: "activities",
    inputSchema: deleteActivitySchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Activity
 */
export async function executeDeleteActivity(
    client: PipedriveClient,
    params: DeleteActivityParams
): Promise<OperationResult> {
    try {
        const response = await client.delete<PipedriveResponse<{ id: number }>>(
            `/activities/${params.id}`
        );

        if (!response.success) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to delete activity",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: { deleted: true, id: params.id }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete activity",
                retryable: false
            }
        };
    }
}
