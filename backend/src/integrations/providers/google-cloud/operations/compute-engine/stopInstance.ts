import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Stop Instance operation schema
 */
export const stopInstanceSchema = z.object({
    zone: z.string().describe("GCP zone (e.g., us-central1-a)"),
    instanceName: z.string().describe("Instance name")
});

export type StopInstanceParams = z.infer<typeof stopInstanceSchema>;

/**
 * Stop Instance operation definition
 */
export const stopInstanceOperation: OperationDefinition = {
    id: "compute_engine_stopInstance",
    name: "Stop Instance",
    description: "Stop a running VM instance",
    category: "compute-engine",
    inputSchema: stopInstanceSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute stop instance operation
 */
export async function executeStopInstance(
    client: GoogleCloudClient,
    params: StopInstanceParams
): Promise<OperationResult> {
    try {
        const response = await client.compute.post<{
            name: string;
            status: string;
            targetLink: string;
        }>(
            `/projects/${client.projectId}/zones/${params.zone}/instances/${params.instanceName}/stop`,
            {}
        );

        return {
            success: true,
            data: {
                operationName: response.name,
                status: response.status,
                targetLink: response.targetLink,
                instanceName: params.instanceName,
                zone: params.zone,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to stop instance",
                retryable: false
            }
        };
    }
}
