import crypto from "crypto";
import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { getLogger } from "../../../core/logging";
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
    OperationResult,
    MCPTool,
    WebhookRequestData,
    WebhookVerificationResult
} from "../../core/types";

const logger = getLogger();

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

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "automatic", // Airtable webhooks are registered via API
            signatureType: "hmac_sha256",
            signatureHeader: "X-Airtable-Content-MAC"
        });

        // Register trigger events
        this.registerTrigger({
            id: "record_created",
            name: "Record Created",
            description: "Triggered when a new record is created in a table",
            requiredScopes: ["data.records:read", "webhook:manage"],
            configFields: [
                {
                    name: "baseId",
                    label: "Base",
                    type: "select",
                    required: true,
                    description: "Select the base to monitor",
                    dynamicOptions: {
                        operation: "listBases",
                        labelField: "name",
                        valueField: "id"
                    }
                },
                {
                    name: "tableId",
                    label: "Table",
                    type: "select",
                    required: true,
                    description: "Select the table to monitor",
                    dynamicOptions: {
                        operation: "listTables",
                        labelField: "name",
                        valueField: "id"
                    }
                }
            ],
            tags: ["records", "data"]
        });

        this.registerTrigger({
            id: "record_updated",
            name: "Record Updated",
            description: "Triggered when an existing record is updated",
            requiredScopes: ["data.records:read", "webhook:manage"],
            configFields: [
                {
                    name: "baseId",
                    label: "Base",
                    type: "select",
                    required: true,
                    description: "Select the base to monitor",
                    dynamicOptions: {
                        operation: "listBases",
                        labelField: "name",
                        valueField: "id"
                    }
                },
                {
                    name: "tableId",
                    label: "Table",
                    type: "select",
                    required: true,
                    description: "Select the table to monitor",
                    dynamicOptions: {
                        operation: "listTables",
                        labelField: "name",
                        valueField: "id"
                    }
                },
                {
                    name: "fields",
                    label: "Fields to Watch",
                    type: "multiselect",
                    required: false,
                    description: "Specific fields to monitor (leave empty for all)"
                }
            ],
            tags: ["records", "data"]
        });

        this.registerTrigger({
            id: "record_deleted",
            name: "Record Deleted",
            description: "Triggered when a record is deleted from a table",
            requiredScopes: ["data.records:read", "webhook:manage"],
            configFields: [
                {
                    name: "baseId",
                    label: "Base",
                    type: "select",
                    required: true,
                    description: "Select the base to monitor",
                    dynamicOptions: {
                        operation: "listBases",
                        labelField: "name",
                        valueField: "id"
                    }
                },
                {
                    name: "tableId",
                    label: "Table",
                    type: "select",
                    required: true,
                    description: "Select the table to monitor",
                    dynamicOptions: {
                        operation: "listTables",
                        labelField: "name",
                        valueField: "id"
                    }
                }
            ],
            tags: ["records", "data"]
        });

        logger.info(
            { component: "AirtableProvider", operationCount: this.operations.size },
            "Registered operations"
        );
    }

    /**
     * Airtable-specific HMAC-SHA256 verification
     * Uses base64 encoding instead of hex
     */
    protected override verifyHmacSha256(
        signature: string,
        body: string,
        secret: string
    ): WebhookVerificationResult {
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(body, "utf-8");
        const computed = hmac.digest("base64");

        return {
            valid: this.timingSafeEqual(signature, computed)
        };
    }

    /**
     * Extract event type from Airtable webhook
     */
    override extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

            // Airtable includes actionMetadata with event type
            if (body.webhook?.changedTablesById) {
                // Determine event type from payload structure
                const tableChanges = Object.values(body.webhook.changedTablesById)[0] as {
                    createdRecordsById?: Record<string, unknown>;
                    changedRecordsById?: Record<string, unknown>;
                    destroyedRecordIds?: string[];
                };

                if (tableChanges?.createdRecordsById) {
                    return "record_created";
                }
                if (tableChanges?.changedRecordsById) {
                    return "record_updated";
                }
                if (tableChanges?.destroyedRecordIds) {
                    return "record_deleted";
                }
            }

            return undefined;
        } catch {
            return undefined;
        }
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
            logger.info(
                { component: "AirtableProvider", connectionId: connection.id },
                "Created new client for connection"
            );
        }

        return client;
    }

    /**
     * Clear cached client (e.g., after token refresh)
     */
    clearClientCache(connectionId: string): void {
        this.clientPool.delete(connectionId);
        logger.info(
            { component: "AirtableProvider", connectionId },
            "Cleared client cache for connection"
        );
    }
}
