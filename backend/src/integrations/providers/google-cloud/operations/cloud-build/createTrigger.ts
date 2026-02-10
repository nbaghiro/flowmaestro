import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Create Trigger operation schema
 */
export const createTriggerSchema = z.object({
    name: z.string().min(1).max(64).describe("Trigger name"),
    description: z.string().optional().describe("Trigger description"),
    disabled: z.boolean().optional().describe("Whether trigger is disabled"),
    github: z
        .object({
            owner: z.string().describe("GitHub repository owner"),
            name: z.string().describe("GitHub repository name"),
            push: z
                .object({
                    branch: z.string().describe("Branch pattern (regex)")
                })
                .optional(),
            pullRequest: z
                .object({
                    branch: z.string().describe("Branch pattern (regex)")
                })
                .optional()
        })
        .optional()
        .describe("GitHub trigger configuration"),
    filename: z
        .string()
        .optional()
        .describe("Path to cloudbuild.yaml (defaults to cloudbuild.yaml)"),
    substitutions: z.record(z.string()).optional().describe("Substitution variables")
});

export type CreateTriggerParams = z.infer<typeof createTriggerSchema>;

/**
 * Create Trigger operation definition
 */
export const createTriggerOperation: OperationDefinition = {
    id: "cloud_build_createTrigger",
    name: "Create Trigger",
    description: "Create a new build trigger",
    category: "cloud-build",
    inputSchema: createTriggerSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute create trigger operation
 */
export async function executeCreateTrigger(
    client: GoogleCloudClient,
    params: CreateTriggerParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            name: params.name
        };

        if (params.description) {
            requestBody.description = params.description;
        }

        if (params.disabled !== undefined) {
            requestBody.disabled = params.disabled;
        }

        if (params.github) {
            requestBody.github = params.github;
        }

        if (params.filename) {
            requestBody.filename = params.filename;
        }

        if (params.substitutions) {
            requestBody.substitutions = params.substitutions;
        }

        const response = await client.cloudBuild.post<{
            id: string;
            name: string;
            description?: string;
            disabled: boolean;
            createTime: string;
        }>(`/projects/${client.projectId}/triggers`, requestBody);

        return {
            success: true,
            data: {
                id: response.id,
                name: response.name,
                description: response.description,
                disabled: response.disabled,
                createTime: response.createTime,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create trigger",
                retryable: false
            }
        };
    }
}
