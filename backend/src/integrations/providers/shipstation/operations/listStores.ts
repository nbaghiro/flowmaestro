import { getLogger } from "../../../../core/logging";
import { ShipStationClient } from "../client/ShipStationClient";
import { ListStoresSchema, type ListStoresParams } from "../schemas";
import type { ShipStationStore } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listStoresOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listStores",
            name: "List Stores",
            description: "Retrieve a list of connected sales channel stores",
            category: "stores",
            inputSchema: ListStoresSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ShipStation", err: error },
            "Failed to create listStoresOperation"
        );
        throw new Error(
            `Failed to create listStores operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListStores(
    client: ShipStationClient,
    params: ListStoresParams
): Promise<OperationResult> {
    try {
        const response = await client.listStores(params.showInactive);
        const stores = response as ShipStationStore[];

        return {
            success: true,
            data: {
                stores,
                store_count: stores.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list stores",
                retryable: true
            }
        };
    }
}
