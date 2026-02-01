import { z } from "zod";
import { StripeClient } from "../client/StripeClient";
import type { StripeCharge, StripeList } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Charges operation schema
 */
export const listChargesSchema = z.object({
    customer: z.string().optional().describe("Filter by customer"),
    payment_intent: z.string().optional().describe("Filter by payment intent"),
    limit: z.number().int().min(1).max(100).optional().default(10).describe("Number of results")
});

export type ListChargesParams = z.infer<typeof listChargesSchema>;

/**
 * List Charges operation definition
 */
export const listChargesOperation: OperationDefinition = {
    id: "listCharges",
    name: "List Charges",
    description: "List all charges with optional filters",
    category: "charges",
    actionType: "read",
    inputSchema: listChargesSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list charges operation
 */
export async function executeListCharges(
    client: StripeClient,
    params: ListChargesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            limit: params.limit
        };

        if (params.customer) {
            queryParams.customer = params.customer;
        }

        if (params.payment_intent) {
            queryParams.payment_intent = params.payment_intent;
        }

        const response = await client.get<StripeList<StripeCharge>>("/charges", queryParams);

        const charges = response.data.map((charge) => ({
            id: charge.id,
            amount: charge.amount,
            amountRefunded: charge.amount_refunded,
            currency: charge.currency,
            status: charge.status,
            customer: charge.customer,
            description: charge.description,
            refunded: charge.refunded,
            paymentIntent: charge.payment_intent,
            created: charge.created,
            livemode: charge.livemode
        }));

        return {
            success: true,
            data: {
                charges,
                hasMore: response.has_more
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list charges",
                retryable: true
            }
        };
    }
}
