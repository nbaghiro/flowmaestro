import { getLogger } from "../../../../core/logging";
import { ShipStationClient } from "../client/ShipStationClient";
import { GetRatesSchema, type GetRatesParams } from "../schemas";
import type { ShipStationRate } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getRatesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getRates",
            name: "Get Rates",
            description:
                "Get shipping rates for a package based on weight, dimensions, and destination",
            category: "rates",
            inputSchema: GetRatesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ShipStation", err: error },
            "Failed to create getRatesOperation"
        );
        throw new Error(
            `Failed to create getRates operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetRates(
    client: ShipStationClient,
    params: GetRatesParams
): Promise<OperationResult> {
    try {
        const response = await client.getRates({
            carrierCode: params.carrierCode,
            fromPostalCode: params.fromPostalCode,
            toPostalCode: params.toPostalCode,
            toCountry: params.toCountry,
            weight: params.weight,
            dimensions: params.dimensions,
            residential: params.residential
        });

        const data = response as { rates?: ShipStationRate[] } | ShipStationRate[];
        const rates = Array.isArray(data) ? data : data.rates || [];

        return {
            success: true,
            data: {
                rates,
                rate_count: rates.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get rates",
                retryable: true
            }
        };
    }
}
