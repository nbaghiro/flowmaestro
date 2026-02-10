import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const listBranchesSchema = z.object({
    project: z.string().describe("Project name or ID"),
    repositoryId: z.string().describe("Repository ID or name")
});

export type ListBranchesParams = z.infer<typeof listBranchesSchema>;

export const listBranchesOperation: OperationDefinition = {
    id: "repositories_listBranches",
    name: "List Branches",
    description: "List all branches in a repository",
    category: "repositories",
    inputSchema: listBranchesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListBranches(
    client: AzureDevOpsClient,
    params: ListBranchesParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{
            value: Array<{
                name: string;
                objectId: string;
                creator: { displayName: string };
                url: string;
            }>;
            count: number;
        }>(`/${params.project}/_apis/git/repositories/${params.repositoryId}/refs?filter=heads/`);

        return {
            success: true,
            data: {
                branches: response.value.map((b) => ({
                    name: b.name.replace("refs/heads/", ""),
                    objectId: b.objectId,
                    creator: b.creator,
                    url: b.url
                })),
                count: response.count,
                repositoryId: params.repositoryId,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list branches",
                retryable: true
            }
        };
    }
}
