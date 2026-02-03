import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Add Instance Tags operation schema
 */
export const addInstanceTagsSchema = z.object({
    zone: z.string().describe("GCP zone (e.g., us-central1-a)"),
    instanceName: z.string().describe("Instance name"),
    tags: z.array(z.string()).describe("Network tags to add"),
    fingerprint: z.string().describe("Tags fingerprint for optimistic locking")
});

export type AddInstanceTagsParams = z.infer<typeof addInstanceTagsSchema>;

/**
 * Add Instance Tags operation definition
 */
export const addInstanceTagsOperation: OperationDefinition = {
    id: "compute_engine_addInstanceTags",
    name: "Add Instance Tags",
    description: "Add network tags to an instance",
    category: "compute-engine",
    inputSchema: addInstanceTagsSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute add instance tags operation
 */
export async function executeAddInstanceTags(
    client: GoogleCloudClient,
    params: AddInstanceTagsParams
): Promise<OperationResult> {
    try {
        const requestBody = {
            fingerprint: params.fingerprint,
            items: params.tags
        };

        const response = await client.compute.post<{
            name: string;
            status: string;
            targetLink: string;
        }>(
            `/projects/${client.projectId}/zones/${params.zone}/instances/${params.instanceName}/setTags`,
            requestBody
        );

        return {
            success: true,
            data: {
                operationName: response.name,
                status: response.status,
                targetLink: response.targetLink,
                instanceName: params.instanceName,
                zone: params.zone,
                tags: params.tags,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add instance tags",
                retryable: false
            }
        };
    }
}
