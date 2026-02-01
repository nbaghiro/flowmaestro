import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SalesforceClient } from "../client/SalesforceClient";

/**
 * List objects input schema
 */
export const listObjectsSchema = z.object({
    includeCustom: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include custom objects in the list"),
    onlyQueryable: z
        .boolean()
        .optional()
        .default(false)
        .describe("Only return objects that can be queried"),
    onlyCreateable: z
        .boolean()
        .optional()
        .default(false)
        .describe("Only return objects that can have records created")
});

export type ListObjectsParams = z.infer<typeof listObjectsSchema>;

/**
 * List objects operation definition
 */
export const listObjectsOperation: OperationDefinition = {
    id: "listObjects",
    name: "List Salesforce Objects",
    description: "Get a list of all available Salesforce objects (sObjects) in the org",
    category: "metadata",
    retryable: true,
    inputSchema: listObjectsSchema
};

/**
 * Execute list objects operation
 */
export async function executeListObjects(
    client: SalesforceClient,
    params: ListObjectsParams
): Promise<OperationResult> {
    try {
        const globalDescribe = await client.describeGlobal();

        let objects = globalDescribe.sobjects;

        // Apply filters
        if (!params.includeCustom) {
            objects = objects.filter((obj) => !obj.custom);
        }

        if (params.onlyQueryable) {
            objects = objects.filter((obj) => obj.queryable);
        }

        if (params.onlyCreateable) {
            objects = objects.filter((obj) => obj.createable);
        }

        // Return cleaned up object list
        return {
            success: true,
            data: {
                totalCount: objects.length,
                objects: objects.map((obj) => ({
                    name: obj.name,
                    label: obj.label,
                    labelPlural: obj.labelPlural,
                    keyPrefix: obj.keyPrefix,
                    queryable: obj.queryable,
                    createable: obj.createable,
                    updateable: obj.updateable,
                    deletable: obj.deletable,
                    searchable: obj.searchable,
                    custom: obj.custom
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list objects",
                retryable: true
            }
        };
    }
}
