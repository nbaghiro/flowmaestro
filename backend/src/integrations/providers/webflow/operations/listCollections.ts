import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WebflowClient } from "../client/WebflowClient";
import { WebflowSiteIdSchema } from "../schemas";
import type { WebflowListCollectionsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Collections operation schema
 */
export const listCollectionsSchema = z.object({
    siteId: WebflowSiteIdSchema
});

export type ListCollectionsParams = z.infer<typeof listCollectionsSchema>;

/**
 * List Collections operation definition
 */
export const listCollectionsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listCollections",
            name: "List Collections",
            description: "List all CMS collections in a Webflow site",
            category: "collections",
            inputSchema: listCollectionsSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Webflow", err: error },
            "Failed to create listCollectionsOperation"
        );
        throw new Error(
            `Failed to create listCollections operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list collections operation
 */
export async function executeListCollections(
    client: WebflowClient,
    params: ListCollectionsParams
): Promise<OperationResult> {
    try {
        const response = (await client.listCollections(
            params.siteId
        )) as WebflowListCollectionsResponse;

        const collections = response.collections.map((collection) => ({
            id: collection.id,
            displayName: collection.displayName,
            singularName: collection.singularName,
            slug: collection.slug,
            createdOn: collection.createdOn,
            lastUpdated: collection.lastUpdated
        }));

        return {
            success: true,
            data: {
                collections,
                count: collections.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list collections",
                retryable: true
            }
        };
    }
}
