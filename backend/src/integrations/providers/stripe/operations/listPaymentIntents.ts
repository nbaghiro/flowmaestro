import { z } from "zod";
import { StripeClient } from "../client/StripeClient";
import type { StripePaymentIntent, StripeList } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Payment Intents operation schema
 */
export const listPaymentIntentsSchema = z.object({
    customer: z.string().optional().describe("Filter by customer ID"),
    created_gte: z.number().optional().describe("Filter by creation time >= (Unix timestamp)"),
    created_lte: z.number().optional().describe("Filter by creation time <= (Unix timestamp)"),
    limit: z.number().int().min(1).max(100).optional().default(10).describe("Number of results")
});

export type ListPaymentIntentsParams = z.infer<typeof listPaymentIntentsSchema>;

/**
 * List Payment Intents operation definition
 */
export const listPaymentIntentsOperation: OperationDefinition = {
    id: "listPaymentIntents",
    name: "List Payment Intents",
    description: "List all payment intents with optional filters",
    category: "payments",
    actionType: "read",
    inputSchema: listPaymentIntentsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list payment intents operation
 */
export async function executeListPaymentIntents(
    client: StripeClient,
    params: ListPaymentIntentsParams
): Promise<OperationResult> {
    try {
        // Build query params
        const queryParams: Record<string, unknown> = {
            limit: params.limit
        };

        if (params.customer) {
            queryParams.customer = params.customer;
        }

        if (params.created_gte || params.created_lte) {
            queryParams["created[gte]"] = params.created_gte;
            queryParams["created[lte]"] = params.created_lte;
        }

        const response = await client.get<StripeList<StripePaymentIntent>>(
            "/payment_intents",
            queryParams
        );

        const paymentIntents = response.data.map((pi) => ({
            id: pi.id,
            amount: pi.amount,
            amountReceived: pi.amount_received,
            currency: pi.currency,
            status: pi.status,
            customer: pi.customer,
            description: pi.description,
            created: pi.created,
            livemode: pi.livemode
        }));

        return {
            success: true,
            data: {
                paymentIntents,
                hasMore: response.has_more
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list payment intents",
                retryable: true
            }
        };
    }
}
