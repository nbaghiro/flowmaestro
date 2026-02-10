import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { GetCustomerSchema, type GetCustomerParams } from "../schemas";
import type { BigCommerceCustomer } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Customer operation definition
 */
export const getCustomerOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCustomer",
            name: "Get Customer",
            description:
                "Retrieve a single customer by ID with optional addresses and store credit",
            category: "customers",
            inputSchema: GetCustomerSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
            "Failed to create getCustomerOperation"
        );
        throw new Error(
            `Failed to create getCustomer operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get customer operation
 */
export async function executeGetCustomer(
    client: BigCommerceClient,
    params: GetCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.getCustomer(params.customer_id, params.include);
        const customer = response as BigCommerceCustomer;

        if (!customer) {
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
            success: true,
            data: {
                customer
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get customer";
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
