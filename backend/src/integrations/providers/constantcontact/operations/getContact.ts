import { z } from "zod";
import type { ConstantContactContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const getContactSchema = z.object({
    contactId: z.string().describe("The contact ID to retrieve")
});

export type GetContactParams = z.infer<typeof getContactSchema>;

export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Retrieve a single contact by ID from Constant Contact",
    category: "contacts",
    inputSchema: getContactSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetContact(
    client: ConstantContactClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const contact = await client.getContact(params.contactId);

        const output: ConstantContactContactOutput = {
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
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get contact";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
