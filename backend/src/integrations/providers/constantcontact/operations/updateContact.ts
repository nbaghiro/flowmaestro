import { z } from "zod";
import type { ConstantContactContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const updateContactSchema = z.object({
    contactId: z.string().describe("The contact ID to update"),
    email: z.string().email().optional().describe("Updated email address"),
    firstName: z.string().optional().describe("Updated first name"),
    lastName: z.string().optional().describe("Updated last name"),
    phone: z.string().optional().describe("Updated phone number"),
    jobTitle: z.string().optional().describe("Updated job title"),
    companyName: z.string().optional().describe("Updated company name")
});

export type UpdateContactParams = z.infer<typeof updateContactSchema>;

export const updateContactOperation: OperationDefinition = {
    id: "updateContact",
    name: "Update Contact",
    description: "Update an existing contact in Constant Contact",
    category: "contacts",
    inputSchema: updateContactSchema,
    retryable: false,
    timeout: 15000
};

export async function executeUpdateContact(
    client: ConstantContactClient,
    params: UpdateContactParams
): Promise<OperationResult> {
    try {
        const updateData: Parameters<typeof client.updateContact>[1] = {};

        if (params.email) {
            updateData.email_address = {
                address: params.email
            };
        }
        if (params.firstName !== undefined) updateData.first_name = params.firstName;
        if (params.lastName !== undefined) updateData.last_name = params.lastName;
        if (params.jobTitle !== undefined) updateData.job_title = params.jobTitle;
        if (params.companyName !== undefined) updateData.company_name = params.companyName;
        if (params.phone !== undefined) {
            updateData.phone_numbers = [{ phone_number: params.phone, kind: "mobile" }];
        }

        const contact = await client.updateContact(params.contactId, updateData);

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
            emailConsent: contact.email_address.permission_to_send
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update contact";
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
