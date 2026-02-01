import { z } from "zod";
import { SquareClient } from "../client/SquareClient";
import type { SquareCustomerResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Update Customer operation schema
 */
export const updateCustomerSchema = z.object({
    customer_id: z.string().describe("Customer ID"),
    given_name: z.string().optional().describe("First name"),
    family_name: z.string().optional().describe("Last name"),
    company_name: z.string().optional().describe("Company name"),
    email_address: z.string().email().optional().describe("Email"),
    phone_number: z.string().optional().describe("Phone"),
    note: z.string().optional().describe("Note")
});

export type UpdateCustomerParams = z.infer<typeof updateCustomerSchema>;

/**
 * Update Customer operation definition
 */
export const updateCustomerOperation: OperationDefinition = {
    id: "updateCustomer",
    name: "Update Customer",
    description: "Update an existing customer in Square",
    category: "customers",
    actionType: "write",
    inputSchema: updateCustomerSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute update customer operation
 */
export async function executeUpdateCustomer(
    client: SquareClient,
    params: UpdateCustomerParams
): Promise<OperationResult> {
    try {
        const { customer_id, ...updateParams } = params;

        const response = await client.put<SquareCustomerResponse>(
            `/customers/${customer_id}`,
            updateParams
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
                message: error instanceof Error ? error.message : "Failed to update customer",
                retryable: true
            }
        };
    }
}
