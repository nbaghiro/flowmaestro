import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RedshiftClient } from "../client/RedshiftClient";

/**
 * List databases operation schema
 */
export const listDatabasesSchema = z.object({});

export type ListDatabasesParams = z.infer<typeof listDatabasesSchema>;

/**
 * List databases operation definition
 */
export const listDatabasesOperation: OperationDefinition = {
    id: "listDatabases",
    name: "List Databases",
    description: "List all databases in the Redshift cluster or workgroup",
    category: "database",
    inputSchema: listDatabasesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list databases operation
 */
export async function executeListDatabases(
    client: RedshiftClient,
    _params: ListDatabasesParams
): Promise<OperationResult> {
    try {
        const databases = await client.listDatabases();

        return {
            success: true,
            data: {
                databases,
                count: databases.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list databases";

        return {
            success: false,
            error: {
                type: message.includes("permission") ? "permission" : "server_error",
                message,
                retryable: true
            }
        };
    }
}
