import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const createReleaseSchema = z.object({
    project: z.string(),
    definitionId: z.number().int(),
    description: z.string().optional()
});

export type CreateReleaseParams = z.infer<typeof createReleaseSchema>;

export const createReleaseOperation: OperationDefinition = {
    id: "releases_create",
    name: "Create Release",
    description: "Trigger a new release",
    category: "releases",
    inputSchema: createReleaseSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateRelease(
    client: AzureDevOpsClient,
    params: CreateReleaseParams
): Promise<OperationResult> {
    try {
        const response = await client.post<Record<string, unknown>>(
            `/${params.project}/_apis/release/releases`,
            {
                definitionId: params.definitionId,
                description: params.description
            }
        );
        return {
            success: true,
            data: { ...response, project: params.project }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create release",
                retryable: false
            }
        };
    }
}
