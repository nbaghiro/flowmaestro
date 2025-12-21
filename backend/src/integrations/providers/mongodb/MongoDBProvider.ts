import { MongoClient, Db } from "mongodb";
import { isDatabaseConnectionData } from "../../../storage/models/Connection";
import { BaseProvider } from "../../core/BaseProvider";
import {
    findOperation,
    executeFind,
    insertOneOperation,
    executeInsertOne,
    insertManyOperation,
    executeInsertMany,
    updateOneOperation,
    executeUpdateOne,
    updateManyOperation,
    executeUpdateMany,
    deleteOneOperation,
    executeDeleteOne,
    deleteManyOperation,
    executeDeleteMany,
    listCollectionsOperation,
    executeListCollections,
    aggregateOperation,
    executeAggregate
} from "./operations";
import type { AggregateParams } from "./operations/aggregate";
import type { DeleteManyParams } from "./operations/deleteMany";
import type { DeleteOneParams } from "./operations/deleteOne";
import type { FindParams } from "./operations/find";
import type { InsertManyParams } from "./operations/insertMany";
import type { InsertOneParams } from "./operations/insertOne";
import type { ListCollectionsParams } from "./operations/listCollections";
import type { UpdateManyParams } from "./operations/updateMany";
import type { UpdateOneParams } from "./operations/updateOne";
import type {
    ConnectionWithData,
    DatabaseConnectionData
} from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * MongoDB Provider - implements database operations via MongoClient
 */
export class MongoDBProvider extends BaseProvider {
    readonly name = "mongodb";
    readonly displayName = "MongoDB";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: undefined // No rate limiting for databases
    };

    private clientCache: Map<string, MongoClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(findOperation);
        this.registerOperation(insertOneOperation);
        this.registerOperation(insertManyOperation);
        this.registerOperation(updateOneOperation);
        this.registerOperation(updateManyOperation);
        this.registerOperation(deleteOneOperation);
        this.registerOperation(deleteManyOperation);
        this.registerOperation(listCollectionsOperation);
        this.registerOperation(aggregateOperation);
    }

    /**
     * Get auth configuration
     * Note: Database connections don't use HTTP headers, but we need to return
     * an AuthConfig to satisfy the interface. The actual connection configuration
     * is handled through DatabaseConnectionData.
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "X-Database-Connection",
            headerTemplate: "{{connection_id}}"
        };
        return config;
    }

    /**
     * Execute operation
     */
    async executeOperation(
        operation: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const { db } = await this.getOrCreateClient(connection);

        switch (operation) {
            case "find":
                return executeFind(db, this.validateParams<FindParams>(operation, params));
            case "insertOne":
                return executeInsertOne(
                    db,
                    this.validateParams<InsertOneParams>(operation, params)
                );
            case "insertMany":
                return executeInsertMany(
                    db,
                    this.validateParams<InsertManyParams>(operation, params)
                );
            case "updateOne":
                return executeUpdateOne(
                    db,
                    this.validateParams<UpdateOneParams>(operation, params)
                );
            case "updateMany":
                return executeUpdateMany(
                    db,
                    this.validateParams<UpdateManyParams>(operation, params)
                );
            case "deleteOne":
                return executeDeleteOne(
                    db,
                    this.validateParams<DeleteOneParams>(operation, params)
                );
            case "deleteMany":
                return executeDeleteMany(
                    db,
                    this.validateParams<DeleteManyParams>(operation, params)
                );
            case "listCollections":
                return executeListCollections(
                    db,
                    this.validateParams<ListCollectionsParams>(operation, params)
                );
            case "aggregate":
                return executeAggregate(
                    db,
                    this.validateParams<AggregateParams>(operation, params)
                );
            default:
                return {
                    success: false,
                    error: {
                        type: "server_error",
                        message: `Unknown operation: ${operation}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get MCP tools (not supported for databases)
     */
    getMCPTools(): MCPTool[] {
        return [];
    }

    /**
     * Execute MCP tool (not supported for databases)
     */
    async executeMCPTool(
        _toolName: string,
        _params: Record<string, unknown>,
        _connection: ConnectionWithData
    ): Promise<unknown> {
        throw new Error("MCP tools are not supported for database providers");
    }

    /**
     * Create a MongoDB client
     */
    private async createClient(connection: ConnectionWithData): Promise<MongoClient> {
        if (!isDatabaseConnectionData(connection.data)) {
            throw new Error("Invalid connection data for MongoDB");
        }

        const dbData = connection.data as DatabaseConnectionData;

        let uri: string;

        // Option 1: Use connection string
        if (dbData.connection_string) {
            uri = dbData.connection_string;
        } else {
            // Option 2: Build URI from individual credentials
            if (!dbData.host || !dbData.database) {
                throw new Error(
                    "MongoDB connection requires either connection_string or (host, database)"
                );
            }

            const auth =
                dbData.username && dbData.password
                    ? `${encodeURIComponent(dbData.username)}:${encodeURIComponent(dbData.password)}@`
                    : "";

            const port = dbData.port || 27017;
            const authSource = dbData.database; // Use database as authSource by default

            uri = `mongodb://${auth}${dbData.host}:${port}/${dbData.database}?authSource=${authSource}`;
        }

        // Build connection options
        const options: Parameters<typeof MongoClient.connect>[1] = {
            maxPoolSize: dbData.max_connections || 10,
            serverSelectionTimeoutMS: dbData.connection_timeout || 10000
        };

        // Add SSL options if enabled
        if (dbData.ssl_enabled) {
            options.tls = true;
            options.tlsAllowInvalidCertificates = true; // For self-signed certs
        }

        return MongoClient.connect(uri, options);
    }

    /**
     * Get or create MongoDB client (with caching)
     */
    private async getOrCreateClient(
        connection: ConnectionWithData
    ): Promise<{ client: MongoClient; db: Db }> {
        const cacheKey = connection.id;

        if (!this.clientCache.has(cacheKey)) {
            const client = await this.createClient(connection);
            this.clientCache.set(cacheKey, client);
        }

        const client = this.clientCache.get(cacheKey)!;
        const dbData = connection.data as DatabaseConnectionData;

        return {
            client,
            db: client.db(dbData.database)
        };
    }

    /**
     * Clean up MongoDB clients
     */
    async cleanup(): Promise<void> {
        const promises = Array.from(this.clientCache.values()).map((client) => client.close());
        await Promise.all(promises);
        this.clientCache.clear();
    }
}
