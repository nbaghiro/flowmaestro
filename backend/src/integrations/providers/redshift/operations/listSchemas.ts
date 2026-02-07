import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RedshiftClient } from "../client/RedshiftClient";

/**
 * List schemas operation schema
 */
export const listSchemasSchema = z.object({
    database: z
        .string()
        .optional()
        .describe("Database name (uses connection default if not specified)")
});

export type ListSchemasParams = z.infer<typeof listSchemasSchema>;

/**
 * List schemas operation definition
 */
export const listSchemasOperation: OperationDefinition = {
    id: "listSchemas",
    name: "List Schemas",
    description: "List all schemas in a Redshift database",
    category: "database",
    inputSchema: listSchemasSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list schemas operation
 */
export async function executeListSchemas(
    client: RedshiftClient,
    params: ListSchemasParams
): Promise<OperationResult> {
    try {
        const schemas = await client.listSchemas(params.database);

        return {
            success: true,
            data: {
                schemas,
                count: schemas.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list schemas";

        return {
            success: false,
            error: {
                type:
                    message.includes("does not exist") || message.includes("not found")
                        ? "not_found"
                        : message.includes("permission")
                          ? "permission"
                          : "server_error",
                message,
                retryable: !message.includes("does not exist")
            }
        };
    }
}
