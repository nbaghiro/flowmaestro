import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedriveOrganization } from "../types";

/**
 * Get Organization Parameters
 */
export const getOrganizationSchema = z.object({
    id: z.number().int().describe("The organization ID")
});

export type GetOrganizationParams = z.infer<typeof getOrganizationSchema>;

/**
 * Operation Definition
 */
export const getOrganizationOperation: OperationDefinition = {
    id: "getOrganization",
    name: "Get Organization",
    description: "Get a specific organization by ID",
    category: "organizations",
    inputSchema: getOrganizationSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Organization
 */
export async function executeGetOrganization(
    client: PipedriveClient,
    params: GetOrganizationParams
): Promise<OperationResult> {
    try {
        const response = await client.get<PipedriveResponse<PipedriveOrganization>>(
            `/organizations/${params.id}`
        );

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Organization with ID ${params.id} not found`,
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
                message: error instanceof Error ? error.message : "Failed to get organization",
                retryable: true
            }
        };
    }
}
