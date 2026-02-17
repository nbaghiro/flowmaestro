import { z } from "zod";
import type { ActiveCampaignContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const createContactSchema = z.object({
    email: z.string().email().describe("Contact email address"),
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

export type CreateContactParams = z.infer<typeof createContactSchema>;

export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact in ActiveCampaign",
    category: "contacts",
    inputSchema: createContactSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateContact(
    client: ActiveCampaignClient,
    params: CreateContactParams
): Promise<OperationResult> {
    try {
        const response = await client.createContact({
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
        const message = error instanceof Error ? error.message : "Failed to create contact";
        return {
            success: false,
            error: {
                type:
                    message.includes("duplicate") || message.includes("exists")
                        ? "validation"
                        : "server_error",
                message,
                retryable: false
            }
        };
    }
}
