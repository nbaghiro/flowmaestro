import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const listMessagesSchema = z.object({
    folderId: z.string().optional().describe("Folder ID (defaults to Inbox)"),
    top: z.number().min(1).max(50).optional().describe("Number of messages to return (max 50)"),
    filter: z.string().optional().describe("OData filter expression (e.g., 'isRead eq false')"),
    search: z.string().optional().describe("Search query to filter messages")
});

export type ListMessagesParams = z.infer<typeof listMessagesSchema>;

export const listMessagesOperation: OperationDefinition = {
    id: "listMessages",
    name: "List Messages",
    description: "List email messages in a mail folder",
    category: "email",
    inputSchema: listMessagesSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            folderId: {
                type: "string",
                description: "Folder ID (defaults to Inbox)"
            },
            top: {
                type: "number",
                minimum: 1,
                maximum: 50,
                description: "Number of messages to return (max 50)"
            },
            filter: {
                type: "string",
                description: "OData filter expression (e.g., 'isRead eq false')"
            },
            search: {
                type: "string",
                description: "Search query to filter messages"
            }
        }
    },
    retryable: true
};

export async function executeListMessages(
    client: MicrosoftOutlookClient,
    params: ListMessagesParams
): Promise<OperationResult> {
    try {
        const result = await client.listMessages({
            folderId: params.folderId,
            top: params.top,
            filter: params.filter,
            search: params.search
        });
        return {
            success: true,
            data: {
                messages: result.value.map((msg) => ({
                    id: msg.id,
                    subject: msg.subject,
                    bodyPreview: msg.bodyPreview,
                    from: msg.from?.emailAddress,
                    toRecipients: msg.toRecipients.map((r) => r.emailAddress),
                    receivedDateTime: msg.receivedDateTime,
                    isRead: msg.isRead,
                    isDraft: msg.isDraft,
                    importance: msg.importance,
                    hasAttachments: msg.hasAttachments
                })),
                hasMore: !!result["@odata.nextLink"]
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
