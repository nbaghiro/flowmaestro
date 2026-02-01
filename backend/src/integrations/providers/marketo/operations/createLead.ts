import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MarketoClient } from "../client/MarketoClient";

/**
 * Create Lead Parameters
 */
export const createLeadSchema = z.object({
    email: z.string().email().describe("Email address of the lead"),
    firstName: z.string().optional().describe("First name of the lead"),
    lastName: z.string().optional().describe("Last name of the lead"),
    company: z.string().optional().describe("Company name"),
    phone: z.string().optional().describe("Phone number"),
    title: z.string().optional().describe("Job title"),
    leadSource: z.string().optional().describe("Source of the lead"),
    customFields: z
        .record(z.unknown())
        .optional()
        .describe("Additional custom fields to set on the lead"),
    lookupField: z.string().optional().describe("Field to use for deduplication (default: email)"),
    partitionName: z.string().optional().describe("Lead partition name (for partitioned instances)")
});

export type CreateLeadParams = z.infer<typeof createLeadSchema>;

/**
 * Operation Definition
 */
export const createLeadOperation: OperationDefinition = {
    id: "createLead",
    name: "Create Lead",
    description: "Create or update a lead in Marketo (upsert by email)",
    category: "leads",
    actionType: "write",
    inputSchema: createLeadSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Create Lead
 */
export async function executeCreateLead(
    client: MarketoClient,
    params: CreateLeadParams
): Promise<OperationResult> {
    try {
        // Build lead data
        const leadData: Record<string, unknown> = {
            email: params.email
        };

        if (params.firstName) leadData.firstName = params.firstName;
        if (params.lastName) leadData.lastName = params.lastName;
        if (params.company) leadData.company = params.company;
        if (params.phone) leadData.phone = params.phone;
        if (params.title) leadData.title = params.title;
        if (params.leadSource) leadData.leadSource = params.leadSource;

        // Add custom fields
        if (params.customFields) {
            Object.assign(leadData, params.customFields);
        }

        const response = await client.createOrUpdateLeads(
            [leadData],
            "createOrUpdate",
            params.lookupField || "email",
            params.partitionName
        );

        if (!response.success) {
            const errorMessage =
                response.errors?.[0]?.message || "Failed to create lead in Marketo";
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
                status: result.status,
                email: params.email
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create lead",
                retryable: false
            }
        };
    }
}
