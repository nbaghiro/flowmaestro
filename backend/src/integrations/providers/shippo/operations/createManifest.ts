import { getLogger } from "../../../../core/logging";
import { ShippoClient } from "../client/ShippoClient";
import { CreateManifestSchema, type CreateManifestParams } from "../schemas";
import type { ShippoManifest } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createManifestOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createManifest",
            name: "Create Manifest",
            description: "Create an end-of-day manifest for carrier pickup",
            category: "manifests",
            inputSchema: CreateManifestSchema,
            retryable: false,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "Shippo", err: error },
            "Failed to create createManifestOperation"
        );
        throw new Error(
            `Failed to create createManifest operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateManifest(
    client: ShippoClient,
    params: CreateManifestParams
): Promise<OperationResult> {
    try {
        const response = await client.createManifest({
            carrier_account: params.carrier_account,
            shipment_date: params.shipment_date,
            address_from: params.address_from,
            transactions: params.transactions,
            async: params.async
        });

        const manifest = response as ShippoManifest;

        return {
            success: true,
            data: {
                manifest,
                manifest_id: manifest.object_id,
                status: manifest.status,
                documents: manifest.documents,
                transaction_count: manifest.transactions?.length || 0,
                message: "Manifest created successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create manifest",
                retryable: false
            }
        };
    }
}
