import { z } from "zod";
import { TableauClient } from "../client/TableauClient";
import { TableauWorkbookIdSchema } from "./schemas";
import type { TableauWorkbook } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Workbook operation schema
 */
export const getWorkbookSchema = z.object({
    workbook_id: TableauWorkbookIdSchema
});

export type GetWorkbookParams = z.infer<typeof getWorkbookSchema>;

/**
 * Get Workbook operation definition
 */
export const getWorkbookOperation: OperationDefinition = {
    id: "getWorkbook",
    name: "Get Workbook",
    description: "Get workbook details including views and connections",
    category: "workbooks",
    inputSchema: getWorkbookSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get workbook operation
 */
export async function executeGetWorkbook(
    client: TableauClient,
    params: GetWorkbookParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{ workbook: TableauWorkbook }>(
            client.makeSitePath(`/workbooks/${params.workbook_id}`)
        );

        return {
            success: true,
            data: response.workbook
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get workbook",
                retryable: true
            }
        };
    }
}
