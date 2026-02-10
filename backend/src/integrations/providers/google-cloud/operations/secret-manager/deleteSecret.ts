import { z } from "zod";
import { SecretNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Delete Secret operation schema
 */
export const deleteSecretSchema = z.object({
    secretId: SecretNameSchema
});

export type DeleteSecretParams = z.infer<typeof deleteSecretSchema>;

/**
 * Delete Secret operation definition
 */
export const deleteSecretOperation: OperationDefinition = {
    id: "secret_manager_deleteSecret",
    name: "Delete Secret",
    description: "Delete a secret and all its versions",
    category: "secret-manager",
    inputSchema: deleteSecretSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete secret operation
 */
export async function executeDeleteSecret(
    client: GoogleCloudClient,
    params: DeleteSecretParams
): Promise<OperationResult> {
    try {
        await client.secretManager.delete(
            `/projects/${client.projectId}/secrets/${params.secretId}`
        );

        return {
            success: true,
            data: {
                secretId: params.secretId,
                message: "Secret deleted successfully",
                deletedAt: new Date().toISOString(),
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete secret",
                retryable: false
            }
        };
    }
}
