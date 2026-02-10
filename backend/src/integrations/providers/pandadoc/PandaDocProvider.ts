import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { PandaDocClient } from "./client/PandaDocClient";
import { PandaDocMCPAdapter } from "./mcp/PandaDocMCPAdapter";
import {
    listDocumentsOperation,
    executeListDocuments,
    getDocumentOperation,
    executeGetDocument,
    getDocumentStatusOperation,
    executeGetDocumentStatus,
    createDocumentOperation,
    executeCreateDocument,
    sendDocumentOperation,
    executeSendDocument,
    downloadDocumentOperation,
    executeDownloadDocument,
    listTemplatesOperation,
    executeListTemplates,
    deleteDocumentOperation,
    executeDeleteDocument
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
 * PandaDoc Provider - implements OAuth2 authentication with document workflow operations
 */
export class PandaDocProvider extends BaseProvider {
    readonly name = "pandadoc";
    readonly displayName = "PandaDoc";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 60 // 60 requests/min for most endpoints
        }
    };

    private mcpAdapter: PandaDocMCPAdapter;
    private clientPool: Map<string, PandaDocClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listDocumentsOperation);
        this.registerOperation(getDocumentOperation);
        this.registerOperation(getDocumentStatusOperation);
        this.registerOperation(createDocumentOperation);
        this.registerOperation(sendDocumentOperation);
        this.registerOperation(downloadDocumentOperation);
        this.registerOperation(listTemplatesOperation);
        this.registerOperation(deleteDocumentOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new PandaDocMCPAdapter(this.operations);

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "hmac_sha256",
            signatureHeader: "X-PandaDoc-Signature"
        });

        // Register trigger events
        this.registerTrigger({
            id: "document_state_changed",
            name: "Document State Changed",
            description: "Triggered when any document status changes",
            configFields: [],
            tags: ["document", "status"]
        });

        this.registerTrigger({
            id: "document_completed",
            name: "Document Completed",
            description: "Triggered when all recipients have completed the document",
            configFields: [],
            tags: ["document", "completed"]
        });

        this.registerTrigger({
            id: "recipient_completed",
            name: "Recipient Completed",
            description: "Triggered when an individual recipient completes the document",
            configFields: [],
            tags: ["recipient", "completed"]
        });
    }

    /**
     * PandaDoc-specific webhook verification using HMAC-SHA256
     */
    verifyWebhookSignature(secret: string, request: WebhookRequestData): WebhookVerificationResult {
        const signature = this.getHeader(request.headers, "X-PandaDoc-Signature");
        if (!signature) {
            return { valid: false, error: "Missing PandaDoc signature header" };
        }

        return this.verifyHmacSha256(signature, this.getBodyString(request), secret);
    }

    /**
     * Extract event type from PandaDoc webhook
     */
    extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
            // PandaDoc sends webhooks as an array of events
            const events = Array.isArray(body) ? body : [body];
            return events[0]?.event;
        } catch {
            return undefined;
        }
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://app.pandadoc.com/oauth2/authorize",
            tokenUrl: "https://api.pandadoc.com/oauth2/access_token",
            scopes: ["read+write"],
            clientId: appConfig.oauth.pandadoc.clientId,
            clientSecret: appConfig.oauth.pandadoc.clientSecret,
            redirectUri: getOAuthRedirectUri("pandadoc"),
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
            case "listDocuments":
                return await executeListDocuments(client, validatedParams as never);
            case "getDocument":
                return await executeGetDocument(client, validatedParams as never);
            case "getDocumentStatus":
                return await executeGetDocumentStatus(client, validatedParams as never);
            case "createDocument":
                return await executeCreateDocument(client, validatedParams as never);
            case "sendDocument":
                return await executeSendDocument(client, validatedParams as never);
            case "downloadDocument":
                return await executeDownloadDocument(client, validatedParams as never);
            case "listTemplates":
                return await executeListTemplates(client, validatedParams as never);
            case "deleteDocument":
                return await executeDeleteDocument(client, validatedParams as never);
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
     * Get or create PandaDoc client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): PandaDocClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get token data
        const tokens = connection.data as OAuth2TokenData;

        // Create new client
        const client = new PandaDocClient({
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
