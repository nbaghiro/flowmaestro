import { z } from "zod";
import type { HubspotMarketingContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const updateContactSchema = z.object({
    contactId: z.string().describe("The ID of the contact to update"),
    email: z.string().email().optional().describe("Contact email address"),
    firstName: z.string().optional().describe("Contact first name"),
    lastName: z.string().optional().describe("Contact last name"),
    company: z.string().optional().describe("Contact company name"),
    phone: z.string().optional().describe("Contact phone number"),
    lifecycleStage: z
        .enum([
            "subscriber",
            "lead",
            "marketingqualifiedlead",
            "salesqualifiedlead",
            "opportunity",
            "customer",
            "evangelist",
            "other"
        ])
        .optional()
        .describe("Contact lifecycle stage"),
    properties: z.record(z.string()).optional().describe("Additional contact properties to update")
});

export type UpdateContactParams = z.infer<typeof updateContactSchema>;

export const updateContactOperation: OperationDefinition = {
    id: "updateContact",
    name: "Update Contact",
    description: "Update a contact in HubSpot Marketing",
    category: "contacts",
    inputSchema: updateContactSchema,
    retryable: false,
    timeout: 15000
};

export async function executeUpdateContact(
    client: HubspotMarketingClient,
    params: UpdateContactParams
): Promise<OperationResult> {
    try {
        const properties: Record<string, string> = {
            ...params.properties
        };

        if (params.email) properties.email = params.email;
        if (params.firstName) properties.firstname = params.firstName;
        if (params.lastName) properties.lastname = params.lastName;
        if (params.company) properties.company = params.company;
        if (params.phone) properties.phone = params.phone;
        if (params.lifecycleStage) properties.lifecyclestage = params.lifecycleStage;

        const contact = await client.updateContact(params.contactId, properties);

        const output: HubspotMarketingContactOutput = {
            id: contact.id,
            email: contact.properties.email || undefined,
            firstName: contact.properties.firstname || undefined,
            lastName: contact.properties.lastname || undefined,
            company: contact.properties.company || undefined,
            phone: contact.properties.phone || undefined,
            lifecycleStage: contact.properties.lifecyclestage || undefined,
            properties: contact.properties,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt
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
