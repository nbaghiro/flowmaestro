import { getLogger } from "../../../../core/logging";
import { ShipStationClient } from "../client/ShipStationClient";
import { ListServicesSchema, type ListServicesParams } from "../schemas";
import type { ShipStationService } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listServicesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listServices",
            name: "List Services",
            description: "Retrieve available shipping services for a specific carrier",
            category: "carriers",
            inputSchema: ListServicesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ShipStation", err: error },
            "Failed to create listServicesOperation"
        );
        throw new Error(
            `Failed to create listServices operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListServices(
    client: ShipStationClient,
    params: ListServicesParams
): Promise<OperationResult> {
    try {
        const response = await client.listServices(params.carrierCode);
        const services = response as ShipStationService[];

        return {
            success: true,
            data: {
                services,
                service_count: services.length,
                carrierCode: params.carrierCode
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list services",
                retryable: true
            }
        };
    }
}
