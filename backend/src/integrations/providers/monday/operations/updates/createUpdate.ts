import { CREATE_UPDATE } from "../../graphql/mutations";
import { createUpdateInputSchema, type CreateUpdateInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const createUpdateOperation: OperationDefinition = {
    id: "createUpdate",
    name: "Create Update",
    description: "Add an update (comment) to an item on Monday.com.",
    category: "updates",
    inputSchema: createUpdateInputSchema,
    retryable: true,
    timeout: 10000
};

interface CreateUpdateResponse {
    create_update: {
        id: string;
        body: string;
        text_body: string;
        created_at: string;
        creator: {
            id: string;
            name: string;
        };
    };
}

export async function executeCreateUpdate(
    client: MondayClient,
    params: CreateUpdateInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<CreateUpdateResponse>(CREATE_UPDATE, {
            item_id: params.item_id,
            body: params.body
        });

        return {
            success: true,
            data: {
                update: response.create_update
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create update",
                retryable: true
            }
        };
    }
}
