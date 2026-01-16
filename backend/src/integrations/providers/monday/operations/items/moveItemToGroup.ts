import { toJSONSchema } from "../../../../core/schema-utils";
import { MOVE_ITEM_TO_GROUP } from "../../graphql/mutations";
import { moveItemToGroupInputSchema, type MoveItemToGroupInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const moveItemToGroupOperation: OperationDefinition = {
    id: "moveItemToGroup",
    name: "Move Item to Group",
    description: "Move an item to a different group within the same board.",
    category: "items",
    inputSchema: moveItemToGroupInputSchema,
    inputSchemaJSON: toJSONSchema(moveItemToGroupInputSchema),
    retryable: true,
    timeout: 10000
};

interface MoveItemToGroupResponse {
    move_item_to_group: {
        id: string;
        name: string;
        group: {
            id: string;
            title: string;
        };
    };
}

export async function executeMoveItemToGroup(
    client: MondayClient,
    params: MoveItemToGroupInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<MoveItemToGroupResponse>(MOVE_ITEM_TO_GROUP, {
            item_id: params.item_id,
            group_id: params.group_id
        });

        return {
            success: true,
            data: {
                moved: true,
                item: response.move_item_to_group
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to move item to group",
                retryable: true
            }
        };
    }
}
