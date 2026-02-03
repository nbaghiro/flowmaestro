import { z } from "zod";
import { SecretNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Access Secret Version operation schema
 */
export const accessSecretVersionSchema = z.object({
    secretId: SecretNameSchema,
    version: z.string().default("latest").describe("Version ID or 'latest'")
});

export type AccessSecretVersionParams = z.infer<typeof accessSecretVersionSchema>;

/**
 * Access Secret Version operation definition
 */
export const accessSecretVersionOperation: OperationDefinition = {
    id: "secret_manager_accessSecretVersion",
    name: "Access Secret Version",
    description: "Get secret payload data from a specific version",
    category: "secret-manager",
    inputSchema: accessSecretVersionSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute access secret version operation
 */
export async function executeAccessSecretVersion(
    client: GoogleCloudClient,
    params: AccessSecretVersionParams
): Promise<OperationResult> {
    try {
        const response = await client.secretManager.get<{
            name: string;
            payload: {
                data: string;
            };
        }>(
            `/projects/${client.projectId}/secrets/${params.secretId}/versions/${params.version}:access`
        );

        // Decode base64 payload
        const decodedPayload = Buffer.from(response.payload.data, "base64").toString("utf-8");

        return {
            success: true,
            data: {
                name: response.name,
                secretId: params.secretId,
                version: params.version,
                payload: decodedPayload,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to access secret version",
                retryable: true
            }
        };
    }
}
