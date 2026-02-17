import { z } from "zod";
import type { HubspotMarketingContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const searchContactsSchema = z.object({
    query: z.string().optional().describe("Search query string"),
    filters: z
        .array(
            z.object({
                propertyName: z.string().describe("Property name to filter on"),
                operator: z
                    .enum([
                        "EQ",
                        "NEQ",
                        "LT",
                        "LTE",
                        "GT",
                        "GTE",
                        "BETWEEN",
                        "IN",
                        "NOT_IN",
                        "HAS_PROPERTY",
                        "NOT_HAS_PROPERTY",
                        "CONTAINS_TOKEN",
                        "NOT_CONTAINS_TOKEN"
                    ])
                    .describe("Filter operator"),
                value: z.string().describe("Value to compare against")
            })
        )
        .optional()
        .describe("Filter conditions for the search"),
    properties: z
        .array(z.string())
        .optional()
        .describe("Contact properties to include in the response"),
    limit: z.number().min(1).max(100).optional().describe("Number of results to return (max 100)")
});

export type SearchContactsParams = z.infer<typeof searchContactsSchema>;

export const searchContactsOperation: OperationDefinition = {
    id: "searchContacts",
    name: "Search Contacts",
    description: "Search contacts in HubSpot Marketing using filters",
    category: "contacts",
    inputSchema: searchContactsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeSearchContacts(
    client: HubspotMarketingClient,
    params: SearchContactsParams
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

        const filterGroups = params.filters
            ? [
                  {
                      filters: params.filters.map((f) => ({
                          propertyName: f.propertyName,
                          operator: f.operator,
                          value: f.value
                      }))
                  }
              ]
            : undefined;

        const response = await client.searchContacts({
            query: params.query,
            filterGroups,
            properties: params.properties || defaultProperties,
            limit: params.limit
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
                total: response.total,
                hasMore: !!response.paging?.next?.after,
                nextCursor: response.paging?.next?.after
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search contacts",
                retryable: true
            }
        };
    }
}
