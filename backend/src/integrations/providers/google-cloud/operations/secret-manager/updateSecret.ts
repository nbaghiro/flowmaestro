import { z } from "zod";
import { SecretNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Update Secret operation schema
 */
export const updateSecretSchema = z.object({
    secretId: SecretNameSchema,
    labels: z.record(z.string()).optional().describe("Updated labels for the secret")
});

export type UpdateSecretParams = z.infer<typeof updateSecretSchema>;

/**
 * Update Secret operation definition
 */
export const updateSecretOperation: OperationDefinition = {
    id: "secret_manager_updateSecret",
    name: "Update Secret",
    description: "Update secret metadata (labels only)",
    category: "secret-manager",
    inputSchema: updateSecretSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute update secret operation
 */
export async function executeUpdateSecret(
    client: GoogleCloudClient,
    params: UpdateSecretParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {};
        const updateMask: string[] = [];

        if (params.labels) {
            requestBody.labels = params.labels;
            updateMask.push("labels");
        }

        const queryParams = new URLSearchParams();
        if (updateMask.length > 0) {
            queryParams.append("updateMask", updateMask.join(","));
        }

        const url = `/projects/${client.projectId}/secrets/${params.secretId}${
            queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`;

        const response = await client.secretManager.patch<{
            name: string;
            labels?: Record<string, string>;
            createTime: string;
        }>(url, requestBody);

        return {
            success: true,
            data: {
                name: response.name,
                secretId: params.secretId,
                labels: response.labels,
                createTime: response.createTime,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update secret",
                retryable: false
            }
        };
    }
}
