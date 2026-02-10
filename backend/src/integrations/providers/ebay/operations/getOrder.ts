import { z } from "zod";
import type { EbayOrderOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EbayClient } from "../client/EbayClient";

export const getOrderSchema = z.object({
    orderId: z.string().min(1).describe("eBay order ID")
});

export type GetOrderParams = z.infer<typeof getOrderSchema>;

export const getOrderOperation: OperationDefinition = {
    id: "getOrder",
    name: "Get Order",
    description: "Get detailed information about an eBay order",
    category: "fulfillment",
    inputSchema: getOrderSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetOrder(
    client: EbayClient,
    params: GetOrderParams
): Promise<OperationResult> {
    try {
        const order = await client.getOrder(params.orderId);

        const shipTo =
            order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress;

        const formatted: EbayOrderOutput = {
            orderId: order.orderId || params.orderId,
            orderStatus: order.orderFulfillmentStatus,
            creationDate: order.creationDate,
            buyer: order.buyer ? { username: order.buyer.username || "unknown" } : undefined,
            pricingSummary: order.pricingSummary
                ? {
                      total: order.pricingSummary.total
                          ? {
                                value: order.pricingSummary.total.value || "0",
                                currency: order.pricingSummary.total.currency || "USD"
                            }
                          : undefined,
                      subtotal: order.pricingSummary.priceSubtotal
                          ? {
                                value: order.pricingSummary.priceSubtotal.value || "0",
                                currency: order.pricingSummary.priceSubtotal.currency || "USD"
                            }
                          : undefined,
                      deliveryCost: order.pricingSummary.deliveryCost
                          ? {
                                value: order.pricingSummary.deliveryCost.value || "0",
                                currency: order.pricingSummary.deliveryCost.currency || "USD"
                            }
                          : undefined
                  }
                : undefined,
            lineItems: (order.lineItems || []).map((li) => ({
                lineItemId: li.lineItemId || "",
                title: li.title,
                quantity: li.quantity,
                lineItemCost: li.lineItemCost
                    ? {
                          value: li.lineItemCost.value || "0",
                          currency: li.lineItemCost.currency || "USD"
                      }
                    : undefined,
                sku: li.sku
            })),
            shippingAddress: shipTo
                ? {
                      addressLine1: shipTo.addressLine1,
                      addressLine2: shipTo.addressLine2,
                      city: shipTo.city,
                      stateOrProvince: shipTo.stateOrProvince,
                      postalCode: shipTo.postalCode,
                      countryCode: shipTo.countryCode
                  }
                : undefined,
            fulfillmentStartInstructions: order.fulfillmentStartInstructions?.map((inst) => ({
                shippingStep: inst.shippingStep
                    ? {
                          shipTo: inst.shippingStep.shipTo
                              ? { fullName: inst.shippingStep.shipTo.fullName }
                              : undefined
                      }
                    : undefined
            }))
        };

        return {
            success: true,
            data: formatted
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
