import { z } from "zod";
import type { HubspotMarketingContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const getContactsSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of contacts to return (max 100)"),
    after: z.string().optional().describe("Pagination cursor from previous response"),
    properties: z
        .array(z.string())
        .optional()
        .describe("Contact properties to include in the response")
});

export type GetContactsParams = z.infer<typeof getContactsSchema>;

export const getContactsOperation: OperationDefinition = {
    id: "getContacts",
    name: "Get Contacts",
    description: "Get contacts from HubSpot Marketing",
    category: "contacts",
    inputSchema: getContactsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetContacts(
    client: HubspotMarketingClient,
    params: GetContactsParams
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

        const response = await client.getContacts({
            limit: params.limit,
            after: params.after,
            properties: params.properties || defaultProperties
        });

        const contacts: HubspotMarketingContactOutput[] = response.results.map((contact) => ({
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
        }));

        return {
            success: true,
            data: {
                contacts,
                hasMore: !!response.paging?.next?.after,
                nextCursor: response.paging?.next?.after
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get contacts",
                retryable: true
            }
        };
    }
}
