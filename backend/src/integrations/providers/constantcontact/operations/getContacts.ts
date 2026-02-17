import { z } from "zod";
import type { ConstantContactContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const getContactsSchema = z.object({
    limit: z.number().min(1).max(500).optional().describe("Maximum contacts to return (1-500)"),
    cursor: z.string().optional().describe("Pagination cursor for next page"),
    status: z
        .enum(["all", "active", "deleted", "not_set", "pending_confirmation", "temp_hold"])
        .optional()
        .describe("Filter by contact status"),
    email: z.string().email().optional().describe("Filter by exact email address"),
    listId: z.string().optional().describe("Filter by list membership")
});

export type GetContactsParams = z.infer<typeof getContactsSchema>;

export const getContactsOperation: OperationDefinition = {
    id: "getContacts",
    name: "Get Contacts",
    description: "Retrieve contacts from Constant Contact with optional filters",
    category: "contacts",
    inputSchema: getContactsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetContacts(
    client: ConstantContactClient,
    params: GetContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.getContacts({
            limit: params.limit,
            cursor: params.cursor,
            status: params.status,
            email: params.email,
            listId: params.listId
        });

        const contacts: ConstantContactContactOutput[] = response.contacts.map((contact) => ({
            id: contact.contact_id,
            email: contact.email_address.address,
            firstName: contact.first_name,
            lastName: contact.last_name,
            phone: contact.phone_numbers?.[0]?.phone_number,
            jobTitle: contact.job_title,
            companyName: contact.company_name,
            createdAt: contact.created_at,
            updatedAt: contact.updated_at,
            emailConsent: contact.email_address.permission_to_send,
            customFields: contact.custom_fields?.map((f) => ({
                fieldId: f.custom_field_id,
                value: f.value
            }))
        }));

        return {
            success: true,
            data: {
                contacts,
                total: contacts.length,
                hasMore: !!response._links?.next
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get contacts";
        return {
            success: false,
            error: {
                type: message.includes("rate limit") ? "rate_limit" : "server_error",
                message,
                retryable: message.includes("rate limit")
            }
        };
    }
}
