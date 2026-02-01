import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient, SendGridContact } from "../client/SendGridClient";

export const updateContactSchema = z.object({
    email: z.string().email().describe("Email address of the contact to update"),
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

export type UpdateContactParams = z.infer<typeof updateContactSchema>;

export const updateContactOperation: OperationDefinition = {
    id: "updateContact",
    name: "Update Contact",
    description: "Update an existing contact in SendGrid Marketing (async operation)",
    category: "contacts",
    inputSchema: updateContactSchema,
    retryable: false,
    timeout: 30000
};

export async function executeUpdateContact(
    client: SendGridClient,
    params: UpdateContactParams
): Promise<OperationResult> {
    try {
        const contact: SendGridContact = {
            email: params.email,
            first_name: params.firstName,
            last_name: params.lastName,
            alternate_emails: params.alternateEmails,
            address_line_1: params.addressLine1,
            address_line_2: params.addressLine2,
            city: params.city,
            state_province_region: params.state,
            postal_code: params.postalCode,
            country: params.country,
            phone_number: params.phone,
            custom_fields: params.customFields
        };

        const result = await client.addContacts([contact]);

        return {
            success: true,
            data: {
                jobId: result.job_id,
                email: params.email
            }
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
