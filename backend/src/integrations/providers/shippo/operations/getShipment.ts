import { getLogger } from "../../../../core/logging";
import { ShippoClient } from "../client/ShippoClient";
import { GetShipmentSchema, type GetShipmentParams } from "../schemas";
import type { ShippoShipment } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getShipmentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getShipment",
            name: "Get Shipment",
            description: "Retrieve a single shipment by its ID",
            category: "shipments",
            inputSchema: GetShipmentSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Shippo", err: error }, "Failed to create getShipmentOperation");
        throw new Error(
            `Failed to create getShipment operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetShipment(
    client: ShippoClient,
    params: GetShipmentParams
): Promise<OperationResult> {
    try {
        const response = await client.getShipment(params.shipment_id);
        const shipment = response as ShippoShipment;

        return {
            success: true,
            data: {
                shipment
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get shipment",
                retryable: true
            }
        };
    }
}
