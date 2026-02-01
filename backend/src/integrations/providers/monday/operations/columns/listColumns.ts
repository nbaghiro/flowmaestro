import { LIST_COLUMNS } from "../../graphql/queries";
import { listColumnsInputSchema, type ListColumnsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const listColumnsOperation: OperationDefinition = {
    id: "listColumns",
    name: "List Columns",
    description: "List all columns on a Monday.com board.",
    category: "columns",
    inputSchema: listColumnsInputSchema,
    retryable: true,
    timeout: 10000
};

interface ListColumnsResponse {
    boards: Array<{
        columns: Array<{
            id: string;
            title: string;
            type: string;
            description: string | null;
            settings_str: string;
            width: number | null;
            archived: boolean;
        }>;
    }>;
}

export async function executeListColumns(
    client: MondayClient,
    params: ListColumnsInput
): Promise<OperationResult> {
    try {
        const response = await client.query<ListColumnsResponse>(LIST_COLUMNS, {
            board_id: params.board_id
        });

        const columns = response.boards?.[0]?.columns || [];

        return {
            success: true,
            data: {
                columns,
                count: columns.length,
                board_id: params.board_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list columns",
                retryable: true
            }
        };
    }
}
