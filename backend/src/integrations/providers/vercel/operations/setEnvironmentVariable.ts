import { z } from "zod";
import type { VercelEnvVarOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { VercelClient } from "../client/VercelClient";

export const setEnvironmentVariableSchema = z.object({
    projectId: z.string().min(1).describe("Project ID or name"),
    key: z.string().min(1).describe("Environment variable name"),
    value: z.string().describe("Environment variable value"),
    type: z
        .enum(["plain", "encrypted", "secret", "sensitive"])
        .optional()
        .describe("Variable type (default: encrypted)"),
    target: z
        .array(z.enum(["production", "preview", "development"]))
        .min(1)
        .describe("Target environments for this variable"),
    gitBranch: z.string().optional().describe("Git branch for preview-specific variables")
});

export type SetEnvironmentVariableParams = z.infer<typeof setEnvironmentVariableSchema>;

export const setEnvironmentVariableOperation: OperationDefinition = {
    id: "setEnvironmentVariable",
    name: "Set Environment Variable",
    description: "Create or update an environment variable for a Vercel project",
    category: "environment",
    actionType: "write",
    inputSchema: setEnvironmentVariableSchema,
    retryable: false,
    timeout: 30000
};

export async function executeSetEnvironmentVariable(
    client: VercelClient,
    params: SetEnvironmentVariableParams
): Promise<OperationResult> {
    try {
        const envVar = await client.createEnvironmentVariable(params.projectId, {
            key: params.key,
            value: params.value,
            type: params.type,
            target: params.target,
            gitBranch: params.gitBranch
        });

        const formattedEnvVar: VercelEnvVarOutput = {
            id: envVar.id,
            key: envVar.key,
            value: "[SET]",
            type: envVar.type,
            target: envVar.target,
            gitBranch: envVar.gitBranch,
            createdAt: envVar.createdAt
        };

        return {
            success: true,
            data: {
                environmentVariable: formattedEnvVar,
                message: `Environment variable ${envVar.key} set successfully`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to set environment variable",
                retryable: false
            }
        };
    }
}
