import { z } from "zod";
import { DatabaseIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Get Database operation schema
 */
export const getDatabaseSchema = z.object({
    databaseId: DatabaseIdSchema
});

export type GetDatabaseParams = z.infer<typeof getDatabaseSchema>;

/**
 * Get Database operation definition
 */
export const getDatabaseOperation: OperationDefinition = {
    id: "databases_getDatabase",
    name: "Get Database",
    description: "Get details for a specific managed database cluster",
    category: "databases",
    inputSchema: getDatabaseSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get database operation
 */
export async function executeGetDatabase(
    client: DigitalOceanClient,
    params: GetDatabaseParams
): Promise<OperationResult> {
    try {
        const db = await client.getDatabase(params.databaseId);

        return {
            success: true,
            data: {
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
                privateNetworkUuid: db.private_network_uuid,
                connection: {
                    protocol: db.connection.protocol,
                    host: db.connection.host,
                    port: db.connection.port,
                    database: db.connection.database,
                    user: db.connection.user,
                    ssl: db.connection.ssl
                },
                privateConnection: {
                    protocol: db.private_connection.protocol,
                    host: db.private_connection.host,
                    port: db.private_connection.port,
                    database: db.private_connection.database,
                    user: db.private_connection.user,
                    ssl: db.private_connection.ssl
                },
                maintenanceWindow: db.maintenance_window,
                createdAt: db.created_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get database",
                retryable: true
            }
        };
    }
}
