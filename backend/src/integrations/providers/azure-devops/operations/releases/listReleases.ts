import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const listReleasesSchema = z.object({
    project: z.string()
});

export type ListReleasesParams = z.infer<typeof listReleasesSchema>;

export const listReleasesOperation: OperationDefinition = {
    id: "releases_list",
    name: "List Releases",
    description: "List all release definitions",
    category: "releases",
    inputSchema: listReleasesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListReleases(
    client: AzureDevOpsClient,
    params: ListReleasesParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{ value: Array<Record<string, unknown>>; count: number }>(
            `/${params.project}/_apis/release/definitions`
        );
        return {
            success: true,
            data: {
                releases: response.value,
                count: response.count,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list releases",
                retryable: true
            }
        };
    }
}
