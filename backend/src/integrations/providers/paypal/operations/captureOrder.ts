import { z } from "zod";
import { PaypalClient } from "../client/PaypalClient";
import type { PaypalOrderResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Capture Order operation schema
 */
export const captureOrderSchema = z.object({
    order_id: z.string().describe("PayPal order ID to capture")
});

export type CaptureOrderParams = z.infer<typeof captureOrderSchema>;

/**
 * Capture Order operation definition
 */
export const captureOrderOperation: OperationDefinition = {
    id: "captureOrder",
    name: "Capture Order",
    description: "Capture payment for an approved PayPal order",
    category: "orders",
    actionType: "write",
    inputSchema: captureOrderSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute capture order operation
 */
export async function executeCaptureOrder(
    client: PaypalClient,
    params: CaptureOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.post<PaypalOrderResponse>(
            `/v2/checkout/orders/${params.order_id}/capture`
        );

        const captures = response.purchase_units
            ?.flatMap((pu) => pu.payments?.captures || [])
            .map((c) => ({
                id: c.id,
                status: c.status,
                amount: c.amount,
                createTime: c.create_time
            }));

        return {
            success: true,
            data: {
                id: response.id,
                status: response.status,
                payer: response.payer
                    ? {
                          email: response.payer.email_address,
                          payerId: response.payer.payer_id,
                          name: response.payer.name
                      }
                    : undefined,
                captures,
                createTime: response.create_time,
                updateTime: response.update_time
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to capture order",
                retryable: true
            }
        };
    }
}
