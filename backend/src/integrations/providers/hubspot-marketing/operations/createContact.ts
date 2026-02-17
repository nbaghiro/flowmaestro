import { z } from "zod";
import type { HubspotMarketingContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const createContactSchema = z.object({
    email: z.string().email().describe("Contact email address"),
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
    properties: z.record(z.string()).optional().describe("Additional contact properties")
});

export type CreateContactParams = z.infer<typeof createContactSchema>;

export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact in HubSpot Marketing",
    category: "contacts",
    inputSchema: createContactSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateContact(
    client: HubspotMarketingClient,
    params: CreateContactParams
): Promise<OperationResult> {
    try {
        const properties: Record<string, string> = {
            email: params.email,
            ...params.properties
        };

        if (params.firstName) properties.firstname = params.firstName;
        if (params.lastName) properties.lastname = params.lastName;
        if (params.company) properties.company = params.company;
        if (params.phone) properties.phone = params.phone;
        if (params.lifecycleStage) properties.lifecyclestage = params.lifecycleStage;

        const contact = await client.createContact(properties);

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
        const message = error instanceof Error ? error.message : "Failed to create contact";
        return {
            success: false,
            error: {
                type: message.includes("already exists") ? "validation" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
