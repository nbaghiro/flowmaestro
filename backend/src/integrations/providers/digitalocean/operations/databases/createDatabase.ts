import { z } from "zod";
import { RegionSlugSchema, SizeSlugSchema, DatabaseEngineSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Create Database operation schema
 */
export const createDatabaseSchema = z.object({
    name: z.string().min(3).max(63).describe("The name of the database cluster"),
    engine: DatabaseEngineSchema.describe("The database engine (pg, mysql, redis, mongodb, kafka)"),
    version: z.string().optional().describe("The version of the database engine"),
    region: RegionSlugSchema,
    size: SizeSlugSchema.describe("The slug of the database cluster size"),
    num_nodes: z.number().int().min(1).max(3).describe("Number of nodes in the cluster (1-3)"),
    tags: z.array(z.string()).optional().describe("Tags to apply to the database cluster"),
    private_network_uuid: z.string().uuid().optional().describe("VPC UUID for private networking")
});

export type CreateDatabaseParams = z.infer<typeof createDatabaseSchema>;

/**
 * Create Database operation definition
 */
export const createDatabaseOperation: OperationDefinition = {
    id: "databases_createDatabase",
    name: "Create Database",
    description: "Create a new managed database cluster",
    category: "databases",
    inputSchema: createDatabaseSchema,
    retryable: false,
    timeout: 120000
};

/**
 * Execute create database operation
 */
export async function executeCreateDatabase(
    client: DigitalOceanClient,
    params: CreateDatabaseParams
): Promise<OperationResult> {
    try {
        const db = await client.createDatabase(params);

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
                createdAt: db.created_at,
                message: "Database cluster creation initiated"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create database",
                retryable: false
            }
        };
    }
}
