import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotContact } from "../types";

/**
 * Update Contact Parameters
 */
export const updateContactSchema = z
    .object({
        contactId: z.string().optional(),
        email: z.string().email().optional(),
        properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    })
    .refine((data) => data.contactId || data.email, {
        message: "Either contactId or email must be provided"
    });

export type UpdateContactParams = z.infer<typeof updateContactSchema>;

/**
 * Operation Definition
 */
export const updateContactOperation: OperationDefinition = {
    id: "updateContact",
    name: "Update Contact",
    description: "Update a contact's properties by ID or email",
    category: "crm",
    inputSchema: updateContactSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Contact
 */
export async function executeUpdateContact(
    client: HubspotClient,
    params: UpdateContactParams
): Promise<OperationResult> {
    try {
        let endpoint = "/crm/v3/objects/contacts";

        const queryParams: Record<string, unknown> = {};

        if (params.email) {
            endpoint += `/${encodeURIComponent(params.email)}`;
            queryParams.idProperty = "email";
        } else if (params.contactId) {
            endpoint += `/${params.contactId}`;
        }

        const response = await client.patch<HubspotContact>(endpoint, {
            properties: params.properties
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update contact",
                retryable: false
            }
        };
    }
}
