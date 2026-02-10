import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Delete Revision operation schema
 */
export const deleteRevisionSchema = z.object({
    region: z.string().describe("GCP region (e.g., us-central1)"),
    serviceName: z.string().describe("Cloud Run service name"),
    revisionName: z.string().describe("Revision name")
});

export type DeleteRevisionParams = z.infer<typeof deleteRevisionSchema>;

/**
 * Delete Revision operation definition
 */
export const deleteRevisionOperation: OperationDefinition = {
    id: "cloud_run_deleteRevision",
    name: "Delete Revision",
    description: "Delete a specific service revision",
    category: "cloud-run",
    inputSchema: deleteRevisionSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete revision operation
 */
export async function executeDeleteRevision(
    client: GoogleCloudClient,
    params: DeleteRevisionParams
): Promise<OperationResult> {
    try {
        const response = await client.cloudRun.delete<{
            name: string;
        }>(
            `/projects/${client.projectId}/locations/${params.region}/services/${params.serviceName}/revisions/${params.revisionName}`
        );

        return {
            success: true,
            data: {
                operationName: response.name,
                revisionName: params.revisionName,
                serviceName: params.serviceName,
                region: params.region,
                message: "Revision deleted successfully",
                deletedAt: new Date().toISOString(),
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete revision",
                retryable: false
            }
        };
    }
}
