import { getLogger } from "../../../../core/logging";
import { ShipStationClient } from "../client/ShipStationClient";
import { UpdateOrderStatusSchema, type UpdateOrderStatusParams } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const updateOrderStatusOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateOrderStatus",
            name: "Mark Order as Shipped",
            description: "Mark an order as shipped with carrier and tracking information",
            category: "orders",
            inputSchema: UpdateOrderStatusSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ShipStation", err: error },
            "Failed to create updateOrderStatusOperation"
        );
        throw new Error(
            `Failed to create updateOrderStatus operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeUpdateOrderStatus(
    client: ShipStationClient,
    params: UpdateOrderStatusParams
): Promise<OperationResult> {
    try {
        await client.markOrderShipped({
            orderId: params.orderId,
            carrierCode: params.carrierCode,
            shipDate: params.shipDate,
            trackingNumber: params.trackingNumber,
            notifyCustomer: params.notifyCustomer,
            notifySalesChannel: params.notifySalesChannel
        });

        return {
            success: true,
            data: {
                orderId: params.orderId,
                status: "shipped",
                carrierCode: params.carrierCode,
                trackingNumber: params.trackingNumber,
                message: "Order marked as shipped"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update order status",
                retryable: false
            }
        };
    }
}
