import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { GetCollectionSchema, type GetCollectionParams } from "../schemas";
import type { WixCollectionResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Collection operation definition
 */
export const getCollectionOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCollection",
            name: "Get Collection",
            description: "Get a single collection by ID",
            category: "collections",
            inputSchema: GetCollectionSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create getCollectionOperation");
        throw new Error(
            `Failed to create getCollection operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get collection operation
 */
export async function executeGetCollection(
    client: WixClient,
    params: GetCollectionParams
): Promise<OperationResult> {
    try {
        const response = await client.getCollection(params.collectionId);
        const data = response as WixCollectionResponse;

        return {
            success: true,
            data: {
                collection: data.collection
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get collection";
        const isNotFound = message.toLowerCase().includes("not found");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
