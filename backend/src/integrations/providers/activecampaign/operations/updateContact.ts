import { z } from "zod";
import type { ActiveCampaignContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const updateContactSchema = z.object({
    contactId: z.string().describe("The ID of the contact to update"),
    email: z.string().email().optional().describe("Contact email address"),
    firstName: z.string().optional().describe("Contact first name"),
    lastName: z.string().optional().describe("Contact last name"),
    phone: z.string().optional().describe("Contact phone number"),
    fieldValues: z
        .array(
            z.object({
                field: z.string().describe("Custom field ID"),
                value: z.string().describe("Field value")
            })
        )
        .optional()
        .describe("Custom field values")
});

export type UpdateContactParams = z.infer<typeof updateContactSchema>;

export const updateContactOperation: OperationDefinition = {
    id: "updateContact",
    name: "Update Contact",
    description: "Update a contact in ActiveCampaign",
    category: "contacts",
    inputSchema: updateContactSchema,
    retryable: false,
    timeout: 15000
};

export async function executeUpdateContact(
    client: ActiveCampaignClient,
    params: UpdateContactParams
): Promise<OperationResult> {
    try {
        const response = await client.updateContact(params.contactId, {
            email: params.email,
            firstName: params.firstName,
            lastName: params.lastName,
            phone: params.phone,
            fieldValues: params.fieldValues
        });

        const output: ActiveCampaignContactOutput = {
            id: response.contact.id,
            email: response.contact.email,
            firstName: response.contact.firstName,
            lastName: response.contact.lastName,
            phone: response.contact.phone,
            createdAt: response.contact.cdate,
            updatedAt: response.contact.udate
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
