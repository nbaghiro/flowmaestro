import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WebflowClient } from "../client/WebflowClient";
import {
    WebflowCollectionIdSchema,
    WebflowItemIdSchema,
    WebflowFieldDataSchema,
    WebflowBooleanSchema
} from "../schemas";
import type { WebflowItemResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Update Collection Item operation schema
 */
export const updateCollectionItemSchema = z.object({
    collectionId: WebflowCollectionIdSchema,
    itemId: WebflowItemIdSchema,
    isArchived: WebflowBooleanSchema.describe("Whether the item is archived"),
    isDraft: WebflowBooleanSchema.describe("Whether the item is a draft (unpublished)"),
    fieldData: WebflowFieldDataSchema.optional()
});

export type UpdateCollectionItemParams = z.infer<typeof updateCollectionItemSchema>;

/**
 * Update Collection Item operation definition
 */
export const updateCollectionItemOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateCollectionItem",
            name: "Update Collection Item",
            description: "Update an existing item in a CMS collection",
            category: "items",
            inputSchema: updateCollectionItemSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Webflow", err: error },
            "Failed to create updateCollectionItemOperation"
        );
        throw new Error(
            `Failed to create updateCollectionItem operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update collection item operation
 */
export async function executeUpdateCollectionItem(
    client: WebflowClient,
    params: UpdateCollectionItemParams
): Promise<OperationResult> {
    try {
        const response = (await client.updateCollectionItem(
            params.collectionId,
            params.itemId,
            {
                isArchived: params.isArchived,
                isDraft: params.isDraft,
                fieldData: params.fieldData
            }
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
                message: error instanceof Error ? error.message : "Failed to update collection item",
                retryable: false
            }
        };
    }
}
