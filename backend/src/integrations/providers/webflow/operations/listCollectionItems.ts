import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WebflowClient } from "../client/WebflowClient";
import { WebflowCollectionIdSchema, WebflowPaginationSchema } from "../schemas";
import type { WebflowListItemsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Collection Items operation schema
 */
export const listCollectionItemsSchema = z
    .object({
        collectionId: WebflowCollectionIdSchema
    })
    .merge(WebflowPaginationSchema);

export type ListCollectionItemsParams = z.input<typeof listCollectionItemsSchema>;

/**
 * List Collection Items operation definition
 */
export const listCollectionItemsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listCollectionItems",
            name: "List Collection Items",
            description: "List all items in a CMS collection with pagination",
            category: "items",
            inputSchema: listCollectionItemsSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Webflow", err: error },
            "Failed to create listCollectionItemsOperation"
        );
        throw new Error(
            `Failed to create listCollectionItems operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list collection items operation
 */
export async function executeListCollectionItems(
    client: WebflowClient,
    params: ListCollectionItemsParams
): Promise<OperationResult> {
    try {
        const response = (await client.listCollectionItems(params.collectionId, {
            offset: params.offset,
            limit: params.limit
        })) as WebflowListItemsResponse;

        const items = response.items.map((item) => ({
            id: item.id,
            cmsLocaleId: item.cmsLocaleId,
            isArchived: item.isArchived,
            isDraft: item.isDraft,
            createdOn: item.createdOn,
            lastUpdated: item.lastUpdated,
            lastPublished: item.lastPublished,
            fieldData: item.fieldData
        }));

        return {
            success: true,
            data: {
                items,
                pagination: {
                    offset: response.pagination.offset,
                    limit: response.pagination.limit,
                    total: response.pagination.total
                },
                hasMore: response.pagination.offset + items.length < response.pagination.total
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list collection items",
                retryable: true
            }
        };
    }
}
