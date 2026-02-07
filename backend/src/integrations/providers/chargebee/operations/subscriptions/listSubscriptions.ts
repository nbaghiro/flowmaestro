import { z } from "zod";
import { ChargebeeClient } from "../../client/ChargebeeClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ChargebeeSubscription, ChargebeeListResponse } from "../types";

/**
 * List Subscriptions operation schema
 */
export const listSubscriptionsSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(25),
    offset: z.string().optional(),
    customer_id: z.string().optional(),
    plan_id: z.string().optional(),
    status: z
        .enum([
            "future",
            "in_trial",
            "active",
            "non_renewing",
            "paused",
            "cancelled",
            "transferred"
        ])
        .optional()
});

export type ListSubscriptionsParams = z.infer<typeof listSubscriptionsSchema>;

/**
 * List Subscriptions operation definition
 */
export const listSubscriptionsOperation: OperationDefinition = {
    id: "listSubscriptions",
    name: "List Subscriptions",
    description: "List all subscriptions in Chargebee with pagination and optional filters",
    category: "subscriptions",
    inputSchema: listSubscriptionsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list subscriptions operation
 */
export async function executeListSubscriptions(
    client: ChargebeeClient,
    params: ListSubscriptionsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            limit: String(params.limit)
        };

        if (params.offset) {
            queryParams.offset = params.offset;
        }
        if (params.customer_id) {
            queryParams["customer_id[is]"] = params.customer_id;
        }
        if (params.plan_id) {
            queryParams["plan_id[is]"] = params.plan_id;
        }
        if (params.status) {
            queryParams["status[is]"] = params.status;
        }

        const queryString = new URLSearchParams(queryParams).toString();
        const response = await client.get<ChargebeeListResponse<ChargebeeSubscription>>(
            `/subscriptions?${queryString}`
        );

        const subscriptions = response.list.map((item) => item.subscription).filter(Boolean);

        return {
            success: true,
            data: {
                subscriptions,
                count: subscriptions.length,
                next_offset: response.next_offset
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list subscriptions",
                retryable: true
            }
        };
    }
}
