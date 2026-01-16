import { toJSONSchema } from "../../../../core/schema-utils";
import { CREATE_COLUMN } from "../../graphql/mutations";
import { createColumnInputSchema, type CreateColumnInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const createColumnOperation: OperationDefinition = {
    id: "createColumn",
    name: "Create Column",
    description: "Create a new column on a Monday.com board.",
    category: "columns",
    inputSchema: createColumnInputSchema,
    inputSchemaJSON: toJSONSchema(createColumnInputSchema),
    retryable: true,
    timeout: 10000
};

interface CreateColumnResponse {
    create_column: {
        id: string;
        title: string;
        type: string;
        description: string | null;
        settings_str: string;
    };
}

export async function executeCreateColumn(
    client: MondayClient,
    params: CreateColumnInput
): Promise<OperationResult> {
    try {
        const variables: Record<string, unknown> = {
            board_id: params.board_id,
            title: params.title,
            column_type: params.column_type
        };

        if (params.description !== undefined) {
            variables.description = params.description;
        }
        if (params.defaults !== undefined) {
            variables.defaults = JSON.stringify(params.defaults);
        }

        const response = await client.mutation<CreateColumnResponse>(CREATE_COLUMN, variables);

        return {
            success: true,
            data: response.create_column
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create column",
                retryable: true
            }
        };
    }
}
