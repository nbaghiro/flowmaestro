import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const createRepositorySchema = z.object({
    project: z.string().describe("Project name or ID"),
    name: z.string().describe("Repository name")
});

export type CreateRepositoryParams = z.infer<typeof createRepositorySchema>;

export const createRepositoryOperation: OperationDefinition = {
    id: "repositories_create",
    name: "Create Repository",
    description: "Create a new Git repository",
    category: "repositories",
    inputSchema: createRepositorySchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateRepository(
    client: AzureDevOpsClient,
    params: CreateRepositoryParams
): Promise<OperationResult> {
    try {
        const response = await client.post<{
            id: string;
            name: string;
            url: string;
            defaultBranch: string;
        }>(`/${params.project}/_apis/git/repositories`, {
            name: params.name,
            project: { id: params.project }
        });

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
                message: error instanceof Error ? error.message : "Failed to create repository",
                retryable: false
            }
        };
    }
}
