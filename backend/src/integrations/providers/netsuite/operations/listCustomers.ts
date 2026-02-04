import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listCustomersSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of results to return (1-100)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination"),
    q: z.string().optional().describe("SuiteQL search query")
});

export type ListCustomersParams = z.infer<typeof listCustomersSchema>;

export const listCustomersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listCustomers",
            name: "List Customers",
            description: "List customers in NetSuite with pagination",
            category: "erp",
            actionType: "read",
            inputSchema: listCustomersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "NetSuite", err: error },
            "Failed to create listCustomersOperation"
        );
        throw new Error(
            `Failed to create listCustomers operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListCustomers(
    client: NetsuiteClient,
    params: ListCustomersParams
): Promise<OperationResult> {
    try {
        const response = await client.listCustomers({
            limit: params.limit,
            offset: params.offset,
            q: params.q
        });

        return {
            success: true,
            data: {
                customers: response.items,
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
                message: error instanceof Error ? error.message : "Failed to list customers",
                retryable: true
            }
        };
    }
}
