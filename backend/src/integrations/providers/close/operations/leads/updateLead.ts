import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseLead } from "../types";

/**
 * Update Lead Parameters
 */
export const updateLeadSchema = z.object({
    id: z.string().describe("The lead ID to update (starts with 'lead_')"),
    name: z.string().min(1).optional().describe("Lead/company name"),
    description: z.string().optional().describe("Lead description"),
    url: z.string().url().nullable().optional().describe("Company website URL"),
    status_id: z.string().optional().describe("Lead status ID"),
    addresses: z
        .array(
            z.object({
                label: z.string().optional(),
                address_1: z.string().optional(),
                address_2: z.string().optional(),
                city: z.string().optional(),
                state: z.string().optional(),
                zipcode: z.string().optional(),
                country: z.string().optional()
            })
        )
        .optional()
        .describe("Company addresses"),
    custom: z.record(z.unknown()).optional().describe("Custom field values")
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
    inputSchemaJSON: toJSONSchema(updateLeadSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute Update Lead
 */
export async function executeUpdateLead(
    client: CloseClient,
    params: UpdateLeadParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<CloseLead>(`/lead/${id}/`, updateData);

        return {
            success: true,
            data: response
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
