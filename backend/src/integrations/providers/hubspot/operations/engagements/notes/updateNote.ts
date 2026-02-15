import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Update Note Parameters
 */
export const updateNoteSchema = z.object({
    noteId: z.string(),
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export type UpdateNoteParams = z.infer<typeof updateNoteSchema>;

/**
 * Operation Definition
 */
export const updateNoteOperation: OperationDefinition = {
    id: "updateNote",
    name: "Update Note",
    description: "Update an existing note engagement in HubSpot CRM",
    category: "crm",
    inputSchema: updateNoteSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Note
 */
export async function executeUpdateNote(
    client: HubspotClient,
    params: UpdateNoteParams
): Promise<OperationResult> {
    try {
        const response = await client.patch<HubspotEngagement>(
            `/crm/v3/objects/notes/${params.noteId}`,
            { properties: params.properties }
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
                message: error instanceof Error ? error.message : "Failed to update note",
                retryable: false
            }
        };
    }
}
