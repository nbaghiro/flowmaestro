import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SquareClient } from "../client/SquareClient";
import type { SquareCustomerResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Customer operation schema
 */
export const getCustomerSchema = z.object({
    customer_id: z.string().describe("Customer ID")
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
    inputSchemaJSON: toJSONSchema(getCustomerSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute get customer operation
 */
export async function executeGetCustomer(
    client: SquareClient,
    params: GetCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.get<SquareCustomerResponse>(
            `/customers/${params.customer_id}`
        );

        if (response.errors && response.errors.length > 0) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: response.errors[0].detail || response.errors[0].code,
                    retryable: false
                }
            };
        }

        const customer = response.customer!;

        return {
            success: true,
            data: {
                id: customer.id,
                givenName: customer.given_name,
                familyName: customer.family_name,
                companyName: customer.company_name,
                emailAddress: customer.email_address,
                phoneNumber: customer.phone_number,
                referenceId: customer.reference_id,
                note: customer.note,
                createdAt: customer.created_at,
                updatedAt: customer.updated_at
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
