import { Pool } from "pg";
import { isDatabaseConnectionData } from "../../../storage/models/Connection";
import { BaseProvider } from "../../core/BaseProvider";
import {
    queryOperation,
    executeQuery,
    insertOperation,
    executeInsert,
    updateOperation,
    executeUpdate,
    deleteOperation,
    executeDelete,
    listTablesOperation,
    executeListTables
} from "./operations";
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
 * PostgreSQL Provider - implements database operations via connection pooling
 */
export class PostgresqlProvider extends BaseProvider {
    readonly name = "postgresql";
    readonly displayName = "PostgreSQL";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: undefined // No rate limiting for databases
    };

    private poolCache: Map<string, Pool> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(queryOperation);
        this.registerOperation(insertOperation);
        this.registerOperation(updateOperation);
        this.registerOperation(deleteOperation);
        this.registerOperation(listTablesOperation);
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
        const pool = this.getOrCreatePool(connection);

        switch (operation) {
            case "query":
                return executeQuery(pool, this.validateParams(operation, params));
            case "insert":
                return executeInsert(pool, this.validateParams(operation, params));
            case "update":
                return executeUpdate(pool, this.validateParams(operation, params));
            case "delete":
                return executeDelete(pool, this.validateParams(operation, params));
            case "listTables":
                return executeListTables(pool, this.validateParams(operation, params));
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
     * Create a PostgreSQL connection pool
     */
    private createPool(connection: ConnectionWithData): Pool {
        if (!isDatabaseConnectionData(connection.data)) {
            throw new Error("Invalid connection data for PostgreSQL");
        }

        const dbData = connection.data as DatabaseConnectionData;

        // Option 1: Use connection string
        if (dbData.connection_string) {
            return new Pool({
                connectionString: dbData.connection_string,
                ssl: dbData.ssl_enabled ? { rejectUnauthorized: false } : undefined,
                max: dbData.max_connections || 10,
                connectionTimeoutMillis: dbData.connection_timeout || 10000
            });
        }

        // Option 2: Use individual credentials
        if (!dbData.host || !dbData.database || !dbData.username) {
            throw new Error(
                "PostgreSQL connection requires either connection_string or (host, database, username)"
            );
        }

        return new Pool({
            host: dbData.host,
            port: dbData.port || 5432,
            database: dbData.database,
            user: dbData.username,
            password: dbData.password,
            ssl: dbData.ssl_enabled ? { rejectUnauthorized: false } : undefined,
            max: dbData.max_connections || 10,
            connectionTimeoutMillis: dbData.connection_timeout || 10000
        });
    }

    /**
     * Get or create connection pool (with caching)
     */
    private getOrCreatePool(connection: ConnectionWithData): Pool {
        const cacheKey = connection.id;

        if (this.poolCache.has(cacheKey)) {
            return this.poolCache.get(cacheKey)!;
        }

        const pool = this.createPool(connection);
        this.poolCache.set(cacheKey, pool);

        return pool;
    }

    /**
     * Clean up connection pools
     */
    async cleanup(): Promise<void> {
        const promises = Array.from(this.poolCache.values()).map((pool) => pool.end());
        await Promise.all(promises);
        this.poolCache.clear();
    }
}
