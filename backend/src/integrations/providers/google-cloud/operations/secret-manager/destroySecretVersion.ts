import { z } from "zod";
import { SecretNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Destroy Secret Version operation schema
 */
export const destroySecretVersionSchema = z.object({
    secretId: SecretNameSchema,
    version: z.string().describe("Version ID to destroy")
});

export type DestroySecretVersionParams = z.infer<typeof destroySecretVersionSchema>;

/**
 * Destroy Secret Version operation definition
 */
export const destroySecretVersionOperation: OperationDefinition = {
    id: "secret_manager_destroySecretVersion",
    name: "Destroy Secret Version",
    description: "Permanently destroy a secret version (cannot be undone)",
    category: "secret-manager",
    inputSchema: destroySecretVersionSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute destroy secret version operation
 */
export async function executeDestroySecretVersion(
    client: GoogleCloudClient,
    params: DestroySecretVersionParams
): Promise<OperationResult> {
    try {
        const response = await client.secretManager.post<{
            name: string;
            destroyTime: string;
            state: string;
        }>(
            `/projects/${client.projectId}/secrets/${params.secretId}/versions/${params.version}:destroy`,
            {}
        );

        return {
            success: true,
            data: {
                name: response.name,
                secretId: params.secretId,
                version: params.version,
                destroyTime: response.destroyTime,
                state: response.state,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to destroy secret version",
                retryable: false
            }
        };
    }
}
