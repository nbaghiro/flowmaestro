/**
 * Intercom Contacts Operations
 */

import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { IntercomClient } from "../client/IntercomClient";
import type { IntercomContact, IntercomListResponse } from "../types";

// ============================================
// List Contacts
// ============================================

export const listContactsSchema = z.object({
    email: z.string().email().optional().describe("Filter contacts by email address"),
    per_page: z
        .number()
        .int()
        .min(1)
        .max(150)
        .optional()
        .describe("Number of results per page (max 150)"),
    starting_after: z.string().optional().describe("Cursor for pagination")
});

export type ListContactsParams = z.infer<typeof listContactsSchema>;

export const listContactsOperation: OperationDefinition = {
    id: "listContacts",
    name: "List Contacts",
    description: "List all contacts with optional filters",
    category: "data",
    inputSchema: listContactsSchema,
    inputSchemaJSON: toJSONSchema(listContactsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListContacts(
    client: IntercomClient,
    params: ListContactsParams
): Promise<OperationResult> {
    try {
        // If email filter is provided, use search instead
        if (params.email) {
            const searchQuery = {
                field: "email",
                operator: "=",
                value: params.email
            };
            const response = (await client.searchContacts(
                searchQuery
            )) as IntercomListResponse<IntercomContact>;
            return {
                success: true,
                data: {
                    contacts: response.data || [],
                    total_count: response.total_count
                }
            };
        }

        const response = (await client.listContacts({
            per_page: params.per_page,
            starting_after: params.starting_after
        })) as IntercomListResponse<IntercomContact>;

        return {
            success: true,
            data: {
                contacts: response.data || [],
                total_count: response.total_count,
                pages: response.pages
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
// Get Contact
// ============================================

export const getContactSchema = z.object({
    contactId: z.string().min(1).describe("The unique identifier of the contact")
});

export type GetContactParams = z.infer<typeof getContactSchema>;

export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Retrieve a specific contact by ID",
    category: "data",
    inputSchema: getContactSchema,
    inputSchemaJSON: toJSONSchema(getContactSchema),
    retryable: true,
    timeout: 10000
};

export async function executeGetContact(
    client: IntercomClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const contact = (await client.getContact(params.contactId)) as IntercomContact;

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
// Create Contact
// ============================================

export const createContactSchema = z.object({
    role: z.enum(["user", "lead"]).describe("Contact type: user or lead"),
    email: z.string().email().optional().describe("Email address of the contact"),
    name: z.string().optional().describe("Full name of the contact"),
    phone: z.string().optional().describe("Phone number of the contact"),
    external_id: z.string().optional().describe("External ID from your system"),
    custom_attributes: z
        .record(z.unknown())
        .optional()
        .describe("Custom attributes for the contact")
});

export type CreateContactParams = z.infer<typeof createContactSchema>;

export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact (lead or user)",
    category: "data",
    inputSchema: createContactSchema,
    inputSchemaJSON: toJSONSchema(createContactSchema),
    retryable: false,
    timeout: 10000
};

export async function executeCreateContact(
    client: IntercomClient,
    params: CreateContactParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            role: params.role
        };

        if (params.email) data.email = params.email;
        if (params.name) data.name = params.name;
        if (params.phone) data.phone = params.phone;
        if (params.external_id) data.external_id = params.external_id;
        if (params.custom_attributes) data.custom_attributes = params.custom_attributes;

        const contact = (await client.createContact(data)) as IntercomContact;

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
// Update Contact
// ============================================

export const updateContactSchema = z.object({
    contactId: z.string().min(1).describe("The unique identifier of the contact to update"),
    email: z.string().email().optional().describe("Email address of the contact"),
    name: z.string().optional().describe("Full name of the contact"),
    phone: z.string().optional().describe("Phone number of the contact"),
    custom_attributes: z
        .record(z.unknown())
        .optional()
        .describe("Custom attributes for the contact")
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
    client: IntercomClient,
    params: UpdateContactParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {};

        if (params.email) data.email = params.email;
        if (params.name) data.name = params.name;
        if (params.phone) data.phone = params.phone;
        if (params.custom_attributes) data.custom_attributes = params.custom_attributes;

        const contact = (await client.updateContact(params.contactId, data)) as IntercomContact;

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
// Search Contacts
// ============================================

export const searchContactsSchema = z.object({
    query: z
        .object({
            field: z.string().describe("Field to search on"),
            operator: z.string().describe("Search operator (=, !=, IN, NIN, <, >, ~, !~, ^, $)"),
            value: z.unknown().describe("Value to search for")
        })
        .describe("Search query object"),
    per_page: z
        .number()
        .int()
        .min(1)
        .max(150)
        .optional()
        .describe("Number of results per page (max 150)")
});

export type SearchContactsParams = z.infer<typeof searchContactsSchema>;

export const searchContactsOperation: OperationDefinition = {
    id: "searchContacts",
    name: "Search Contacts",
    description: "Search contacts with query",
    category: "data",
    inputSchema: searchContactsSchema,
    inputSchemaJSON: toJSONSchema(searchContactsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeSearchContacts(
    client: IntercomClient,
    params: SearchContactsParams
): Promise<OperationResult> {
    try {
        const response = (await client.searchContacts(
            params.query
        )) as IntercomListResponse<IntercomContact>;

        return {
            success: true,
            data: {
                contacts: response.data || [],
                total_count: response.total_count,
                pages: response.pages
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
