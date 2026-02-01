import { z } from "zod";
import { StripeClient } from "../client/StripeClient";
import type { StripeCustomer } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Customer operation schema
 */
export const createCustomerSchema = z.object({
    email: z.string().email().optional().describe("Customer email"),
    name: z.string().optional().describe("Customer name"),
    phone: z.string().optional().describe("Customer phone"),
    description: z.string().optional().describe("Customer description"),
    metadata: z.record(z.string()).optional().describe("Key-value metadata"),
    payment_method: z.string().optional().describe("Default payment method ID")
});

export type CreateCustomerParams = z.infer<typeof createCustomerSchema>;

/**
 * Create Customer operation definition
 */
export const createCustomerOperation: OperationDefinition = {
    id: "createCustomer",
    name: "Create Customer",
    description: "Create a new customer in Stripe",
    category: "customers",
    actionType: "write",
    inputSchema: createCustomerSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute create customer operation
 */
export async function executeCreateCustomer(
    client: StripeClient,
    params: CreateCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.postForm<StripeCustomer>("/customers", params);

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
                message: error instanceof Error ? error.message : "Failed to create customer",
                retryable: true
            }
        };
    }
}
