import { z } from "zod";
import type { SendGridContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const getContactSchema = z.object({
    contactId: z.string().min(1).describe("The unique ID of the contact")
});

export type GetContactParams = z.infer<typeof getContactSchema>;

export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Get a single contact by ID from SendGrid",
    category: "contacts",
    inputSchema: getContactSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetContact(
    client: SendGridClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const c = await client.getContact(params.contactId);

        const output: SendGridContactOutput = {
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
        };

        return {
            success: true,
            data: output
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
