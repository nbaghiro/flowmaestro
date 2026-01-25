/**
 * Freshdesk Contacts Operations
 */

import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FreshdeskClient } from "../client/FreshdeskClient";
import type { FreshdeskContact, FreshdeskSearchResponse } from "../types";

// ============================================
// Create Contact
// ============================================

export const createContactSchema = z.object({
    name: z.string().min(1).describe("Contact name"),
    email: z.string().email().optional().describe("Primary email"),
    phone: z.string().optional().describe("Phone number"),
    mobile: z.string().optional().describe("Mobile number"),
    company_id: z.number().int().optional().describe("Associated company ID"),
    custom_fields: z.record(z.unknown()).optional().describe("Custom fields")
});

export type CreateContactParams = z.infer<typeof createContactSchema>;

export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact",
    category: "data",
    inputSchema: createContactSchema,
    inputSchemaJSON: toJSONSchema(createContactSchema),
    retryable: false,
    timeout: 10000
};

export async function executeCreateContact(
    client: FreshdeskClient,
    params: CreateContactParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            name: params.name
        };

        if (params.email) data.email = params.email;
        if (params.phone) data.phone = params.phone;
        if (params.mobile) data.mobile = params.mobile;
        if (params.company_id) data.company_id = params.company_id;
        if (params.custom_fields) data.custom_fields = params.custom_fields;

        const contact = (await client.createContact(data)) as FreshdeskContact;

        return {
            success: true,
            data: contact
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create contact",
                retryable: false
            }
        };
    }
}

// ============================================
// Get Contact
// ============================================

export const getContactSchema = z.object({
    contactId: z.number().int().describe("Contact ID")
});

export type GetContactParams = z.infer<typeof getContactSchema>;

export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Retrieve a specific contact",
    category: "data",
    inputSchema: getContactSchema,
    inputSchemaJSON: toJSONSchema(getContactSchema),
    retryable: true,
    timeout: 10000
};

export async function executeGetContact(
    client: FreshdeskClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const contact = (await client.getContact(params.contactId)) as FreshdeskContact;

        return {
            success: true,
            data: contact
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get contact",
                retryable: true
            }
        };
    }
}

// ============================================
// Update Contact
// ============================================

export const updateContactSchema = z.object({
    contactId: z.number().int().describe("Contact ID"),
    name: z.string().optional().describe("Contact name"),
    email: z.string().email().optional().describe("Email"),
    phone: z.string().optional().describe("Phone"),
    custom_fields: z.record(z.unknown()).optional().describe("Custom fields")
});

export type UpdateContactParams = z.infer<typeof updateContactSchema>;

export const updateContactOperation: OperationDefinition = {
    id: "updateContact",
    name: "Update Contact",
    description: "Update an existing contact",
    category: "data",
    inputSchema: updateContactSchema,
    inputSchemaJSON: toJSONSchema(updateContactSchema),
    retryable: false,
    timeout: 10000
};

export async function executeUpdateContact(
    client: FreshdeskClient,
    params: UpdateContactParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {};

        if (params.name) data.name = params.name;
        if (params.email) data.email = params.email;
        if (params.phone) data.phone = params.phone;
        if (params.custom_fields) data.custom_fields = params.custom_fields;

        const contact = (await client.updateContact(params.contactId, data)) as FreshdeskContact;

        return {
            success: true,
            data: contact
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update contact",
                retryable: false
            }
        };
    }
}

// ============================================
// List Contacts
// ============================================

export const listContactsSchema = z.object({
    email: z.string().email().optional().describe("Filter by email"),
    phone: z.string().optional().describe("Filter by phone"),
    company_id: z.number().int().optional().describe("Filter by company"),
    per_page: z.number().int().min(1).max(100).optional().describe("Results per page"),
    page: z.number().int().min(1).optional().describe("Page number")
});

export type ListContactsParams = z.infer<typeof listContactsSchema>;

export const listContactsOperation: OperationDefinition = {
    id: "listContacts",
    name: "List Contacts",
    description: "List all contacts",
    category: "data",
    inputSchema: listContactsSchema,
    inputSchemaJSON: toJSONSchema(listContactsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListContacts(
    client: FreshdeskClient,
    params: ListContactsParams
): Promise<OperationResult> {
    try {
        const contacts = (await client.listContacts(params)) as FreshdeskContact[];

        return {
            success: true,
            data: {
                contacts
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list contacts",
                retryable: true
            }
        };
    }
}

// ============================================
// Search Contacts
// ============================================

export const searchContactsSchema = z.object({
    query: z.string().min(1).describe("Search query")
});

export type SearchContactsParams = z.infer<typeof searchContactsSchema>;

export const searchContactsOperation: OperationDefinition = {
    id: "searchContacts",
    name: "Search Contacts",
    description: "Search contacts using query",
    category: "data",
    inputSchema: searchContactsSchema,
    inputSchemaJSON: toJSONSchema(searchContactsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeSearchContacts(
    client: FreshdeskClient,
    params: SearchContactsParams
): Promise<OperationResult> {
    try {
        const response = (await client.searchContacts(
            params.query
        )) as FreshdeskSearchResponse<FreshdeskContact>;

        return {
            success: true,
            data: {
                contacts: response.results || [],
                total: response.total
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search contacts",
                retryable: true
            }
        };
    }
}
