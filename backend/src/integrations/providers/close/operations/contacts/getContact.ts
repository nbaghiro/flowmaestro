import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseContact } from "../types";

/**
 * Get Contact Parameters
 */
export const getContactSchema = z.object({
    id: z.string().describe("The contact ID (starts with 'cont_')"),
    _fields: z.array(z.string()).optional().describe("Fields to include in response")
});

export type GetContactParams = z.infer<typeof getContactSchema>;

/**
 * Operation Definition
 */
export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Get a specific contact by ID",
    category: "contacts",
    inputSchema: getContactSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Contact
 */
export async function executeGetContact(
    client: CloseClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};
        if (params._fields && params._fields.length > 0) {
            queryParams._fields = params._fields.join(",");
        }

        const response = await client.get<CloseContact>(`/contact/${params.id}/`, queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get contact",
                retryable: true
            }
        };
    }
}
