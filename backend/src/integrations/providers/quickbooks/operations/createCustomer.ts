import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { QuickBooksCustomerOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { QuickBooksClient } from "../client/QuickBooksClient";

export const createCustomerSchema = z.object({
    displayName: z.string().min(1).describe("Customer display name (required, must be unique)"),
    givenName: z.string().optional().describe("Customer first name"),
    familyName: z.string().optional().describe("Customer last name"),
    email: z.string().email().optional().describe("Primary email address"),
    phone: z.string().optional().describe("Primary phone number"),
    companyName: z.string().optional().describe("Company name")
});

export type CreateCustomerParams = z.infer<typeof createCustomerSchema>;

export const createCustomerOperation: OperationDefinition = {
    id: "createCustomer",
    name: "Create Customer",
    description: "Create a new customer in QuickBooks",
    category: "customers",
    inputSchema: createCustomerSchema,
    inputSchemaJSON: toJSONSchema(createCustomerSchema),
    retryable: false,
    timeout: 30000
};

export async function executeCreateCustomer(
    client: QuickBooksClient,
    params: CreateCustomerParams
): Promise<OperationResult> {
    try {
        const customerData: {
            DisplayName: string;
            GivenName?: string;
            FamilyName?: string;
            CompanyName?: string;
            PrimaryEmailAddr?: { Address: string };
            PrimaryPhone?: { FreeFormNumber: string };
        } = {
            DisplayName: params.displayName
        };

        if (params.givenName) {
            customerData.GivenName = params.givenName;
        }
        if (params.familyName) {
            customerData.FamilyName = params.familyName;
        }
        if (params.companyName) {
            customerData.CompanyName = params.companyName;
        }
        if (params.email) {
            customerData.PrimaryEmailAddr = { Address: params.email };
        }
        if (params.phone) {
            customerData.PrimaryPhone = { FreeFormNumber: params.phone };
        }

        const response = await client.createCustomer(customerData);
        const customer = response.Customer;

        const formattedCustomer: QuickBooksCustomerOutput = {
            id: customer.Id,
            displayName: customer.DisplayName,
            givenName: customer.GivenName,
            familyName: customer.FamilyName,
            companyName: customer.CompanyName,
            email: customer.PrimaryEmailAddr?.Address,
            phone: customer.PrimaryPhone?.FreeFormNumber,
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
                message: error instanceof Error ? error.message : "Failed to create customer",
                retryable: false
            }
        };
    }
}
