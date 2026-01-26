import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketPipeline } from "../types";

/**
 * Trigger Pipeline operation schema
 */
export const triggerPipelineSchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug"),
    target_type: z
        .enum(["branch", "tag", "commit", "pullrequest"])
        .optional()
        .default("branch")
        .describe("Type of ref to run pipeline on"),
    target_ref: z.string().min(1).describe("Branch name, tag name, or commit hash"),
    selector_type: z
        .enum(["branches", "tags", "custom", "pull-requests"])
        .optional()
        .describe("Pipeline selector type (for custom pipelines)"),
    selector_pattern: z
        .string()
        .optional()
        .describe("Pipeline selector pattern (e.g., custom pipeline name)"),
    variables: z
        .array(
            z.object({
                key: z.string().describe("Variable key"),
                value: z.string().describe("Variable value"),
                secured: z.boolean().optional().default(false).describe("Mark as secured variable")
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
    description: "Trigger a new pipeline in a Bitbucket repository",
    category: "pipelines",
    actionType: "write",
    inputSchema: triggerPipelineSchema,
    inputSchemaJSON: toJSONSchema(triggerPipelineSchema),
    retryable: false,
    timeout: 30000
};

/**
 * Execute trigger pipeline operation
 */
export async function executeTriggerPipeline(
    client: BitbucketClient,
    params: TriggerPipelineParams
): Promise<OperationResult> {
    try {
        const {
            workspace,
            repo_slug,
            target_type,
            target_ref,
            selector_type,
            selector_pattern,
            variables
        } = params;

        const requestBody: Record<string, unknown> = {
            target: {
                type: "pipeline_ref_target",
                ref_type: target_type === "branch" ? "branch" : target_type,
                ref_name: target_ref
            }
        };

        // Add selector for custom pipelines
        if (selector_type && selector_pattern) {
            (requestBody.target as Record<string, unknown>).selector = {
                type: selector_type,
                pattern: selector_pattern
            };
        }

        // Add variables if provided
        if (variables && variables.length > 0) {
            requestBody.variables = variables;
        }

        const pipeline = await client.post<BitbucketPipeline>(
            `/repositories/${workspace}/${repo_slug}/pipelines`,
            requestBody
        );

        return {
            success: true,
            data: {
                uuid: pipeline.uuid,
                build_number: pipeline.build_number,
                state: {
                    name: pipeline.state.name,
                    result: pipeline.state.result?.name
                },
                target: {
                    type: pipeline.target.type,
                    ref_type: pipeline.target.ref_type,
                    ref_name: pipeline.target.ref_name
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
                html_url: pipeline.links.html?.href
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to trigger pipeline";
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
                retryable: false
            }
        };
    }
}
