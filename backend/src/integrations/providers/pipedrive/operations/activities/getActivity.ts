import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedriveActivity } from "../types";

/**
 * Get Activity Parameters
 */
export const getActivitySchema = z.object({
    id: z.number().int().describe("The activity ID")
});

export type GetActivityParams = z.infer<typeof getActivitySchema>;

/**
 * Operation Definition
 */
export const getActivityOperation: OperationDefinition = {
    id: "getActivity",
    name: "Get Activity",
    description: "Get a specific activity by ID",
    category: "activities",
    inputSchema: getActivitySchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Activity
 */
export async function executeGetActivity(
    client: PipedriveClient,
    params: GetActivityParams
): Promise<OperationResult> {
    try {
        const response = await client.get<PipedriveResponse<PipedriveActivity>>(
            `/activities/${params.id}`
        );

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Activity with ID ${params.id} not found`,
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get activity",
                retryable: true
            }
        };
    }
}
