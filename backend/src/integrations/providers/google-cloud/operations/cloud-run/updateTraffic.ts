import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Update Traffic operation schema
 */
export const updateTrafficSchema = z.object({
    region: z.string().describe("GCP region (e.g., us-central1)"),
    serviceName: z.string().describe("Cloud Run service name"),
    traffic: z
        .array(
            z.object({
                revision: z.string().describe("Revision name"),
                percent: z.number().int().min(0).max(100).describe("Traffic percentage")
            })
        )
        .describe("Traffic split configuration (percentages must sum to 100)")
});

export type UpdateTrafficParams = z.infer<typeof updateTrafficSchema>;

/**
 * Update Traffic operation definition
 */
export const updateTrafficOperation: OperationDefinition = {
    id: "cloud_run_updateTraffic",
    name: "Update Traffic",
    description: "Update traffic split between service revisions",
    category: "cloud-run",
    inputSchema: updateTrafficSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute update traffic operation
 */
export async function executeUpdateTraffic(
    client: GoogleCloudClient,
    params: UpdateTrafficParams
): Promise<OperationResult> {
    try {
        const totalPercent = params.traffic.reduce((sum, t) => sum + t.percent, 0);
        if (totalPercent !== 100) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `Traffic percentages must sum to 100 (got ${totalPercent})`,
                    retryable: false
                }
            };
        }

        const requestBody = {
            apiVersion: "serving.knative.dev/v1",
            kind: "Service",
            spec: {
                traffic: params.traffic.map((t) => ({
                    revisionName: t.revision,
                    percent: t.percent
                }))
            }
        };

        const response = await client.cloudRun.patch<{
            name: string;
            metadata: {
                uid: string;
            };
        }>(
            `/projects/${client.projectId}/locations/${params.region}/services/${params.serviceName}`,
            requestBody
        );

        return {
            success: true,
            data: {
                operationName: response.name,
                serviceUid: response.metadata.uid,
                serviceName: params.serviceName,
                traffic: params.traffic,
                region: params.region,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update traffic",
                retryable: false
            }
        };
    }
}
