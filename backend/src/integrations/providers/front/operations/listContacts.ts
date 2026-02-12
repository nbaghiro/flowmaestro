import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

export const listContactsSchema = z.object({
    query: z.string().optional().describe("Search query to filter contacts"),
    sortBy: z.string().optional().describe("Field to sort by"),
    sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort order (default: asc)"),
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum results to return (default: 50, max: 100)"),
    pageToken: z.string().optional().describe("Pagination token for next page")
});

export type ListContactsParams = z.infer<typeof listContactsSchema>;

export const listContactsOperation: OperationDefinition = {
    id: "listContacts",
    name: "List Contacts",
    description: "List all contacts in Front with optional filters",
    category: "data",
    inputSchema: listContactsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListContacts(
    client: FrontClient,
    params: ListContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.listContacts({
            q: params.query,
            sort_by: params.sortBy,
            sort_order: params.sortOrder,
            limit: params.limit,
            page_token: params.pageToken
        });

        return {
            success: true,
            data: {
                contacts: response._results.map((contact) => ({
                    id: contact.id,
                    name: contact.name,
                    description: contact.description,
                    avatarUrl: contact.avatar_url,
                    isSpammer: contact.is_spammer,
                    handles: contact.handles,
                    links: contact.links,
                    groups: contact.groups?.map((g) => ({ id: g.id, name: g.name })) || [],
                    updatedAt: new Date(contact.updated_at * 1000).toISOString()
                })),
                pagination: {
                    nextToken: response._pagination?.next
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list contacts",
                retryable: true
            }
        };
    }
}
