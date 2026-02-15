import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WebflowClient } from "../client/WebflowClient";
import { WebflowCollectionIdSchema, WebflowItemIdSchema } from "../schemas";
import type { WebflowPublishItemsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Publish Collection Items operation schema
 */
export const publishCollectionItemsSchema = z.object({
    collectionId: WebflowCollectionIdSchema,
    itemIds: z.array(WebflowItemIdSchema).min(1).max(100).describe("IDs of items to publish")
});

export type PublishCollectionItemsParams = z.infer<typeof publishCollectionItemsSchema>;

/**
 * Publish Collection Items operation definition
 */
export const publishCollectionItemsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "publishCollectionItems",
            name: "Publish Collection Items",
            description: "Publish one or more items in a CMS collection",
            category: "items",
            inputSchema: publishCollectionItemsSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Webflow", err: error },
            "Failed to create publishCollectionItemsOperation"
        );
        throw new Error(
            `Failed to create publishCollectionItems operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute publish collection items operation
 */
export async function executePublishCollectionItems(
    client: WebflowClient,
    params: PublishCollectionItemsParams
): Promise<OperationResult> {
    try {
        const response = (await client.publishCollectionItems(
            params.collectionId,
            params.itemIds
        )) as WebflowPublishItemsResponse;

        return {
            success: true,
            data: {
                publishedItemIds: response.publishedItemIds,
                count: response.publishedItemIds.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to publish collection items",
                retryable: false
            }
        };
    }
}
