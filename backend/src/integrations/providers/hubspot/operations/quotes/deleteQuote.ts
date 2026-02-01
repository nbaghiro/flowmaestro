import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";

/**
 * Delete Quote Parameters
 */
export const deleteQuoteSchema = z.object({
    quoteId: z.string()
});

export type DeleteQuoteParams = z.infer<typeof deleteQuoteSchema>;

/**
 * Operation Definition
 */
export const deleteQuoteOperation: OperationDefinition = {
    id: "deleteQuote",
    name: "Delete Quote",
    description: "Delete (archive) a quote in HubSpot CRM",
    category: "crm",
    inputSchema: deleteQuoteSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Delete Quote
 */
export async function executeDeleteQuote(
    client: HubspotClient,
    params: DeleteQuoteParams
): Promise<OperationResult> {
    try {
        await client.delete(`/crm/v3/objects/quotes/${params.quoteId}`);

        return {
            success: true,
            data: { deleted: true }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete quote",
                retryable: false
            }
        };
    }
}
