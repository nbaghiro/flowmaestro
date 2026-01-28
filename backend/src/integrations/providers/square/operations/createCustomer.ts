import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SquareClient } from "../client/SquareClient";
import type { SquareCustomerResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Customer operation schema
 */
export const createCustomerSchema = z.object({
    idempotency_key: z.string().optional().describe("Unique key"),
    given_name: z.string().optional().describe("First name"),
    family_name: z.string().optional().describe("Last name"),
    company_name: z.string().optional().describe("Company name"),
    email_address: z.string().email().optional().describe("Email"),
    phone_number: z.string().optional().describe("Phone"),
    reference_id: z.string().optional().describe("External reference"),
    note: z.string().optional().describe("Note about customer")
});

export type CreateCustomerParams = z.infer<typeof createCustomerSchema>;

/**
 * Create Customer operation definition
 */
export const createCustomerOperation: OperationDefinition = {
    id: "createCustomer",
    name: "Create Customer",
    description: "Create a new customer in Square",
    category: "customers",
    actionType: "write",
    inputSchema: createCustomerSchema,
    inputSchemaJSON: toJSONSchema(createCustomerSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute create customer operation
 */
export async function executeCreateCustomer(
    client: SquareClient,
    params: CreateCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.postWithIdempotency<SquareCustomerResponse>(
            "/customers",
            params,
            params.idempotency_key
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
                message: error instanceof Error ? error.message : "Failed to create customer",
                retryable: true
            }
        };
    }
}
