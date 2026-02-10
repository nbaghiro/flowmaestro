import { z } from "zod";
import type { EbayOrderOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EbayClient } from "../client/EbayClient";

export const listOrdersSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .default(50)
        .describe("Number of orders to return (max 200)"),
    offset: z.number().min(0).optional().default(0).describe("Offset for pagination (0-based)"),
    filter: z
        .string()
        .optional()
        .describe(
            "Filter string for orders (e.g., orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS})"
        )
});

export type ListOrdersParams = z.infer<typeof listOrdersSchema>;

export const listOrdersOperation: OperationDefinition = {
    id: "listOrders",
    name: "List Orders",
    description: "Get a list of orders from eBay",
    category: "fulfillment",
    inputSchema: listOrdersSchema,
    retryable: true,
    timeout: 30000
};

function formatOrder(order: Record<string, unknown>): EbayOrderOutput {
    const o = order as {
        orderId?: string;
        orderFulfillmentStatus?: string;
        creationDate?: string;
        buyer?: { username?: string };
        pricingSummary?: {
            total?: { value?: string; currency?: string };
            priceSubtotal?: { value?: string; currency?: string };
            deliveryCost?: { value?: string; currency?: string };
        };
        lineItems?: Array<{
            lineItemId?: string;
            title?: string;
            quantity?: number;
            lineItemCost?: { value?: string; currency?: string };
            sku?: string;
        }>;
        fulfillmentStartInstructions?: Array<{
            shippingStep?: {
                shipTo?: {
                    fullName?: string;
                    contactAddress?: {
                        addressLine1?: string;
                        addressLine2?: string;
                        city?: string;
                        stateOrProvince?: string;
                        postalCode?: string;
                        countryCode?: string;
                    };
                };
            };
        }>;
    };

    const shipTo = o.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress;

    return {
        orderId: o.orderId || "",
        orderStatus: o.orderFulfillmentStatus,
        creationDate: o.creationDate,
        buyer: o.buyer ? { username: o.buyer.username || "unknown" } : undefined,
        pricingSummary: o.pricingSummary
            ? {
                  total: o.pricingSummary.total
                      ? {
                            value: o.pricingSummary.total.value || "0",
                            currency: o.pricingSummary.total.currency || "USD"
                        }
                      : undefined,
                  subtotal: o.pricingSummary.priceSubtotal
                      ? {
                            value: o.pricingSummary.priceSubtotal.value || "0",
                            currency: o.pricingSummary.priceSubtotal.currency || "USD"
                        }
                      : undefined,
                  deliveryCost: o.pricingSummary.deliveryCost
                      ? {
                            value: o.pricingSummary.deliveryCost.value || "0",
                            currency: o.pricingSummary.deliveryCost.currency || "USD"
                        }
                      : undefined
              }
            : undefined,
        lineItems: (o.lineItems || []).map((li) => ({
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
        fulfillmentStartInstructions: o.fulfillmentStartInstructions?.map((inst) => ({
            shippingStep: inst.shippingStep
                ? {
                      shipTo: inst.shippingStep.shipTo
                          ? { fullName: inst.shippingStep.shipTo.fullName }
                          : undefined
                  }
                : undefined
        }))
    };
}

export async function executeListOrders(
    client: EbayClient,
    params: ListOrdersParams
): Promise<OperationResult> {
    try {
        const response = await client.listOrders(params.limit, params.offset, params.filter);
        const orders = response.orders || [];

        const formattedOrders: EbayOrderOutput[] = orders.map((order) =>
            formatOrder(order as unknown as Record<string, unknown>)
        );

        return {
            success: true,
            data: {
                orders: formattedOrders,
                count: formattedOrders.length,
                total: response.total || 0,
                offset: response.offset || 0,
                limit: response.limit || params.limit
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list orders",
                retryable: true
            }
        };
    }
}
