import { z } from "zod";
import { ChargebeeClient } from "../../client/ChargebeeClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ChargebeeCustomer, ChargebeeSingleResponse } from "../types";

/**
 * Create Customer operation schema
 */
export const createCustomerSchema = z.object({
    id: z.string().optional().describe("Customer ID (auto-generated if not provided)"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    auto_collection: z.enum(["on", "off"]).optional().default("on"),
    net_term_days: z.number().min(0).optional(),
    taxability: z.enum(["taxable", "exempt"]).optional(),
    preferred_currency_code: z.string().length(3).optional(),
    billing_address: z
        .object({
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            email: z.string().email().optional(),
            company: z.string().optional(),
            phone: z.string().optional(),
            line1: z.string().optional(),
            line2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
            zip: z.string().optional()
        })
        .optional()
});

export type CreateCustomerParams = z.infer<typeof createCustomerSchema>;

/**
 * Create Customer operation definition
 */
export const createCustomerOperation: OperationDefinition = {
    id: "createCustomer",
    name: "Create Customer",
    description: "Create a new customer in Chargebee",
    category: "customers",
    inputSchema: createCustomerSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create customer operation
 */
export async function executeCreateCustomer(
    client: ChargebeeClient,
    params: CreateCustomerParams
): Promise<OperationResult> {
    try {
        const formData = client.toFormData(params);

        const response = await client.post<ChargebeeSingleResponse<ChargebeeCustomer>>(
            "/customers",
            formData
        );

        if (!response.customer) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create customer",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.customer
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create customer";

        if (message.includes("validation") || message.includes("already exists")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message,
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
