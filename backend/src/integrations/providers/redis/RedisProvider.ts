import Redis from "ioredis";
import { isDatabaseConnectionData } from "../../../storage/models/Connection";
import { BaseProvider } from "../../core/BaseProvider";
import {
    getOperation,
    executeGet,
    setOperation,
    executeSet,
    deleteOperation,
    executeDelete,
    keysOperation,
    executeKeys,
    hashGetOperation,
    executeHashGet,
    hashSetOperation,
    executeHashSet,
    listPushOperation,
    executeListPush,
    listRangeOperation,
    executeListRange
} from "./operations";
import type { DeleteParams } from "./operations/delete";
import type { GetParams } from "./operations/get";
import type { HashGetParams } from "./operations/hashGet";
import type { HashSetParams } from "./operations/hashSet";
import type { KeysParams } from "./operations/keys";
import type { ListPushParams } from "./operations/listPush";
import type { ListRangeParams } from "./operations/listRange";
import type { SetParams } from "./operations/set";
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
 * Redis Provider - implements key-value and data structure operations via ioredis
 */
export class RedisProvider extends BaseProvider {
    readonly name = "redis";
    readonly displayName = "Redis";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: undefined
    };

    private clientCache: Map<string, Redis> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(getOperation);
        this.registerOperation(setOperation);
        this.registerOperation(deleteOperation);
        this.registerOperation(keysOperation);
        this.registerOperation(hashGetOperation);
        this.registerOperation(hashSetOperation);
        this.registerOperation(listPushOperation);
        this.registerOperation(listRangeOperation);
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
        const client = this.getOrCreateClient(connection);

        switch (operation) {
            case "get":
                return executeGet(client, this.validateParams<GetParams>(operation, params));
            case "set":
                return executeSet(client, this.validateParams<SetParams>(operation, params));
            case "delete":
                return executeDelete(client, this.validateParams<DeleteParams>(operation, params));
            case "keys":
                return executeKeys(client, this.validateParams<KeysParams>(operation, params));
            case "hashGet":
                return executeHashGet(
                    client,
                    this.validateParams<HashGetParams>(operation, params)
                );
            case "hashSet":
                return executeHashSet(
                    client,
                    this.validateParams<HashSetParams>(operation, params)
                );
            case "listPush":
                return executeListPush(
                    client,
                    this.validateParams<ListPushParams>(operation, params)
                );
            case "listRange":
                return executeListRange(
                    client,
                    this.validateParams<ListRangeParams>(operation, params)
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
     * Create a Redis client
     */
    private createRedisClient(connection: ConnectionWithData): Redis {
        if (!isDatabaseConnectionData(connection.data)) {
            throw new Error("Invalid connection data for Redis");
        }

        const dbData = connection.data as DatabaseConnectionData;

        // Option 1: Use connection string
        if (dbData.connection_string) {
            return new Redis(dbData.connection_string, {
                connectTimeout: dbData.connection_timeout || 10000,
                lazyConnect: true
            });
        }

        // Option 2: Use individual credentials
        if (!dbData.host) {
            throw new Error("Redis connection requires either connection_string or host");
        }

        return new Redis({
            host: dbData.host,
            port: dbData.port || 6379,
            db: dbData.database ? parseInt(dbData.database, 10) : 0,
            username: dbData.username,
            password: dbData.password,
            tls: dbData.ssl_enabled ? {} : undefined,
            connectTimeout: dbData.connection_timeout || 10000,
            lazyConnect: true
        });
    }

    /**
     * Get or create Redis client (with caching)
     */
    private getOrCreateClient(connection: ConnectionWithData): Redis {
        const cacheKey = connection.id;

        if (this.clientCache.has(cacheKey)) {
            return this.clientCache.get(cacheKey)!;
        }

        const client = this.createRedisClient(connection);
        this.clientCache.set(cacheKey, client);

        return client;
    }

    /**
     * Clean up Redis clients
     */
    async cleanup(): Promise<void> {
        const promises = Array.from(this.clientCache.values()).map((client) => client.quit());
        await Promise.all(promises);
        this.clientCache.clear();
    }
}
