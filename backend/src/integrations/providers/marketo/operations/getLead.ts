import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MarketoClient } from "../client/MarketoClient";

/**
 * Get Lead Parameters
 */
export const getLeadSchema = z.object({
    leadId: z.number().describe("The ID of the lead to retrieve"),
    fields: z
        .array(z.string())
        .optional()
        .describe("List of lead fields to return. If not specified, returns default fields.")
});

export type GetLeadParams = z.infer<typeof getLeadSchema>;

/**
 * Operation Definition
 */
export const getLeadOperation: OperationDefinition = {
    id: "getLead",
    name: "Get Lead",
    description: "Get a lead by ID from Marketo",
    category: "leads",
    inputSchema: getLeadSchema,
    inputSchemaJSON: toJSONSchema(getLeadSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Lead
 */
export async function executeGetLead(
    client: MarketoClient,
    params: GetLeadParams
): Promise<OperationResult> {
    try {
        const response = await client.getLead(params.leadId, params.fields);

        if (!response.success) {
            const errorMessage = response.errors?.[0]?.message || "Failed to get lead from Marketo";
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: errorMessage,
                    retryable: false
                }
            };
        }

        if (!response.result || response.result.length === 0) {
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
            success: true,
            data: response.result[0]
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
