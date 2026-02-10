import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { ListCustomersSchema, type ListCustomersParams } from "../schemas";
import type { WooCommerceCustomer } from "./types";
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
                "Retrieve a list of customers with optional filters for email, role, and pagination",
            category: "customers",
            inputSchema: ListCustomersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
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
    client: WooCommerceClient,
    params: ListCustomersParams
): Promise<OperationResult> {
    try {
        const response = await client.listCustomers({
            email: params.email,
            role: params.role,
            page: params.page,
            per_page: params.per_page,
            order: params.order,
            orderby: params.orderby
        });

        const customers = response as WooCommerceCustomer[];

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
