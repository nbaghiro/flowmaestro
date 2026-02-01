import { z } from "zod";
import { extractHeaders, extractPlainTextBody, extractHtmlBody } from "../utils/email-builder";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient, GmailMessage } from "../client/GmailClient";

/**
 * Get thread input schema
 */
export const getThreadSchema = z.object({
    threadId: z.string().describe("The ID of the thread to retrieve"),
    format: z
        .enum(["full", "metadata", "minimal"])
        .optional()
        .default("full")
        .describe("Format of messages in the thread"),
    metadataHeaders: z
        .array(z.string())
        .optional()
        .describe("When format is 'metadata', only include these headers")
});

export type GetThreadParams = z.infer<typeof getThreadSchema>;

interface ParsedThreadMessage {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    from?: string;
    to?: string;
    subject?: string;
    date?: string;
    bodyPlainText?: string | null;
    bodyHtml?: string | null;
}

/**
 * Parse thread messages into a more usable format
 */
function parseThreadMessages(messages: GmailMessage[]): ParsedThreadMessage[] {
    return messages.map((message) => {
        const result: ParsedThreadMessage = {
            id: message.id,
            threadId: message.threadId,
            labelIds: message.labelIds || [],
            snippet: message.snippet || ""
        };

        if (message.payload) {
            const headers = extractHeaders(message.payload.headers || []);
            result.from = headers["from"];
            result.to = headers["to"];
            result.subject = headers["subject"];
            result.date = headers["date"];
            result.bodyPlainText = extractPlainTextBody(message.payload);
            result.bodyHtml = extractHtmlBody(message.payload);
        }

        return result;
    });
}

/**
 * Get thread operation definition
 */
export const getThreadOperation: OperationDefinition = {
    id: "getThread",
    name: "Get Gmail Thread",
    description: "Get a complete conversation thread with all messages",
    category: "threads",
    retryable: true,
    inputSchema: getThreadSchema
};

/**
 * Execute get thread operation
 */
export async function executeGetThread(
    client: GmailClient,
    params: GetThreadParams
): Promise<OperationResult> {
    try {
        const thread = await client.getThread(
            params.threadId,
            params.format || "full",
            params.metadataHeaders
        );

        // Parse messages into a more usable format when using 'full' format
        const data = {
            id: thread.id,
            historyId: thread.historyId,
            snippet: thread.snippet,
            messages:
                params.format === "full" || !params.format
                    ? parseThreadMessages(thread.messages || [])
                    : thread.messages || []
        };

        return {
            success: true,
            data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get thread",
                retryable: true
            }
        };
    }
}
