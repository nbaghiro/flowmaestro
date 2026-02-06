import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperLead } from "../types";

/**
 * Get Lead operation schema
 */
export const getLeadSchema = z.object({
    lead_id: z.number().describe("The ID of the lead to retrieve")
});

export type GetLeadParams = z.infer<typeof getLeadSchema>;

/**
 * Get Lead operation definition
 */
export const getLeadOperation: OperationDefinition = {
    id: "getLead",
    name: "Get Lead",
    description: "Get a specific lead by ID from Copper CRM",
    category: "leads",
    inputSchema: getLeadSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get lead operation
 */
export async function executeGetLead(
    client: CopperClient,
    params: GetLeadParams
): Promise<OperationResult> {
    try {
        const lead = await client.get<CopperLead>(`/leads/${params.lead_id}`);

        return {
            success: true,
            data: lead
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get lead",
                retryable: false
            }
        };
    }
}
