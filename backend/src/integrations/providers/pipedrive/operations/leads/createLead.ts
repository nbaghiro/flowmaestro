import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedriveLead } from "../types";

/**
 * Create Lead Parameters
 */
export const createLeadSchema = z.object({
    title: z.string().min(1).describe("Lead title (required)"),
    owner_id: z.number().int().optional().describe("Owner user ID"),
    person_id: z.number().int().optional().describe("Linked person ID"),
    organization_id: z.number().int().optional().describe("Linked organization ID"),
    value: z
        .object({
            amount: z.number().describe("Monetary value"),
            currency: z.string().length(3).describe("Currency code (e.g., USD)")
        })
        .optional()
        .describe("Lead value"),
    expected_close_date: z.string().optional().describe("Expected close date (YYYY-MM-DD)"),
    label_ids: z.array(z.string().uuid()).optional().describe("Lead label IDs"),
    visible_to: z
        .enum(["1", "3", "7"])
        .optional()
        .describe("Visibility: 1=owner, 3=owner+followers, 7=entire company")
});

export type CreateLeadParams = z.infer<typeof createLeadSchema>;

/**
 * Operation Definition
 */
export const createLeadOperation: OperationDefinition = {
    id: "createLead",
    name: "Create Lead",
    description: "Create a new lead in the Leads Inbox",
    category: "leads",
    inputSchema: createLeadSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Create Lead
 */
export async function executeCreateLead(
    client: PipedriveClient,
    params: CreateLeadParams
): Promise<OperationResult> {
    try {
        const response = await client.post<PipedriveResponse<PipedriveLead>>("/leads", params);

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create lead",
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
                message: error instanceof Error ? error.message : "Failed to create lead",
                retryable: false
            }
        };
    }
}
