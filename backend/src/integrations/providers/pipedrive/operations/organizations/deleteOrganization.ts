import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse } from "../types";

/**
 * Delete Organization Parameters
 */
export const deleteOrganizationSchema = z.object({
    id: z.number().int().describe("The organization ID to delete")
});

export type DeleteOrganizationParams = z.infer<typeof deleteOrganizationSchema>;

/**
 * Operation Definition
 */
export const deleteOrganizationOperation: OperationDefinition = {
    id: "deleteOrganization",
    name: "Delete Organization",
    description: "Delete an organization",
    category: "organizations",
    inputSchema: deleteOrganizationSchema,
    inputSchemaJSON: toJSONSchema(deleteOrganizationSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Organization
 */
export async function executeDeleteOrganization(
    client: PipedriveClient,
    params: DeleteOrganizationParams
): Promise<OperationResult> {
    try {
        const response = await client.delete<PipedriveResponse<{ id: number }>>(
            `/organizations/${params.id}`
        );

        if (!response.success) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to delete organization",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: { deleted: true, id: params.id }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete organization",
                retryable: false
            }
        };
    }
}
