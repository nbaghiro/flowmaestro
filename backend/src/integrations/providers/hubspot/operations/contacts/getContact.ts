import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotContact } from "../types";

/**
 * Get Contact Parameters
 */
export const getContactSchema = z
    .object({
        contactId: z.string().optional(),
        email: z.string().email().optional(),
        properties: z.array(z.string()).optional(),
        associations: z.array(z.string()).optional()
    })
    .refine((data) => data.contactId || data.email, {
        message: "Either contactId or email must be provided"
    });

export type GetContactParams = z.infer<typeof getContactSchema>;

/**
 * Operation Definition
 */
export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Get a contact by ID or email address",
    category: "crm",
    inputSchema: getContactSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Contact
 */
export async function executeGetContact(
    client: HubspotClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        let endpoint = "/crm/v3/objects/contacts";

        // Build query parameters
        const queryParams: Record<string, unknown> = {};

        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }

        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        // Fetch by email or ID
        if (params.email) {
            endpoint += `/${encodeURIComponent(params.email)}`;
            queryParams.idProperty = "email";
        } else if (params.contactId) {
            endpoint += `/${params.contactId}`;
        }

        const response = await client.get<HubspotContact>(endpoint, queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get contact",
                retryable: false
            }
        };
    }
}
