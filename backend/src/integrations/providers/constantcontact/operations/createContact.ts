import { z } from "zod";
import type { ConstantContactContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const createContactSchema = z.object({
    email: z.string().email().describe("Contact email address"),
    firstName: z.string().optional().describe("Contact first name"),
    lastName: z.string().optional().describe("Contact last name"),
    phone: z.string().optional().describe("Contact phone number"),
    jobTitle: z.string().optional().describe("Contact job title"),
    companyName: z.string().optional().describe("Contact company name"),
    listIds: z.array(z.string()).optional().describe("List IDs to add the contact to"),
    permissionToSend: z
        .enum(["explicit", "implicit", "pending_confirmation"])
        .optional()
        .default("implicit")
        .describe("Email permission status")
});

export type CreateContactParams = z.infer<typeof createContactSchema>;

export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact in Constant Contact",
    category: "contacts",
    inputSchema: createContactSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateContact(
    client: ConstantContactClient,
    params: CreateContactParams
): Promise<OperationResult> {
    try {
        const contact = await client.createContact({
            email_address: {
                address: params.email,
                permission_to_send: params.permissionToSend || "implicit"
            },
            first_name: params.firstName,
            last_name: params.lastName,
            job_title: params.jobTitle,
            company_name: params.companyName,
            phone_numbers: params.phone
                ? [{ phone_number: params.phone, kind: "mobile" }]
                : undefined,
            list_memberships: params.listIds
        });

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
        const message = error instanceof Error ? error.message : "Failed to create contact";
        return {
            success: false,
            error: {
                type:
                    message.includes("duplicate") || message.includes("already exists")
                        ? "validation"
                        : "server_error",
                message,
                retryable: false
            }
        };
    }
}
