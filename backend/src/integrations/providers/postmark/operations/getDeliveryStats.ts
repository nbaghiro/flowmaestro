import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PostmarkClient } from "../client/PostmarkClient";

export const getDeliveryStatsSchema = z.object({});

export type GetDeliveryStatsParams = z.infer<typeof getDeliveryStatsSchema>;

export const getDeliveryStatsOperation: OperationDefinition = {
    id: "getDeliveryStats",
    name: "Get Delivery Stats",
    description: "Get email delivery statistics including bounce summaries",
    category: "data",
    inputSchema: getDeliveryStatsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetDeliveryStats(
    client: PostmarkClient,
    _params: GetDeliveryStatsParams
): Promise<OperationResult> {
    try {
        const stats = await client.getDeliveryStats();

        return {
            success: true,
            data: {
                inactiveMails: stats.InactiveMails,
                bounces: stats.Bounces.map((b) => ({
                    name: b.Name,
                    count: b.Count,
                    type: b.Type
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get delivery stats",
                retryable: true
            }
        };
    }
}
