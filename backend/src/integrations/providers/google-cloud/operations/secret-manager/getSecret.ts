import { z } from "zod";
import { SecretNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Get Secret operation schema
 */
export const getSecretSchema = z.object({
    secretId: SecretNameSchema
});

export type GetSecretParams = z.infer<typeof getSecretSchema>;

/**
 * Get Secret operation definition
 */
export const getSecretOperation: OperationDefinition = {
    id: "secret_manager_getSecret",
    name: "Get Secret",
    description: "Get secret metadata (without payload data)",
    category: "secret-manager",
    inputSchema: getSecretSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get secret operation
 */
export async function executeGetSecret(
    client: GoogleCloudClient,
    params: GetSecretParams
): Promise<OperationResult> {
    try {
        const response = await client.secretManager.get<{
            name: string;
            replication: object;
            createTime: string;
            labels?: Record<string, string>;
        }>(`/projects/${client.projectId}/secrets/${params.secretId}`);

        return {
            success: true,
            data: {
                name: response.name,
                secretId: params.secretId,
                replication: response.replication,
                createTime: response.createTime,
                labels: response.labels,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get secret",
                retryable: true
            }
        };
    }
}
