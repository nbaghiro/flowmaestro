import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SquareClient } from "../client/SquareClient";
import type { SquareOrderResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Order operation schema
 */
export const getOrderSchema = z.object({
    order_id: z.string().describe("Order ID")
});

export type GetOrderParams = z.infer<typeof getOrderSchema>;

/**
 * Get Order operation definition
 */
export const getOrderOperation: OperationDefinition = {
    id: "getOrder",
    name: "Get Order",
    description: "Retrieve details of a specific order",
    category: "orders",
    actionType: "read",
    inputSchema: getOrderSchema,
    inputSchemaJSON: toJSONSchema(getOrderSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute get order operation
 */
export async function executeGetOrder(
    client: SquareClient,
    params: GetOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.get<SquareOrderResponse>(`/orders/${params.order_id}`);

        if (response.errors && response.errors.length > 0) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: response.errors[0].detail || response.errors[0].code,
                    retryable: false
                }
            };
        }

        const order = response.order!;

        return {
            success: true,
            data: {
                id: order.id,
                locationId: order.location_id,
                referenceId: order.reference_id,
                state: order.state,
                totalMoney: order.total_money,
                totalTaxMoney: order.total_tax_money,
                totalDiscountMoney: order.total_discount_money,
                totalServiceChargeMoney: order.total_service_charge_money,
                createdAt: order.created_at,
                updatedAt: order.updated_at
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
