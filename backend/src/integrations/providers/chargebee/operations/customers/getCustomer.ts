import { z } from "zod";
import { ChargebeeClient } from "../../client/ChargebeeClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ChargebeeCustomer, ChargebeeSingleResponse } from "../types";

/**
 * Get Customer operation schema
 */
export const getCustomerSchema = z.object({
    id: z.string().min(1).describe("Customer ID")
});

export type GetCustomerParams = z.infer<typeof getCustomerSchema>;

/**
 * Get Customer operation definition
 */
export const getCustomerOperation: OperationDefinition = {
    id: "getCustomer",
    name: "Get Customer",
    description: "Get a specific customer by ID from Chargebee",
    category: "customers",
    inputSchema: getCustomerSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get customer operation
 */
export async function executeGetCustomer(
    client: ChargebeeClient,
    params: GetCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.get<ChargebeeSingleResponse<ChargebeeCustomer>>(
            `/customers/${encodeURIComponent(params.id)}`
        );

        if (!response.customer) {
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
            data: response.customer
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get customer";

        if (message.includes("not found") || message.includes("404")) {
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
