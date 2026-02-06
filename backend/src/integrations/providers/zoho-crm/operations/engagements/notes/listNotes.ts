import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoNote } from "../../types";

/**
 * List Notes Parameters
 */
export const listNotesSchema = z.object({
    page: z.number().min(1).optional().default(1),
    per_page: z.number().min(1).max(200).optional().default(200),
    fields: z.array(z.string()).optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(["asc", "desc"]).optional()
});

export type ListNotesParams = z.infer<typeof listNotesSchema>;

/**
 * Operation Definition
 */
export const listNotesOperation: OperationDefinition = {
    id: "listNotes",
    name: "List Notes",
    description: "List all notes with pagination",
    category: "crm",
    inputSchema: listNotesSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Notes
 */
export async function executeListNotes(
    client: ZohoCrmClient,
    params: ListNotesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            page: params.page,
            per_page: params.per_page
        };

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        if (params.sort_by) {
            queryParams.sort_by = params.sort_by;
        }

        if (params.sort_order) {
            queryParams.sort_order = params.sort_order;
        }

        const response = await client.get<ZohoListResponse<ZohoNote>>("/crm/v8/Notes", queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list notes",
                retryable: false
            }
        };
    }
}
