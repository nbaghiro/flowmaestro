import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatabricksClient } from "../client/DatabricksClient";

/**
 * List schemas operation schema
 */
export const listSchemasSchema = z.object({
    catalog: z
        .string()
        .optional()
        .describe("Catalog name to list schemas from (defaults to connection catalog)")
});

export type ListSchemasParams = z.infer<typeof listSchemasSchema>;

/**
 * List schemas operation definition
 */
export const listSchemasOperation: OperationDefinition = {
    id: "listSchemas",
    name: "List Schemas",
    description: "List all schemas in a catalog",
    category: "database",
    inputSchema: listSchemasSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list schemas operation
 */
export async function executeListSchemas(
    client: DatabricksClient,
    params: ListSchemasParams
): Promise<OperationResult> {
    try {
        const schemas = await client.listSchemas(params.catalog);

        return {
            success: true,
            data: {
                schemas,
                count: schemas.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list schemas";
        const isCatalogNotFound =
            message.includes("does not exist") || message.includes("not found");

        return {
            success: false,
            error: {
                type: isCatalogNotFound ? "not_found" : "server_error",
                message,
                retryable: !isCatalogNotFound
            }
        };
    }
}
