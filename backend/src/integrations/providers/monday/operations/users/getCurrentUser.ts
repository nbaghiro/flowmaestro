import { GET_CURRENT_USER } from "../../graphql/queries";
import { getCurrentUserInputSchema, type GetCurrentUserInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const getCurrentUserOperation: OperationDefinition = {
    id: "getCurrentUser",
    name: "Get Current User",
    description: "Get the currently authenticated Monday.com user.",
    category: "users",
    inputSchema: getCurrentUserInputSchema,
    retryable: true,
    timeout: 10000
};

interface GetCurrentUserResponse {
    me: {
        id: string;
        name: string;
        email: string;
        photo_thumb: string | null;
        title: string | null;
        account: {
            id: string;
            name: string;
            slug: string;
        };
        teams: Array<{
            id: string;
            name: string;
        }>;
    };
}

export async function executeGetCurrentUser(
    client: MondayClient,
    _params: GetCurrentUserInput
): Promise<OperationResult> {
    try {
        const response = await client.query<GetCurrentUserResponse>(GET_CURRENT_USER);

        return {
            success: true,
            data: {
                user: response.me
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get current user",
                retryable: true
            }
        };
    }
}
