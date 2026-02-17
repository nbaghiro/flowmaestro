import { z } from "zod";
import type { ActiveCampaignContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const getContactsSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of contacts to return (max 100)"),
    offset: z.number().min(0).optional().describe("Number of contacts to skip"),
    email: z.string().email().optional().describe("Filter contacts by email address"),
    listId: z.string().optional().describe("Filter contacts by list ID")
});

export type GetContactsParams = z.infer<typeof getContactsSchema>;

export const getContactsOperation: OperationDefinition = {
    id: "getContacts",
    name: "Get Contacts",
    description: "Get contacts from ActiveCampaign",
    category: "contacts",
    inputSchema: getContactsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetContacts(
    client: ActiveCampaignClient,
    params: GetContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.getContacts({
            limit: params.limit,
            offset: params.offset,
            email: params.email,
            listid: params.listId
        });

        const contacts: ActiveCampaignContactOutput[] = response.contacts.map((contact) => ({
            id: contact.id,
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
            phone: contact.phone,
            createdAt: contact.cdate,
            updatedAt: contact.udate
        }));

        return {
            success: true,
            data: {
                contacts,
                total: parseInt(response.meta.total, 10),
                hasMore: contacts.length === (params.limit || 20)
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
