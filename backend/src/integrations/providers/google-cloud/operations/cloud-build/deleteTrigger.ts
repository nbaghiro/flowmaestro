import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Delete Trigger operation schema
 */
export const deleteTriggerSchema = z.object({
    triggerId: z.string().describe("Build trigger ID")
});

export type DeleteTriggerParams = z.infer<typeof deleteTriggerSchema>;

/**
 * Delete Trigger operation definition
 */
export const deleteTriggerOperation: OperationDefinition = {
    id: "cloud_build_deleteTrigger",
    name: "Delete Trigger",
    description: "Delete a build trigger",
    category: "cloud-build",
    inputSchema: deleteTriggerSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete trigger operation
 */
export async function executeDeleteTrigger(
    client: GoogleCloudClient,
    params: DeleteTriggerParams
): Promise<OperationResult> {
    try {
        await client.cloudBuild.delete(
            `/projects/${client.projectId}/triggers/${params.triggerId}`
        );

        return {
            success: true,
            data: {
                triggerId: params.triggerId,
                message: "Trigger deleted successfully",
                deletedAt: new Date().toISOString(),
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete trigger",
                retryable: false
            }
        };
    }
}
