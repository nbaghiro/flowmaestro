import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { HelloSignClient } from "./client/HelloSignClient";
import { HelloSignMCPAdapter } from "./mcp/HelloSignMCPAdapter";
import {
    createSignatureRequestOperation,
    executeCreateSignatureRequest,
    getSignatureRequestOperation,
    executeGetSignatureRequest,
    listSignatureRequestsOperation,
    executeListSignatureRequests,
    cancelSignatureRequestOperation,
    executeCancelSignatureRequest,
    downloadDocumentOperation,
    executeDownloadDocument,
    listTemplatesOperation,
    executeListTemplates,
    createFromTemplateOperation,
    executeCreateFromTemplate
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    WebhookRequestData,
    WebhookVerificationResult
} from "../../core/types";

/**
 * HelloSign Provider - implements OAuth2 authentication with e-signature operations
 */
export class HelloSignProvider extends BaseProvider {
    readonly name = "hellosign";
    readonly displayName = "HelloSign";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 600 // 600 requests per minute
        }
    };

    private mcpAdapter: HelloSignMCPAdapter;
    private clientPool: Map<string, HelloSignClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(createSignatureRequestOperation);
        this.registerOperation(getSignatureRequestOperation);
        this.registerOperation(listSignatureRequestsOperation);
        this.registerOperation(cancelSignatureRequestOperation);
        this.registerOperation(downloadDocumentOperation);
        this.registerOperation(listTemplatesOperation);
        this.registerOperation(createFromTemplateOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new HelloSignMCPAdapter(this.operations);

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "hmac_sha256",
            signatureHeader: "X-HelloSign-Signature"
        });

        // Register trigger events
        this.registerTrigger({
            id: "signature_request_sent",
            name: "Signature Request Sent",
            description: "Triggered when a signature request is sent",
            configFields: [],
            tags: ["signature", "sent"]
        });

        this.registerTrigger({
            id: "signature_request_signed",
            name: "Signer Completed",
            description: "Triggered when a signer completes signing",
            configFields: [],
            tags: ["signature", "signed"]
        });

        this.registerTrigger({
            id: "signature_request_all_signed",
            name: "All Signers Completed",
            description: "Triggered when all signers have completed signing",
            configFields: [],
            tags: ["signature", "complete"]
        });

        this.registerTrigger({
            id: "signature_request_declined",
            name: "Signature Declined",
            description: "Triggered when a signer declines to sign",
            configFields: [],
            tags: ["signature", "declined"]
        });

        this.registerTrigger({
            id: "signature_request_downloadable",
            name: "Document Ready",
            description: "Triggered when a signed document is ready for download",
            configFields: [],
            tags: ["document", "ready"]
        });
    }

    /**
     * HelloSign-specific webhook verification
     * HelloSign requires responding with "Hello API Event Received"
     */
    verifyWebhookSignature(secret: string, request: WebhookRequestData): WebhookVerificationResult {
        // HelloSign uses HMAC-SHA256 verification
        return this.verifyHmacSha256(
            this.getHeader(request.headers, "X-HelloSign-Signature") || "",
            this.getBodyString(request),
            secret
        );
    }

    /**
     * Extract event type from HelloSign webhook
     */
    extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
            return body?.event?.event_type;
        } catch {
            return undefined;
        }
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://app.hellosign.com/oauth/authorize",
            tokenUrl: "https://app.hellosign.com/oauth/token",
            scopes: ["signature_request_access", "template_access", "account_access"],
            clientId: appConfig.oauth.hellosign.clientId,
            clientSecret: appConfig.oauth.hellosign.clientSecret,
            redirectUri: getOAuthRedirectUri("hellosign"),
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
            case "createSignatureRequest":
                return await executeCreateSignatureRequest(client, validatedParams as never);
            case "getSignatureRequest":
                return await executeGetSignatureRequest(client, validatedParams as never);
            case "listSignatureRequests":
                return await executeListSignatureRequests(client, validatedParams as never);
            case "cancelSignatureRequest":
                return await executeCancelSignatureRequest(client, validatedParams as never);
            case "downloadDocument":
                return await executeDownloadDocument(client, validatedParams as never);
            case "listTemplates":
                return await executeListTemplates(client, validatedParams as never);
            case "createFromTemplate":
                return await executeCreateFromTemplate(client, validatedParams as never);
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
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if ((result as { success?: boolean }).success) {
            return (result as { data?: unknown }).data;
        } else {
            throw new Error(
                (result as { error?: { message?: string } }).error?.message ||
                    "MCP tool execution failed"
            );
        }
    }

    /**
     * Get or create HelloSign client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): HelloSignClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new HelloSignClient({
            accessToken: tokens.access_token,
            connectionId: connection.id
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
