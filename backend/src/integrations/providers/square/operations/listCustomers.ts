import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SquareClient } from "../client/SquareClient";
import type { SquareCustomersResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Customers operation schema
 */
export const listCustomersSchema = z.object({
    sort_field: z.enum(["DEFAULT", "CREATED_AT"]).optional().default("DEFAULT"),
    sort_order: z.enum(["ASC", "DESC"]).optional().default("ASC"),
    limit: z.number().int().min(1).max(100).optional().default(10).describe("Number of results")
});

export type ListCustomersParams = z.infer<typeof listCustomersSchema>;

/**
 * List Customers operation definition
 */
export const listCustomersOperation: OperationDefinition = {
    id: "listCustomers",
    name: "List Customers",
    description: "List all customers with optional sorting",
    category: "customers",
    actionType: "read",
    inputSchema: listCustomersSchema,
    inputSchemaJSON: toJSONSchema(listCustomersSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute list customers operation
 */
export async function executeListCustomers(
    client: SquareClient,
    params: ListCustomersParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            limit: params.limit
        };

        if (params.sort_field) {
            queryParams.sort_field = params.sort_field;
        }

        if (params.sort_order) {
            queryParams.sort_order = params.sort_order;
        }

        const response = await client.get<SquareCustomersResponse>("/customers", queryParams);

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

        const customers = (response.customers || []).map((customer) => ({
            id: customer.id,
            givenName: customer.given_name,
            familyName: customer.family_name,
            companyName: customer.company_name,
            emailAddress: customer.email_address,
            phoneNumber: customer.phone_number,
            referenceId: customer.reference_id,
            createdAt: customer.created_at
        }));

        return {
            success: true,
            data: {
                customers,
                cursor: response.cursor
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list customers",
                retryable: true
            }
        };
    }
}
