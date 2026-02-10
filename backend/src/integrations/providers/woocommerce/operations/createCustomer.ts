import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { CreateCustomerSchema, type CreateCustomerParams } from "../schemas";
import type { WooCommerceCustomer } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Customer operation definition
 */
export const createCustomerOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createCustomer",
            name: "Create Customer",
            description: "Create a new customer with email, name, and addresses",
            category: "customers",
            inputSchema: CreateCustomerSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
            "Failed to create createCustomerOperation"
        );
        throw new Error(
            `Failed to create createCustomer operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create customer operation
 */
export async function executeCreateCustomer(
    client: WooCommerceClient,
    params: CreateCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.createCustomer({
            email: params.email,
            first_name: params.first_name,
            last_name: params.last_name,
            username: params.username,
            password: params.password,
            billing: params.billing,
            shipping: params.shipping
        });

        const customer = response as WooCommerceCustomer;

        return {
            success: true,
            data: {
                customer,
                customerId: String(customer.id),
                message: "Customer created successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create customer",
                retryable: false
            }
        };
    }
}
