import { z } from "zod";
import { StripeClient } from "../client/StripeClient";
import type { StripeRefund } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Refund operation schema
 */
export const createRefundSchema = z.object({
    charge: z.string().optional().describe("Charge ID to refund"),
    payment_intent: z.string().optional().describe("Payment intent to refund"),
    amount: z.number().int().positive().optional().describe("Partial refund amount in cents"),
    reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional(),
    metadata: z.record(z.string()).optional()
});

export type CreateRefundParams = z.infer<typeof createRefundSchema>;

/**
 * Create Refund operation definition
 */
export const createRefundOperation: OperationDefinition = {
    id: "createRefund",
    name: "Create Refund",
    description: "Create a refund for a charge or payment intent",
    category: "refunds",
    actionType: "write",
    inputSchema: createRefundSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute create refund operation
 */
export async function executeCreateRefund(
    client: StripeClient,
    params: CreateRefundParams
): Promise<OperationResult> {
    try {
        const response = await client.postForm<StripeRefund>("/refunds", params);

        return {
            success: true,
            data: {
                id: response.id,
                amount: response.amount,
                currency: response.currency,
                status: response.status,
                charge: response.charge,
                paymentIntent: response.payment_intent,
                reason: response.reason,
                metadata: response.metadata,
                created: response.created
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create refund",
                retryable: true
            }
        };
    }
}
