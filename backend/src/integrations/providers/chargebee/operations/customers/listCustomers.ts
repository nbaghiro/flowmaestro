import { z } from "zod";
import { ChargebeeClient } from "../../client/ChargebeeClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ChargebeeCustomer, ChargebeeListResponse } from "../types";

/**
 * List Customers operation schema
 */
export const listCustomersSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(25),
    offset: z.string().optional(),
    email: z.string().email().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company: z.string().optional()
});

export type ListCustomersParams = z.infer<typeof listCustomersSchema>;

/**
 * List Customers operation definition
 */
export const listCustomersOperation: OperationDefinition = {
    id: "listCustomers",
    name: "List Customers",
    description: "List all customers in Chargebee with pagination and optional filters",
    category: "customers",
    inputSchema: listCustomersSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list customers operation
 */
export async function executeListCustomers(
    client: ChargebeeClient,
    params: ListCustomersParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            limit: String(params.limit)
        };

        if (params.offset) {
            queryParams.offset = params.offset;
        }
        if (params.email) {
            queryParams["email[is]"] = params.email;
        }
        if (params.first_name) {
            queryParams["first_name[is]"] = params.first_name;
        }
        if (params.last_name) {
            queryParams["last_name[is]"] = params.last_name;
        }
        if (params.company) {
            queryParams["company[is]"] = params.company;
        }

        const queryString = new URLSearchParams(queryParams).toString();
        const response = await client.get<ChargebeeListResponse<ChargebeeCustomer>>(
            `/customers?${queryString}`
        );

        const customers = response.list.map((item) => item.customer).filter(Boolean);

        return {
            success: true,
            data: {
                customers,
                count: customers.length,
                next_offset: response.next_offset
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
