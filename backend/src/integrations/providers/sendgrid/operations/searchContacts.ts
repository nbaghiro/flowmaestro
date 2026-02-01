import { z } from "zod";
import type { SendGridContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const searchContactsSchema = z.object({
    query: z
        .string()
        .min(1)
        .describe(
            "SGQL query (e.g., \"email LIKE '%@example.com'\" or \"first_name='John' AND last_name='Doe'\")"
        )
});

export type SearchContactsParams = z.infer<typeof searchContactsSchema>;

export const searchContactsOperation: OperationDefinition = {
    id: "searchContacts",
    name: "Search Contacts",
    description: "Search contacts using SendGrid Query Language (SGQL)",
    category: "contacts",
    inputSchema: searchContactsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeSearchContacts(
    client: SendGridClient,
    params: SearchContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.searchContacts(params.query);

        const contacts: SendGridContactOutput[] = response.result.map((c) => ({
            id: c.id,
            email: c.email,
            firstName: c.first_name,
            lastName: c.last_name,
            alternateEmails: c.alternate_emails,
            address: {
                line1: c.address_line_1,
                line2: c.address_line_2,
                city: c.city,
                state: c.state_province_region,
                postalCode: c.postal_code,
                country: c.country
            },
            phone: c.phone_number,
            customFields: c.custom_fields,
            createdAt: c.created_at,
            updatedAt: c.updated_at
        }));

        return {
            success: true,
            data: {
                contacts,
                totalCount: response.contact_count
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
