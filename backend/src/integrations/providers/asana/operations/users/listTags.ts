import { listTagsInputSchema, type ListTagsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const listTagsOperation: OperationDefinition = {
    id: "listTags",
    name: "List Tags",
    description: "List all tags in a workspace.",
    category: "users",
    inputSchema: listTagsInputSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListTags(
    client: AsanaClient,
    params: ListTagsInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const tags = await client.getPaginated<Record<string, unknown>>(
            `/workspaces/${params.workspace}/tags`,
            queryParams,
            params.limit
        );

        return {
            success: true,
            data: {
                tags,
                count: tags.length,
                workspace_gid: params.workspace
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list tags",
                retryable: true
            }
        };
    }
}
