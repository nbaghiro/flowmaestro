import { z } from "zod";
import type { QuickBooksCustomerOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { QuickBooksClient } from "../client/QuickBooksClient";

export const getCustomerSchema = z.object({
    customerId: z.string().describe("The QuickBooks customer ID")
});

export type GetCustomerParams = z.infer<typeof getCustomerSchema>;

export const getCustomerOperation: OperationDefinition = {
    id: "getCustomer",
    name: "Get Customer",
    description: "Get a specific customer by ID from QuickBooks",
    category: "customers",
    inputSchema: getCustomerSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetCustomer(
    client: QuickBooksClient,
    params: GetCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.getCustomer(params.customerId);
        const customer = response.Customer;

        const formattedCustomer: QuickBooksCustomerOutput = {
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
        };

        return {
            success: true,
            data: formattedCustomer
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
