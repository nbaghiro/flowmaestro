import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoDeleteResponse } from "../types";

/**
 * Delete Contact Parameters
 */
export const deleteContactSchema = z.object({
    id: z.string().min(1, "Contact ID is required")
});

export type DeleteContactParams = z.infer<typeof deleteContactSchema>;

/**
 * Operation Definition
 */
export const deleteContactOperation: OperationDefinition = {
    id: "deleteContact",
    name: "Delete Contact",
    description: "Delete a contact from Zoho CRM",
    category: "crm",
    inputSchema: deleteContactSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Contact
 */
export async function executeDeleteContact(
    client: ZohoCrmClient,
    params: DeleteContactParams
): Promise<OperationResult> {
    try {
        const response = await client.delete<ZohoDeleteResponse>(
            `/crm/v8/Contacts?ids=${params.id}`
        );

        if (response.data?.[0]?.status === "success") {
            return {
                success: true,
                data: {
                    deleted: true,
                    contactId: params.id
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: response.data?.[0]?.message || "Failed to delete contact",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete contact",
                retryable: false
            }
        };
    }
}
