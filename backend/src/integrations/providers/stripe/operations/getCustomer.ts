import { z } from "zod";
import { StripeClient } from "../client/StripeClient";
import type { StripeCustomer } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Customer operation schema
 */
export const getCustomerSchema = z.object({
    customer_id: z.string().describe("Customer ID (cus_xxx)")
});

export type GetCustomerParams = z.infer<typeof getCustomerSchema>;

/**
 * Get Customer operation definition
 */
export const getCustomerOperation: OperationDefinition = {
    id: "getCustomer",
    name: "Get Customer",
    description: "Retrieve details of a specific customer",
    category: "customers",
    actionType: "read",
    inputSchema: getCustomerSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get customer operation
 */
export async function executeGetCustomer(
    client: StripeClient,
    params: GetCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.get<StripeCustomer>(`/customers/${params.customer_id}`);

        return {
            success: true,
            data: {
                id: response.id,
                email: response.email,
                name: response.name,
                phone: response.phone,
                description: response.description,
                metadata: response.metadata,
                defaultSource: response.default_source,
                created: response.created,
                livemode: response.livemode
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get customer",
                retryable: true
            }
        };
    }
}
