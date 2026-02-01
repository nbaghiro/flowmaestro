import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedriveOrganization } from "../types";

/**
 * Create Organization Parameters
 */
export const createOrganizationSchema = z.object({
    name: z.string().min(1).describe("Organization name (required)"),
    owner_id: z.number().int().optional().describe("Owner user ID"),
    address: z.string().optional().describe("Full address"),
    visible_to: z
        .enum(["1", "3", "5", "7"])
        .optional()
        .describe("Visibility: 1=owner, 3=owner+followers, 5=company, 7=owner+followers+company")
});

export type CreateOrganizationParams = z.infer<typeof createOrganizationSchema>;

/**
 * Operation Definition
 */
export const createOrganizationOperation: OperationDefinition = {
    id: "createOrganization",
    name: "Create Organization",
    description: "Create a new organization",
    category: "organizations",
    inputSchema: createOrganizationSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Create Organization
 */
export async function executeCreateOrganization(
    client: PipedriveClient,
    params: CreateOrganizationParams
): Promise<OperationResult> {
    try {
        const response = await client.post<PipedriveResponse<PipedriveOrganization>>(
            "/organizations",
            params
        );

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create organization",
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
                message: error instanceof Error ? error.message : "Failed to create organization",
                retryable: false
            }
        };
    }
}
