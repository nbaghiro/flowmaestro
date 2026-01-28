import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { StripeClient } from "../client/StripeClient";
import type { StripeCustomer } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Update Customer operation schema
 */
export const updateCustomerSchema = z.object({
    customer_id: z.string().describe("Customer ID (cus_xxx)"),
    email: z.string().email().optional().describe("New email"),
    name: z.string().optional().describe("New name"),
    phone: z.string().optional().describe("New phone"),
    description: z.string().optional().describe("New description"),
    metadata: z.record(z.string()).optional().describe("Metadata to merge")
});

export type UpdateCustomerParams = z.infer<typeof updateCustomerSchema>;

/**
 * Update Customer operation definition
 */
export const updateCustomerOperation: OperationDefinition = {
    id: "updateCustomer",
    name: "Update Customer",
    description: "Update an existing customer in Stripe",
    category: "customers",
    actionType: "write",
    inputSchema: updateCustomerSchema,
    inputSchemaJSON: toJSONSchema(updateCustomerSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute update customer operation
 */
export async function executeUpdateCustomer(
    client: StripeClient,
    params: UpdateCustomerParams
): Promise<OperationResult> {
    try {
        const { customer_id, ...updateParams } = params;

        const response = await client.postForm<StripeCustomer>(
            `/customers/${customer_id}`,
            updateParams
        );

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
                message: error instanceof Error ? error.message : "Failed to update customer",
                retryable: true
            }
        };
    }
}
