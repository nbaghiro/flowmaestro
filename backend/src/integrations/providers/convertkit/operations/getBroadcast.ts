import { z } from "zod";
import type { ConvertKitBroadcastOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const getBroadcastSchema = z.object({
    broadcastId: z.string().describe("The broadcast ID to retrieve")
});

export type GetBroadcastParams = z.infer<typeof getBroadcastSchema>;

export const getBroadcastOperation: OperationDefinition = {
    id: "getBroadcast",
    name: "Get Broadcast",
    description: "Retrieve a single broadcast by ID from ConvertKit",
    category: "broadcasts",
    inputSchema: getBroadcastSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetBroadcast(
    client: ConvertKitClient,
    params: GetBroadcastParams
): Promise<OperationResult> {
    try {
        const response = await client.getBroadcast(params.broadcastId);

        const output: ConvertKitBroadcastOutput = {
            id: String(response.broadcast.id),
            subject: response.broadcast.subject,
            description: response.broadcast.description,
            content: response.broadcast.content,
            public: response.broadcast.public,
            publishedAt: response.broadcast.published_at,
            sendAt: response.broadcast.send_at,
            thumbnailUrl: response.broadcast.thumbnail_url,
            createdAt: response.broadcast.created_at
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get broadcast";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
