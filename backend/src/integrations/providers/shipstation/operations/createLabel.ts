import { getLogger } from "../../../../core/logging";
import { ShipStationClient } from "../client/ShipStationClient";
import { CreateLabelSchema, type CreateLabelParams } from "../schemas";
import type { ShipStationCreateLabelResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createLabelOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createLabel",
            name: "Create Label",
            description: "Create a shipping label for an existing order",
            category: "labels",
            inputSchema: CreateLabelSchema,
            retryable: false,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "ShipStation", err: error },
            "Failed to create createLabelOperation"
        );
        throw new Error(
            `Failed to create createLabel operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateLabel(
    client: ShipStationClient,
    params: CreateLabelParams
): Promise<OperationResult> {
    try {
        const response = await client.createLabel({
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

        const label = response as ShipStationCreateLabelResponse;

        return {
            success: true,
            data: {
                shipmentId: label.shipmentId,
                shipmentCost: label.shipmentCost,
                insuranceCost: label.insuranceCost,
                trackingNumber: label.trackingNumber,
                labelData: label.labelData,
                message: "Label created successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create label",
                retryable: false
            }
        };
    }
}
