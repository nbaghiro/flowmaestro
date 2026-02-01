import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient, SendGridContact } from "../client/SendGridClient";

const contactSchema = z.object({
    email: z.string().email().describe("Email address (required)"),
    firstName: z.string().optional().describe("First name"),
    lastName: z.string().optional().describe("Last name"),
    alternateEmails: z.array(z.string().email()).optional().describe("Alternate email addresses"),
    addressLine1: z.string().optional().describe("Address line 1"),
    addressLine2: z.string().optional().describe("Address line 2"),
    city: z.string().optional().describe("City"),
    state: z.string().optional().describe("State/Province"),
    postalCode: z.string().optional().describe("Postal/ZIP code"),
    country: z.string().optional().describe("Country"),
    phone: z.string().optional().describe("Phone number"),
    customFields: z.record(z.string()).optional().describe("Custom field values")
});

export const addContactsSchema = z.object({
    contacts: z.array(contactSchema).min(1).max(30000).describe("Contacts to add (max 30,000)"),
    listIds: z.array(z.string()).optional().describe("List IDs to add contacts to")
});

export type AddContactsParams = z.infer<typeof addContactsSchema>;

export const addContactsOperation: OperationDefinition = {
    id: "addContacts",
    name: "Add Contacts",
    description: "Add or update contacts in SendGrid Marketing (async operation)",
    category: "contacts",
    inputSchema: addContactsSchema,
    retryable: false,
    timeout: 30000
};

export async function executeAddContacts(
    client: SendGridClient,
    params: AddContactsParams
): Promise<OperationResult> {
    try {
        const contacts: SendGridContact[] = params.contacts.map((c) => ({
            email: c.email,
            first_name: c.firstName,
            last_name: c.lastName,
            alternate_emails: c.alternateEmails,
            address_line_1: c.addressLine1,
            address_line_2: c.addressLine2,
            city: c.city,
            state_province_region: c.state,
            postal_code: c.postalCode,
            country: c.country,
            phone_number: c.phone,
            custom_fields: c.customFields
        }));

        const result = await client.addContacts(contacts, params.listIds);

        return {
            success: true,
            data: {
                jobId: result.job_id,
                contactCount: params.contacts.length,
                listIds: params.listIds
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add contacts",
                retryable: false
            }
        };
    }
}
