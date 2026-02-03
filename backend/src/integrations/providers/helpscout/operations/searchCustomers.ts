import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { HelpScoutCustomersResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const searchCustomersSchema = z.object({
    query: z
        .string()
        .describe("Search query string (e.g., 'email:customer@example.com' or 'firstName:John')"),
    page: z.number().optional().default(1).describe("Page number"),
    sortField: z
        .enum(["firstName", "lastName", "modifiedAt", "score"])
        .optional()
        .describe("Field to sort by"),
    sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort direction")
});

export type SearchCustomersParams = z.infer<typeof searchCustomersSchema>;

export const searchCustomersOperation: OperationDefinition = {
    id: "searchCustomers",
    name: "Search Customers",
    description: "Search customers using query syntax (e.g., email, name, organization)",
    category: "customers",
    actionType: "read",
    inputSchema: searchCustomersSchema,
    retryable: true,
    timeout: 15000
};

export async function executeSearchCustomers(
    client: HelpScoutClient,
    params: SearchCustomersParams
): Promise<OperationResult> {
    try {
        const queryParams = new URLSearchParams();
        queryParams.set("query", params.query);
        if (params.page) queryParams.set("page", String(params.page));
        if (params.sortField) queryParams.set("sortField", params.sortField);
        if (params.sortOrder) queryParams.set("sortOrder", params.sortOrder);

        const response = await client.get<HelpScoutCustomersResponse>(
            `/customers?${queryParams.toString()}`
        );

        return {
            success: true,
            data: {
                customers: response._embedded.customers.map((c) => ({
                    id: c.id,
                    firstName: c.firstName,
                    lastName: c.lastName,
                    jobTitle: c.jobTitle,
                    organization: c.organization,
                    emails: c._embedded?.emails,
                    phones: c._embedded?.phones,
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt
                })),
                page: response.page
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search customers",
                retryable: true
            }
        };
    }
}
