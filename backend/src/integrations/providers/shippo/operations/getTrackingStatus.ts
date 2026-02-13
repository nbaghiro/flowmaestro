import { getLogger } from "../../../../core/logging";
import { ShippoClient } from "../client/ShippoClient";
import { GetTrackingStatusSchema, type GetTrackingStatusParams } from "../schemas";
import type { ShippoTrack } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getTrackingStatusOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getTrackingStatus",
            name: "Get Tracking Status",
            description: "Retrieve the current tracking status for a shipment",
            category: "tracking",
            inputSchema: GetTrackingStatusSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Shippo", err: error },
            "Failed to create getTrackingStatusOperation"
        );
        throw new Error(
            `Failed to create getTrackingStatus operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetTrackingStatus(
    client: ShippoClient,
    params: GetTrackingStatusParams
): Promise<OperationResult> {
    try {
        const response = await client.getTrackingStatus(params.carrier, params.tracking_number);
        const track = response as ShippoTrack;

        return {
            success: true,
            data: {
                carrier: track.carrier,
                tracking_number: track.tracking_number,
                status: track.tracking_status?.status,
                status_details: track.tracking_status?.status_details,
                status_date: track.tracking_status?.status_date,
                location: track.tracking_status?.location,
                eta: track.eta,
                tracking_history: track.tracking_history
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get tracking status",
                retryable: true
            }
        };
    }
}
