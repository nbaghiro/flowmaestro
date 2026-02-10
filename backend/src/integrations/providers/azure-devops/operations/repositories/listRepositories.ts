import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const listRepositoriesSchema = z.object({
    project: z.string().describe("Project name or ID")
});

export type ListRepositoriesParams = z.infer<typeof listRepositoriesSchema>;

export const listRepositoriesOperation: OperationDefinition = {
    id: "repositories_list",
    name: "List Repositories",
    description: "List all Git repositories in a project",
    category: "repositories",
    inputSchema: listRepositoriesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListRepositories(
    client: AzureDevOpsClient,
    params: ListRepositoriesParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{
            value: Array<{
                id: string;
                name: string;
                url: string;
                defaultBranch: string;
                size: number;
            }>;
            count: number;
        }>(`/${params.project}/_apis/git/repositories`);

        return {
            success: true,
            data: {
                repositories: response.value,
                count: response.count,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list repositories",
                retryable: true
            }
        };
    }
}
