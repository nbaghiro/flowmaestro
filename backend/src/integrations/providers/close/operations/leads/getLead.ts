import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseLead } from "../types";

/**
 * Get Lead Parameters
 */
export const getLeadSchema = z.object({
    id: z.string().describe("The lead ID (starts with 'lead_')"),
    _fields: z.array(z.string()).optional().describe("Fields to include in response")
});

export type GetLeadParams = z.infer<typeof getLeadSchema>;

/**
 * Operation Definition
 */
export const getLeadOperation: OperationDefinition = {
    id: "getLead",
    name: "Get Lead",
    description: "Get a specific lead by ID",
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
    client: CloseClient,
    params: GetLeadParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};
        if (params._fields && params._fields.length > 0) {
            queryParams._fields = params._fields.join(",");
        }

        const response = await client.get<CloseLead>(`/lead/${params.id}/`, queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get lead",
                retryable: true
            }
        };
    }
}
