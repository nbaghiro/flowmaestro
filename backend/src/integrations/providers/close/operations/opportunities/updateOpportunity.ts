import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseOpportunity } from "../types";

/**
 * Update Opportunity Parameters
 */
export const updateOpportunitySchema = z.object({
    id: z.string().describe("The opportunity ID to update (starts with 'oppo_')"),
    status_id: z.string().optional().describe("Opportunity status ID"),
    contact_id: z.string().nullable().optional().describe("Associated contact ID (null to remove)"),
    value: z.number().optional().describe("Opportunity value in smallest currency unit"),
    value_currency: z.string().length(3).optional().describe("Currency code (e.g., USD)"),
    value_period: z
        .enum(["one_time", "monthly", "annual"])
        .optional()
        .describe("Value period for recurring revenue"),
    confidence: z.number().min(0).max(100).optional().describe("Win confidence percentage"),
    note: z.string().optional().describe("Note about the opportunity"),
    date_won: z.string().optional().describe("Date won (YYYY-MM-DD) - sets status to won"),
    date_lost: z.string().optional().describe("Date lost (YYYY-MM-DD) - sets status to lost")
});

export type UpdateOpportunityParams = z.infer<typeof updateOpportunitySchema>;

/**
 * Operation Definition
 */
export const updateOpportunityOperation: OperationDefinition = {
    id: "updateOpportunity",
    name: "Update Opportunity",
    description: "Update an existing opportunity",
    category: "opportunities",
    inputSchema: updateOpportunitySchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Update Opportunity
 */
export async function executeUpdateOpportunity(
    client: CloseClient,
    params: UpdateOpportunityParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<CloseOpportunity>(`/opportunity/${id}/`, updateData);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update opportunity",
                retryable: false
            }
        };
    }
}
