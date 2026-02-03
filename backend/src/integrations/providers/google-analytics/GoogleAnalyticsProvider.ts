import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { GoogleAnalyticsClient } from "./client/GoogleAnalyticsClient";
import {
    listPropertiesOperation,
    executeListProperties,
    runReportOperation,
    executeRunReport,
    batchRunReportsOperation,
    executeBatchRunReports,
    runRealtimeReportOperation,
    executeRunRealtimeReport,
    getMetadataOperation,
    executeGetMetadata
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    WebhookRequestData
} from "../../core/types";

/**
 * Google Analytics Provider - implements OAuth2 authentication with GA4 Data API
 *
 * ## Setup Instructions
 *
 * ### 1. Create Google Cloud Project
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable Google Analytics Data API:
 *    - Go to "APIs & Services" > "Library"
 *    - Search for "Google Analytics Data API"
 *    - Click "Enable"
 * 4. Enable Google Analytics Admin API:
 *    - Search for "Google Analytics Admin API"
 *    - Click "Enable"
 *
 * ### 2. OAuth 2.0 Credentials
 * Uses the shared Google OAuth client (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)
 * which should already be configured with appropriate redirect URIs.
 *
 * ### 3. OAuth Scopes
 * Required scope:
 * - `https://www.googleapis.com/auth/analytics.readonly` - Read analytics data
 *
 * ### 4. Rate Limits
 * - Google Analytics API has quota limits per project
 * - Default: 60 requests per minute
 * - Monitor usage in Google Cloud Console
 */
export class GoogleAnalyticsProvider extends BaseProvider {
    readonly name = "google-analytics";
    readonly displayName = "Google Analytics";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        supportsPolling: true,
        rateLimit: {
            tokensPerMinute: 60
        }
    };

    private clientPool: Map<string, GoogleAnalyticsClient> = new Map();

    constructor() {
        super();

        // Register property operations
        this.registerOperation(listPropertiesOperation);

        // Register report operations
        this.registerOperation(runReportOperation);
        this.registerOperation(batchRunReportsOperation);
        this.registerOperation(runRealtimeReportOperation);

        // Register metadata operations
        this.registerOperation(getMetadataOperation);

        // Configure webhook settings (polling-based, no webhooks support)
        this.setWebhookConfig({
            setupType: "polling",
            signatureType: "none"
        });
    }

    /**
     * Extract event type from webhook (not used)
     */
    override extractEventType(_request: WebhookRequestData): string | undefined {
        return undefined;
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
            clientId: appConfig.oauth.google.clientId,
            clientSecret: appConfig.oauth.google.clientSecret,
            redirectUri: getOAuthRedirectUri("google"),
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
            case "listProperties":
                return await executeListProperties(client, validatedParams as never);
            case "runReport":
                return await executeRunReport(client, validatedParams as never);
            case "batchRunReports":
                return await executeBatchRunReports(client, validatedParams as never);
            case "runRealtimeReport":
                return await executeRunRealtimeReport(client, validatedParams as never);
            case "getMetadata":
                return await executeGetMetadata(client, validatedParams as never);

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
            name: `google_analytics_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema)
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
        const operationId = toolName.replace("google_analytics_", "");

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
     * Get or create Google Analytics client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GoogleAnalyticsClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;
        const client = new GoogleAnalyticsClient({
            accessToken: data.access_token
        });

        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
