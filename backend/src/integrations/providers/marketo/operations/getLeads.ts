import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MarketoClient } from "../client/MarketoClient";

/**
 * Get Leads Parameters
 */
export const getLeadsSchema = z.object({
    filterType: z
        .string()
        .describe(
            "The lead field to filter on (e.g., 'email', 'id', 'linkedInId', or custom field API name)"
        ),
    filterValues: z
        .array(z.string())
        .min(1)
        .max(300)
        .describe("List of values to filter by (max 300 values)"),
    fields: z
        .array(z.string())
        .optional()
        .describe("List of lead fields to return. If not specified, returns default fields."),
    nextPageToken: z.string().optional().describe("Token for pagination to get the next page")
});

export type GetLeadsParams = z.infer<typeof getLeadsSchema>;

/**
 * Operation Definition
 */
export const getLeadsOperation: OperationDefinition = {
    id: "getLeads",
    name: "Get Leads",
    description:
        "Query leads by filter type and values. Supports pagination for large result sets.",
    category: "leads",
    inputSchema: getLeadsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Get Leads
 */
export async function executeGetLeads(
    client: MarketoClient,
    params: GetLeadsParams
): Promise<OperationResult> {
    try {
        const response = await client.getLeads(
            params.filterType,
            params.filterValues,
            params.fields,
            params.nextPageToken
        );

        if (!response.success) {
            const errorMessage =
                response.errors?.[0]?.message || "Failed to get leads from Marketo";
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: errorMessage,
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                leads: response.result || [],
                nextPageToken: response.nextPageToken,
                hasMore: !!response.nextPageToken
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get leads",
                retryable: false
            }
        };
    }
}
