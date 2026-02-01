import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MarketoClient } from "../client/MarketoClient";

/**
 * Update Lead Parameters
 */
export const updateLeadSchema = z.object({
    leadId: z.number().describe("The ID of the lead to update"),
    email: z.string().email().optional().describe("Updated email address"),
    firstName: z.string().optional().describe("Updated first name"),
    lastName: z.string().optional().describe("Updated last name"),
    company: z.string().optional().describe("Updated company name"),
    phone: z.string().optional().describe("Updated phone number"),
    title: z.string().optional().describe("Updated job title"),
    customFields: z.record(z.unknown()).optional().describe("Additional custom fields to update")
});

export type UpdateLeadParams = z.infer<typeof updateLeadSchema>;

/**
 * Operation Definition
 */
export const updateLeadOperation: OperationDefinition = {
    id: "updateLead",
    name: "Update Lead",
    description: "Update an existing lead's fields in Marketo",
    category: "leads",
    actionType: "write",
    inputSchema: updateLeadSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Update Lead
 */
export async function executeUpdateLead(
    client: MarketoClient,
    params: UpdateLeadParams
): Promise<OperationResult> {
    try {
        // Build lead data with ID
        const leadData: Record<string, unknown> = {
            id: params.leadId
        };

        if (params.email) leadData.email = params.email;
        if (params.firstName) leadData.firstName = params.firstName;
        if (params.lastName) leadData.lastName = params.lastName;
        if (params.company) leadData.company = params.company;
        if (params.phone) leadData.phone = params.phone;
        if (params.title) leadData.title = params.title;

        // Add custom fields
        if (params.customFields) {
            Object.assign(leadData, params.customFields);
        }

        const response = await client.createOrUpdateLeads([leadData], "updateOnly", "id");

        if (!response.success) {
            const errorMessage =
                response.errors?.[0]?.message || "Failed to update lead in Marketo";
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: errorMessage,
                    retryable: false
                }
            };
        }

        const result = response.result?.[0];
        if (!result) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "No result returned from Marketo",
                    retryable: false
                }
            };
        }

        // Check for individual lead errors
        if (result.status === "skipped" && result.reasons) {
            const reason = result.reasons[0];
            // Check if lead not found
            if (reason?.code === "1004") {
                return {
                    success: false,
                    error: {
                        type: "not_found",
                        message: `Lead with ID ${params.leadId} not found`,
                        retryable: false
                    }
                };
            }
            return {
                success: false,
                error: {
                    type: "validation",
                    message: result.reasons.map((r) => r.message).join("; "),
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                id: result.id,
                status: result.status
            }
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
