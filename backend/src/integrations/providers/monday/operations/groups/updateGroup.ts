import { UPDATE_GROUP } from "../../graphql/mutations";
import { updateGroupInputSchema, type UpdateGroupInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const updateGroupOperation: OperationDefinition = {
    id: "updateGroup",
    name: "Update Group",
    description: "Update a group's title, color, or position in Monday.com.",
    category: "groups",
    inputSchema: updateGroupInputSchema,
    retryable: true,
    timeout: 10000
};

interface UpdateGroupResponse {
    update_group: string;
}

export async function executeUpdateGroup(
    client: MondayClient,
    params: UpdateGroupInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<UpdateGroupResponse>(UPDATE_GROUP, {
            board_id: params.board_id,
            group_id: params.group_id,
            group_attribute: params.group_attribute,
            new_value: params.new_value
        });

        return {
            success: true,
            data: {
                group_id: params.group_id,
                updated: true,
                attribute: params.group_attribute,
                new_value: params.new_value,
                result: response.update_group
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update group",
                retryable: true
            }
        };
    }
}
