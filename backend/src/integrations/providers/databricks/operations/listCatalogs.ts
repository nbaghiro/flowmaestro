import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatabricksClient } from "../client/DatabricksClient";

/**
 * List catalogs operation schema
 */
export const listCatalogsSchema = z.object({});

export type ListCatalogsParams = z.infer<typeof listCatalogsSchema>;

/**
 * List catalogs operation definition
 */
export const listCatalogsOperation: OperationDefinition = {
    id: "listCatalogs",
    name: "List Catalogs",
    description: "List all Unity Catalogs available in the workspace",
    category: "database",
    inputSchema: listCatalogsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list catalogs operation
 */
export async function executeListCatalogs(
    client: DatabricksClient,
    _params: ListCatalogsParams
): Promise<OperationResult> {
    try {
        const catalogs = await client.listCatalogs();

        return {
            success: true,
            data: {
                catalogs,
                count: catalogs.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list catalogs";

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
