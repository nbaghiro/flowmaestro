import { getLogger } from "../../../../core/logging";
import { ShippoClient } from "../client/ShippoClient";
import { GetRatesSchema, type GetRatesParams } from "../schemas";
import type { ShippoShipment, ShippoRate } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getRatesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getRates",
            name: "Get Rates",
            description: "Retrieve shipping rates for a shipment",
            category: "rates",
            inputSchema: GetRatesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Shippo", err: error }, "Failed to create getRatesOperation");
        throw new Error(
            `Failed to create getRates operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetRates(
    client: ShippoClient,
    params: GetRatesParams
): Promise<OperationResult> {
    try {
        // First get the shipment to access its rates
        const response = await client.getShipment(params.shipment_id);
        const shipment = response as ShippoShipment;

        // Filter rates by currency if specified
        let rates = shipment.rates || [];
        if (params.currency_code) {
            rates = rates.filter(
                (rate: ShippoRate) =>
                    rate.currency.toUpperCase() === params.currency_code.toUpperCase()
            );
        }

        return {
            success: true,
            data: {
                rates,
                rate_count: rates.length,
                shipment_id: params.shipment_id,
                currency: params.currency_code || "USD"
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
