import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoNote } from "../../types";

/**
 * Update Note Parameters
 */
export const updateNoteSchema = z.object({
    id: z.string().min(1, "Note ID is required"),
    Note_Content: z.string().optional(),
    Note_Title: z.string().optional()
});

export type UpdateNoteParams = z.infer<typeof updateNoteSchema>;

/**
 * Operation Definition
 */
export const updateNoteOperation: OperationDefinition = {
    id: "updateNote",
    name: "Update Note",
    description: "Update an existing note in Zoho CRM",
    category: "crm",
    inputSchema: updateNoteSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Note
 */
export async function executeUpdateNote(
    client: ZohoCrmClient,
    params: UpdateNoteParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<ZohoRecordResponse<ZohoNote>>(`/crm/v8/Notes/${id}`, {
            data: [updateData]
        });

        if (response.data?.[0]?.status === "success") {
            return {
                success: true,
                data: response.data[0].details
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: response.data?.[0]?.message || "Failed to update note",
                retryable: false
            }
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
