import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { StripeClient } from "../client/StripeClient";
import type { StripeCharge } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Charge operation schema
 */
export const getChargeSchema = z.object({
    charge_id: z.string().describe("Charge ID (ch_xxx)")
});

export type GetChargeParams = z.infer<typeof getChargeSchema>;

/**
 * Get Charge operation definition
 */
export const getChargeOperation: OperationDefinition = {
    id: "getCharge",
    name: "Get Charge",
    description: "Retrieve details of a specific charge",
    category: "charges",
    actionType: "read",
    inputSchema: getChargeSchema,
    inputSchemaJSON: toJSONSchema(getChargeSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute get charge operation
 */
export async function executeGetCharge(
    client: StripeClient,
    params: GetChargeParams
): Promise<OperationResult> {
    try {
        const response = await client.get<StripeCharge>(`/charges/${params.charge_id}`);

        return {
            success: true,
            data: {
                id: response.id,
                amount: response.amount,
                amountRefunded: response.amount_refunded,
                currency: response.currency,
                status: response.status,
                customer: response.customer,
                description: response.description,
                metadata: response.metadata,
                receiptEmail: response.receipt_email,
                receiptUrl: response.receipt_url,
                refunded: response.refunded,
                paymentIntent: response.payment_intent,
                created: response.created,
                livemode: response.livemode
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get charge",
                retryable: true
            }
        };
    }
}
