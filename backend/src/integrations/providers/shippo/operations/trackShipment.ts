import { getLogger } from "../../../../core/logging";
import { ShippoClient } from "../client/ShippoClient";
import { TrackShipmentSchema, type TrackShipmentParams } from "../schemas";
import type { ShippoTrack } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const trackShipmentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "trackShipment",
            name: "Track Shipment",
            description: "Register a tracking number for webhook updates",
            category: "tracking",
            inputSchema: TrackShipmentSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Shippo", err: error },
            "Failed to create trackShipmentOperation"
        );
        throw new Error(
            `Failed to create trackShipment operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeTrackShipment(
    client: ShippoClient,
    params: TrackShipmentParams
): Promise<OperationResult> {
    try {
        const response = await client.trackShipment({
            carrier: params.carrier,
            tracking_number: params.tracking_number
        });

        const track = response as ShippoTrack;

        return {
            success: true,
            data: {
                track,
                carrier: track.carrier,
                tracking_number: track.tracking_number,
                status: track.tracking_status?.status,
                status_details: track.tracking_status?.status_details,
                eta: track.eta,
                message: "Tracking registered successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to track shipment",
                retryable: false
            }
        };
    }
}
