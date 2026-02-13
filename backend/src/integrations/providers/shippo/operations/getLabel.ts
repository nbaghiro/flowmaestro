import { getLogger } from "../../../../core/logging";
import { ShippoClient } from "../client/ShippoClient";
import { GetLabelSchema, type GetLabelParams } from "../schemas";
import type { ShippoTransaction } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getLabelOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getLabel",
            name: "Get Label",
            description: "Retrieve a shipping label/transaction by its ID",
            category: "labels",
            inputSchema: GetLabelSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Shippo", err: error }, "Failed to create getLabelOperation");
        throw new Error(
            `Failed to create getLabel operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetLabel(
    client: ShippoClient,
    params: GetLabelParams
): Promise<OperationResult> {
    try {
        const response = await client.getLabel(params.transaction_id);
        const transaction = response as ShippoTransaction;

        return {
            success: true,
            data: {
                transaction,
                transaction_id: transaction.object_id,
                tracking_number: transaction.tracking_number,
                label_url: transaction.label_url,
                status: transaction.status
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get label",
                retryable: true
            }
        };
    }
}
