import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoContact } from "../types";

/**
 * List Contacts Parameters
 */
export const listContactsSchema = z.object({
    page: z.number().min(1).optional().default(1),
    per_page: z.number().min(1).max(200).optional().default(200),
    fields: z.array(z.string()).optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(["asc", "desc"]).optional()
});

export type ListContactsParams = z.infer<typeof listContactsSchema>;

/**
 * Operation Definition
 */
export const listContactsOperation: OperationDefinition = {
    id: "listContacts",
    name: "List Contacts",
    description: "List all contacts with pagination",
    category: "crm",
    inputSchema: listContactsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Contacts
 */
export async function executeListContacts(
    client: ZohoCrmClient,
    params: ListContactsParams
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

        const response = await client.get<ZohoListResponse<ZohoContact>>(
            "/crm/v8/Contacts",
            queryParams
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
                message: error instanceof Error ? error.message : "Failed to list contacts",
                retryable: false
            }
        };
    }
}
