import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Create Email Parameters
 */
export const createEmailSchema = z.object({
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
    associations: z
        .array(
            z.object({
                to: z.object({ id: z.string() }),
                types: z.array(
                    z.object({
                        associationCategory: z.string(),
                        associationTypeId: z.number()
                    })
                )
            })
        )
        .optional()
});

export type CreateEmailParams = z.infer<typeof createEmailSchema>;

/**
 * Operation Definition
 */
export const createEmailOperation: OperationDefinition = {
    id: "createEmail",
    name: "Create Email",
    description: "Create a new email engagement in HubSpot CRM",
    category: "crm",
    inputSchema: createEmailSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Email
 */
export async function executeCreateEmail(
    client: HubspotClient,
    params: CreateEmailParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotEngagement>("/crm/v3/objects/emails", {
            properties: params.properties,
            associations: params.associations
        });

        return { success: true, data: response };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create email",
                retryable: false
            }
        };
    }
}
