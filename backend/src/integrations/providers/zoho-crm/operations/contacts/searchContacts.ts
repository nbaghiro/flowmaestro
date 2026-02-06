import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoContact } from "../types";

/**
 * Search Contacts Parameters
 */
export const searchContactsSchema = z.object({
    criteria: z.string().min(1, "Search criteria is required"),
    email: z.string().optional(),
    phone: z.string().optional(),
    word: z.string().optional(),
    page: z.number().min(1).optional().default(1),
    per_page: z.number().min(1).max(200).optional().default(200),
    fields: z.array(z.string()).optional()
});

export type SearchContactsParams = z.infer<typeof searchContactsSchema>;

/**
 * Operation Definition
 */
export const searchContactsOperation: OperationDefinition = {
    id: "searchContacts",
    name: "Search Contacts",
    description: "Search contacts using criteria, email, phone, or word",
    category: "crm",
    inputSchema: searchContactsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Search Contacts
 */
export async function executeSearchContacts(
    client: ZohoCrmClient,
    params: SearchContactsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            page: params.page,
            per_page: params.per_page
        };

        if (params.criteria) {
            queryParams.criteria = params.criteria;
        }

        if (params.email) {
            queryParams.email = params.email;
        }

        if (params.phone) {
            queryParams.phone = params.phone;
        }

        if (params.word) {
            queryParams.word = params.word;
        }

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        const response = await client.get<ZohoListResponse<ZohoContact>>(
            "/crm/v8/Contacts/search",
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
                message: error instanceof Error ? error.message : "Failed to search contacts",
                retryable: false
            }
        };
    }
}
