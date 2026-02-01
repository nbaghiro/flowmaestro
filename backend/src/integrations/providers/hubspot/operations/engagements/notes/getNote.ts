import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Get Note Parameters
 */
export const getNoteSchema = z.object({
    noteId: z.string(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type GetNoteParams = z.infer<typeof getNoteSchema>;

/**
 * Operation Definition
 */
export const getNoteOperation: OperationDefinition = {
    id: "getNote",
    name: "Get Note",
    description: "Retrieve a note engagement by ID from HubSpot CRM",
    category: "crm",
    inputSchema: getNoteSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Note
 */
export async function executeGetNote(
    client: HubspotClient,
    params: GetNoteParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/notes/${params.noteId}`;

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
                message: error instanceof Error ? error.message : "Failed to get note",
                retryable: false
            }
        };
    }
}
