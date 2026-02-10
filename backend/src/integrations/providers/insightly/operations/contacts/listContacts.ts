import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyContact } from "../types";

/**
 * List Contacts operation schema
 */
export const listContactsSchema = z.object({
    skip: z.number().min(0).optional().default(0),
    top: z.number().min(1).max(500).optional().default(50),
    order_by: z.string().optional().describe("Field to sort by (e.g., DATE_UPDATED_UTC desc)")
});

export type ListContactsParams = z.infer<typeof listContactsSchema>;

/**
 * List Contacts operation definition
 */
export const listContactsOperation: OperationDefinition = {
    id: "listContacts",
    name: "List Contacts",
    description: "List all contacts in Insightly CRM with pagination",
    category: "contacts",
    inputSchema: listContactsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list contacts operation
 */
export async function executeListContacts(
    client: InsightlyClient,
    params: ListContactsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            skip: params.skip,
            top: params.top
        };

        if (params.order_by) {
            queryParams["$orderby"] = params.order_by;
        }

        const contacts = await client.get<InsightlyContact[]>("/Contacts", queryParams);

        return {
            success: true,
            data: {
                contacts,
                count: contacts.length,
                skip: params.skip,
                top: params.top
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
