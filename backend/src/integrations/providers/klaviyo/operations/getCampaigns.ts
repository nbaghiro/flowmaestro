import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KlaviyoClient } from "../client/KlaviyoClient";

/**
 * Get Campaigns Parameters
 */
export const getCampaignsSchema = z.object({
    filter: z
        .string()
        .optional()
        .describe("Filter query (e.g., 'equals(status,\"draft\")' or 'equals(channel,\"email\")')"),
    pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of campaigns per page (max 100)"),
    pageCursor: z.string().optional().describe("Cursor for pagination"),
    sort: z
        .string()
        .optional()
        .describe("Sort field (e.g., 'created_at' or '-created_at' for descending)")
});

export type GetCampaignsParams = z.infer<typeof getCampaignsSchema>;

/**
 * Operation Definition
 */
export const getCampaignsOperation: OperationDefinition = {
    id: "getCampaigns",
    name: "Get Campaigns",
    description: "List campaigns with optional filters and pagination",
    category: "campaigns",
    inputSchema: getCampaignsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Get Campaigns
 */
export async function executeGetCampaigns(
    client: KlaviyoClient,
    params: GetCampaignsParams
): Promise<OperationResult> {
    try {
        const response = await client.getCampaigns({
            filter: params.filter,
            pageSize: params.pageSize,
            pageCursor: params.pageCursor,
            sort: params.sort
        });

        // Extract next cursor from links
        let nextCursor: string | undefined;
        if (response.links?.next) {
            const url = new URL(response.links.next);
            nextCursor = url.searchParams.get("page[cursor]") || undefined;
        }

        return {
            success: true,
            data: {
                campaigns: response.data.map((c) => ({
                    id: c.id,
                    ...c.attributes
                })),
                nextCursor,
                hasMore: !!response.links?.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get campaigns",
                retryable: false
            }
        };
    }
}
