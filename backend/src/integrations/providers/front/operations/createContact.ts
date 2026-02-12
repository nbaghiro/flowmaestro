import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

const handleSchema = z.object({
    handle: z.string().describe("The contact handle (email, phone number, etc.)"),
    source: z.string().describe("The source/type of handle (email, phone, twitter, etc.)")
});

export const createContactSchema = z.object({
    name: z.string().optional().describe("Contact name"),
    description: z.string().optional().describe("Contact description or notes"),
    handles: z
        .array(handleSchema)
        .min(1)
        .describe("Contact handles (email addresses, phone numbers, etc.)"),
    groupNames: z.array(z.string()).optional().describe("Group names to add the contact to"),
    customFields: z.record(z.unknown()).optional().describe("Custom field values")
});

export type CreateContactParams = z.infer<typeof createContactSchema>;

export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact in Front",
    category: "data",
    inputSchema: createContactSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateContact(
    client: FrontClient,
    params: CreateContactParams
): Promise<OperationResult> {
    try {
        const contact = await client.createContact({
            name: params.name,
            description: params.description,
            handles: params.handles,
            group_names: params.groupNames,
            custom_fields: params.customFields
        });

        return {
            success: true,
            data: {
                id: contact.id,
                name: contact.name,
                description: contact.description,
                handles: contact.handles,
                groups: contact.groups?.map((g) => ({ id: g.id, name: g.name })) || [],
                updatedAt: new Date(contact.updated_at * 1000).toISOString()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create contact",
                retryable: false
            }
        };
    }
}
