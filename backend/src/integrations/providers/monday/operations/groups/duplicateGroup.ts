import { toJSONSchema } from "../../../../core/schema-utils";
import { DUPLICATE_GROUP } from "../../graphql/mutations";
import { duplicateGroupInputSchema, type DuplicateGroupInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const duplicateGroupOperation: OperationDefinition = {
    id: "duplicateGroup",
    name: "Duplicate Group",
    description: "Duplicate a group on a Monday.com board.",
    category: "groups",
    inputSchema: duplicateGroupInputSchema,
    inputSchemaJSON: toJSONSchema(duplicateGroupInputSchema),
    retryable: true,
    timeout: 10000
};

interface DuplicateGroupResponse {
    duplicate_group: {
        id: string;
        title: string;
        color: string;
        position: string;
    };
}

export async function executeDuplicateGroup(
    client: MondayClient,
    params: DuplicateGroupInput
): Promise<OperationResult> {
    try {
        const variables: Record<string, unknown> = {
            board_id: params.board_id,
            group_id: params.group_id
        };

        if (params.add_to_top !== undefined) {
            variables.add_to_top = params.add_to_top;
        }
        if (params.group_title !== undefined) {
            variables.group_title = params.group_title;
        }

        const response = await client.mutation<DuplicateGroupResponse>(DUPLICATE_GROUP, variables);

        return {
            success: true,
            data: {
                duplicated: true,
                original_group_id: params.group_id,
                new_group: response.duplicate_group
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to duplicate group",
                retryable: true
            }
        };
    }
}
