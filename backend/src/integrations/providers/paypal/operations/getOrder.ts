import { z } from "zod";
import { PaypalClient } from "../client/PaypalClient";
import type { PaypalOrderResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Order operation schema
 */
export const getOrderSchema = z.object({
    order_id: z.string().describe("PayPal order ID")
});

export type GetOrderParams = z.infer<typeof getOrderSchema>;

/**
 * Get Order operation definition
 */
export const getOrderOperation: OperationDefinition = {
    id: "getOrder",
    name: "Get Order",
    description: "Retrieve details of a PayPal order",
    category: "orders",
    actionType: "read",
    inputSchema: getOrderSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get order operation
 */
export async function executeGetOrder(
    client: PaypalClient,
    params: GetOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.get<PaypalOrderResponse>(
            `/v2/checkout/orders/${params.order_id}`
        );

        return {
            success: true,
            data: {
                id: response.id,
                status: response.status,
                intent: response.intent,
                purchaseUnits: response.purchase_units.map((pu) => ({
                    referenceId: pu.reference_id,
                    amount: pu.amount,
                    description: pu.description,
                    captures: pu.payments?.captures?.map((c) => ({
                        id: c.id,
                        status: c.status,
                        amount: c.amount,
                        createTime: c.create_time
                    }))
                })),
                payer: response.payer
                    ? {
                          email: response.payer.email_address,
                          payerId: response.payer.payer_id,
                          name: response.payer.name
                      }
                    : undefined,
                createTime: response.create_time,
                updateTime: response.update_time,
                links: response.links
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get order",
                retryable: true
            }
        };
    }
}
