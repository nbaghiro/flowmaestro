import { toJSONSchema } from "../../../../core/schema-utils";
import { DELETE_UPDATE } from "../../graphql/mutations";
import { deleteUpdateInputSchema, type DeleteUpdateInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const deleteUpdateOperation: OperationDefinition = {
    id: "deleteUpdate",
    name: "Delete Update",
    description: "Delete an update (comment) from Monday.com.",
    category: "updates",
    inputSchema: deleteUpdateInputSchema,
    inputSchemaJSON: toJSONSchema(deleteUpdateInputSchema),
    retryable: false,
    timeout: 10000
};

interface DeleteUpdateResponse {
    delete_update: {
        id: string;
    };
}

export async function executeDeleteUpdate(
    client: MondayClient,
    params: DeleteUpdateInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<DeleteUpdateResponse>(DELETE_UPDATE, {
            update_id: params.update_id
        });

        return {
            success: true,
            data: {
                deleted: true,
                update_id: response.delete_update.id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete update",
                retryable: false
            }
        };
    }
}
