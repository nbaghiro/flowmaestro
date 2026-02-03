import { z } from "zod";
import { SecretNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Add Secret Version operation schema
 */
export const addSecretVersionSchema = z.object({
    secretId: SecretNameSchema,
    payload: z.string().describe("Secret payload data (will be base64 encoded)")
});

export type AddSecretVersionParams = z.infer<typeof addSecretVersionSchema>;

/**
 * Add Secret Version operation definition
 */
export const addSecretVersionOperation: OperationDefinition = {
    id: "secret_manager_addSecretVersion",
    name: "Add Secret Version",
    description: "Add a new version to an existing secret with payload data",
    category: "secret-manager",
    inputSchema: addSecretVersionSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute add secret version operation
 */
export async function executeAddSecretVersion(
    client: GoogleCloudClient,
    params: AddSecretVersionParams
): Promise<OperationResult> {
    try {
        // Base64 encode the payload
        const encodedPayload = Buffer.from(params.payload).toString("base64");

        const requestBody = {
            payload: {
                data: encodedPayload
            }
        };

        const response = await client.secretManager.post<{
            name: string;
            createTime: string;
            state: string;
        }>(`/projects/${client.projectId}/secrets/${params.secretId}:addVersion`, requestBody);

        return {
            success: true,
            data: {
                name: response.name,
                secretId: params.secretId,
                createTime: response.createTime,
                state: response.state,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add secret version",
                retryable: false
            }
        };
    }
}
