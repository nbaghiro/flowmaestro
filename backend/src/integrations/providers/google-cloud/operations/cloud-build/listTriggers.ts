import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * List Triggers operation schema
 */
export const listTriggersSchema = z.object({
    pageSize: z.number().int().min(1).max(100).optional().describe("Number of triggers per page"),
    pageToken: z.string().optional().describe("Token for pagination")
});

export type ListTriggersParams = z.infer<typeof listTriggersSchema>;

/**
 * List Triggers operation definition
 */
export const listTriggersOperation: OperationDefinition = {
    id: "cloud_build_listTriggers",
    name: "List Triggers",
    description: "List all build triggers in the project",
    category: "cloud-build",
    inputSchema: listTriggersSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list triggers operation
 */
export async function executeListTriggers(
    client: GoogleCloudClient,
    params: ListTriggersParams
): Promise<OperationResult> {
    try {
        const queryParams = new URLSearchParams();
        if (params.pageSize) {
            queryParams.append("pageSize", params.pageSize.toString());
        }
        if (params.pageToken) {
            queryParams.append("pageToken", params.pageToken);
        }

        const url = `/projects/${client.projectId}/triggers${
            queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`;

        const response = await client.cloudBuild.get<{
            triggers: Array<{
                id: string;
                name: string;
                description?: string;
                disabled: boolean;
                createTime: string;
                github?: {
                    owner: string;
                    name: string;
                    push?: { branch: string };
                    pullRequest?: { branch: string };
                };
                filename?: string;
            }>;
            nextPageToken?: string;
        }>(url);

        return {
            success: true,
            data: {
                triggers: response.triggers || [],
                nextPageToken: response.nextPageToken,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list triggers",
                retryable: true
            }
        };
    }
}
