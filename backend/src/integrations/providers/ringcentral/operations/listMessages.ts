import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RingCentralClient } from "../client/RingCentralClient";

export const listMessagesSchema = z.object({
    messageType: z
        .enum(["SMS", "MMS", "Pager", "Fax", "VoiceMail", "Text"])
        .optional()
        .describe("Filter by message type"),
    direction: z.enum(["Inbound", "Outbound"]).optional().describe("Filter by direction"),
    dateFrom: z.string().optional().describe("Start date (ISO 8601 format)"),
    dateTo: z.string().optional().describe("End date (ISO 8601 format)"),
    page: z.number().min(1).optional().describe("Page number (default: 1)"),
    perPage: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Results per page (default: 100, max: 1000)")
});

export type ListMessagesParams = z.infer<typeof listMessagesSchema>;

export const listMessagesOperation: OperationDefinition = {
    id: "listMessages",
    name: "List Messages",
    description: "List SMS/MMS message history",
    category: "data",
    inputSchema: listMessagesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListMessages(
    client: RingCentralClient,
    params: ListMessagesParams
): Promise<OperationResult> {
    try {
        const response = await client.listMessages({
            messageType: params.messageType,
            direction: params.direction,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            page: params.page,
            perPage: params.perPage
        });

        return {
            success: true,
            data: {
                messages: response.records.map((m) => ({
                    id: m.id,
                    type: m.type,
                    direction: m.direction,
                    status: m.messageStatus,
                    readStatus: m.readStatus,
                    from: m.from.phoneNumber,
                    to: m.to.map((r) => r.phoneNumber),
                    subject: m.subject,
                    createdAt: m.creationTime,
                    conversationId: m.conversationId
                })),
                pagination: {
                    page: response.paging.page,
                    perPage: response.paging.perPage,
                    totalPages: response.paging.totalPages,
                    totalElements: response.paging.totalElements,
                    hasNext: !!response.navigation.nextPage
                }
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
