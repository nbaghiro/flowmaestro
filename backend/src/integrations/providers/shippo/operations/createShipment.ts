import { getLogger } from "../../../../core/logging";
import { ShippoClient } from "../client/ShippoClient";
import { CreateShipmentSchema, type CreateShipmentParams } from "../schemas";
import type { ShippoShipment } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createShipmentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createShipment",
            name: "Create Shipment",
            description:
                "Create a new shipment with addresses and parcel details to get shipping rates",
            category: "shipments",
            inputSchema: CreateShipmentSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Shippo", err: error },
            "Failed to create createShipmentOperation"
        );
        throw new Error(
            `Failed to create createShipment operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateShipment(
    client: ShippoClient,
    params: CreateShipmentParams
): Promise<OperationResult> {
    try {
        const response = await client.createShipment({
            address_from: params.address_from,
            address_to: params.address_to,
            parcels: params.parcels,
            async: params.async
        });

        const shipment = response as ShippoShipment;

        return {
            success: true,
            data: {
                shipment,
                shipment_id: shipment.object_id,
                rates: shipment.rates,
                rate_count: shipment.rates?.length || 0,
                status: shipment.status,
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
