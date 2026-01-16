import { toJSONSchema } from "../../../../core/schema-utils";
import { DELETE_GROUP } from "../../graphql/mutations";
import { deleteGroupInputSchema, type DeleteGroupInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const deleteGroupOperation: OperationDefinition = {
    id: "deleteGroup",
    name: "Delete Group",
    description: "Delete a group from a Monday.com board. Items in the group will be deleted.",
    category: "groups",
    inputSchema: deleteGroupInputSchema,
    inputSchemaJSON: toJSONSchema(deleteGroupInputSchema),
    retryable: false,
    timeout: 10000
};

interface DeleteGroupResponse {
    delete_group: {
        id: string;
        deleted: boolean;
    };
}

export async function executeDeleteGroup(
    client: MondayClient,
    params: DeleteGroupInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<DeleteGroupResponse>(DELETE_GROUP, {
            board_id: params.board_id,
            group_id: params.group_id
        });

        return {
            success: true,
            data: {
                deleted: response.delete_group.deleted,
                group_id: response.delete_group.id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete group",
                retryable: false
            }
        };
    }
}
