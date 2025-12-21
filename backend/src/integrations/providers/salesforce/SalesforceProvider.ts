import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { SalesforceClient } from "./client/SalesforceClient";
import {
    // Query operations
    queryRecordsOperation,
    executeQueryRecords,
    // CRUD operations
    createRecordOperation,
    executeCreateRecord,
    getRecordOperation,
    executeGetRecord,
    updateRecordOperation,
    executeUpdateRecord,
    deleteRecordOperation,
    executeDeleteRecord,
    // Metadata operations
    describeObjectOperation,
    executeDescribeObject,
    listObjectsOperation,
    executeListObjects,
    // Search operations
    searchRecordsOperation,
    executeSearchRecords
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Salesforce Connection Metadata - includes instance URL
 */
interface SalesforceConnectionMetadata {
    instanceUrl: string;
    organizationId?: string;
    userId?: string;
    email?: string;
}

/**
 * Salesforce Provider - implements OAuth2 authentication with REST API operations
 *
 * ## Setup Instructions
 *
 * ### 1. Create a Connected App in Salesforce
 * 1. Go to Setup > App Manager > New Connected App
 * 2. Fill in basic information:
 *    - Connected App Name: FlowMaestro
 *    - API Name: FlowMaestro
 *    - Contact Email: your email
 * 3. Enable OAuth Settings:
 *    - Callback URL: {API_URL}/oauth/salesforce/callback
 *    - Selected OAuth Scopes:
 *      - Full access (full)
 *      - Perform requests at any time (refresh_token, offline_access)
 * 4. Save and wait ~10 minutes for changes to propagate
 * 5. Click "Manage Consumer Details" to get credentials
 *
 * ### 2. Environment Variables
 * ```
 * SALESFORCE_CLIENT_ID=your_consumer_key
 * SALESFORCE_CLIENT_SECRET=your_consumer_secret
 * ```
 *
 * ### 3. OAuth Scopes
 * Required scopes:
 * - `api` - Access to Salesforce REST API
 * - `refresh_token` - Offline access for token refresh
 * - `id` - Access to identity service (for instance URL)
 *
 * ### 4. Rate Limits
 * Salesforce API limits vary by edition:
 * - Developer Edition: 15,000 requests/day
 * - Enterprise Edition: 100,000 requests/day
 * - Unlimited Edition: 1,000,000 requests/day
 *
 * Per-user concurrent request limit: 25
 *
 * ### 5. Important Notes
 * - The instance URL (e.g., https://na123.salesforce.com) is obtained during
 *   OAuth and stored in connection metadata. It's required for all API calls.
 * - Salesforce IDs can be 15 or 18 characters
 * - Custom objects end with "__c" (e.g., MyObject__c)
 * - SOQL queries are case-insensitive for keywords but may be case-sensitive
 *   for field values depending on the field type
 */
export class SalesforceProvider extends BaseProvider {
    readonly name = "salesforce";
    readonly displayName = "Salesforce";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            // Conservative default, varies by edition
            tokensPerMinute: 1500 // ~25 requests/second
        }
    };

    private clientPool: Map<string, SalesforceClient> = new Map();

    constructor() {
        super();

        // Register query operations
        this.registerOperation(queryRecordsOperation);

        // Register CRUD operations
        this.registerOperation(createRecordOperation);
        this.registerOperation(getRecordOperation);
        this.registerOperation(updateRecordOperation);
        this.registerOperation(deleteRecordOperation);

        // Register metadata operations
        this.registerOperation(describeObjectOperation);
        this.registerOperation(listObjectsOperation);

        // Register search operations
        this.registerOperation(searchRecordsOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://login.salesforce.com/services/oauth2/authorize",
            tokenUrl: "https://login.salesforce.com/services/oauth2/token",
            scopes: ["api", "refresh_token", "id"],
            clientId: appConfig.oauth.salesforce.clientId,
            clientSecret: appConfig.oauth.salesforce.clientSecret,
            redirectUri: getOAuthRedirectUri("salesforce"),
            refreshable: true
        };

        return config;
    }

    /**
     * Execute operation via direct API
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        // Validate parameters
        const validatedParams = this.validateParams(operationId, params);

        // Get or create client
        const client = this.getOrCreateClient(connection);

        // Execute operation
        switch (operationId) {
            // Query operations
            case "queryRecords":
                return await executeQueryRecords(client, validatedParams as never);

            // CRUD operations
            case "createRecord":
                return await executeCreateRecord(client, validatedParams as never);
            case "getRecord":
                return await executeGetRecord(client, validatedParams as never);
            case "updateRecord":
                return await executeUpdateRecord(client, validatedParams as never);
            case "deleteRecord":
                return await executeDeleteRecord(client, validatedParams as never);

            // Metadata operations
            case "describeObject":
                return await executeDescribeObject(client, validatedParams as never);
            case "listObjects":
                return await executeListObjects(client, validatedParams as never);

            // Search operations
            case "searchRecords":
                return await executeSearchRecords(client, validatedParams as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get MCP tools
     */
    getMCPTools(): MCPTool[] {
        return this.getOperations().map((op) => ({
            name: `salesforce_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        // Remove salesforce_ prefix to get operation ID
        const operationId = toolName.replace("salesforce_", "");

        const result = await this.executeOperation(operationId, params, connection, {
            mode: "agent",
            conversationId: "unknown",
            toolCallId: "unknown"
        });

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create Salesforce client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): SalesforceClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Extract token data and metadata
        const data = connection.data as OAuth2TokenData;
        const metadata = connection.metadata as SalesforceConnectionMetadata;

        // Instance URL is required
        if (!metadata?.instanceUrl) {
            throw new Error(
                "Salesforce instance URL not found in connection metadata. " +
                    "This usually means the OAuth flow did not complete properly. " +
                    "Please reconnect your Salesforce account."
            );
        }

        // Create new client
        const client = new SalesforceClient({
            accessToken: data.access_token,
            instanceUrl: metadata.instanceUrl
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (e.g., when connection is deleted or token is refreshed)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
