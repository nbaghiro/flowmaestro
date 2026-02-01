import { z } from "zod";
import type { CircleCIArtifactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CircleCIClient } from "../client/CircleCIClient";

export const getJobArtifactsSchema = z.object({
    projectSlug: z.string().min(1).describe("Project slug (e.g., gh/owner/repo)"),
    jobNumber: z.number().int().positive().describe("Job number")
});

export type GetJobArtifactsParams = z.infer<typeof getJobArtifactsSchema>;

export const getJobArtifactsOperation: OperationDefinition = {
    id: "getJobArtifacts",
    name: "Get Job Artifacts",
    description: "Get artifacts from a completed CircleCI job",
    category: "jobs",
    inputSchema: getJobArtifactsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetJobArtifacts(
    client: CircleCIClient,
    params: GetJobArtifactsParams
): Promise<OperationResult> {
    try {
        const artifacts = await client.getJobArtifacts(params.projectSlug, params.jobNumber);

        const formattedArtifacts: CircleCIArtifactOutput[] = artifacts.map((a) => ({
            path: a.path,
            url: a.url,
            nodeIndex: a.node_index
        }));

        return {
            success: true,
            data: {
                artifacts: formattedArtifacts,
                count: formattedArtifacts.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get job artifacts",
                retryable: true
            }
        };
    }
}
