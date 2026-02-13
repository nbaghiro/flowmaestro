import { getLogger } from "../../../../core/logging";
import { ShipStationClient } from "../client/ShipStationClient";
import { CreateOrderSchema, type CreateOrderParams } from "../schemas";
import type { ShipStationOrder } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createOrder",
            name: "Create Order",
            description: "Create a new order in ShipStation",
            category: "orders",
            inputSchema: CreateOrderSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ShipStation", err: error },
            "Failed to create createOrderOperation"
        );
        throw new Error(
            `Failed to create createOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateOrder(
    client: ShipStationClient,
    params: CreateOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.createOrder({
            orderNumber: params.orderNumber,
            orderDate: params.orderDate,
            orderStatus: params.orderStatus,
            billTo: params.billTo,
            shipTo: params.shipTo,
            items: params.items,
            amountPaid: params.amountPaid,
            shippingAmount: params.shippingAmount,
            customerEmail: params.customerEmail,
            customerNotes: params.customerNotes,
            internalNotes: params.internalNotes,
            requestedShippingService: params.requestedShippingService
        });

        const order = response as ShipStationOrder;

        return {
            success: true,
            data: {
                order,
                orderId: order.orderId,
                orderNumber: order.orderNumber,
                message: "Order created successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create order",
                retryable: false
            }
        };
    }
}
