/**
 * Kustomer Customer Operations
 *
 * Customers are the central entity in Kustomer's data model.
 * All interactions and conversations are organized around customers.
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KustomerClient } from "../client/KustomerClient";
import type { KustomerCustomer, KustomerSingleResponse, KustomerListResponse } from "../types";

// ============================================
// List Customers
// ============================================

export const listCustomersSchema = z.object({
    page: z.number().int().min(1).optional().describe("Page number for pagination"),
    pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (max 100)")
});

export type ListCustomersParams = z.infer<typeof listCustomersSchema>;

export const listCustomersOperation: OperationDefinition = {
    id: "listCustomers",
    name: "List Customers",
    description: "List customers with pagination",
    category: "customers",
    inputSchema: listCustomersSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListCustomers(
    client: KustomerClient,
    params: ListCustomersParams
): Promise<OperationResult> {
    try {
        const response = (await client.listCustomers(
            params
        )) as KustomerListResponse<KustomerCustomer>;

        return {
            success: true,
            data: {
                customers: response.data || [],
                meta: response.meta
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

// ============================================
// Get Customer
// ============================================

export const getCustomerSchema = z.object({
    customerId: z.string().min(1).describe("The unique ID of the customer")
});

export type GetCustomerParams = z.infer<typeof getCustomerSchema>;

export const getCustomerOperation: OperationDefinition = {
    id: "getCustomer",
    name: "Get Customer",
    description: "Retrieve a specific customer by ID",
    category: "customers",
    inputSchema: getCustomerSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetCustomer(
    client: KustomerClient,
    params: GetCustomerParams
): Promise<OperationResult> {
    try {
        const response = (await client.getCustomer(
            params.customerId
        )) as KustomerSingleResponse<KustomerCustomer>;

        return {
            success: true,
            data: response.data
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

// ============================================
// Create Customer
// ============================================

export const createCustomerSchema = z.object({
    name: z.string().min(1).optional().describe("Customer's full name"),
    email: z.string().email().optional().describe("Customer's email address"),
    phone: z.string().optional().describe("Customer's phone number"),
    externalId: z.string().optional().describe("External system identifier for the customer"),
    company: z.string().optional().describe("Customer's company name"),
    locale: z.string().optional().describe("Customer's locale (e.g., en_US)"),
    timeZone: z.string().optional().describe("Customer's timezone"),
    tags: z.array(z.string()).optional().describe("Tags to apply to the customer"),
    custom: z.record(z.unknown()).optional().describe("Custom attribute values")
});

export type CreateCustomerParams = z.infer<typeof createCustomerSchema>;

export const createCustomerOperation: OperationDefinition = {
    id: "createCustomer",
    name: "Create Customer",
    description: "Create a new customer in Kustomer",
    category: "customers",
    inputSchema: createCustomerSchema,
    retryable: false,
    timeout: 10000
};

export async function executeCreateCustomer(
    client: KustomerClient,
    params: CreateCustomerParams
): Promise<OperationResult> {
    try {
        // Build the customer attributes object
        const attributes: Record<string, unknown> = {};

        if (params.name) attributes.name = params.name;
        if (params.externalId) attributes.externalId = params.externalId;
        if (params.company) attributes.company = params.company;
        if (params.locale) attributes.locale = params.locale;
        if (params.timeZone) attributes.timeZone = params.timeZone;
        if (params.tags) attributes.tags = params.tags;
        if (params.custom) attributes.custom = params.custom;

        // Kustomer stores emails and phones as arrays of objects
        if (params.email) {
            attributes.emails = [{ email: params.email, type: "home" }];
        }
        if (params.phone) {
            attributes.phones = [{ phone: params.phone, type: "home" }];
        }

        const response = (await client.createCustomer(
            attributes
        )) as KustomerSingleResponse<KustomerCustomer>;

        return {
            success: true,
            data: response.data
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

// ============================================
// Update Customer
// ============================================

export const updateCustomerSchema = z.object({
    customerId: z.string().min(1).describe("The unique ID of the customer to update"),
    name: z.string().optional().describe("Updated customer name"),
    email: z.string().email().optional().describe("Updated email address"),
    phone: z.string().optional().describe("Updated phone number"),
    company: z.string().optional().describe("Updated company name"),
    locale: z.string().optional().describe("Updated locale"),
    timeZone: z.string().optional().describe("Updated timezone"),
    tags: z.array(z.string()).optional().describe("Updated tags (replaces existing)"),
    custom: z.record(z.unknown()).optional().describe("Updated custom attributes")
});

export type UpdateCustomerParams = z.infer<typeof updateCustomerSchema>;

export const updateCustomerOperation: OperationDefinition = {
    id: "updateCustomer",
    name: "Update Customer",
    description: "Update an existing customer",
    category: "customers",
    inputSchema: updateCustomerSchema,
    retryable: false,
    timeout: 10000
};

export async function executeUpdateCustomer(
    client: KustomerClient,
    params: UpdateCustomerParams
): Promise<OperationResult> {
    try {
        const attributes: Record<string, unknown> = {};

        if (params.name) attributes.name = params.name;
        if (params.company) attributes.company = params.company;
        if (params.locale) attributes.locale = params.locale;
        if (params.timeZone) attributes.timeZone = params.timeZone;
        if (params.tags) attributes.tags = params.tags;
        if (params.custom) attributes.custom = params.custom;

        if (params.email) {
            attributes.emails = [{ email: params.email, type: "home" }];
        }
        if (params.phone) {
            attributes.phones = [{ phone: params.phone, type: "home" }];
        }

        const response = (await client.updateCustomer(
            params.customerId,
            attributes
        )) as KustomerSingleResponse<KustomerCustomer>;

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update customer",
                retryable: false
            }
        };
    }
}

// ============================================
// Delete Customer
// ============================================

export const deleteCustomerSchema = z.object({
    customerId: z.string().min(1).describe("The unique ID of the customer to delete")
});

export type DeleteCustomerParams = z.infer<typeof deleteCustomerSchema>;

export const deleteCustomerOperation: OperationDefinition = {
    id: "deleteCustomer",
    name: "Delete Customer",
    description: "Delete a customer from Kustomer",
    category: "customers",
    inputSchema: deleteCustomerSchema,
    retryable: false,
    timeout: 10000
};

export async function executeDeleteCustomer(
    client: KustomerClient,
    params: DeleteCustomerParams
): Promise<OperationResult> {
    try {
        await client.deleteCustomer(params.customerId);

        return {
            success: true,
            data: {
                deleted: true,
                customerId: params.customerId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete customer",
                retryable: false
            }
        };
    }
}

// ============================================
// Search Customers
// ============================================

export const searchCustomersSchema = z.object({
    query: z.record(z.unknown()).describe("Search query object using Kustomer search syntax"),
    page: z.number().int().min(1).optional().describe("Page number for pagination"),
    pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (max 100)")
});

export type SearchCustomersParams = z.infer<typeof searchCustomersSchema>;

export const searchCustomersOperation: OperationDefinition = {
    id: "searchCustomers",
    name: "Search Customers",
    description: "Search customers using query criteria",
    category: "customers",
    inputSchema: searchCustomersSchema,
    retryable: true,
    timeout: 30000
};

export async function executeSearchCustomers(
    client: KustomerClient,
    params: SearchCustomersParams
): Promise<OperationResult> {
    try {
        const response = (await client.searchCustomers(params.query, {
            page: params.page,
            pageSize: params.pageSize
        })) as KustomerListResponse<KustomerCustomer>;

        return {
            success: true,
            data: {
                customers: response.data || [],
                meta: response.meta
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
