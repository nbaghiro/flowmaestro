import { z } from "zod";
import type { SendGridContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const getContactsSchema = z.object({
    pageSize: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Number of contacts per page (max 1000)"),
    pageToken: z.string().optional().describe("Page token for pagination")
});

export type GetContactsParams = z.infer<typeof getContactsSchema>;

export const getContactsOperation: OperationDefinition = {
    id: "getContacts",
    name: "Get Contacts",
    description: "Get all contacts from SendGrid Marketing",
    category: "contacts",
    inputSchema: getContactsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetContacts(
    client: SendGridClient,
    params: GetContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.getContacts({
            page_size: params.pageSize,
            page_token: params.pageToken
        });

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

        // Extract next page token from metadata
        let nextPageToken: string | undefined;
        if (response._metadata?.next) {
            const url = new URL(response._metadata.next, "https://api.sendgrid.com");
            nextPageToken = url.searchParams.get("page_token") || undefined;
        }

        return {
            success: true,
            data: {
                contacts,
                totalCount: response.contact_count,
                nextPageToken,
                hasMore: !!response._metadata?.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get contacts",
                retryable: true
            }
        };
    }
}
