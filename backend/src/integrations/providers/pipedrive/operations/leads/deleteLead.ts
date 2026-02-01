import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse } from "../types";

/**
 * Delete Lead Parameters
 */
export const deleteLeadSchema = z.object({
    id: z.string().uuid().describe("The lead UUID to delete")
});

export type DeleteLeadParams = z.infer<typeof deleteLeadSchema>;

/**
 * Operation Definition
 */
export const deleteLeadOperation: OperationDefinition = {
    id: "deleteLead",
    name: "Delete Lead",
    description: "Delete/archive a lead (moves to archive, can be recovered)",
    category: "leads",
    inputSchema: deleteLeadSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Lead
 */
export async function executeDeleteLead(
    client: PipedriveClient,
    params: DeleteLeadParams
): Promise<OperationResult> {
    try {
        const response = await client.delete<PipedriveResponse<{ id: string }>>(
            `/leads/${params.id}`
        );

        if (!response.success) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to delete lead",
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
                message: error instanceof Error ? error.message : "Failed to delete lead",
                retryable: false
            }
        };
    }
}
