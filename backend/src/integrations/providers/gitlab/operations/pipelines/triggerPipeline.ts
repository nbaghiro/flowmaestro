import { z } from "zod";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabPipeline } from "../types";

/**
 * Trigger Pipeline operation schema
 */
export const triggerPipelineSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')"),
    ref: z.string().min(1).describe("Branch or tag name to run the pipeline on"),
    variables: z
        .array(
            z.object({
                key: z.string().describe("Variable key"),
                value: z.string().describe("Variable value"),
                variable_type: z
                    .enum(["env_var", "file"])
                    .optional()
                    .default("env_var")
                    .describe("Variable type")
            })
        )
        .optional()
        .describe("Pipeline variables to set")
});

export type TriggerPipelineParams = z.infer<typeof triggerPipelineSchema>;

/**
 * Trigger Pipeline operation definition
 */
export const triggerPipelineOperation: OperationDefinition = {
    id: "triggerPipeline",
    name: "Trigger Pipeline",
    description: "Trigger a new CI/CD pipeline in a GitLab project",
    category: "pipelines",
    actionType: "write",
    inputSchema: triggerPipelineSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute trigger pipeline operation
 */
export async function executeTriggerPipeline(
    client: GitLabClient,
    params: TriggerPipelineParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);

        // Build request body
        const requestBody: Record<string, unknown> = {
            ref: params.ref
        };

        // Add variables if provided
        if (params.variables && params.variables.length > 0) {
            requestBody.variables = params.variables;
        }

        const pipeline = await client.post<GitLabPipeline>(
            `/projects/${projectId}/pipeline`,
            requestBody
        );

        return {
            success: true,
            data: {
                id: pipeline.id,
                iid: pipeline.iid,
                project_id: pipeline.project_id,
                status: pipeline.status,
                source: pipeline.source,
                ref: pipeline.ref,
                sha: pipeline.sha,
                web_url: pipeline.web_url,
                created_at: pipeline.created_at,
                user: pipeline.user
                    ? {
                          id: pipeline.user.id,
                          username: pipeline.user.username,
                          name: pipeline.user.name
                      }
                    : null
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to trigger pipeline",
                retryable: false
            }
        };
    }
}
