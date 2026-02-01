import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedriveLead } from "../types";

/**
 * Get Lead Parameters
 */
export const getLeadSchema = z.object({
    id: z.string().uuid().describe("The lead UUID")
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
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Lead
 */
export async function executeGetLead(
    client: PipedriveClient,
    params: GetLeadParams
): Promise<OperationResult> {
    try {
        const response = await client.get<PipedriveResponse<PipedriveLead>>(`/leads/${params.id}`);

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Lead with ID ${params.id} not found`,
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
                message: error instanceof Error ? error.message : "Failed to get lead",
                retryable: true
            }
        };
    }
}
