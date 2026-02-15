import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WebflowClient } from "../client/WebflowClient";
import { WebflowCollectionIdSchema, WebflowItemIdSchema } from "../schemas";
import type { WebflowItemResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Collection Item operation schema
 */
export const getCollectionItemSchema = z.object({
    collectionId: WebflowCollectionIdSchema,
    itemId: WebflowItemIdSchema
});

export type GetCollectionItemParams = z.infer<typeof getCollectionItemSchema>;

/**
 * Get Collection Item operation definition
 */
export const getCollectionItemOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCollectionItem",
            name: "Get Collection Item",
            description: "Get a specific item from a CMS collection",
            category: "items",
            inputSchema: getCollectionItemSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Webflow", err: error },
            "Failed to create getCollectionItemOperation"
        );
        throw new Error(
            `Failed to create getCollectionItem operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get collection item operation
 */
export async function executeGetCollectionItem(
    client: WebflowClient,
    params: GetCollectionItemParams
): Promise<OperationResult> {
    try {
        const response = (await client.getCollectionItem(
            params.collectionId,
            params.itemId
        )) as WebflowItemResponse;

        return {
            success: true,
            data: {
                id: response.id,
                cmsLocaleId: response.cmsLocaleId,
                isArchived: response.isArchived,
                isDraft: response.isDraft,
                createdOn: response.createdOn,
                lastUpdated: response.lastUpdated,
                lastPublished: response.lastPublished,
                fieldData: response.fieldData
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get collection item",
                retryable: true
            }
        };
    }
}
