import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { GoogleFormsClient } from "./client/GoogleFormsClient";
import {
    // Form operations
    getFormOperation,
    executeGetForm,
    createFormOperation,
    executeCreateForm,
    updateFormOperation,
    executeUpdateForm,
    // Response operations
    listResponsesOperation,
    executeListResponses,
    getResponseOperation,
    executeGetResponse
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
 * Google Forms Provider - implements OAuth2 authentication with REST API operations
 *
 * ## Setup Instructions
 *
 * Uses the shared Google OAuth client - no additional secrets needed.
 * Ensure Google Forms API is enabled in your Google Cloud project.
 *
 * ### Enable Google Forms API
 * 1. Go to https://console.cloud.google.com/
 * 2. Select your project
 * 3. Go to "APIs & Services" > "Library"
 * 4. Search for "Google Forms API"
 * 5. Click "Enable"
 *
 * ### OAuth Scopes
 * Required scope for this provider:
 * - `https://www.googleapis.com/auth/forms.body` - Full read/write access to forms
 *
 * For read-only access, use:
 * - `https://www.googleapis.com/auth/forms.body.readonly` - Read-only access to forms
 *
 * For responses, use:
 * - `https://www.googleapis.com/auth/forms.responses.readonly` - Read-only access to responses
 *
 * ### Rate Limits
 * - Google Forms API has quota limits per project
 * - Default: 60 requests per minute per user
 * - Monitor usage in Google Cloud Console
 *
 * ### Testing Connection
 * After setup, test the connection by:
 * 1. Creating a connection in FlowMaestro
 * 2. Authorizing via OAuth flow
 * 3. Running "Test Connection" to verify access
 */
export class GoogleFormsProvider extends BaseProvider {
    readonly name = "google-forms";
    readonly displayName = "Google Forms";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true, // Polling-based triggers
        supportsPolling: true,
        rateLimit: {
            tokensPerMinute: 60 // 60 requests per minute per user
        }
    };

    private clientPool: Map<string, GoogleFormsClient> = new Map();

    constructor() {
        super();

        // Register form operations
        this.registerOperation(getFormOperation);
        this.registerOperation(createFormOperation);
        this.registerOperation(updateFormOperation);

        // Register response operations
        this.registerOperation(listResponsesOperation);
        this.registerOperation(getResponseOperation);

        // Configure webhook settings (polling-based)
        this.setWebhookConfig({
            setupType: "polling", // Google Forms webhooks require Cloud Pub/Sub
            signatureType: "none"
        });

        // Register trigger events (polling-based)
        this.registerTrigger({
            id: "response_submitted",
            name: "Response Submitted",
            description: "Triggered when a new response is submitted to a form",
            requiredScopes: ["https://www.googleapis.com/auth/forms.responses.readonly"],
            configFields: [
                {
                    name: "formId",
                    label: "Form",
                    type: "text",
                    required: true,
                    description: "The ID of the form to monitor for new responses",
                    placeholder: "1FAIpQLSf..."
                }
            ],
            tags: ["responses", "submissions"]
        });
    }

    /**
     * Extract event type from polling result
     * (Not used for actual webhooks since Google Forms uses polling)
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
            scopes: [
                "https://www.googleapis.com/auth/forms.body",
                "https://www.googleapis.com/auth/forms.responses.readonly"
            ],
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
            // Form operations
            case "getForm":
                return await executeGetForm(client, validatedParams as never);
            case "createForm":
                return await executeCreateForm(client, validatedParams as never);
            case "updateForm":
                return await executeUpdateForm(client, validatedParams as never);

            // Response operations
            case "listResponses":
                return await executeListResponses(client, validatedParams as never);
            case "getResponse":
                return await executeGetResponse(client, validatedParams as never);

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
        // Convert operations to MCP tools with google_forms_ prefix
        return this.getOperations().map((op) => ({
            name: `google_forms_${op.id}`,
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
        // Remove google_forms_ prefix to get operation ID
        const operationId = toolName.replace("google_forms_", "");

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
     * Get or create Google Forms client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GoogleFormsClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new GoogleFormsClient({
            accessToken: data.access_token
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (e.g., when connection is deleted)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
