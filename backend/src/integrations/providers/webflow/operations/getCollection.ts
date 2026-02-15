import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WebflowClient } from "../client/WebflowClient";
import { WebflowCollectionIdSchema } from "../schemas";
import type { WebflowGetCollectionResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Collection operation schema
 */
export const getCollectionSchema = z.object({
    collectionId: WebflowCollectionIdSchema
});

export type GetCollectionParams = z.infer<typeof getCollectionSchema>;

/**
 * Get Collection operation definition
 */
export const getCollectionOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCollection",
            name: "Get Collection",
            description: "Get details of a specific CMS collection including its fields",
            category: "collections",
            inputSchema: getCollectionSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Webflow", err: error },
            "Failed to create getCollectionOperation"
        );
        throw new Error(
            `Failed to create getCollection operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get collection operation
 */
export async function executeGetCollection(
    client: WebflowClient,
    params: GetCollectionParams
): Promise<OperationResult> {
    try {
        const response = (await client.getCollection(
            params.collectionId
        )) as WebflowGetCollectionResponse;

        return {
            success: true,
            data: {
                id: response.id,
                displayName: response.displayName,
                singularName: response.singularName,
                slug: response.slug,
                createdOn: response.createdOn,
                lastUpdated: response.lastUpdated,
                fields: response.fields?.map((field) => ({
                    id: field.id,
                    slug: field.slug,
                    displayName: field.displayName,
                    type: field.type,
                    isRequired: field.isRequired,
                    isEditable: field.isEditable,
                    helpText: field.helpText
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get collection",
                retryable: true
            }
        };
    }
}
