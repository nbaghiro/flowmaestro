import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Create Note Parameters
 */
export const createNoteSchema = z.object({
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

export type CreateNoteParams = z.infer<typeof createNoteSchema>;

/**
 * Operation Definition
 */
export const createNoteOperation: OperationDefinition = {
    id: "createNote",
    name: "Create Note",
    description: "Create a new note engagement in HubSpot CRM",
    category: "crm",
    inputSchema: createNoteSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Note
 */
export async function executeCreateNote(
    client: HubspotClient,
    params: CreateNoteParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotEngagement>("/crm/v3/objects/notes", {
            properties: params.properties,
            associations: params.associations
        });

        return { success: true, data: response };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create note",
                retryable: false
            }
        };
    }
}
