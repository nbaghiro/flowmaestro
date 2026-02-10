import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * List Revisions operation schema
 */
export const listRevisionsSchema = z.object({
    region: z.string().describe("GCP region (e.g., us-central1)"),
    serviceName: z.string().describe("Cloud Run service name"),
    pageSize: z.number().int().min(1).max(100).optional().describe("Number of revisions per page"),
    pageToken: z.string().optional().describe("Token for pagination")
});

export type ListRevisionsParams = z.infer<typeof listRevisionsSchema>;

/**
 * List Revisions operation definition
 */
export const listRevisionsOperation: OperationDefinition = {
    id: "cloud_run_listRevisions",
    name: "List Revisions",
    description: "List all revisions of a Cloud Run service",
    category: "cloud-run",
    inputSchema: listRevisionsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list revisions operation
 */
export async function executeListRevisions(
    client: GoogleCloudClient,
    params: ListRevisionsParams
): Promise<OperationResult> {
    try {
        const queryParams = new URLSearchParams();
        if (params.pageSize) {
            queryParams.append("pageSize", params.pageSize.toString());
        }
        if (params.pageToken) {
            queryParams.append("pageToken", params.pageToken);
        }

        const url = `/projects/${client.projectId}/locations/${params.region}/services/${params.serviceName}/revisions${
            queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`;

        const response = await client.cloudRun.get<{
            revisions: Array<{
                name: string;
                uid: string;
                createTime: string;
                updateTime: string;
                containerImage: string;
                serving: boolean;
            }>;
            nextPageToken?: string;
        }>(url);

        return {
            success: true,
            data: {
                revisions: response.revisions || [],
                nextPageToken: response.nextPageToken,
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
                message: error instanceof Error ? error.message : "Failed to list revisions",
                retryable: true
            }
        };
    }
}
