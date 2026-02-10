import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { ListCustomersSchema, type ListCustomersParams } from "../schemas";
import type { BigCommerceCustomer } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Customers operation definition
 */
export const listCustomersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listCustomers",
            name: "List Customers",
            description:
                "Retrieve a list of customers with optional filters for email, name, and pagination",
            category: "customers",
            inputSchema: ListCustomersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
            "Failed to create listCustomersOperation"
        );
        throw new Error(
            `Failed to create listCustomers operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list customers operation
 */
export async function executeListCustomers(
    client: BigCommerceClient,
    params: ListCustomersParams
): Promise<OperationResult> {
    try {
        const response = await client.listCustomers({
            email: params.email,
            name: params.name,
            company: params.company,
            customer_group_id: params.customer_group_id,
            date_created: params.date_created,
            date_modified: params.date_modified,
            include: params.include,
            sort: params.sort,
            page: params.page,
            limit: params.limit
        });

        const customers = response as BigCommerceCustomer[];

        return {
            success: true,
            data: {
                customers,
                count: customers.length
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
