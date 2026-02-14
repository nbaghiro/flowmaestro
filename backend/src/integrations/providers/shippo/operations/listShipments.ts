import { getLogger } from "../../../../core/logging";
import { ShippoClient } from "../client/ShippoClient";
import { ListShipmentsSchema, type ListShipmentsParams } from "../schemas";
import type { ShippoListResponse, ShippoShipment } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listShipmentsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listShipments",
            name: "List Shipments",
            description: "Retrieve a list of shipments with pagination",
            category: "shipments",
            inputSchema: ListShipmentsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Shippo", err: error },
            "Failed to create listShipmentsOperation"
        );
        throw new Error(
            `Failed to create listShipments operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListShipments(
    client: ShippoClient,
    params: ListShipmentsParams
): Promise<OperationResult> {
    try {
        const response = await client.listShipments({
            page: params.page,
            results: params.results
        });

        const data = response as ShippoListResponse<ShippoShipment>;

        return {
            success: true,
            data: {
                shipments: data.results,
                total_count: data.count,
                page: params.page || 1,
                has_more: !!data.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list shipments",
                retryable: true
            }
        };
    }
}
