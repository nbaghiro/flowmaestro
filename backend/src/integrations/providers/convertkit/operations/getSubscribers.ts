import { z } from "zod";
import type { ConvertKitSubscriberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const getSubscribersSchema = z.object({
    page: z.number().min(1).optional().describe("Page number (starts at 1)"),
    sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    sortField: z.enum(["id", "created_at"]).optional().describe("Sort field")
});

export type GetSubscribersParams = z.infer<typeof getSubscribersSchema>;

export const getSubscribersOperation: OperationDefinition = {
    id: "getSubscribers",
    name: "Get Subscribers",
    description: "Retrieve all subscribers from ConvertKit",
    category: "subscribers",
    inputSchema: getSubscribersSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetSubscribers(
    client: ConvertKitClient,
    params: GetSubscribersParams
): Promise<OperationResult> {
    try {
        const response = await client.getSubscribers({
            page: params.page,
            sort_order: params.sortOrder,
            sort_field: params.sortField
        });

        const subscribers: ConvertKitSubscriberOutput[] = response.subscribers.map((sub) => ({
            id: String(sub.id),
            email: sub.email_address,
            firstName: sub.first_name,
            state: sub.state,
            createdAt: sub.created_at,
            fields: sub.fields
        }));

        return {
            success: true,
            data: {
                subscribers,
                total: response.total_subscribers,
                page: response.page,
                totalPages: response.total_pages,
                hasMore: response.page < response.total_pages
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get subscribers";
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
