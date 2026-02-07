import { isDatabaseConnectionData } from "../../../storage/models/Connection";
import { BaseProvider } from "../../core/BaseProvider";
import { DatabricksClient } from "./client/DatabricksClient";
import {
    queryOperation,
    executeQuery,
    insertOperation,
    executeInsert,
    updateOperation,
    executeUpdate,
    deleteOperation,
    executeDelete,
    listCatalogsOperation,
    executeListCatalogs,
    listSchemasOperation,
    executeListSchemas,
    listTablesOperation,
    executeListTables
} from "./operations";
import type { DeleteParams } from "./operations/delete";
import type { InsertParams } from "./operations/insert";
import type { ListCatalogsParams } from "./operations/listCatalogs";
import type { ListSchemasParams } from "./operations/listSchemas";
import type { ListTablesParams } from "./operations/listTables";
import type { QueryParams } from "./operations/query";
import type { UpdateParams } from "./operations/update";
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
 * Databricks Provider - implements SQL operations via Databricks SQL Statement Execution API
 */
export class DatabricksProvider extends BaseProvider {
    readonly name = "databricks";
    readonly displayName = "Databricks";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: undefined
    };

    private clientCache: Map<string, DatabricksClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(queryOperation);
        this.registerOperation(insertOperation);
        this.registerOperation(updateOperation);
        this.registerOperation(deleteOperation);
        this.registerOperation(listCatalogsOperation);
        this.registerOperation(listSchemasOperation);
        this.registerOperation(listTablesOperation);
    }

    /**
     * Get auth configuration
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
            case "query":
                return executeQuery(client, this.validateParams<QueryParams>(operation, params));
            case "insert":
                return executeInsert(client, this.validateParams<InsertParams>(operation, params));
            case "update":
                return executeUpdate(client, this.validateParams<UpdateParams>(operation, params));
            case "delete":
                return executeDelete(client, this.validateParams<DeleteParams>(operation, params));
            case "listCatalogs":
                return executeListCatalogs(
                    client,
                    this.validateParams<ListCatalogsParams>(operation, params)
                );
            case "listSchemas":
                return executeListSchemas(
                    client,
                    this.validateParams<ListSchemasParams>(operation, params)
                );
            case "listTables":
                return executeListTables(
                    client,
                    this.validateParams<ListTablesParams>(operation, params)
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
     * Create a Databricks client
     */
    private createClient(connection: ConnectionWithData): DatabricksClient {
        if (!isDatabaseConnectionData(connection.data)) {
            throw new Error("Invalid connection data for Databricks");
        }

        const dbData = connection.data as DatabaseConnectionData;

        if (!dbData.host) {
            throw new Error("Databricks connection requires a host (workspace URL)");
        }

        const options = dbData.options || {};
        const accessToken = options.accessToken as string;
        const warehouseId = options.warehouseId as string;

        if (!accessToken) {
            throw new Error("Databricks connection requires an access token");
        }

        if (!warehouseId) {
            throw new Error("Databricks connection requires a SQL Warehouse ID");
        }

        return new DatabricksClient({
            host: dbData.host,
            accessToken,
            warehouseId,
            catalog: (options.catalog as string) || "main",
            schema: (options.schema as string) || "default"
        });
    }

    /**
     * Get or create Databricks client (with caching)
     */
    private getOrCreateClient(connection: ConnectionWithData): DatabricksClient {
        const cacheKey = connection.id;

        if (!this.clientCache.has(cacheKey)) {
            const client = this.createClient(connection);
            this.clientCache.set(cacheKey, client);
        }

        return this.clientCache.get(cacheKey)!;
    }

    /**
     * Clean up Databricks clients
     */
    async cleanup(): Promise<void> {
        const promises = Array.from(this.clientCache.values()).map((client) => client.close());
        await Promise.all(promises);
        this.clientCache.clear();
    }
}
