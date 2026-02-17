import { z } from "zod";
import type { ConvertKitBroadcastOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const getBroadcastsSchema = z.object({
    page: z.number().min(1).optional().describe("Page number (starts at 1)")
});

export type GetBroadcastsParams = z.infer<typeof getBroadcastsSchema>;

export const getBroadcastsOperation: OperationDefinition = {
    id: "getBroadcasts",
    name: "Get Broadcasts",
    description: "Retrieve all broadcasts from ConvertKit",
    category: "broadcasts",
    inputSchema: getBroadcastsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetBroadcasts(
    client: ConvertKitClient,
    params: GetBroadcastsParams
): Promise<OperationResult> {
    try {
        const response = await client.getBroadcasts({
            page: params.page
        });

        const broadcasts: ConvertKitBroadcastOutput[] = response.broadcasts.map((broadcast) => ({
            id: String(broadcast.id),
            subject: broadcast.subject,
            description: broadcast.description,
            content: broadcast.content,
            public: broadcast.public,
            publishedAt: broadcast.published_at,
            sendAt: broadcast.send_at,
            thumbnailUrl: broadcast.thumbnail_url,
            createdAt: broadcast.created_at
        }));

        return {
            success: true,
            data: {
                broadcasts,
                total: broadcasts.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get broadcasts";
        return {
            success: false,
            error: {
                type: message.includes("rate limit") ? "rate_limit" : "server_error",
                message,
                retryable: message.includes("rate limit")
            }
        };
    }
}
