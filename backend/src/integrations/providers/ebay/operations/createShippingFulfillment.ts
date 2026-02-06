import { z } from "zod";
import type { EbayShippingFulfillmentOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EbayClient } from "../client/EbayClient";

export const createShippingFulfillmentSchema = z.object({
    orderId: z.string().min(1).describe("eBay order ID"),
    lineItems: z
        .array(
            z.object({
                lineItemId: z.string().min(1).describe("Line item ID"),
                quantity: z.number().min(1).describe("Quantity shipped")
            })
        )
        .min(1)
        .describe("Line items being fulfilled"),
    shippedDate: z
        .string()
        .min(1)
        .describe("Shipped date in ISO 8601 format (e.g., 2024-01-15T10:00:00.000Z)"),
    shippingCarrierCode: z
        .string()
        .min(1)
        .describe("Shipping carrier code (e.g., USPS, UPS, FEDEX)"),
    trackingNumber: z.string().min(1).describe("Shipment tracking number")
});

export type CreateShippingFulfillmentParams = z.infer<typeof createShippingFulfillmentSchema>;

export const createShippingFulfillmentOperation: OperationDefinition = {
    id: "createShippingFulfillment",
    name: "Create Shipping Fulfillment",
    description: "Create a shipping fulfillment record for an eBay order",
    category: "fulfillment",
    inputSchema: createShippingFulfillmentSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateShippingFulfillment(
    client: EbayClient,
    params: CreateShippingFulfillmentParams
): Promise<OperationResult> {
    try {
        const fulfillment = await client.createShippingFulfillment(params.orderId, {
            lineItems: params.lineItems,
            shippedDate: params.shippedDate,
            shippingCarrierCode: params.shippingCarrierCode,
            trackingNumber: params.trackingNumber
        });

        const formatted: EbayShippingFulfillmentOutput = {
            fulfillmentId: fulfillment.fulfillmentId || "",
            trackingNumber: fulfillment.trackingNumber || params.trackingNumber,
            shippingCarrierCode: fulfillment.shippingCarrierCode || params.shippingCarrierCode,
            shippedDate: fulfillment.shippedDate || params.shippedDate,
            lineItems: (fulfillment.lineItems || params.lineItems).map((li) => ({
                lineItemId: li.lineItemId || "",
                quantity: li.quantity || 0
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
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to create shipping fulfillment",
                retryable: false
            }
        };
    }
}
