import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketPipeline, BitbucketPaginatedResponse } from "../types";

/**
 * List Pipelines operation schema
 */
export const listPipelinesSchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug"),
    sort: z
        .string()
        .optional()
        .describe("Field to sort by (e.g., '-created_on' for descending by creation date)"),
    pagelen: z.number().int().min(1).max(50).optional().default(20).describe("Results per page"),
    page: z.number().int().min(1).optional().default(1).describe("Page number")
});

export type ListPipelinesParams = z.infer<typeof listPipelinesSchema>;

/**
 * List Pipelines operation definition
 */
export const listPipelinesOperation: OperationDefinition = {
    id: "listPipelines",
    name: "List Pipelines",
    description:
        "List pipelines in a Bitbucket repository (requires Pipelines to be enabled on the repository)",
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
    client: BitbucketClient,
    params: ListPipelinesParams
): Promise<OperationResult> {
    try {
        const { workspace, repo_slug, ...queryParams } = params;

        const response = await client.get<BitbucketPaginatedResponse<BitbucketPipeline>>(
            `/repositories/${workspace}/${repo_slug}/pipelines`,
            queryParams
        );

        return {
            success: true,
            data: {
                pipelines: response.values.map((pipeline) => ({
                    uuid: pipeline.uuid,
                    build_number: pipeline.build_number,
                    state: {
                        name: pipeline.state.name,
                        result: pipeline.state.result?.name
                    },
                    target: {
                        type: pipeline.target.type,
                        ref_type: pipeline.target.ref_type,
                        ref_name: pipeline.target.ref_name,
                        commit: pipeline.target.commit?.hash
                    },
                    trigger: {
                        type: pipeline.trigger.type,
                        name: pipeline.trigger.name
                    },
                    creator: pipeline.creator
                        ? {
                              uuid: pipeline.creator.uuid,
                              display_name: pipeline.creator.display_name
                          }
                        : null,
                    created_on: pipeline.created_on,
                    completed_on: pipeline.completed_on,
                    duration_in_seconds: pipeline.duration_in_seconds,
                    build_seconds_used: pipeline.build_seconds_used,
                    html_url: pipeline.links.html?.href
                })),
                count: response.values.length,
                has_more: !!response.next
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to list pipelines";
        if (errorMessage.includes("404") || errorMessage.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message:
                        "Pipelines are not enabled for this repository. Enable them in repository settings.",
                    retryable: false
                }
            };
        }
        return {
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: true
            }
        };
    }
}
