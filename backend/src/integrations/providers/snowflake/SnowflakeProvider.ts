import snowflake from "snowflake-sdk";
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
import type { Connection } from "snowflake-sdk";

/**
 * Snowflake Provider - implements database operations via cached connections
 */
export class SnowflakeProvider extends BaseProvider {
    readonly name = "snowflake";
    readonly displayName = "Snowflake";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: undefined
    };

    private connectionCache: Map<string, Connection> = new Map();

    constructor() {
        super();

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
        const conn = await this.getOrCreateConnection(connection);

        switch (operation) {
            case "query":
                return executeQuery(conn, this.validateParams(operation, params));
            case "insert":
                return executeInsert(conn, this.validateParams(operation, params));
            case "update":
                return executeUpdate(conn, this.validateParams(operation, params));
            case "delete":
                return executeDelete(conn, this.validateParams(operation, params));
            case "listTables":
                return executeListTables(conn, this.validateParams(operation, params));
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
     * Create a Snowflake connection
     */
    private createSnowflakeConnection(connection: ConnectionWithData): Connection {
        if (!isDatabaseConnectionData(connection.data)) {
            throw new Error("Invalid connection data for Snowflake");
        }

        const dbData = connection.data as DatabaseConnectionData;
        const options = (dbData.options as Record<string, unknown>) || {};

        if (!options.account) {
            throw new Error(
                "Snowflake connection requires an account identifier in options.account"
            );
        }

        if (!dbData.username || !dbData.database) {
            throw new Error("Snowflake connection requires username and database");
        }

        return snowflake.createConnection({
            account: options.account as string,
            username: dbData.username,
            password: dbData.password || "",
            database: dbData.database,
            warehouse: (options.warehouse as string) || undefined,
            schema: (options.schema as string) || "PUBLIC",
            role: (options.role as string) || undefined,
            timeout: dbData.connection_timeout || 60000
        });
    }

    /**
     * Connect asynchronously (wraps callback-based API)
     */
    private connectAsync(conn: Connection): Promise<void> {
        return new Promise((resolve, reject) => {
            conn.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Get or create connection (with caching)
     */
    private async getOrCreateConnection(connection: ConnectionWithData): Promise<Connection> {
        const cacheKey = connection.id;

        if (this.connectionCache.has(cacheKey)) {
            return this.connectionCache.get(cacheKey)!;
        }

        const conn = this.createSnowflakeConnection(connection);
        await this.connectAsync(conn);
        this.connectionCache.set(cacheKey, conn);

        return conn;
    }

    /**
     * Clean up connections
     */
    async cleanup(): Promise<void> {
        const promises = Array.from(this.connectionCache.values()).map((conn) => {
            return new Promise<void>((resolve) => {
                conn.destroy((err) => {
                    // Resolve even on error to ensure all connections are cleaned up
                    if (err) {
                        // Silently ignore destroy errors during cleanup
                    }
                    resolve();
                });
            });
        });
        await Promise.all(promises);
        this.connectionCache.clear();
    }
}
