import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseOpportunity } from "../types";

/**
 * Get Opportunity Parameters
 */
export const getOpportunitySchema = z.object({
    id: z.string().describe("The opportunity ID (starts with 'oppo_')"),
    _fields: z.array(z.string()).optional().describe("Fields to include in response")
});

export type GetOpportunityParams = z.infer<typeof getOpportunitySchema>;

/**
 * Operation Definition
 */
export const getOpportunityOperation: OperationDefinition = {
    id: "getOpportunity",
    name: "Get Opportunity",
    description: "Get a specific opportunity by ID",
    category: "opportunities",
    inputSchema: getOpportunitySchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Opportunity
 */
export async function executeGetOpportunity(
    client: CloseClient,
    params: GetOpportunityParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};
        if (params._fields && params._fields.length > 0) {
            queryParams._fields = params._fields.join(",");
        }

        const response = await client.get<CloseOpportunity>(
            `/opportunity/${params.id}/`,
            queryParams
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get opportunity",
                retryable: true
            }
        };
    }
}
