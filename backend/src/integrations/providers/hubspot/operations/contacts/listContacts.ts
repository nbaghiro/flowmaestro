import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotContact, HubspotListResponse } from "../types";

/**
 * List Contacts Parameters
 */
export const listContactsSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(10),
    after: z.string().optional(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type ListContactsParams = z.infer<typeof listContactsSchema>;

/**
 * Operation Definition
 */
export const listContactsOperation: OperationDefinition = {
    id: "listContacts",
    name: "List Contacts",
    description: "List all contacts with pagination",
    category: "crm",
    inputSchema: listContactsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute List Contacts
 */
export async function executeListContacts(
    client: HubspotClient,
    params: ListContactsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            limit: params.limit
        };

        if (params.after) {
            queryParams.after = params.after;
        }

        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }

        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        const response = await client.get<HubspotListResponse<HubspotContact>>(
            "/crm/v3/objects/contacts",
            queryParams
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list contacts",
                retryable: false
            }
        };
    }
}
