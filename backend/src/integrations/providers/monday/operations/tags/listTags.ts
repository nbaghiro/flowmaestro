import { toJSONSchema } from "../../../../core/schema-utils";
import { LIST_TAGS } from "../../graphql/queries";
import { listTagsInputSchema, type ListTagsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const listTagsOperation: OperationDefinition = {
    id: "listTags",
    name: "List Tags",
    description: "List all tags on a Monday.com board.",
    category: "tags",
    inputSchema: listTagsInputSchema,
    inputSchemaJSON: toJSONSchema(listTagsInputSchema),
    retryable: true,
    timeout: 10000
};

interface ListTagsResponse {
    boards: Array<{
        tags: Array<{
            id: string;
            name: string;
            color: string;
        }>;
    }>;
}

export async function executeListTags(
    client: MondayClient,
    params: ListTagsInput
): Promise<OperationResult> {
    try {
        const response = await client.query<ListTagsResponse>(LIST_TAGS, {
            board_id: params.board_id
        });

        const tags = response.boards?.[0]?.tags || [];

        return {
            success: true,
            data: {
                tags,
                count: tags.length,
                board_id: params.board_id
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
