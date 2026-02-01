import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedriveLead } from "../types";

/**
 * Update Lead Parameters
 */
export const updateLeadSchema = z.object({
    id: z.string().uuid().describe("The lead UUID to update"),
    title: z.string().min(1).optional().describe("Lead title"),
    owner_id: z.number().int().optional().describe("Owner user ID"),
    person_id: z.number().int().nullable().optional().describe("Linked person ID (null to unlink)"),
    organization_id: z
        .number()
        .int()
        .nullable()
        .optional()
        .describe("Linked organization ID (null to unlink)"),
    value: z
        .object({
            amount: z.number().describe("Monetary value"),
            currency: z.string().length(3).describe("Currency code (e.g., USD)")
        })
        .nullable()
        .optional()
        .describe("Lead value (null to remove)"),
    expected_close_date: z
        .string()
        .nullable()
        .optional()
        .describe("Expected close date (YYYY-MM-DD or null)"),
    label_ids: z.array(z.string().uuid()).optional().describe("Lead label IDs"),
    is_archived: z.boolean().optional().describe("Archive or unarchive the lead")
});

export type UpdateLeadParams = z.infer<typeof updateLeadSchema>;

/**
 * Operation Definition
 */
export const updateLeadOperation: OperationDefinition = {
    id: "updateLead",
    name: "Update Lead",
    description: "Update an existing lead",
    category: "leads",
    inputSchema: updateLeadSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Update Lead
 */
export async function executeUpdateLead(
    client: PipedriveClient,
    params: UpdateLeadParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.patch<PipedriveResponse<PipedriveLead>>(
            `/leads/${id}`,
            updateData
        );

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to update lead",
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
                message: error instanceof Error ? error.message : "Failed to update lead",
                retryable: false
            }
        };
    }
}
