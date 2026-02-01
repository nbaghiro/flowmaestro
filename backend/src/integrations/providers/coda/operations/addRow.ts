import { z } from "zod";
import { CodaClient } from "../client/CodaClient";
import { CodaDocIdSchema, CodaTableIdSchema } from "../schemas";
import type { CodaAddRowResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Add Row operation schema
 */
export const addRowSchema = z.object({
    docId: CodaDocIdSchema,
    tableId: CodaTableIdSchema,
    cells: z.record(z.any()).describe("Object with column names as keys and values")
});

export type AddRowParams = z.infer<typeof addRowSchema>;

/**
 * Add Row operation definition
 */
export const addRowOperation: OperationDefinition = {
    id: "addRow",
    name: "Add Row",
    description: "Add a new row to a Coda table",
    category: "data",
    inputSchema: addRowSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute add row operation
 */
export async function executeAddRow(
    client: CodaClient,
    params: AddRowParams
): Promise<OperationResult> {
    try {
        const response = await client.post<CodaAddRowResponse>(
            `/docs/${params.docId}/tables/${params.tableId}/rows`,
            {
                rows: [
                    {
                        cells: Object.entries(params.cells).map(([column, value]) => ({
                            column,
                            value
                        }))
                    }
                ]
            }
        );

        return {
            success: true,
            data: {
                requestId: response.requestId,
                rowIds: response.addedRowIds
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add row",
                retryable: true
            }
        };
    }
}
