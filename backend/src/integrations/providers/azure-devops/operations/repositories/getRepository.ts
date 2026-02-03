import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const getRepositorySchema = z.object({
    project: z.string().describe("Project name or ID"),
    repositoryId: z.string().describe("Repository ID or name")
});

export type GetRepositoryParams = z.infer<typeof getRepositorySchema>;

export const getRepositoryOperation: OperationDefinition = {
    id: "repositories_get",
    name: "Get Repository",
    description: "Get detailed information about a repository",
    category: "repositories",
    inputSchema: getRepositorySchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetRepository(
    client: AzureDevOpsClient,
    params: GetRepositoryParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{
            id: string;
            name: string;
            url: string;
            defaultBranch: string;
            size: number;
            remoteUrl: string;
            sshUrl: string;
        }>(`/${params.project}/_apis/git/repositories/${params.repositoryId}`);

        return {
            success: true,
            data: {
                ...response,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get repository",
                retryable: true
            }
        };
    }
}
