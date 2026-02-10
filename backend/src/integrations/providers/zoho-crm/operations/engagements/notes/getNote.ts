import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoNote } from "../../types";

/**
 * Get Note Parameters
 */
export const getNoteSchema = z.object({
    id: z.string().min(1, "Note ID is required"),
    fields: z.array(z.string()).optional()
});

export type GetNoteParams = z.infer<typeof getNoteSchema>;

/**
 * Operation Definition
 */
export const getNoteOperation: OperationDefinition = {
    id: "getNote",
    name: "Get Note",
    description: "Get a note by ID from Zoho CRM",
    category: "crm",
    inputSchema: getNoteSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Note
 */
export async function executeGetNote(
    client: ZohoCrmClient,
    params: GetNoteParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        const response = await client.get<ZohoListResponse<ZohoNote>>(
            `/crm/v8/Notes/${params.id}`,
            queryParams
        );

        if (response.data?.[0]) {
            return {
                success: true,
                data: response.data[0]
            };
        }

        return {
            success: false,
            error: {
                type: "not_found",
                message: "Note not found",
                retryable: false
            }
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
