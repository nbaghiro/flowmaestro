import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyContact } from "../types";

/**
 * Get Contact operation schema
 */
export const getContactSchema = z.object({
    contact_id: z.number().describe("The ID of the contact to retrieve")
});

export type GetContactParams = z.infer<typeof getContactSchema>;

/**
 * Get Contact operation definition
 */
export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Get a specific contact by ID from Insightly CRM",
    category: "contacts",
    inputSchema: getContactSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get contact operation
 */
export async function executeGetContact(
    client: InsightlyClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const contact = await client.get<InsightlyContact>(`/Contacts/${params.contact_id}`);

        return {
            success: true,
            data: contact
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
