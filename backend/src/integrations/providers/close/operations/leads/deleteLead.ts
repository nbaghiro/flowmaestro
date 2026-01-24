import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";

/**
 * Delete Lead Parameters
 */
export const deleteLeadSchema = z.object({
    id: z.string().describe("The lead ID to delete (starts with 'lead_')")
});

export type DeleteLeadParams = z.infer<typeof deleteLeadSchema>;

/**
 * Operation Definition
 */
export const deleteLeadOperation: OperationDefinition = {
    id: "deleteLead",
    name: "Delete Lead",
    description: "Delete a lead and all associated data",
    category: "leads",
    inputSchema: deleteLeadSchema,
    inputSchemaJSON: toJSONSchema(deleteLeadSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Lead
 */
export async function executeDeleteLead(
    client: CloseClient,
    params: DeleteLeadParams
): Promise<OperationResult> {
    try {
        await client.delete(`/lead/${params.id}/`);

        return {
            success: true,
            data: { deleted: true, id: params.id }
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
