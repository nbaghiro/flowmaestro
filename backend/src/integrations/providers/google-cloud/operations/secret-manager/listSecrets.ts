import { z } from "zod";
import { PageSizeSchema, PageTokenSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * List Secrets operation schema
 */
export const listSecretsSchema = z.object({
    pageSize: PageSizeSchema.optional(),
    pageToken: PageTokenSchema,
    filter: z.string().optional().describe("Filter expression")
});

export type ListSecretsParams = z.infer<typeof listSecretsSchema>;

/**
 * List Secrets operation definition
 */
export const listSecretsOperation: OperationDefinition = {
    id: "secret_manager_listSecrets",
    name: "List Secrets",
    description: "List all secrets in the project",
    category: "secret-manager",
    inputSchema: listSecretsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list secrets operation
 */
export async function executeListSecrets(
    client: GoogleCloudClient,
    params: ListSecretsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {};

        if (params.pageSize) {
            queryParams.pageSize = params.pageSize.toString();
        }

        if (params.pageToken) {
            queryParams.pageToken = params.pageToken;
        }

        if (params.filter) {
            queryParams.filter = params.filter;
        }

        const response = await client.secretManager.get<{
            secrets: Array<{
                name: string;
                replication: {
                    automatic?: object;
                    userManaged?: {
                        replicas: Array<{
                            location: string;
                        }>;
                    };
                };
                createTime: string;
                labels?: Record<string, string>;
            }>;
            nextPageToken?: string;
        }>(`/projects/${client.projectId}/secrets`, queryParams);

        return {
            success: true,
            data: {
                secrets: response.secrets || [],
                nextPageToken: response.nextPageToken,
                secretCount: (response.secrets || []).length,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list secrets",
                retryable: true
            }
        };
    }
}
