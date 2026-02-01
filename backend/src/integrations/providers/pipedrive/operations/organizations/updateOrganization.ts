import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedriveOrganization } from "../types";

/**
 * Update Organization Parameters
 */
export const updateOrganizationSchema = z.object({
    id: z.number().int().describe("The organization ID to update"),
    name: z.string().min(1).optional().describe("Organization name"),
    owner_id: z.number().int().optional().describe("Owner user ID"),
    address: z.string().optional().describe("Full address"),
    visible_to: z
        .enum(["1", "3", "5", "7"])
        .optional()
        .describe("Visibility: 1=owner, 3=owner+followers, 5=company, 7=owner+followers+company")
});

export type UpdateOrganizationParams = z.infer<typeof updateOrganizationSchema>;

/**
 * Operation Definition
 */
export const updateOrganizationOperation: OperationDefinition = {
    id: "updateOrganization",
    name: "Update Organization",
    description: "Update an existing organization",
    category: "organizations",
    inputSchema: updateOrganizationSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Update Organization
 */
export async function executeUpdateOrganization(
    client: PipedriveClient,
    params: UpdateOrganizationParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<PipedriveResponse<PipedriveOrganization>>(
            `/organizations/${id}`,
            updateData
        );

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to update organization",
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
                message: error instanceof Error ? error.message : "Failed to update organization",
                retryable: false
            }
        };
    }
}
