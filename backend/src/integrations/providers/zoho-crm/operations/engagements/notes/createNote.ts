import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoNote } from "../../types";

/**
 * Create Note Parameters
 */
export const createNoteSchema = z.object({
    Note_Content: z.string().min(1, "Note content is required"),
    Note_Title: z.string().optional(),
    Parent_Id: z.object({ id: z.string() }).optional(),
    $se_module: z.string().optional()
});

export type CreateNoteParams = z.infer<typeof createNoteSchema>;

/**
 * Operation Definition
 */
export const createNoteOperation: OperationDefinition = {
    id: "createNote",
    name: "Create Note",
    description: "Create a new note in Zoho CRM",
    category: "crm",
    inputSchema: createNoteSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Note
 */
export async function executeCreateNote(
    client: ZohoCrmClient,
    params: CreateNoteParams
): Promise<OperationResult> {
    try {
        const response = await client.post<ZohoRecordResponse<ZohoNote>>("/crm/v8/Notes", {
            data: [params]
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
                message: response.data?.[0]?.message || "Failed to create note",
                retryable: false
            }
        };
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
