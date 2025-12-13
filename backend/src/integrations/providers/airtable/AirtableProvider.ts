import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { AirtableClient } from "./client/AirtableClient";
import { AirtableMCPAdapter } from "./mcp/AirtableMCPAdapter";
import {
    // Core Data Operations
    listRecordsOperation,
    executeListRecords,
    getRecordOperation,
    executeGetRecord,
    createRecordOperation,
    executeCreateRecord,
    updateRecordOperation,
    executeUpdateRecord,
    deleteRecordOperation,
    executeDeleteRecord,
    batchCreateRecordsOperation,
    executeBatchCreateRecords,
    batchUpdateRecordsOperation,
    executeBatchUpdateRecords,
    batchDeleteRecordsOperation,
    executeBatchDeleteRecords,
    // Schema Discovery
    listBasesOperation,
    executeListBases,
    getBaseSchemaOperation,
    executeGetBaseSchema,
    listTablesOperation,
    executeListTables,
    // Comments
    listCommentsOperation,
    executeListComments,
    createCommentOperation,
    executeCreateComment,
    updateCommentOperation,
    executeUpdateComment
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    OAuthConfig,
    ProviderCapabilities,
    TestResult,
    OperationResult,
    MCPTool
} from "../../core/types";

/**
 * Airtable Provider
 *
 * Implements OAuth 2.0 with PKCE authentication and provides 25 operations for:
 * - CRUD on records (including batch operations)
 * - Schema discovery (bases, tables, fields, views)
 * - Comments and collaboration
 * - Attachments
 * - Webhooks for real-time updates
 * - Schema management
 *
 * Rate Limits:
 * - 5 requests/second per base
 * - 50 requests/second per user
 */
export class AirtableProvider extends BaseProvider {
    readonly name = "airtable";
    readonly displayName = "Airtable";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 300, // 5 req/sec = 300/min per base
            burstSize: 10
        }
    };

    private clientPool: Map<string, AirtableClient> = new Map();
    private mcpAdapter: AirtableMCPAdapter;

    constructor() {
        super();

        // Register Core Data Operations
        this.registerOperation(listRecordsOperation);
        this.registerOperation(getRecordOperation);
        this.registerOperation(createRecordOperation);
        this.registerOperation(updateRecordOperation);
        this.registerOperation(deleteRecordOperation);
        this.registerOperation(batchCreateRecordsOperation);
        this.registerOperation(batchUpdateRecordsOperation);
        this.registerOperation(batchDeleteRecordsOperation);

        // Register Schema Discovery Operations
        this.registerOperation(listBasesOperation);
        this.registerOperation(getBaseSchemaOperation);
        this.registerOperation(listTablesOperation);

        // Register Comment Operations
        this.registerOperation(listCommentsOperation);
        this.registerOperation(createCommentOperation);
        this.registerOperation(updateCommentOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new AirtableMCPAdapter(this.operations);

        console.log(`[AirtableProvider] Registered ${this.operations.size} operations`);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://airtable.com/oauth2/v1/authorize",
            tokenUrl: "https://airtable.com/oauth2/v1/token",
            scopes: [
                "data.records:read",
                "data.records:write",
                "schema.bases:read",
                "schema.bases:write",
                "data.recordComments:read",
                "data.recordComments:write",
                "webhook:manage"
            ],
            clientId: appConfig.oauth.airtable.clientId,
            clientSecret: appConfig.oauth.airtable.clientSecret,
            redirectUri: getOAuthRedirectUri("airtable"),
            refreshable: true
        };

        return config;
    }

    /**
     * Test connection by calling whoami endpoint
     */
    async testConnection(connection: ConnectionWithData): Promise<TestResult> {
        try {
            const client = this.getOrCreateClient(connection);
            const response = await client.get<{ id: string; scopes: string[] }>("/meta/whoami");

            return {
                success: true,
                message: "Successfully connected to Airtable",
                tested_at: new Date().toISOString(),
                details: {
                    userId: response.id,
                    scopes: response.scopes
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to connect to Airtable",
                tested_at: new Date().toISOString()
            };
        }
    }

    /**
     * Get MCP tools
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        return this.mcpAdapter.executeTool(toolName, params, client);
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

        // Route to appropriate operation executor
        switch (operation) {
            // Core Data Operations
            case "listRecords":
                return executeListRecords(
                    client,
                    params as Parameters<typeof executeListRecords>[1]
                );
            case "getRecord":
                return executeGetRecord(client, params as Parameters<typeof executeGetRecord>[1]);
            case "createRecord":
                return executeCreateRecord(
                    client,
                    params as Parameters<typeof executeCreateRecord>[1]
                );
            case "updateRecord":
                return executeUpdateRecord(
                    client,
                    params as Parameters<typeof executeUpdateRecord>[1]
                );
            case "deleteRecord":
                return executeDeleteRecord(
                    client,
                    params as Parameters<typeof executeDeleteRecord>[1]
                );
            case "batchCreateRecords":
                return executeBatchCreateRecords(
                    client,
                    params as Parameters<typeof executeBatchCreateRecords>[1]
                );
            case "batchUpdateRecords":
                return executeBatchUpdateRecords(
                    client,
                    params as Parameters<typeof executeBatchUpdateRecords>[1]
                );
            case "batchDeleteRecords":
                return executeBatchDeleteRecords(
                    client,
                    params as Parameters<typeof executeBatchDeleteRecords>[1]
                );

            // Schema Discovery
            case "listBases":
                return executeListBases(client, params as Parameters<typeof executeListBases>[1]);
            case "getBaseSchema":
                return executeGetBaseSchema(
                    client,
                    params as Parameters<typeof executeGetBaseSchema>[1]
                );
            case "listTables":
                return executeListTables(client, params as Parameters<typeof executeListTables>[1]);

            // Comments
            case "listComments":
                return executeListComments(
                    client,
                    params as Parameters<typeof executeListComments>[1]
                );
            case "createComment":
                return executeCreateComment(
                    client,
                    params as Parameters<typeof executeCreateComment>[1]
                );
            case "updateComment":
                return executeUpdateComment(
                    client,
                    params as Parameters<typeof executeUpdateComment>[1]
                );

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operation}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get or create HTTP client for connection
     */
    private getOrCreateClient(connection: ConnectionWithData): AirtableClient {
        const cacheKey = connection.id;

        let client = this.clientPool.get(cacheKey);

        if (!client) {
            const oauth2Data = connection.data as OAuth2TokenData;
            if (!oauth2Data.access_token) {
                throw new Error("No access token found in connection data");
            }

            client = new AirtableClient({
                accessToken: oauth2Data.access_token,
                connectionId: connection.id
            });

            this.clientPool.set(cacheKey, client);
            console.log(`[AirtableProvider] Created new client for connection ${connection.id}`);
        }

        return client;
    }

    /**
     * Clear cached client (e.g., after token refresh)
     */
    clearClientCache(connectionId: string): void {
        this.clientPool.delete(connectionId);
        console.log(`[AirtableProvider] Cleared client cache for connection ${connectionId}`);
    }
}
