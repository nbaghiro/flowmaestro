import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PostmarkClient } from "../client/PostmarkClient";

export const listBouncesSchema = z.object({
    count: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe("Number of bounces to return (default: 50, max: 500)"),
    offset: z.number().min(0).optional().describe("Offset for pagination (default: 0)"),
    type: z
        .string()
        .optional()
        .describe("Filter by bounce type (e.g., HardBounce, SoftBounce, SpamComplaint)"),
    inactive: z.boolean().optional().describe("Filter by inactive status"),
    emailFilter: z.string().optional().describe("Filter by email address"),
    tag: z.string().optional().describe("Filter by tag"),
    messageID: z.string().optional().describe("Filter by message ID"),
    fromDate: z.string().optional().describe("Filter bounces after this date (YYYY-MM-DD)"),
    toDate: z.string().optional().describe("Filter bounces before this date (YYYY-MM-DD)"),
    messageStream: z.string().optional().describe("Filter by message stream")
});

export type ListBouncesParams = z.infer<typeof listBouncesSchema>;

export const listBouncesOperation: OperationDefinition = {
    id: "listBounces",
    name: "List Bounces",
    description: "Get a list of bounced email records with optional filters",
    category: "data",
    inputSchema: listBouncesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListBounces(
    client: PostmarkClient,
    params: ListBouncesParams
): Promise<OperationResult> {
    try {
        const response = await client.listBounces({
            count: params.count,
            offset: params.offset,
            type: params.type,
            inactive: params.inactive,
            emailFilter: params.emailFilter,
            tag: params.tag,
            messageID: params.messageID,
            fromDate: params.fromDate,
            toDate: params.toDate,
            messageStream: params.messageStream
        });

        return {
            success: true,
            data: {
                totalCount: response.TotalCount,
                bounces: response.Bounces.map((b) => ({
                    id: b.ID,
                    type: b.Type,
                    typeCode: b.TypeCode,
                    name: b.Name,
                    tag: b.Tag,
                    messageId: b.MessageID,
                    email: b.Email,
                    from: b.From,
                    bouncedAt: b.BouncedAt,
                    description: b.Description,
                    details: b.Details,
                    inactive: b.Inactive,
                    canActivate: b.CanActivate,
                    subject: b.Subject,
                    messageStream: b.MessageStream
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list bounces",
                retryable: true
            }
        };
    }
}
