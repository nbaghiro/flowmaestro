/**
 * Gorgias Customer Operations
 *
 * Customers represent the people who contact support.
 * They can have multiple contact channels (email, phone, social).
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GorgiasClient } from "../client/GorgiasClient";
import type { GorgiasCustomer, GorgiasListResponse } from "../types";

// ============================================
// List Customers
// ============================================

export const listCustomersSchema = z.object({
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results to return (max 100)"),
    cursor: z.string().optional().describe("Cursor for pagination from previous response")
});

export type ListCustomersParams = z.infer<typeof listCustomersSchema>;

export const listCustomersOperation: OperationDefinition = {
    id: "listCustomers",
    name: "List Customers",
    description: "List customers with cursor-based pagination",
    category: "customers",
    inputSchema: listCustomersSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListCustomers(
    client: GorgiasClient,
    params: ListCustomersParams
): Promise<OperationResult> {
    try {
        const response = (await client.listCustomers(
            params
        )) as GorgiasListResponse<GorgiasCustomer>;

        return {
            success: true,
            data: {
                customers: response.data || [],
                pagination: response.meta
                    ? {
                          next_cursor: response.meta.next_cursor,
                          prev_cursor: response.meta.prev_cursor
                      }
                    : null
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
    customerId: z.number().int().positive().describe("The unique ID of the customer")
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
    client: GorgiasClient,
    params: GetCustomerParams
): Promise<OperationResult> {
    try {
        const customer = (await client.getCustomer(params.customerId)) as GorgiasCustomer;

        return {
            success: true,
            data: customer
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get customer";
        const isNotFound = message.includes("not found") || message.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}

// ============================================
// Create Customer
// ============================================

export const createCustomerSchema = z.object({
    email: z.string().email().optional().describe("Customer's primary email address"),
    name: z.string().optional().describe("Customer's full name"),
    firstname: z.string().optional().describe("Customer's first name"),
    lastname: z.string().optional().describe("Customer's last name"),
    language: z.string().optional().describe("Customer's preferred language code (e.g., 'en')"),
    timezone: z.string().optional().describe("Customer's timezone (e.g., 'America/New_York')"),
    external_id: z.string().optional().describe("External ID from your system"),
    note: z.string().optional().describe("Internal note about the customer"),
    channels: z
        .array(
            z.object({
                type: z
                    .enum(["email", "phone", "facebook", "instagram", "twitter"])
                    .describe("Channel type"),
                address: z.string().describe("Channel address (email, phone number, username)")
            })
        )
        .optional()
        .describe("Contact channels for the customer"),
    data: z.record(z.unknown()).optional().describe("Custom data fields from integrations")
});

export type CreateCustomerParams = z.infer<typeof createCustomerSchema>;

export const createCustomerOperation: OperationDefinition = {
    id: "createCustomer",
    name: "Create Customer",
    description: "Create a new customer",
    category: "customers",
    inputSchema: createCustomerSchema,
    retryable: false,
    timeout: 10000
};

export async function executeCreateCustomer(
    client: GorgiasClient,
    params: CreateCustomerParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {};

        if (params.email) data.email = params.email;
        if (params.name) data.name = params.name;
        if (params.firstname) data.firstname = params.firstname;
        if (params.lastname) data.lastname = params.lastname;
        if (params.language) data.language = params.language;
        if (params.timezone) data.timezone = params.timezone;
        if (params.external_id) data.external_id = params.external_id;
        if (params.note) data.note = params.note;
        if (params.channels) data.channels = params.channels;
        if (params.data) data.data = params.data;

        const customer = (await client.createCustomer(data)) as GorgiasCustomer;

        return {
            success: true,
            data: customer
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create customer";
        const isValidation = message.includes("validation") || message.includes("required");

        return {
            success: false,
            error: {
                type: isValidation ? "validation" : "server_error",
                message,
                retryable: !isValidation
            }
        };
    }
}

// ============================================
// Update Customer
// ============================================

export const updateCustomerSchema = z.object({
    customerId: z.number().int().positive().describe("The unique ID of the customer to update"),
    email: z.string().email().optional().describe("Updated email address"),
    name: z.string().optional().describe("Updated full name"),
    firstname: z.string().optional().describe("Updated first name"),
    lastname: z.string().optional().describe("Updated last name"),
    language: z.string().optional().describe("Updated language code"),
    timezone: z.string().optional().describe("Updated timezone"),
    external_id: z.string().optional().describe("Updated external ID"),
    note: z.string().optional().describe("Updated internal note"),
    channels: z
        .array(
            z.object({
                type: z.enum(["email", "phone", "facebook", "instagram", "twitter"]),
                address: z.string()
            })
        )
        .optional()
        .describe("Updated contact channels (replaces existing)"),
    data: z.record(z.unknown()).optional().describe("Updated custom data fields")
});

export type UpdateCustomerParams = z.infer<typeof updateCustomerSchema>;

export const updateCustomerOperation: OperationDefinition = {
    id: "updateCustomer",
    name: "Update Customer",
    description: "Update an existing customer's information",
    category: "customers",
    inputSchema: updateCustomerSchema,
    retryable: false,
    timeout: 10000
};

export async function executeUpdateCustomer(
    client: GorgiasClient,
    params: UpdateCustomerParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {};

        if (params.email !== undefined) data.email = params.email;
        if (params.name !== undefined) data.name = params.name;
        if (params.firstname !== undefined) data.firstname = params.firstname;
        if (params.lastname !== undefined) data.lastname = params.lastname;
        if (params.language !== undefined) data.language = params.language;
        if (params.timezone !== undefined) data.timezone = params.timezone;
        if (params.external_id !== undefined) data.external_id = params.external_id;
        if (params.note !== undefined) data.note = params.note;
        if (params.channels !== undefined) data.channels = params.channels;
        if (params.data !== undefined) data.data = params.data;

        const customer = (await client.updateCustomer(params.customerId, data)) as GorgiasCustomer;

        return {
            success: true,
            data: customer
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update customer";
        const isNotFound = message.includes("not found") || message.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
