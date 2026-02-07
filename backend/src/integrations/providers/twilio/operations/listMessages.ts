import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { TwilioClient } from "../client/TwilioClient";

export const listMessagesSchema = z.object({
    to: z.string().optional().describe("Filter by recipient phone number"),
    from: z.string().optional().describe("Filter by sender phone number"),
    dateSent: z.string().optional().describe("Filter by exact date sent (YYYY-MM-DD)"),
    dateSentBefore: z
        .string()
        .optional()
        .describe("Filter messages sent before this date (YYYY-MM-DD)"),
    dateSentAfter: z
        .string()
        .optional()
        .describe("Filter messages sent after this date (YYYY-MM-DD)"),
    pageSize: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .default(50)
        .describe("Number of messages per page (max 1000)"),
    pageToken: z.string().optional().describe("Page token for pagination")
});

export type ListMessagesParams = z.infer<typeof listMessagesSchema>;

export const listMessagesOperation: OperationDefinition = {
    id: "listMessages",
    name: "List Messages",
    description: "List SMS messages with optional filtering and pagination",
    category: "messaging",
    inputSchema: listMessagesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListMessages(
    client: TwilioClient,
    params: ListMessagesParams
): Promise<OperationResult> {
    try {
        const response = await client.listMessages({
            to: params.to,
            from: params.from,
            dateSent: params.dateSent,
            dateSentBefore: params.dateSentBefore,
            dateSentAfter: params.dateSentAfter,
            pageSize: params.pageSize,
            pageToken: params.pageToken
        });

        const messages = response.messages.map((msg) => ({
            sid: msg.sid,
            accountSid: msg.account_sid,
            from: msg.from,
            to: msg.to,
            body: msg.body,
            status: msg.status,
            direction: msg.direction,
            numSegments: parseInt(msg.num_segments, 10),
            price: msg.price,
            priceUnit: msg.price_unit,
            errorCode: msg.error_code,
            errorMessage: msg.error_message,
            dateCreated: msg.date_created,
            dateSent: msg.date_sent
        }));

        // Extract page token from next_page_uri if present
        let nextPageToken: string | null = null;
        if (response.next_page_uri) {
            const urlParams = new URL(`https://api.twilio.com${response.next_page_uri}`)
                .searchParams;
            nextPageToken = urlParams.get("PageToken");
        }

        return {
            success: true,
            data: {
                messages,
                hasMore: response.next_page_uri !== null,
                nextPageToken,
                page: response.page,
                pageSize: response.page_size
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
