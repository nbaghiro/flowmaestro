import { isDatabaseConnectionData } from "../../../storage/models/Connection";
import { BaseProvider } from "../../core/BaseProvider";
import { BigQueryClient } from "./client/BigQueryClient";
import {
    queryOperation,
    executeQuery,
    listDatasetsOperation,
    executeListDatasets,
    listTablesOperation,
    executeListTables,
    getTableSchemaOperation,
    executeGetTableSchema,
    insertOperation,
    executeInsert
} from "./operations";
import type { GetTableSchemaParams } from "./operations/getTableSchema";
import type { InsertParams } from "./operations/insert";
import type { ListDatasetsParams } from "./operations/listDatasets";
import type { ListTablesParams } from "./operations/listTables";
import type { QueryParams } from "./operations/query";
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
 * BigQuery Provider - implements SQL operations via Google BigQuery API
 */
export class BigQueryProvider extends BaseProvider {
    readonly name = "bigquery";
    readonly displayName = "BigQuery";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: undefined
    };

    private clientCache: Map<string, BigQueryClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(queryOperation);
        this.registerOperation(listDatasetsOperation);
        this.registerOperation(listTablesOperation);
        this.registerOperation(getTableSchemaOperation);
        this.registerOperation(insertOperation);
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
            case "listDatasets":
                return executeListDatasets(
                    client,
                    this.validateParams<ListDatasetsParams>(operation, params)
                );
            case "listTables":
                return executeListTables(
                    client,
                    this.validateParams<ListTablesParams>(operation, params)
                );
            case "getTableSchema":
                return executeGetTableSchema(
                    client,
                    this.validateParams<GetTableSchemaParams>(operation, params)
                );
            case "insert":
                return executeInsert(client, this.validateParams<InsertParams>(operation, params));
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
     * Create a BigQuery client
     */
    private createClient(connection: ConnectionWithData): BigQueryClient {
        if (!isDatabaseConnectionData(connection.data)) {
            throw new Error("Invalid connection data for BigQuery");
        }

        const dbData = connection.data as DatabaseConnectionData;
        const options = dbData.options || {};

        // Project ID can be in database field or options
        const projectId = (options.projectId as string) || dbData.database;
        if (!projectId) {
            throw new Error("BigQuery connection requires a project ID");
        }

        const serviceAccountKey = options.serviceAccountKey as string;
        if (!serviceAccountKey) {
            throw new Error("BigQuery connection requires a service account key");
        }

        return new BigQueryClient({
            projectId,
            serviceAccountKey,
            location: (options.location as string) || "US",
            defaultDataset: options.defaultDataset as string | undefined
        });
    }

    /**
     * Get or create BigQuery client (with caching)
     */
    private getOrCreateClient(connection: ConnectionWithData): BigQueryClient {
        const cacheKey = connection.id;

        if (!this.clientCache.has(cacheKey)) {
            const client = this.createClient(connection);
            this.clientCache.set(cacheKey, client);
        }

        return this.clientCache.get(cacheKey)!;
    }

    /**
     * Clean up BigQuery clients
     */
    async cleanup(): Promise<void> {
        const promises = Array.from(this.clientCache.values()).map((client) => client.close());
        await Promise.all(promises);
        this.clientCache.clear();
    }
}
