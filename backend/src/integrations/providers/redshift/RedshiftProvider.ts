import { isDatabaseConnectionData } from "../../../storage/models/Connection";
import { BaseProvider } from "../../core/BaseProvider";
import { RedshiftClient } from "./client/RedshiftClient";
import {
    queryOperation,
    executeQuery,
    listDatabasesOperation,
    executeListDatabases,
    listSchemasOperation,
    executeListSchemas,
    listTablesOperation,
    executeListTables,
    describeTableOperation,
    executeDescribeTable,
    insertOperation,
    executeInsert
} from "./operations";
import type { DescribeTableParams } from "./operations/describeTable";
import type { InsertParams } from "./operations/insert";
import type { ListDatabasesParams } from "./operations/listDatabases";
import type { ListSchemasParams } from "./operations/listSchemas";
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
 * Redshift Provider - implements SQL operations via AWS Redshift Data API
 */
export class RedshiftProvider extends BaseProvider {
    readonly name = "redshift";
    readonly displayName = "Amazon Redshift";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: undefined
    };

    private clientCache: Map<string, RedshiftClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(queryOperation);
        this.registerOperation(listDatabasesOperation);
        this.registerOperation(listSchemasOperation);
        this.registerOperation(listTablesOperation);
        this.registerOperation(describeTableOperation);
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
            case "listDatabases":
                return executeListDatabases(
                    client,
                    this.validateParams<ListDatabasesParams>(operation, params)
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
            case "describeTable":
                return executeDescribeTable(
                    client,
                    this.validateParams<DescribeTableParams>(operation, params)
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
     * Create a Redshift client
     */
    private createClient(connection: ConnectionWithData): RedshiftClient {
        if (!isDatabaseConnectionData(connection.data)) {
            throw new Error("Invalid connection data for Redshift");
        }

        const dbData = connection.data as DatabaseConnectionData;
        const options = dbData.options || {};

        const accessKeyId = options.accessKeyId as string;
        const secretAccessKey = options.secretAccessKey as string;
        const region = options.region as string;

        if (!accessKeyId || !secretAccessKey) {
            throw new Error("Redshift connection requires AWS access key ID and secret access key");
        }

        if (!region) {
            throw new Error("Redshift connection requires an AWS region");
        }

        if (!dbData.database) {
            throw new Error("Redshift connection requires a database name");
        }

        const clusterIdentifier = options.clusterIdentifier as string | undefined;
        const workgroupName = options.workgroupName as string | undefined;

        if (!clusterIdentifier && !workgroupName) {
            throw new Error(
                "Redshift connection requires either clusterIdentifier (provisioned) or workgroupName (serverless)"
            );
        }

        return new RedshiftClient({
            accessKeyId,
            secretAccessKey,
            region,
            database: dbData.database,
            dbUser: dbData.username,
            clusterIdentifier,
            workgroupName
        });
    }

    /**
     * Get or create Redshift client (with caching)
     */
    private getOrCreateClient(connection: ConnectionWithData): RedshiftClient {
        const cacheKey = connection.id;

        if (!this.clientCache.has(cacheKey)) {
            const client = this.createClient(connection);
            this.clientCache.set(cacheKey, client);
        }

        return this.clientCache.get(cacheKey)!;
    }

    /**
     * Clean up Redshift clients
     */
    async cleanup(): Promise<void> {
        const promises = Array.from(this.clientCache.values()).map((client) => client.close());
        await Promise.all(promises);
        this.clientCache.clear();
    }
}
