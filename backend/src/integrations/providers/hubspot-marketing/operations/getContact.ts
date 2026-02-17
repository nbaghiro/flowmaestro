import { z } from "zod";
import type { HubspotMarketingContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const getContactSchema = z.object({
    contactId: z.string().describe("The ID of the contact to retrieve"),
    properties: z
        .array(z.string())
        .optional()
        .describe("Contact properties to include in the response")
});

export type GetContactParams = z.infer<typeof getContactSchema>;

export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Get a single contact from HubSpot Marketing by ID",
    category: "contacts",
    inputSchema: getContactSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetContact(
    client: HubspotMarketingClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const defaultProperties = [
            "email",
            "firstname",
            "lastname",
            "company",
            "phone",
            "lifecyclestage"
        ];

        const contact = await client.getContact(
            params.contactId,
            params.properties || defaultProperties
        );

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
        const message = error instanceof Error ? error.message : "Failed to get contact";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: !message.includes("not found")
            }
        };
    }
}
