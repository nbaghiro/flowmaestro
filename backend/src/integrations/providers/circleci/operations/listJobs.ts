import { z } from "zod";
import type { CircleCIJobOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CircleCIClient } from "../client/CircleCIClient";

export const listJobsSchema = z.object({
    workflowId: z.string().min(1).describe("Workflow ID (UUID) to list jobs for")
});

export type ListJobsParams = z.infer<typeof listJobsSchema>;

export const listJobsOperation: OperationDefinition = {
    id: "listJobs",
    name: "List Jobs",
    description: "List all jobs in a CircleCI workflow",
    category: "jobs",
    inputSchema: listJobsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListJobs(
    client: CircleCIClient,
    params: ListJobsParams
): Promise<OperationResult> {
    try {
        const jobs = await client.listJobs(params.workflowId);

        const formattedJobs: CircleCIJobOutput[] = jobs.map((j) => ({
            id: j.id,
            name: j.name,
            jobNumber: j.job_number,
            projectSlug: j.project_slug,
            status: j.status,
            type: j.type,
            startedAt: j.started_at,
            stoppedAt: j.stopped_at,
            dependencies: j.dependencies
        }));

        return {
            success: true,
            data: {
                jobs: formattedJobs,
                count: formattedJobs.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list jobs",
                retryable: true
            }
        };
    }
}
