import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse } from "../types";

/**
 * Delete Deal Parameters
 */
export const deleteDealSchema = z.object({
    id: z.number().int().describe("The deal ID to delete")
});

export type DeleteDealParams = z.infer<typeof deleteDealSchema>;

/**
 * Operation Definition
 */
export const deleteDealOperation: OperationDefinition = {
    id: "deleteDeal",
    name: "Delete Deal",
    description: "Delete a deal (marks as deleted, can be recovered within 30 days)",
    category: "deals",
    inputSchema: deleteDealSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Deal
 */
export async function executeDeleteDeal(
    client: PipedriveClient,
    params: DeleteDealParams
): Promise<OperationResult> {
    try {
        const response = await client.delete<PipedriveResponse<{ id: number }>>(
            `/deals/${params.id}`
        );

        if (!response.success) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to delete deal",
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
                message: error instanceof Error ? error.message : "Failed to delete deal",
                retryable: false
            }
        };
    }
}
