import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

export const getContactSchema = z.object({
    contactId: z.string().describe("The contact ID to retrieve")
});

export type GetContactParams = z.infer<typeof getContactSchema>;

export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Get a specific contact by ID",
    category: "data",
    inputSchema: getContactSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetContact(
    client: FrontClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const contact = await client.getContact(params.contactId);

        return {
            success: true,
            data: {
                id: contact.id,
                name: contact.name,
                description: contact.description,
                avatarUrl: contact.avatar_url,
                isSpammer: contact.is_spammer,
                handles: contact.handles,
                links: contact.links,
                groups: contact.groups?.map((g) => ({ id: g.id, name: g.name })) || [],
                customFields: contact.custom_fields,
                updatedAt: new Date(contact.updated_at * 1000).toISOString()
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get contact";
        const isNotFound = errorMessage.includes("not found") || errorMessage.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message: errorMessage,
                retryable: !isNotFound
            }
        };
    }
}
