import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { DriftContactsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listContactsSchema = z.object({
    limit: z.number().optional().default(50).describe("Number of contacts to return"),
    cursor: z.string().optional().describe("Pagination cursor for next page")
});

export type ListContactsParams = z.infer<typeof listContactsSchema>;

export const listContactsOperation: OperationDefinition = {
    id: "listContacts",
    name: "List Contacts",
    description: "List contacts with pagination",
    category: "contacts",
    actionType: "read",
    inputSchema: listContactsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeListContacts(
    client: DriftClient,
    params: ListContactsParams
): Promise<OperationResult> {
    try {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.set("limit", String(params.limit));
        if (params.cursor) queryParams.set("cursor", params.cursor);

        const qs = queryParams.toString();
        const response = await client.get<DriftContactsResponse>(`/contacts${qs ? `?${qs}` : ""}`);

        return {
            success: true,
            data: {
                contacts: response.data.map((c) => ({
                    id: c.id,
                    email: c.attributes.email,
                    name: c.attributes.name,
                    phone: c.attributes.phone,
                    company: c.attributes.company,
                    title: c.attributes.title,
                    createdAt: c.createdAt
                })),
                pagination: response.pagination
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
