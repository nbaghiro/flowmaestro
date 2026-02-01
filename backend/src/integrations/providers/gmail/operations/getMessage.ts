import { z } from "zod";
import { extractHeaders, extractPlainTextBody, extractHtmlBody } from "../utils/email-builder";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient, GmailMessage } from "../client/GmailClient";

/**
 * Get message input schema
 */
export const getMessageSchema = z.object({
    messageId: z.string().describe("The ID of the message to retrieve"),
    format: z
        .enum(["full", "metadata", "minimal", "raw"])
        .optional()
        .default("full")
        .describe(
            "Format of the response: 'full' (complete message), 'metadata' (headers only), 'minimal' (IDs only), 'raw' (RFC 2822)"
        ),
    metadataHeaders: z
        .array(z.string())
        .optional()
        .describe("When format is 'metadata', only include these headers")
});

export type GetMessageParams = z.infer<typeof getMessageSchema>;

interface ParsedMessage {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    internalDate: string;
    from?: string;
    to?: string;
    cc?: string;
    subject?: string;
    date?: string;
    messageId?: string;
    bodyPlainText?: string | null;
    bodyHtml?: string | null;
    attachments: Array<{
        filename: string;
        mimeType: string;
        size: number;
        attachmentId: string;
    }>;
}

/**
 * Parse Gmail message into a more usable format
 */
function parseMessage(message: GmailMessage): ParsedMessage {
    const result: ParsedMessage = {
        id: message.id,
        threadId: message.threadId,
        labelIds: message.labelIds || [],
        snippet: message.snippet || "",
        internalDate: message.internalDate || "",
        attachments: []
    };

    if (message.payload) {
        // Extract headers
        const headers = extractHeaders(message.payload.headers || []);
        result.from = headers["from"];
        result.to = headers["to"];
        result.cc = headers["cc"];
        result.subject = headers["subject"];
        result.date = headers["date"];
        result.messageId = headers["message-id"];

        // Extract body content
        result.bodyPlainText = extractPlainTextBody(message.payload);
        result.bodyHtml = extractHtmlBody(message.payload);

        // Extract attachments
        const extractAttachments = (
            part: typeof message.payload,
            attachments: ParsedMessage["attachments"]
        ): void => {
            if (part.filename && part.body?.attachmentId) {
                attachments.push({
                    filename: part.filename,
                    mimeType: part.mimeType,
                    size: part.body.size,
                    attachmentId: part.body.attachmentId
                });
            }
            if (part.parts) {
                for (const subPart of part.parts) {
                    extractAttachments(subPart, attachments);
                }
            }
        };
        extractAttachments(message.payload, result.attachments);
    }

    return result;
}

/**
 * Get message operation definition
 */
export const getMessageOperation: OperationDefinition = {
    id: "getMessage",
    name: "Get Gmail Message",
    description:
        "Get a specific Gmail message by ID with full details including body and attachments",
    category: "messages",
    retryable: true,
    inputSchema: getMessageSchema
};

/**
 * Execute get message operation
 */
export async function executeGetMessage(
    client: GmailClient,
    params: GetMessageParams
): Promise<OperationResult> {
    try {
        const message = await client.getMessage(
            params.messageId,
            params.format || "full",
            params.metadataHeaders
        );

        // Parse message into a more usable format when using 'full' format
        const data = params.format === "full" || !params.format ? parseMessage(message) : message;

        return {
            success: true,
            data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get message",
                retryable: true
            }
        };
    }
}
