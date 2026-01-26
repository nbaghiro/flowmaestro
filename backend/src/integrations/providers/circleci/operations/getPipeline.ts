import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { CircleCIPipelineOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CircleCIClient } from "../client/CircleCIClient";

export const getPipelineSchema = z.object({
    pipelineId: z.string().min(1).describe("Pipeline ID (UUID)")
});

export type GetPipelineParams = z.infer<typeof getPipelineSchema>;

export const getPipelineOperation: OperationDefinition = {
    id: "getPipeline",
    name: "Get Pipeline",
    description: "Get details of a specific CircleCI pipeline",
    category: "pipelines",
    inputSchema: getPipelineSchema,
    inputSchemaJSON: toJSONSchema(getPipelineSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetPipeline(
    client: CircleCIClient,
    params: GetPipelineParams
): Promise<OperationResult> {
    try {
        const pipeline = await client.getPipeline(params.pipelineId);

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
                pipeline: formattedPipeline
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
