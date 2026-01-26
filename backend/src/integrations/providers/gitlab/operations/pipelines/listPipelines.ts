import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabPipeline } from "../types";

/**
 * List Pipelines operation schema
 */
export const listPipelinesSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')"),
    status: z
        .enum([
            "created",
            "waiting_for_resource",
            "preparing",
            "pending",
            "running",
            "success",
            "failed",
            "canceled",
            "skipped",
            "manual",
            "scheduled"
        ])
        .optional()
        .describe("Filter by pipeline status"),
    ref: z.string().optional().describe("Filter by branch or tag name"),
    sha: z.string().optional().describe("Filter by commit SHA"),
    source: z
        .enum([
            "push",
            "web",
            "trigger",
            "schedule",
            "api",
            "external",
            "pipeline",
            "chat",
            "webide",
            "merge_request_event",
            "external_pull_request_event",
            "parent_pipeline",
            "ondemand_dast_scan",
            "ondemand_dast_validation"
        ])
        .optional()
        .describe("Filter by pipeline source"),
    order_by: z
        .enum(["id", "status", "ref", "updated_at", "user_id"])
        .optional()
        .default("id")
        .describe("Order pipelines by field"),
    sort: z.enum(["asc", "desc"]).optional().default("desc").describe("Sort direction"),
    per_page: z.number().int().min(1).max(100).optional().default(20).describe("Results per page"),
    page: z.number().int().min(1).optional().default(1).describe("Page number")
});

export type ListPipelinesParams = z.infer<typeof listPipelinesSchema>;

/**
 * List Pipelines operation definition
 */
export const listPipelinesOperation: OperationDefinition = {
    id: "listPipelines",
    name: "List Pipelines",
    description: "List CI/CD pipelines in a GitLab project",
    category: "pipelines",
    inputSchema: listPipelinesSchema,
    inputSchemaJSON: toJSONSchema(listPipelinesSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute list pipelines operation
 */
export async function executeListPipelines(
    client: GitLabClient,
    params: ListPipelinesParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);
        const { project_id: _projectId, ...queryParams } = params;

        const pipelines = await client.get<GitLabPipeline[]>(
            `/projects/${projectId}/pipelines`,
            queryParams
        );

        return {
            success: true,
            data: {
                pipelines: pipelines.map((pipeline) => ({
                    id: pipeline.id,
                    iid: pipeline.iid,
                    project_id: pipeline.project_id,
                    status: pipeline.status,
                    source: pipeline.source,
                    ref: pipeline.ref,
                    sha: pipeline.sha,
                    web_url: pipeline.web_url,
                    created_at: pipeline.created_at,
                    updated_at: pipeline.updated_at,
                    started_at: pipeline.started_at,
                    finished_at: pipeline.finished_at,
                    duration: pipeline.duration,
                    coverage: pipeline.coverage
                })),
                count: pipelines.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list pipelines",
                retryable: true
            }
        };
    }
}
