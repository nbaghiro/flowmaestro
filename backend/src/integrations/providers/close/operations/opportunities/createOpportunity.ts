import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseOpportunity } from "../types";

/**
 * Create Opportunity Parameters
 */
export const createOpportunitySchema = z.object({
    lead_id: z.string().describe("Lead ID this opportunity belongs to (required)"),
    status_id: z.string().describe("Opportunity status ID (required)"),
    contact_id: z.string().optional().describe("Associated contact ID"),
    value: z.number().optional().describe("Opportunity value in smallest currency unit"),
    value_currency: z.string().length(3).optional().describe("Currency code (e.g., USD)"),
    value_period: z
        .enum(["one_time", "monthly", "annual"])
        .optional()
        .describe("Value period for recurring revenue"),
    confidence: z.number().min(0).max(100).optional().describe("Win confidence percentage"),
    note: z.string().optional().describe("Note about the opportunity")
});

export type CreateOpportunityParams = z.infer<typeof createOpportunitySchema>;

/**
 * Operation Definition
 */
export const createOpportunityOperation: OperationDefinition = {
    id: "createOpportunity",
    name: "Create Opportunity",
    description: "Create a new opportunity on a lead",
    category: "opportunities",
    inputSchema: createOpportunitySchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Create Opportunity
 */
export async function executeCreateOpportunity(
    client: CloseClient,
    params: CreateOpportunityParams
): Promise<OperationResult> {
    try {
        const response = await client.post<CloseOpportunity>("/opportunity/", params);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create opportunity",
                retryable: false
            }
        };
    }
}
