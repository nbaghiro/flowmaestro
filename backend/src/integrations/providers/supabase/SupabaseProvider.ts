import { isApiKeyData } from "../../../storage/models/Connection";
import { BaseProvider } from "../../core/BaseProvider";
import { SupabaseClient } from "./client/SupabaseClient";
import {
    queryOperation,
    executeQuery,
    insertOperation,
    executeInsert,
    updateOperation,
    executeUpdate,
    deleteOperation,
    executeDelete,
    upsertOperation,
    executeUpsert,
    listTablesOperation,
    executeListTables,
    rpcOperation,
    executeRpc
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Supabase Provider - implements database operations via PostgREST HTTP API
 *
 * Auth: api_key (service_role key) + api_secret (project URL)
 */
export class SupabaseProvider extends BaseProvider {
    readonly name = "supabase";
    readonly displayName = "Supabase";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: undefined
    };

    private clientCache: Map<string, SupabaseClient> = new Map();

    constructor() {
        super();

        this.registerOperation(queryOperation);
        this.registerOperation(insertOperation);
        this.registerOperation(updateOperation);
        this.registerOperation(deleteOperation);
        this.registerOperation(upsertOperation);
        this.registerOperation(listTablesOperation);
        this.registerOperation(rpcOperation);
    }

    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "apikey",
            headerTemplate: "{{api_key}}"
        };
        return config;
    }

    async executeOperation(
        operation: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operation) {
            case "query":
                return executeQuery(client, this.validateParams(operation, params));
            case "insert":
                return executeInsert(client, this.validateParams(operation, params));
            case "update":
                return executeUpdate(client, this.validateParams(operation, params));
            case "delete":
                return executeDelete(client, this.validateParams(operation, params));
            case "upsert":
                return executeUpsert(client, this.validateParams(operation, params));
            case "listTables":
                return executeListTables(client, this.validateParams(operation, params));
            case "rpc":
                return executeRpc(client, this.validateParams(operation, params));
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

    getMCPTools(): MCPTool[] {
        return [];
    }

    async executeMCPTool(
        _toolName: string,
        _params: Record<string, unknown>,
        _connection: ConnectionWithData
    ): Promise<unknown> {
        throw new Error("MCP tools are not supported for database providers");
    }

    private createClient(connection: ConnectionWithData): SupabaseClient {
        if (!isApiKeyData(connection.data)) {
            throw new Error("Invalid connection data for Supabase - expected API key credentials");
        }

        const apiKeyData = connection.data as ApiKeyData;

        if (!apiKeyData.api_key) {
            throw new Error("Supabase service role key is required");
        }

        if (!apiKeyData.api_secret) {
            throw new Error("Supabase project URL is required");
        }

        return new SupabaseClient(apiKeyData.api_secret, apiKeyData.api_key);
    }

    private getOrCreateClient(connection: ConnectionWithData): SupabaseClient {
        const cacheKey = connection.id;

        if (this.clientCache.has(cacheKey)) {
            return this.clientCache.get(cacheKey)!;
        }

        const client = this.createClient(connection);
        this.clientCache.set(cacheKey, client);

        return client;
    }

    async cleanup(): Promise<void> {
        this.clientCache.clear();
    }
}
