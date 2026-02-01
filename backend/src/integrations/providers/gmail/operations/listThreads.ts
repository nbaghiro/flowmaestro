import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * List threads input schema
 */
export const listThreadsSchema = z.object({
    query: z
        .string()
        .optional()
        .describe(
            "Gmail search query (e.g., 'from:user@example.com', 'is:unread', 'subject:meeting')"
        ),
    maxResults: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .default(100)
        .describe("Maximum number of threads to return (1-500, default 100)"),
    pageToken: z.string().optional().describe("Token for next page of results"),
    labelIds: z
        .array(z.string())
        .optional()
        .describe("Filter by label IDs (e.g., ['INBOX', 'UNREAD'])"),
    includeSpamTrash: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include threads from SPAM and TRASH in results")
});

export type ListThreadsParams = z.infer<typeof listThreadsSchema>;

/**
 * List threads operation definition
 */
export const listThreadsOperation: OperationDefinition = {
    id: "listThreads",
    name: "List Gmail Threads",
    description: "List conversation threads in the user's Gmail mailbox with optional filters",
    category: "threads",
    retryable: true,
    inputSchema: listThreadsSchema
};

/**
 * Execute list threads operation
 */
export async function executeListThreads(
    client: GmailClient,
    params: ListThreadsParams
): Promise<OperationResult> {
    try {
        const response = await client.listThreads({
            q: params.query,
            maxResults: params.maxResults || 100,
            pageToken: params.pageToken,
            labelIds: params.labelIds,
            includeSpamTrash: params.includeSpamTrash
        });

        return {
            success: true,
            data: {
                threads: response.threads || [],
                nextPageToken: response.nextPageToken,
                resultSizeEstimate: response.resultSizeEstimate
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list threads",
                retryable: true
            }
        };
    }
}
