import { z } from "zod";
import type { QuickBooksCustomerOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { QuickBooksClient } from "../client/QuickBooksClient";

export const listCustomersSchema = z.object({
    maxResults: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .default(100)
        .describe("Maximum number of results to return (1-1000)"),
    startPosition: z
        .number()
        .min(1)
        .optional()
        .default(1)
        .describe("Starting position for pagination (1-based)")
});

export type ListCustomersParams = z.infer<typeof listCustomersSchema>;

export const listCustomersOperation: OperationDefinition = {
    id: "listCustomers",
    name: "List Customers",
    description: "Get a list of customers from QuickBooks",
    category: "customers",
    inputSchema: listCustomersSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListCustomers(
    client: QuickBooksClient,
    params: ListCustomersParams
): Promise<OperationResult> {
    try {
        const response = await client.listCustomers(params.maxResults, params.startPosition);
        const customers = response.QueryResponse.Customer || [];

        const formattedCustomers: QuickBooksCustomerOutput[] = customers.map((customer) => ({
            id: customer.Id,
            displayName: customer.DisplayName,
            givenName: customer.GivenName,
            familyName: customer.FamilyName,
            companyName: customer.CompanyName,
            email: customer.PrimaryEmailAddr?.Address,
            phone: customer.PrimaryPhone?.FreeFormNumber,
            billingAddress: customer.BillAddr
                ? {
                      line1: customer.BillAddr.Line1,
                      city: customer.BillAddr.City,
                      state: customer.BillAddr.CountrySubDivisionCode,
                      postalCode: customer.BillAddr.PostalCode
                  }
                : undefined,
            balance: customer.Balance,
            active: customer.Active,
            createdAt: customer.MetaData?.CreateTime,
            updatedAt: customer.MetaData?.LastUpdatedTime
        }));

        return {
            success: true,
            data: {
                customers: formattedCustomers,
                count: formattedCustomers.length,
                startPosition: params.startPosition,
                maxResults: params.maxResults
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
