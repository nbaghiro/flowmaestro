import { z } from "zod";
import { SecretNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * List Secret Versions operation schema
 */
export const listSecretVersionsSchema = z.object({
    secretId: SecretNameSchema,
    pageSize: z.number().int().min(1).max(100).optional().describe("Number of versions per page"),
    pageToken: z.string().optional().describe("Token for pagination")
});

export type ListSecretVersionsParams = z.infer<typeof listSecretVersionsSchema>;

/**
 * List Secret Versions operation definition
 */
export const listSecretVersionsOperation: OperationDefinition = {
    id: "secret_manager_listSecretVersions",
    name: "List Secret Versions",
    description: "List all versions of a secret",
    category: "secret-manager",
    inputSchema: listSecretVersionsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list secret versions operation
 */
export async function executeListSecretVersions(
    client: GoogleCloudClient,
    params: ListSecretVersionsParams
): Promise<OperationResult> {
    try {
        const queryParams = new URLSearchParams();
        if (params.pageSize) {
            queryParams.append("pageSize", params.pageSize.toString());
        }
        if (params.pageToken) {
            queryParams.append("pageToken", params.pageToken);
        }

        const url = `/projects/${client.projectId}/secrets/${params.secretId}/versions${
            queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`;

        const response = await client.secretManager.get<{
            versions: Array<{
                name: string;
                createTime: string;
                state: string;
                destroyTime?: string;
            }>;
            nextPageToken?: string;
            totalSize: number;
        }>(url);

        return {
            success: true,
            data: {
                versions: response.versions || [],
                nextPageToken: response.nextPageToken,
                totalSize: response.totalSize,
                secretId: params.secretId,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list secret versions",
                retryable: true
            }
        };
    }
}
