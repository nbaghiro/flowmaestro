import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { DocuSignClient } from "./client/DocuSignClient";
import { DocuSignMCPAdapter } from "./mcp/DocuSignMCPAdapter";
import {
    createEnvelopeOperation,
    executeCreateEnvelope,
    getEnvelopeOperation,
    executeGetEnvelope,
    listEnvelopesOperation,
    executeListEnvelopes,
    voidEnvelopeOperation,
    executeVoidEnvelope,
    downloadDocumentsOperation,
    executeDownloadDocuments,
    listTemplatesOperation,
    executeListTemplates,
    createFromTemplateOperation,
    executeCreateFromTemplate,
    getRecipientsOperation,
    executeGetRecipients
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
 * Extended OAuth token data for DocuSign (includes account info)
 */
interface DocuSignTokenData extends OAuth2TokenData {
    account_id?: string;
    base_uri?: string;
}

/**
 * DocuSign Provider - implements OAuth2 authentication with e-signature operations
 */
export class DocuSignProvider extends BaseProvider {
    readonly name = "docusign";
    readonly displayName = "DocuSign";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 1000 // ~1000 requests per hour
        }
    };

    private mcpAdapter: DocuSignMCPAdapter;
    private clientPool: Map<string, DocuSignClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(createEnvelopeOperation);
        this.registerOperation(getEnvelopeOperation);
        this.registerOperation(listEnvelopesOperation);
        this.registerOperation(voidEnvelopeOperation);
        this.registerOperation(downloadDocumentsOperation);
        this.registerOperation(listTemplatesOperation);
        this.registerOperation(createFromTemplateOperation);
        this.registerOperation(getRecipientsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new DocuSignMCPAdapter(this.operations);

        // Configure webhook settings (DocuSign Connect)
        this.setWebhookConfig({
            setupType: "manual", // DocuSign Connect requires configuration in admin panel
            signatureType: "hmac_sha256",
            signatureHeader: "X-DocuSign-Signature-1"
        });

        // Register trigger events
        this.registerTrigger({
            id: "envelope_sent",
            name: "Envelope Sent",
            description: "Triggered when an envelope is sent to recipients",
            configFields: [],
            tags: ["envelope", "sent"]
        });

        this.registerTrigger({
            id: "envelope_delivered",
            name: "Envelope Delivered",
            description: "Triggered when an envelope is delivered to a recipient",
            configFields: [],
            tags: ["envelope", "delivered"]
        });

        this.registerTrigger({
            id: "envelope_completed",
            name: "Envelope Completed",
            description: "Triggered when all recipients have signed",
            configFields: [],
            tags: ["envelope", "complete"]
        });

        this.registerTrigger({
            id: "envelope_declined",
            name: "Envelope Declined",
            description: "Triggered when a recipient declines to sign",
            configFields: [],
            tags: ["envelope", "declined"]
        });

        this.registerTrigger({
            id: "envelope_voided",
            name: "Envelope Voided",
            description: "Triggered when an envelope is voided",
            configFields: [],
            tags: ["envelope", "voided"]
        });

        this.registerTrigger({
            id: "recipient_completed",
            name: "Recipient Completed",
            description: "Triggered when a single recipient completes signing",
            configFields: [],
            tags: ["recipient", "signed"]
        });
    }

    /**
     * DocuSign-specific webhook verification using HMAC-SHA256
     */
    verifyWebhookSignature(secret: string, request: WebhookRequestData): WebhookVerificationResult {
        // DocuSign Connect uses HMAC-SHA256 with base64 encoding
        const signature = this.getHeader(request.headers, "X-DocuSign-Signature-1");
        if (!signature) {
            return { valid: false, error: "Missing DocuSign signature header" };
        }

        return this.verifyHmacSha256(signature, this.getBodyString(request), secret);
    }

    /**
     * Extract event type from DocuSign webhook
     */
    extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
            // DocuSign Connect sends event type in different formats
            return body?.event || body?.envelopeStatus || body?.recipientStatus;
        } catch {
            return undefined;
        }
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://account.docusign.com/oauth/auth",
            tokenUrl: "https://account.docusign.com/oauth/token",
            scopes: ["signature", "extended"],
            clientId: appConfig.oauth.docusign.clientId,
            clientSecret: appConfig.oauth.docusign.clientSecret,
            redirectUri: getOAuthRedirectUri("docusign"),
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
            case "createEnvelope":
                return await executeCreateEnvelope(client, validatedParams as never);
            case "getEnvelope":
                return await executeGetEnvelope(client, validatedParams as never);
            case "listEnvelopes":
                return await executeListEnvelopes(client, validatedParams as never);
            case "voidEnvelope":
                return await executeVoidEnvelope(client, validatedParams as never);
            case "downloadDocuments":
                return await executeDownloadDocuments(client, validatedParams as never);
            case "listTemplates":
                return await executeListTemplates(client, validatedParams as never);
            case "createFromTemplate":
                return await executeCreateFromTemplate(client, validatedParams as never);
            case "getRecipients":
                return await executeGetRecipients(client, validatedParams as never);
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
     * Get or create DocuSign client (with connection pooling)
     *
     * DocuSign requires account_id and base_uri for API calls, which are
     * stored in the connection data after OAuth (fetched from /oauth/userinfo)
     */
    private getOrCreateClient(connection: ConnectionWithData): DocuSignClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get token data with DocuSign-specific fields
        const tokens = connection.data as DocuSignTokenData;

        // DocuSign requires account_id and base_uri from OAuth userinfo
        // These are stored in metadata during the OAuth flow
        const metadata = connection.metadata as { account_id?: string; base_uri?: string } | null;
        const accountId = tokens.account_id || metadata?.account_id;
        const baseUri = tokens.base_uri || metadata?.base_uri;

        if (!accountId || !baseUri) {
            throw new Error(
                "DocuSign connection is missing account_id or base_uri. Please reconnect your DocuSign account."
            );
        }

        // Create new client with DocuSign-specific configuration
        const client = new DocuSignClient({
            accessToken: tokens.access_token,
            accountId,
            baseUri,
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
