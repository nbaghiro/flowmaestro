import { getLogger } from "../../../../core/logging";
import { ShipStationClient } from "../client/ShipStationClient";
import { VoidLabelSchema, type VoidLabelParams } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const voidLabelOperation: OperationDefinition = (() => {
    try {
        return {
            id: "voidLabel",
            name: "Void Label",
            description: "Void/cancel a shipping label",
            category: "labels",
            inputSchema: VoidLabelSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ShipStation", err: error },
            "Failed to create voidLabelOperation"
        );
        throw new Error(
            `Failed to create voidLabel operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeVoidLabel(
    client: ShipStationClient,
    params: VoidLabelParams
): Promise<OperationResult> {
    try {
        const response = await client.voidLabel(params.shipmentId);
        const result = response as { approved: boolean; message?: string };

        return {
            success: true,
            data: {
                shipmentId: params.shipmentId,
                voided: result.approved,
                message: result.approved
                    ? "Label voided successfully"
                    : result.message || "Failed to void label"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to void label",
                retryable: false
            }
        };
    }
}
