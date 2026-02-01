import { GET_USER } from "../../graphql/queries";
import { getUserInputSchema, type GetUserInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const getUserOperation: OperationDefinition = {
    id: "getUser",
    name: "Get User",
    description: "Get a specific Monday.com user by ID.",
    category: "users",
    inputSchema: getUserInputSchema,
    retryable: true,
    timeout: 10000
};

interface GetUserResponse {
    users: Array<{
        id: string;
        name: string;
        email: string;
        photo_thumb: string | null;
        title: string | null;
        enabled: boolean;
        created_at: string;
    }>;
}

export async function executeGetUser(
    client: MondayClient,
    params: GetUserInput
): Promise<OperationResult> {
    try {
        const response = await client.query<GetUserResponse>(GET_USER, {
            user_id: params.user_id
        });

        const user = response.users?.[0];

        if (!user) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `User with ID ${params.user_id} not found`,
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                user
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get user",
                retryable: true
            }
        };
    }
}
