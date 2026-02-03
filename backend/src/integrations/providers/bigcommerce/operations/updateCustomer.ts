import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { UpdateCustomerSchema, type UpdateCustomerParams } from "../schemas";
import type { BigCommerceCustomer } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Update Customer operation definition
 */
export const updateCustomerOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateCustomer",
            name: "Update Customer",
            description: "Update an existing customer's details",
            category: "customers",
            inputSchema: UpdateCustomerSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
            "Failed to create updateCustomerOperation"
        );
        throw new Error(
            `Failed to create updateCustomer operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update customer operation
 */
export async function executeUpdateCustomer(
    client: BigCommerceClient,
    params: UpdateCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.updateCustomer(params.customer_id, {
            email: params.email,
            first_name: params.first_name,
            last_name: params.last_name,
            company: params.company,
            phone: params.phone,
            customer_group_id: params.customer_group_id
        });

        const customer = response as BigCommerceCustomer;

        return {
            success: true,
            data: {
                customer,
                message: "Customer updated successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update customer";
        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Customer not found",
                    retryable: false
                }
            };
        }
        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
