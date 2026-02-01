import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * List messages input schema
 */
export const listMessagesSchema = z.object({
    query: z
        .string()
        .optional()
        .describe(
            "Gmail search query (e.g., 'from:user@example.com', 'is:unread', 'subject:meeting', 'has:attachment')"
        ),
    maxResults: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .default(100)
        .describe("Maximum number of messages to return (1-500, default 100)"),
    pageToken: z.string().optional().describe("Token for next page of results"),
    labelIds: z
        .array(z.string())
        .optional()
        .describe("Filter by label IDs (e.g., ['INBOX', 'UNREAD', 'STARRED'])"),
    includeSpamTrash: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include messages from SPAM and TRASH in results")
});

export type ListMessagesParams = z.infer<typeof listMessagesSchema>;

/**
 * List messages operation definition
 */
export const listMessagesOperation: OperationDefinition = {
    id: "listMessages",
    name: "List Gmail Messages",
    description:
        "List or search messages in the user's Gmail mailbox with optional filters and search query",
    category: "messages",
    retryable: true,
    inputSchema: listMessagesSchema
};

/**
 * Execute list messages operation
 */
export async function executeListMessages(
    client: GmailClient,
    params: ListMessagesParams
): Promise<OperationResult> {
    try {
        const response = await client.listMessages({
            q: params.query,
            maxResults: params.maxResults || 100,
            pageToken: params.pageToken,
            labelIds: params.labelIds,
            includeSpamTrash: params.includeSpamTrash
        });

        return {
            success: true,
            data: {
                messages: response.messages || [],
                nextPageToken: response.nextPageToken,
                resultSizeEstimate: response.resultSizeEstimate
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list messages",
                retryable: true
            }
        };
    }
}
