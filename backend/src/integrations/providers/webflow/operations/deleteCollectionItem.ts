import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WebflowClient } from "../client/WebflowClient";
import { WebflowCollectionIdSchema, WebflowItemIdSchema } from "../schemas";
import type { WebflowDeleteItemResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Delete Collection Item operation schema
 */
export const deleteCollectionItemSchema = z.object({
    collectionId: WebflowCollectionIdSchema,
    itemId: WebflowItemIdSchema
});

export type DeleteCollectionItemParams = z.infer<typeof deleteCollectionItemSchema>;

/**
 * Delete Collection Item operation definition
 */
export const deleteCollectionItemOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deleteCollectionItem",
            name: "Delete Collection Item",
            description: "Delete an item from a CMS collection",
            category: "items",
            inputSchema: deleteCollectionItemSchema,
            retryable: false,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Webflow", err: error },
            "Failed to create deleteCollectionItemOperation"
        );
        throw new Error(
            `Failed to create deleteCollectionItem operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete collection item operation
 */
export async function executeDeleteCollectionItem(
    client: WebflowClient,
    params: DeleteCollectionItemParams
): Promise<OperationResult> {
    try {
        const response = (await client.deleteCollectionItem(
            params.collectionId,
            params.itemId
        )) as WebflowDeleteItemResponse;

        return {
            success: true,
            data: {
                deleted: response.deleted,
                itemId: params.itemId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete collection item",
                retryable: false
            }
        };
    }
}
