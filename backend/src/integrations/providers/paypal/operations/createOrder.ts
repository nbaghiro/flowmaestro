import { z } from "zod";
import { PaypalClient } from "../client/PaypalClient";
import type { PaypalOrderResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Order operation schema
 */
export const createOrderSchema = z.object({
    intent: z
        .enum(["CAPTURE", "AUTHORIZE"])
        .default("CAPTURE")
        .describe("Payment intent - CAPTURE for immediate payment, AUTHORIZE for later capture"),
    purchase_units: z
        .array(
            z.object({
                reference_id: z.string().optional().describe("External reference ID"),
                amount: z.object({
                    currency_code: z.string().length(3).describe("ISO 4217 currency code"),
                    value: z.string().describe("Amount value (e.g., '10.00')")
                }),
                description: z.string().optional().describe("Purchase description")
            })
        )
        .min(1)
        .describe("Purchase units for the order"),
    application_context: z
        .object({
            brand_name: z.string().optional().describe("Brand name for checkout"),
            return_url: z.string().optional().describe("URL for approved payment redirect"),
            cancel_url: z.string().optional().describe("URL for cancelled payment redirect")
        })
        .optional()
        .describe("Application context for checkout experience")
});

export type CreateOrderParams = z.infer<typeof createOrderSchema>;

/**
 * Create Order operation definition
 */
export const createOrderOperation: OperationDefinition = {
    id: "createOrder",
    name: "Create Order",
    description: "Create a new PayPal order for checkout",
    category: "orders",
    actionType: "write",
    inputSchema: createOrderSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute create order operation
 */
export async function executeCreateOrder(
    client: PaypalClient,
    params: CreateOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.post<PaypalOrderResponse>("/v2/checkout/orders", params);

        return {
            success: true,
            data: {
                id: response.id,
                status: response.status,
                intent: response.intent,
                purchaseUnits: response.purchase_units.map((pu) => ({
                    referenceId: pu.reference_id,
                    amount: pu.amount,
                    description: pu.description
                })),
                createTime: response.create_time,
                links: response.links
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create order",
                retryable: true
            }
        };
    }
}
