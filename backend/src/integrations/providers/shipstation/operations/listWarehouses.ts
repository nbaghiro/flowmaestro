import { getLogger } from "../../../../core/logging";
import { ShipStationClient } from "../client/ShipStationClient";
import { ListWarehousesSchema, type ListWarehousesParams } from "../schemas";
import type { ShipStationWarehouse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listWarehousesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listWarehouses",
            name: "List Warehouses",
            description: "Retrieve a list of configured warehouses/ship-from locations",
            category: "warehouses",
            inputSchema: ListWarehousesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ShipStation", err: error },
            "Failed to create listWarehousesOperation"
        );
        throw new Error(
            `Failed to create listWarehouses operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListWarehouses(
    client: ShipStationClient,
    _params: ListWarehousesParams
): Promise<OperationResult> {
    try {
        const response = await client.listWarehouses();
        const warehouses = response as ShipStationWarehouse[];

        return {
            success: true,
            data: {
                warehouses,
                warehouse_count: warehouses.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list warehouses",
                retryable: true
            }
        };
    }
}
