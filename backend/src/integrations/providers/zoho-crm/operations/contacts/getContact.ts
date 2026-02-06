import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoContact } from "../types";

/**
 * Get Contact Parameters
 */
export const getContactSchema = z.object({
    id: z.string().min(1, "Contact ID is required"),
    fields: z.array(z.string()).optional()
});

export type GetContactParams = z.infer<typeof getContactSchema>;

/**
 * Operation Definition
 */
export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Get a contact by ID from Zoho CRM",
    category: "crm",
    inputSchema: getContactSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Contact
 */
export async function executeGetContact(
    client: ZohoCrmClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        const response = await client.get<ZohoListResponse<ZohoContact>>(
            `/crm/v8/Contacts/${params.id}`,
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
                message: "Contact not found",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get contact",
                retryable: false
            }
        };
    }
}
