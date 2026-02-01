import { z } from "zod";
import type { VercelEnvVarOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { VercelClient } from "../client/VercelClient";

export const getEnvironmentVariablesSchema = z.object({
    projectId: z.string().min(1).describe("Project ID or name"),
    decrypt: z
        .boolean()
        .optional()
        .describe("Whether to decrypt secret values (requires appropriate permissions)")
});

export type GetEnvironmentVariablesParams = z.infer<typeof getEnvironmentVariablesSchema>;

export const getEnvironmentVariablesOperation: OperationDefinition = {
    id: "getEnvironmentVariables",
    name: "Get Environment Variables",
    description: "Get all environment variables for a Vercel project",
    category: "environment",
    inputSchema: getEnvironmentVariablesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetEnvironmentVariables(
    client: VercelClient,
    params: GetEnvironmentVariablesParams
): Promise<OperationResult> {
    try {
        const envVars = await client.getEnvironmentVariables(params.projectId, {
            decrypt: params.decrypt
        });

        const formattedEnvVars: VercelEnvVarOutput[] = envVars.map((e) => ({
            id: e.id,
            key: e.key,
            value: e.decrypted ? e.value : "[ENCRYPTED]",
            type: e.type,
            target: e.target,
            gitBranch: e.gitBranch,
            createdAt: e.createdAt
        }));

        return {
            success: true,
            data: {
                environmentVariables: formattedEnvVars,
                count: formattedEnvVars.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to get environment variables",
                retryable: true
            }
        };
    }
}
