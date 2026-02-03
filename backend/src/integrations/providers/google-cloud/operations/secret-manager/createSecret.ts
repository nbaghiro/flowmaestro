import { z } from "zod";
import { SecretNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Create Secret operation schema
 */
export const createSecretSchema = z.object({
    secretId: SecretNameSchema,
    labels: z.record(z.string()).optional().describe("Labels for the secret"),
    replication: z
        .object({
            automatic: z.object({}).optional().describe("Automatic replication"),
            userManaged: z
                .object({
                    replicas: z.array(
                        z.object({
                            location: z.string().describe("Location for replica")
                        })
                    )
                })
                .optional()
                .describe("User-managed replication")
        })
        .optional()
        .describe("Replication policy (defaults to automatic)")
});

export type CreateSecretParams = z.infer<typeof createSecretSchema>;

/**
 * Create Secret operation definition
 */
export const createSecretOperation: OperationDefinition = {
    id: "secret_manager_createSecret",
    name: "Create Secret",
    description: "Create a new secret (without payload data)",
    category: "secret-manager",
    inputSchema: createSecretSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute create secret operation
 */
export async function executeCreateSecret(
    client: GoogleCloudClient,
    params: CreateSecretParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            replication: params.replication || { automatic: {} }
        };

        if (params.labels) {
            requestBody.labels = params.labels;
        }

        const response = await client.secretManager.post<{
            name: string;
            replication: object;
            createTime: string;
            labels?: Record<string, string>;
        }>(
            `/projects/${client.projectId}/secrets?secretId=${encodeURIComponent(params.secretId)}`,
            requestBody
        );

        return {
            success: true,
            data: {
                name: response.name,
                secretId: params.secretId,
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
                message: error instanceof Error ? error.message : "Failed to create secret",
                retryable: false
            }
        };
    }
}
