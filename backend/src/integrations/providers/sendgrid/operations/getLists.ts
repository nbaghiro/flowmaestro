import { z } from "zod";
import type { SendGridListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const getListsSchema = z.object({
    pageSize: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Number of lists per page (max 1000)"),
    pageToken: z.string().optional().describe("Page token for pagination")
});

export type GetListsParams = z.infer<typeof getListsSchema>;

export const getListsOperation: OperationDefinition = {
    id: "getLists",
    name: "Get Lists",
    description: "Get all contact lists from SendGrid Marketing",
    category: "lists",
    inputSchema: getListsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetLists(
    client: SendGridClient,
    params: GetListsParams
): Promise<OperationResult> {
    try {
        const response = await client.getLists({
            page_size: params.pageSize,
            page_token: params.pageToken
        });

        const lists: SendGridListOutput[] = response.result.map((l) => ({
            id: l.id,
            name: l.name,
            contactCount: l.contact_count
        }));

        // Extract next page token from metadata
        let nextPageToken: string | undefined;
        if (response._metadata?.next) {
            const url = new URL(response._metadata.next, "https://api.sendgrid.com");
            nextPageToken = url.searchParams.get("page_token") || undefined;
        }

        return {
            success: true,
            data: {
                lists,
                nextPageToken,
                hasMore: !!response._metadata?.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get lists",
                retryable: true
            }
        };
    }
}
