import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Get Email Parameters
 */
export const getEmailSchema = z.object({
    emailId: z.string(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type GetEmailParams = z.infer<typeof getEmailSchema>;

/**
 * Operation Definition
 */
export const getEmailOperation: OperationDefinition = {
    id: "getEmail",
    name: "Get Email",
    description: "Retrieve an email engagement by ID from HubSpot CRM",
    category: "crm",
    inputSchema: getEmailSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Email
 */
export async function executeGetEmail(
    client: HubspotClient,
    params: GetEmailParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/emails/${params.emailId}`;

        const queryParams: Record<string, unknown> = {};
        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }
        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        const response = await client.get<HubspotEngagement>(endpoint, queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get email",
                retryable: false
            }
        };
    }
}
