import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listInvoicesSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of results to return (1-100)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination"),
    q: z.string().optional().describe("SuiteQL search query")
});

export type ListInvoicesParams = z.infer<typeof listInvoicesSchema>;

export const listInvoicesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listInvoices",
            name: "List Invoices",
            description: "List invoices in NetSuite with pagination",
            category: "erp",
            actionType: "read",
            inputSchema: listInvoicesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "NetSuite", err: error },
            "Failed to create listInvoicesOperation"
        );
        throw new Error(
            `Failed to create listInvoices operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListInvoices(
    client: NetsuiteClient,
    params: ListInvoicesParams
): Promise<OperationResult> {
    try {
        const response = await client.listInvoices({
            limit: params.limit,
            offset: params.offset,
            q: params.q
        });

        return {
            success: true,
            data: {
                invoices: response.items,
                totalResults: response.totalResults,
                count: response.count,
                offset: response.offset,
                hasMore: response.hasMore
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list invoices",
                retryable: true
            }
        };
    }
}
