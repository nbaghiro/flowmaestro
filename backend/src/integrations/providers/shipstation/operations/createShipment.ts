import { getLogger } from "../../../../core/logging";
import { ShipStationClient } from "../client/ShipStationClient";
import { CreateShipmentSchema, type CreateShipmentParams } from "../schemas";
import type { ShipStationCreateLabelResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createShipmentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createShipment",
            name: "Create Shipment",
            description: "Create a shipment and generate a shipping label for an order",
            category: "shipments",
            inputSchema: CreateShipmentSchema,
            retryable: false,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "ShipStation", err: error },
            "Failed to create createShipmentOperation"
        );
        throw new Error(
            `Failed to create createShipment operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateShipment(
    client: ShipStationClient,
    params: CreateShipmentParams
): Promise<OperationResult> {
    try {
        const response = await client.createShipment({
            orderId: params.orderId,
            carrierCode: params.carrierCode,
            serviceCode: params.serviceCode,
            packageCode: params.packageCode,
            confirmation: params.confirmation,
            shipDate: params.shipDate,
            weight: params.weight,
            dimensions: params.dimensions,
            testLabel: params.testLabel
        });

        const shipment = response as ShipStationCreateLabelResponse;

        return {
            success: true,
            data: {
                shipmentId: shipment.shipmentId,
                shipmentCost: shipment.shipmentCost,
                insuranceCost: shipment.insuranceCost,
                trackingNumber: shipment.trackingNumber,
                labelData: shipment.labelData,
                message: "Shipment created successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create shipment",
                retryable: false
            }
        };
    }
}
