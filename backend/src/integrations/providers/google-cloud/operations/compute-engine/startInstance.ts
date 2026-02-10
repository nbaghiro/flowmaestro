import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Start Instance operation schema
 */
export const startInstanceSchema = z.object({
    zone: z.string().describe("GCP zone (e.g., us-central1-a)"),
    instanceName: z.string().describe("Instance name")
});

export type StartInstanceParams = z.infer<typeof startInstanceSchema>;

/**
 * Start Instance operation definition
 */
export const startInstanceOperation: OperationDefinition = {
    id: "compute_engine_startInstance",
    name: "Start Instance",
    description: "Start a stopped VM instance",
    category: "compute-engine",
    inputSchema: startInstanceSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute start instance operation
 */
export async function executeStartInstance(
    client: GoogleCloudClient,
    params: StartInstanceParams
): Promise<OperationResult> {
    try {
        const response = await client.compute.post<{
            name: string;
            status: string;
            targetLink: string;
        }>(
            `/projects/${client.projectId}/zones/${params.zone}/instances/${params.instanceName}/start`,
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
                message: error instanceof Error ? error.message : "Failed to start instance",
                retryable: false
            }
        };
    }
}
