import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

export const listInboxesSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum results to return (default: 50, max: 100)"),
    pageToken: z.string().optional().describe("Pagination token for next page")
});

export type ListInboxesParams = z.infer<typeof listInboxesSchema>;

export const listInboxesOperation: OperationDefinition = {
    id: "listInboxes",
    name: "List Inboxes",
    description: "List all inboxes in the Front workspace",
    category: "data",
    inputSchema: listInboxesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListInboxes(
    client: FrontClient,
    params: ListInboxesParams
): Promise<OperationResult> {
    try {
        const response = await client.listInboxes({
            limit: params.limit,
            page_token: params.pageToken
        });

        return {
            success: true,
            data: {
                inboxes: response._results.map((inbox) => ({
                    id: inbox.id,
                    name: inbox.name,
                    isPrivate: inbox.is_private,
                    isPublic: inbox.is_public
                })),
                pagination: {
                    nextToken: response._pagination?.next
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list inboxes",
                retryable: true
            }
        };
    }
}
