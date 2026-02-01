import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseListResponse, CloseContact } from "../types";

/**
 * List Contacts Parameters
 */
export const listContactsSchema = z.object({
    _skip: z.number().int().min(0).optional().default(0).describe("Number of items to skip"),
    _limit: z.number().int().min(1).max(100).optional().default(50).describe("Items per page"),
    lead_id: z.string().optional().describe("Filter by lead ID"),
    _fields: z.array(z.string()).optional().describe("Fields to include in response")
});

export type ListContactsParams = z.infer<typeof listContactsSchema>;

/**
 * Operation Definition
 */
export const listContactsOperation: OperationDefinition = {
    id: "listContacts",
    name: "List Contacts",
    description: "Get all contacts with optional filtering and pagination",
    category: "contacts",
    inputSchema: listContactsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Contacts
 */
export async function executeListContacts(
    client: CloseClient,
    params: ListContactsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            _skip: params._skip,
            _limit: params._limit
        };

        if (params.lead_id) {
            queryParams.lead_id = params.lead_id;
        }
        if (params._fields && params._fields.length > 0) {
            queryParams._fields = params._fields.join(",");
        }

        const response = await client.get<CloseListResponse<CloseContact>>(
            "/contact/",
            queryParams
        );

        return {
            success: true,
            data: {
                contacts: response.data,
                has_more: response.has_more,
                total_results: response.total_results
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list contacts",
                retryable: true
            }
        };
    }
}
