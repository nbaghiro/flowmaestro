import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

export const createMeetingSchema = z.object({
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

export type CreateMeetingParams = z.infer<typeof createMeetingSchema>;

export const createMeetingOperation: OperationDefinition = {
    id: "createMeeting",
    name: "Create Meeting",
    description: "Create a new meeting in HubSpot CRM",
    category: "crm",
    inputSchema: createMeetingSchema,
    retryable: true,
    timeout: 10000
};

export async function executeCreateMeeting(
    client: HubspotClient,
    params: CreateMeetingParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotEngagement>("/crm/v3/objects/meetings", {
            properties: params.properties,
            associations: params.associations
        });

        return { success: true, data: response };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create meeting",
                retryable: false
            }
        };
    }
}
