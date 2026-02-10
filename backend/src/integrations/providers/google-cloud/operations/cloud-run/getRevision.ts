import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Get Revision operation schema
 */
export const getRevisionSchema = z.object({
    region: z.string().describe("GCP region (e.g., us-central1)"),
    serviceName: z.string().describe("Cloud Run service name"),
    revisionName: z.string().describe("Revision name")
});

export type GetRevisionParams = z.infer<typeof getRevisionSchema>;

/**
 * Get Revision operation definition
 */
export const getRevisionOperation: OperationDefinition = {
    id: "cloud_run_getRevision",
    name: "Get Revision",
    description: "Get detailed information about a specific service revision",
    category: "cloud-run",
    inputSchema: getRevisionSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get revision operation
 */
export async function executeGetRevision(
    client: GoogleCloudClient,
    params: GetRevisionParams
): Promise<OperationResult> {
    try {
        const response = await client.cloudRun.get<{
            name: string;
            uid: string;
            createTime: string;
            updateTime: string;
            containers: Array<{
                image: string;
                ports?: Array<{
                    containerPort: number;
                }>;
                env?: Array<{
                    name: string;
                    value?: string;
                }>;
            }>;
            scaling?: {
                minInstanceCount: number;
                maxInstanceCount: number;
            };
            serving: boolean;
        }>(
            `/projects/${client.projectId}/locations/${params.region}/services/${params.serviceName}/revisions/${params.revisionName}`
        );

        return {
            success: true,
            data: {
                name: response.name,
                uid: response.uid,
                createTime: response.createTime,
                updateTime: response.updateTime,
                containers: response.containers,
                scaling: response.scaling,
                serving: response.serving,
                serviceName: params.serviceName,
                region: params.region,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get revision",
                retryable: true
            }
        };
    }
}
