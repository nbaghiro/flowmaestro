import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { ListTransactionsSchema, type ListTransactionsParams } from "../schemas";
import type { SquarespaceTransactionsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Transactions operation definition
 */
export const listTransactionsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listTransactions",
            name: "List Transactions",
            description: "Retrieve financial transactions with optional date filtering",
            category: "transactions",
            inputSchema: ListTransactionsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
            "Failed to create listTransactionsOperation"
        );
        throw new Error(
            `Failed to create listTransactions operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list transactions operation
 */
export async function executeListTransactions(
    client: SquarespaceClient,
    params: ListTransactionsParams
): Promise<OperationResult> {
    try {
        const response = await client.listTransactions({
            modifiedAfter: params.modifiedAfter,
            modifiedBefore: params.modifiedBefore,
            cursor: params.cursor
        });

        const data = response as SquarespaceTransactionsResponse;

        return {
            success: true,
            data: {
                transactions: data.documents,
                count: data.documents.length,
                nextCursor: data.pagination?.nextPageCursor
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list transactions",
                retryable: true
            }
        };
    }
}
