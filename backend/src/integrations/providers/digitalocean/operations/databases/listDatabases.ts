import { z } from "zod";
import { PaginationSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * List Databases operation schema
 */
export const listDatabasesSchema = PaginationSchema.extend({
    tag_name: z.string().optional().describe("Filter by tag name")
});

export type ListDatabasesParams = z.infer<typeof listDatabasesSchema>;

/**
 * List Databases operation definition
 */
export const listDatabasesOperation: OperationDefinition = {
    id: "databases_listDatabases",
    name: "List Databases",
    description: "List all managed database clusters in the account",
    category: "databases",
    inputSchema: listDatabasesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list databases operation
 */
export async function executeListDatabases(
    client: DigitalOceanClient,
    params: ListDatabasesParams
): Promise<OperationResult> {
    try {
        const response = await client.listDatabases(params);

        return {
            success: true,
            data: {
                databases: response.databases.map((db) => ({
                    id: db.id,
                    name: db.name,
                    engine: db.engine,
                    version: db.version,
                    numNodes: db.num_nodes,
                    size: db.size,
                    region: db.region,
                    status: db.status,
                    dbNames: db.db_names,
                    tags: db.tags,
                    createdAt: db.created_at
                })),
                meta: response.meta,
                links: response.links
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list databases",
                retryable: true
            }
        };
    }
}
