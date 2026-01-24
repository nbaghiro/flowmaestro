import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedriveDeal } from "../types";

/**
 * Get Deal Parameters
 */
export const getDealSchema = z.object({
    id: z.number().int().describe("The deal ID")
});

export type GetDealParams = z.infer<typeof getDealSchema>;

/**
 * Operation Definition
 */
export const getDealOperation: OperationDefinition = {
    id: "getDeal",
    name: "Get Deal",
    description: "Get a specific deal by ID",
    category: "deals",
    inputSchema: getDealSchema,
    inputSchemaJSON: toJSONSchema(getDealSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Deal
 */
export async function executeGetDeal(
    client: PipedriveClient,
    params: GetDealParams
): Promise<OperationResult> {
    try {
        const response = await client.get<PipedriveResponse<PipedriveDeal>>(`/deals/${params.id}`);

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Deal with ID ${params.id} not found`,
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
                message: error instanceof Error ? error.message : "Failed to get deal",
                retryable: true
            }
        };
    }
}
