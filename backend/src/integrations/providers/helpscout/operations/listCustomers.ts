import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { HelpScoutCustomersResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listCustomersSchema = z.object({
    firstName: z.string().optional().describe("Filter by first name"),
    lastName: z.string().optional().describe("Filter by last name"),
    email: z.string().optional().describe("Filter by email address"),
    page: z.number().optional().default(1).describe("Page number"),
    sortField: z
        .enum(["firstName", "lastName", "modifiedAt", "score"])
        .optional()
        .describe("Field to sort by"),
    sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort direction")
});

export type ListCustomersParams = z.infer<typeof listCustomersSchema>;

export const listCustomersOperation: OperationDefinition = {
    id: "listCustomers",
    name: "List Customers",
    description: "List customers with optional filtering",
    category: "customers",
    actionType: "read",
    inputSchema: listCustomersSchema,
    retryable: true,
    timeout: 15000
};

export async function executeListCustomers(
    client: HelpScoutClient,
    params: ListCustomersParams
): Promise<OperationResult> {
    try {
        const queryParams = new URLSearchParams();
        if (params.firstName) queryParams.set("firstName", params.firstName);
        if (params.lastName) queryParams.set("lastName", params.lastName);
        if (params.email) queryParams.set("email", params.email);
        if (params.page) queryParams.set("page", String(params.page));
        if (params.sortField) queryParams.set("sortField", params.sortField);
        if (params.sortOrder) queryParams.set("sortOrder", params.sortOrder);

        const qs = queryParams.toString();
        const response = await client.get<HelpScoutCustomersResponse>(
            `/customers${qs ? `?${qs}` : ""}`
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
                message: error instanceof Error ? error.message : "Failed to list customers",
                retryable: true
            }
        };
    }
}
