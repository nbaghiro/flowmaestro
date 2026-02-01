import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotListResponse, HubspotEngagement } from "../../types";

/**
 * List Emails Parameters
 */
export const listEmailsSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(10),
    after: z.string().optional(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional(),
    archived: z.boolean().optional()
});

export type ListEmailsParams = z.infer<typeof listEmailsSchema>;

/**
 * Operation Definition
 */
export const listEmailsOperation: OperationDefinition = {
    id: "listEmails",
    name: "List Emails",
    description: "List all email engagements in HubSpot CRM with pagination",
    category: "crm",
    inputSchema: listEmailsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute List Emails
 */
export async function executeListEmails(
    client: HubspotClient,
    params: ListEmailsParams
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
        if (params.archived !== undefined) {
            queryParams.archived = params.archived;
        }

        const response = await client.get<HubspotListResponse<HubspotEngagement>>(
            "/crm/v3/objects/emails",
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
                message: error instanceof Error ? error.message : "Failed to list emails",
                retryable: false
            }
        };
    }
}
