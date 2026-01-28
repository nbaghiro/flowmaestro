import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { StripeClient } from "../client/StripeClient";
import type { StripeCustomer, StripeList } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Customers operation schema
 */
export const listCustomersSchema = z.object({
    email: z.string().email().optional().describe("Filter by email"),
    created_gte: z.number().optional().describe("Created after (Unix timestamp)"),
    created_lte: z.number().optional().describe("Created before (Unix timestamp)"),
    limit: z.number().int().min(1).max(100).optional().default(10).describe("Number of results")
});

export type ListCustomersParams = z.infer<typeof listCustomersSchema>;

/**
 * List Customers operation definition
 */
export const listCustomersOperation: OperationDefinition = {
    id: "listCustomers",
    name: "List Customers",
    description: "List all customers with optional filters",
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
    client: StripeClient,
    params: ListCustomersParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            limit: params.limit
        };

        if (params.email) {
            queryParams.email = params.email;
        }

        if (params.created_gte || params.created_lte) {
            queryParams["created[gte]"] = params.created_gte;
            queryParams["created[lte]"] = params.created_lte;
        }

        const response = await client.get<StripeList<StripeCustomer>>("/customers", queryParams);

        const customers = response.data.map((customer) => ({
            id: customer.id,
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            description: customer.description,
            metadata: customer.metadata,
            defaultSource: customer.default_source,
            created: customer.created,
            livemode: customer.livemode
        }));

        return {
            success: true,
            data: {
                customers,
                hasMore: response.has_more
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
