import { z } from "zod";
import type { CircleCIPipelineOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CircleCIClient } from "../client/CircleCIClient";

export const triggerPipelineSchema = z.object({
    projectSlug: z.string().min(1).describe("Project slug (e.g., gh/owner/repo or bb/owner/repo)"),
    branch: z.string().optional().describe("Branch to build"),
    tag: z.string().optional().describe("Tag to build (mutually exclusive with branch)"),
    parameters: z.record(z.unknown()).optional().describe("Pipeline parameters to pass")
});

export type TriggerPipelineParams = z.infer<typeof triggerPipelineSchema>;

export const triggerPipelineOperation: OperationDefinition = {
    id: "triggerPipeline",
    name: "Trigger Pipeline",
    description: "Trigger a new pipeline for a CircleCI project",
    category: "pipelines",
    actionType: "write",
    inputSchema: triggerPipelineSchema,
    retryable: false,
    timeout: 60000
};

export async function executeTriggerPipeline(
    client: CircleCIClient,
    params: TriggerPipelineParams
): Promise<OperationResult> {
    try {
        const pipeline = await client.triggerPipeline(params.projectSlug, {
            branch: params.branch,
            tag: params.tag,
            parameters: params.parameters
        });

        const formattedPipeline: CircleCIPipelineOutput = {
            id: pipeline.id,
            number: pipeline.number,
            projectSlug: pipeline.project_slug,
            state: pipeline.state,
            createdAt: pipeline.created_at,
            trigger: {
                type: pipeline.trigger.type,
                actor: pipeline.trigger.actor.login
            },
            vcs: pipeline.vcs
                ? {
                      branch: pipeline.vcs.branch,
                      tag: pipeline.vcs.tag,
                      revision: pipeline.vcs.revision,
                      commitSubject: pipeline.vcs.commit?.subject
                  }
                : undefined
        };

        return {
            success: true,
            data: {
                pipeline: formattedPipeline,
                message: `Pipeline ${pipeline.number} triggered successfully`
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
