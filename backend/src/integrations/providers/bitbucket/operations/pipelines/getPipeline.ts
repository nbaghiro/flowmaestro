import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketPipeline } from "../types";

/**
 * Get Pipeline operation schema
 */
export const getPipelineSchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug"),
    pipeline_uuid: z.string().min(1).describe("Pipeline UUID (with curly braces, e.g., '{uuid}')")
});

export type GetPipelineParams = z.infer<typeof getPipelineSchema>;

/**
 * Get Pipeline operation definition
 */
export const getPipelineOperation: OperationDefinition = {
    id: "getPipeline",
    name: "Get Pipeline",
    description: "Get details of a specific pipeline in a Bitbucket repository",
    category: "pipelines",
    inputSchema: getPipelineSchema,
    inputSchemaJSON: toJSONSchema(getPipelineSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute get pipeline operation
 */
export async function executeGetPipeline(
    client: BitbucketClient,
    params: GetPipelineParams
): Promise<OperationResult> {
    try {
        const pipeline = await client.get<BitbucketPipeline>(
            `/repositories/${params.workspace}/${params.repo_slug}/pipelines/${params.pipeline_uuid}`
        );

        return {
            success: true,
            data: {
                uuid: pipeline.uuid,
                build_number: pipeline.build_number,
                run_number: pipeline.run_number,
                state: {
                    type: pipeline.state.type,
                    name: pipeline.state.name,
                    result: pipeline.state.result
                        ? {
                              type: pipeline.state.result.type,
                              name: pipeline.state.result.name
                          }
                        : null,
                    stage: pipeline.state.stage
                        ? {
                              type: pipeline.state.stage.type,
                              name: pipeline.state.stage.name
                          }
                        : null
                },
                target: {
                    type: pipeline.target.type,
                    ref_type: pipeline.target.ref_type,
                    ref_name: pipeline.target.ref_name,
                    selector: pipeline.target.selector,
                    commit: pipeline.target.commit?.hash
                },
                trigger: {
                    type: pipeline.trigger.type,
                    name: pipeline.trigger.name
                },
                creator: pipeline.creator
                    ? {
                          uuid: pipeline.creator.uuid,
                          display_name: pipeline.creator.display_name,
                          username: pipeline.creator.username
                      }
                    : null,
                created_on: pipeline.created_on,
                completed_on: pipeline.completed_on,
                duration_in_seconds: pipeline.duration_in_seconds,
                build_seconds_used: pipeline.build_seconds_used,
                first_successful: pipeline.first_successful,
                expired: pipeline.expired,
                html_url: pipeline.links.html?.href
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get pipeline",
                retryable: true
            }
        };
    }
}
