import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Delete Lead operation schema
 */
export const deleteLeadSchema = z.object({
    lead_id: z.number().describe("The ID of the lead to delete")
});

export type DeleteLeadParams = z.infer<typeof deleteLeadSchema>;

/**
 * Delete Lead operation definition
 */
export const deleteLeadOperation: OperationDefinition = {
    id: "deleteLead",
    name: "Delete Lead",
    description: "Delete a lead from Copper CRM",
    category: "leads",
    inputSchema: deleteLeadSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute delete lead operation
 */
export async function executeDeleteLead(
    client: CopperClient,
    params: DeleteLeadParams
): Promise<OperationResult> {
    try {
        await client.delete(`/leads/${params.lead_id}`);

        return {
            success: true,
            data: {
                deleted: true,
                lead_id: params.lead_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete lead",
                retryable: false
            }
        };
    }
}
