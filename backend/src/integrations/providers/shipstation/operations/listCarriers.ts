import { getLogger } from "../../../../core/logging";
import { ShipStationClient } from "../client/ShipStationClient";
import { ListCarriersSchema, type ListCarriersParams } from "../schemas";
import type { ShipStationCarrier } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listCarriersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listCarriers",
            name: "List Carriers",
            description: "Retrieve a list of available shipping carriers",
            category: "carriers",
            inputSchema: ListCarriersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ShipStation", err: error },
            "Failed to create listCarriersOperation"
        );
        throw new Error(
            `Failed to create listCarriers operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListCarriers(
    client: ShipStationClient,
    _params: ListCarriersParams
): Promise<OperationResult> {
    try {
        const response = await client.listCarriers();
        const carriers = response as ShipStationCarrier[];

        return {
            success: true,
            data: {
                carriers,
                carrier_count: carriers.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list carriers",
                retryable: true
            }
        };
    }
}
