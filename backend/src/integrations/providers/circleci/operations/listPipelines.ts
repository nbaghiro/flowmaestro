import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { CircleCIPipelineOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CircleCIClient } from "../client/CircleCIClient";

export const listPipelinesSchema = z.object({
    projectSlug: z.string().min(1).describe("Project slug (e.g., gh/owner/repo or bb/owner/repo)"),
    branch: z.string().optional().describe("Filter pipelines by branch name")
});

export type ListPipelinesParams = z.infer<typeof listPipelinesSchema>;

export const listPipelinesOperation: OperationDefinition = {
    id: "listPipelines",
    name: "List Pipelines",
    description: "List all pipelines for a CircleCI project",
    category: "pipelines",
    inputSchema: listPipelinesSchema,
    inputSchemaJSON: toJSONSchema(listPipelinesSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListPipelines(
    client: CircleCIClient,
    params: ListPipelinesParams
): Promise<OperationResult> {
    try {
        const pipelines = await client.listPipelines(params.projectSlug, {
            branch: params.branch
        });

        const formattedPipelines: CircleCIPipelineOutput[] = pipelines.map((p) => ({
            id: p.id,
            number: p.number,
            projectSlug: p.project_slug,
            state: p.state,
            createdAt: p.created_at,
            trigger: {
                type: p.trigger.type,
                actor: p.trigger.actor.login
            },
            vcs: p.vcs
                ? {
                      branch: p.vcs.branch,
                      tag: p.vcs.tag,
                      revision: p.vcs.revision,
                      commitSubject: p.vcs.commit?.subject
                  }
                : undefined
        }));

        return {
            success: true,
            data: {
                pipelines: formattedPipelines,
                count: formattedPipelines.length
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
