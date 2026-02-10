import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Delete Service operation schema
 */
export const deleteServiceSchema = z.object({
    region: z.string().describe("GCP region (e.g., us-central1)"),
    serviceName: z.string().describe("Cloud Run service name")
});

export type DeleteServiceParams = z.infer<typeof deleteServiceSchema>;

/**
 * Delete Service operation definition
 */
export const deleteServiceOperation: OperationDefinition = {
    id: "cloud_run_deleteService",
    name: "Delete Service",
    description: "Delete a Cloud Run service",
    category: "cloud-run",
    inputSchema: deleteServiceSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute delete service operation
 */
export async function executeDeleteService(
    client: GoogleCloudClient,
    params: DeleteServiceParams
): Promise<OperationResult> {
    try {
        const response = await client.cloudRun.delete<{
            name: string;
        }>(
            `/projects/${client.projectId}/locations/${params.region}/services/${params.serviceName}`
        );

        return {
            success: true,
            data: {
                operationName: response.name,
                serviceName: params.serviceName,
                region: params.region,
                message: "Service deleted successfully",
                deletedAt: new Date().toISOString(),
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete service",
                retryable: false
            }
        };
    }
}
