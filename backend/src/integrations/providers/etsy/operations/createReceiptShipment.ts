import { getLogger } from "../../../../core/logging";
import { EtsyClient } from "../client/EtsyClient";
import { CreateReceiptShipmentSchema, type CreateReceiptShipmentParams } from "../schemas";
import type { EtsyReceipt } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Receipt Shipment operation definition
 */
export const createReceiptShipmentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createReceiptShipment",
            name: "Create Shipment",
            description:
                "Add tracking information to a receipt (order) and optionally notify the buyer",
            category: "orders",
            inputSchema: CreateReceiptShipmentSchema,
            retryable: false, // Don't retry to avoid duplicate notifications
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Etsy", err: error },
            "Failed to create createReceiptShipmentOperation"
        );
        throw new Error(
            `Failed to create createReceiptShipment operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create receipt shipment operation
 */
export async function executeCreateReceiptShipment(
    client: EtsyClient,
    params: CreateReceiptShipmentParams
): Promise<OperationResult> {
    try {
        const response = await client.createReceiptShipment(params.shop_id, params.receipt_id, {
            tracking_code: params.tracking_code,
            carrier_name: params.carrier_name,
            send_bcc: params.send_bcc,
            note_to_buyer: params.note_to_buyer
        });

        const receipt = response as EtsyReceipt;

        return {
            success: true,
            data: {
                receipt,
                message: "Shipment tracking added successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create shipment";
        const isNotFound = message.toLowerCase().includes("not found");
        const isValidation = message.toLowerCase().includes("validation");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : isValidation ? "validation" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
