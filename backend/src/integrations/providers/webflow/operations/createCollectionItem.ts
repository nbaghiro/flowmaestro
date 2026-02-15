import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WebflowClient } from "../client/WebflowClient";
import {
    WebflowCollectionIdSchema,
    WebflowFieldDataSchema,
    WebflowBooleanSchema
} from "../schemas";
import type { WebflowItemResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Collection Item operation schema
 */
export const createCollectionItemSchema = z.object({
    collectionId: WebflowCollectionIdSchema,
    isArchived: WebflowBooleanSchema.describe("Whether the item is archived"),
    isDraft: WebflowBooleanSchema.describe("Whether the item is a draft (unpublished)"),
    fieldData: WebflowFieldDataSchema
});

export type CreateCollectionItemParams = z.infer<typeof createCollectionItemSchema>;

/**
 * Create Collection Item operation definition
 */
export const createCollectionItemOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createCollectionItem",
            name: "Create Collection Item",
            description: "Create a new item in a CMS collection",
            category: "items",
            inputSchema: createCollectionItemSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Webflow", err: error },
            "Failed to create createCollectionItemOperation"
        );
        throw new Error(
            `Failed to create createCollectionItem operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create collection item operation
 */
export async function executeCreateCollectionItem(
    client: WebflowClient,
    params: CreateCollectionItemParams
): Promise<OperationResult> {
    try {
        const response = (await client.createCollectionItem(params.collectionId, {
            isArchived: params.isArchived,
            isDraft: params.isDraft,
            fieldData: params.fieldData
        })) as WebflowItemResponse;

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
                message: error instanceof Error ? error.message : "Failed to create collection item",
                retryable: false
            }
        };
    }
}
