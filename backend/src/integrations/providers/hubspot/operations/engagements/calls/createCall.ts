import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Create Call Parameters
 */
export const createCallSchema = z.object({
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

export type CreateCallParams = z.infer<typeof createCallSchema>;

/**
 * Operation Definition
 */
export const createCallOperation: OperationDefinition = {
    id: "createCall",
    name: "Create Call",
    description: "Create a new call engagement in HubSpot CRM",
    category: "crm",
    inputSchema: createCallSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Call
 */
export async function executeCreateCall(
    client: HubspotClient,
    params: CreateCallParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotEngagement>("/crm/v3/objects/calls", {
            properties: params.properties,
            associations: params.associations
        });

        return { success: true, data: response };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create call",
                retryable: false
            }
        };
    }
}
