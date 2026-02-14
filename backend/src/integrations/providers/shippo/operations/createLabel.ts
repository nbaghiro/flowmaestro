import { getLogger } from "../../../../core/logging";
import { ShippoClient } from "../client/ShippoClient";
import { CreateLabelSchema, type CreateLabelParams } from "../schemas";
import type { ShippoTransaction } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createLabelOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createLabel",
            name: "Create Label",
            description: "Purchase a shipping label by providing a rate ID",
            category: "labels",
            inputSchema: CreateLabelSchema,
            retryable: false,
            timeout: 60000 // Labels can take longer
        };
    } catch (error) {
        logger.error({ component: "Shippo", err: error }, "Failed to create createLabelOperation");
        throw new Error(
            `Failed to create createLabel operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateLabel(
    client: ShippoClient,
    params: CreateLabelParams
): Promise<OperationResult> {
    try {
        const response = await client.createLabel({
            rate: params.rate,
            label_file_type: params.label_file_type,
            async: params.async
        });

        const transaction = response as ShippoTransaction;

        return {
            success: true,
            data: {
                transaction,
                transaction_id: transaction.object_id,
                tracking_number: transaction.tracking_number,
                label_url: transaction.label_url,
                status: transaction.status,
                message: "Label created successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create label",
                retryable: false
            }
        };
    }
}
