import { z } from "zod";
import { StripeClient } from "../client/StripeClient";
import type { StripeRefund, StripeList } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Refunds operation schema
 */
export const listRefundsSchema = z.object({
    charge: z.string().optional().describe("Filter by charge"),
    payment_intent: z.string().optional().describe("Filter by payment intent"),
    limit: z.number().int().min(1).max(100).optional().default(10).describe("Number of results")
});

export type ListRefundsParams = z.infer<typeof listRefundsSchema>;

/**
 * List Refunds operation definition
 */
export const listRefundsOperation: OperationDefinition = {
    id: "listRefunds",
    name: "List Refunds",
    description: "List all refunds with optional filters",
    category: "refunds",
    actionType: "read",
    inputSchema: listRefundsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list refunds operation
 */
export async function executeListRefunds(
    client: StripeClient,
    params: ListRefundsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            limit: params.limit
        };

        if (params.charge) {
            queryParams.charge = params.charge;
        }

        if (params.payment_intent) {
            queryParams.payment_intent = params.payment_intent;
        }

        const response = await client.get<StripeList<StripeRefund>>("/refunds", queryParams);

        const refunds = response.data.map((refund) => ({
            id: refund.id,
            amount: refund.amount,
            currency: refund.currency,
            status: refund.status,
            charge: refund.charge,
            paymentIntent: refund.payment_intent,
            reason: refund.reason,
            created: refund.created
        }));

        return {
            success: true,
            data: {
                refunds,
                hasMore: response.has_more
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list refunds",
                retryable: true
            }
        };
    }
}
