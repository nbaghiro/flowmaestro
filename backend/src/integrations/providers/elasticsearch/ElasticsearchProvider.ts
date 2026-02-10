import { isDatabaseConnectionData } from "../../../storage/models/Connection";
import { BaseProvider } from "../../core/BaseProvider";
import { ElasticsearchClient } from "./client/ElasticsearchClient";
import {
    searchOperation,
    executeSearch,
    getDocumentOperation,
    executeGetDocument,
    indexDocumentOperation,
    executeIndexDocument,
    updateDocumentOperation,
    executeUpdateDocument,
    deleteDocumentOperation,
    executeDeleteDocument,
    deleteByQueryOperation,
    executeDeleteByQuery,
    bulkOperation,
    executeBulk,
    createIndexOperation,
    executeCreateIndex,
    deleteIndexOperation,
    executeDeleteIndex,
    listIndicesOperation,
    executeListIndices
} from "./operations";
import type { BulkParams } from "./operations/bulk";
import type { CreateIndexParams } from "./operations/createIndex";
import type { DeleteByQueryParams } from "./operations/deleteByQuery";
import type { DeleteDocumentParams } from "./operations/deleteDocument";
import type { DeleteIndexParams } from "./operations/deleteIndex";
import type { GetDocumentParams } from "./operations/getDocument";
import type { IndexDocumentParams } from "./operations/indexDocument";
import type { ListIndicesParams } from "./operations/listIndices";
import type { SearchParams } from "./operations/search";
import type { UpdateDocumentParams } from "./operations/updateDocument";
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
 * Elasticsearch Provider - implements search and document operations via Elasticsearch REST API
 */
export class ElasticsearchProvider extends BaseProvider {
    readonly name = "elasticsearch";
    readonly displayName = "Elasticsearch";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: undefined
    };

    private clientCache: Map<string, ElasticsearchClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(searchOperation);
        this.registerOperation(getDocumentOperation);
        this.registerOperation(indexDocumentOperation);
        this.registerOperation(updateDocumentOperation);
        this.registerOperation(deleteDocumentOperation);
        this.registerOperation(deleteByQueryOperation);
        this.registerOperation(bulkOperation);
        this.registerOperation(createIndexOperation);
        this.registerOperation(deleteIndexOperation);
        this.registerOperation(listIndicesOperation);
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
            case "search":
                return executeSearch(client, this.validateParams<SearchParams>(operation, params));
            case "getDocument":
                return executeGetDocument(
                    client,
                    this.validateParams<GetDocumentParams>(operation, params)
                );
            case "indexDocument":
                return executeIndexDocument(
                    client,
                    this.validateParams<IndexDocumentParams>(operation, params)
                );
            case "updateDocument":
                return executeUpdateDocument(
                    client,
                    this.validateParams<UpdateDocumentParams>(operation, params)
                );
            case "deleteDocument":
                return executeDeleteDocument(
                    client,
                    this.validateParams<DeleteDocumentParams>(operation, params)
                );
            case "deleteByQuery":
                return executeDeleteByQuery(
                    client,
                    this.validateParams<DeleteByQueryParams>(operation, params)
                );
            case "bulk":
                return executeBulk(client, this.validateParams<BulkParams>(operation, params));
            case "createIndex":
                return executeCreateIndex(
                    client,
                    this.validateParams<CreateIndexParams>(operation, params)
                );
            case "deleteIndex":
                return executeDeleteIndex(
                    client,
                    this.validateParams<DeleteIndexParams>(operation, params)
                );
            case "listIndices":
                return executeListIndices(
                    client,
                    this.validateParams<ListIndicesParams>(operation, params)
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
     * Create an Elasticsearch client
     */
    private createClient(connection: ConnectionWithData): ElasticsearchClient {
        if (!isDatabaseConnectionData(connection.data)) {
            throw new Error("Invalid connection data for Elasticsearch");
        }

        const dbData = connection.data as DatabaseConnectionData;
        const options = dbData.options || {};

        // Check for Cloud ID first
        if (options.cloudId) {
            return new ElasticsearchClient({
                host: "",
                cloudId: options.cloudId as string,
                apiKey: options.apiKey as string | undefined,
                username: dbData.username,
                password: dbData.password,
                defaultIndex: options.defaultIndex as string | undefined
            });
        }

        // Otherwise require host
        if (!dbData.host) {
            throw new Error("Elasticsearch connection requires a host or Cloud ID");
        }

        return new ElasticsearchClient({
            host: dbData.host,
            port: dbData.port,
            username: dbData.username,
            password: dbData.password,
            apiKey: options.apiKey as string | undefined,
            sslEnabled: dbData.ssl_enabled,
            defaultIndex: options.defaultIndex as string | undefined
        });
    }

    /**
     * Get or create Elasticsearch client (with caching)
     */
    private getOrCreateClient(connection: ConnectionWithData): ElasticsearchClient {
        const cacheKey = connection.id;

        if (!this.clientCache.has(cacheKey)) {
            const client = this.createClient(connection);
            this.clientCache.set(cacheKey, client);
        }

        return this.clientCache.get(cacheKey)!;
    }

    /**
     * Clean up Elasticsearch clients
     */
    async cleanup(): Promise<void> {
        const promises = Array.from(this.clientCache.values()).map((client) => client.close());
        await Promise.all(promises);
        this.clientCache.clear();
    }
}
