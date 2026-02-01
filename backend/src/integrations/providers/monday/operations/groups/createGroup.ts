import { CREATE_GROUP } from "../../graphql/mutations";
import { createGroupInputSchema, type CreateGroupInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const createGroupOperation: OperationDefinition = {
    id: "createGroup",
    name: "Create Group",
    description: "Create a new group on a Monday.com board.",
    category: "groups",
    inputSchema: createGroupInputSchema,
    retryable: true,
    timeout: 10000
};

interface CreateGroupResponse {
    create_group: {
        id: string;
        title: string;
        color: string;
        position: string;
    };
}

export async function executeCreateGroup(
    client: MondayClient,
    params: CreateGroupInput
): Promise<OperationResult> {
    try {
        const variables: Record<string, unknown> = {
            board_id: params.board_id,
            group_name: params.group_name
        };

        if (params.group_color !== undefined) {
            variables.group_color = params.group_color;
        }
        if (params.position !== undefined) {
            variables.position = params.position;
        }
        if (params.position_relative_method !== undefined) {
            variables.position_relative_method = params.position_relative_method;
        }

        const response = await client.mutation<CreateGroupResponse>(CREATE_GROUP, variables);

        return {
            success: true,
            data: response.create_group
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create group",
                retryable: true
            }
        };
    }
}
