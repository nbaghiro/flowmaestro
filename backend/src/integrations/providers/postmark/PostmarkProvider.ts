/**
 * Postmark Integration Provider
 *
 * Transactional email delivery platform with API Key authentication.
 * Supports email sending, templates, delivery stats, and bounce management.
 *
 * Rate limit: No hard limit (1000 requests/minute suggested)
 */

import { BaseProvider } from "../../core/BaseProvider";
import { PostmarkClient } from "./client/PostmarkClient";
import { PostmarkMCPAdapter } from "./mcp/PostmarkMCPAdapter";
import {
    // Email Operations
    sendEmailOperation,
    executeSendEmail,
    sendBatchEmailsOperation,
    executeSendBatchEmails,
    sendTemplateEmailOperation,
    executeSendTemplateEmail,
    // Template Operations
    listTemplatesOperation,
    executeListTemplates,
    getTemplateOperation,
    executeGetTemplate,
    // Analytics Operations
    getDeliveryStatsOperation,
    executeGetDeliveryStats,
    // Bounce Operations
    listBouncesOperation,
    executeListBounces,
    activateBounceOperation,
    executeActivateBounce
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class PostmarkProvider extends BaseProvider {
    readonly name = "postmark";
    readonly displayName = "Postmark";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 1000,
            burstSize: 100
        }
    };

    private clientPool: Map<string, PostmarkClient> = new Map();
    private mcpAdapter: PostmarkMCPAdapter;

    constructor() {
        super();

        // Register Email Operations (3 operations)
        this.registerOperation(sendEmailOperation);
        this.registerOperation(sendBatchEmailsOperation);
        this.registerOperation(sendTemplateEmailOperation);

        // Register Template Operations (2 operations)
        this.registerOperation(listTemplatesOperation);
        this.registerOperation(getTemplateOperation);

        // Register Analytics Operations (1 operation)
        this.registerOperation(getDeliveryStatsOperation);

        // Register Bounce Operations (2 operations)
        this.registerOperation(listBouncesOperation);
        this.registerOperation(activateBounceOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new PostmarkMCPAdapter(this.operations);

        // Configure webhooks
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "none" // Postmark uses IP allowlisting, not signatures
        });

        // Register webhook triggers
        this.registerTrigger({
            id: "email_delivered",
            name: "Email Delivered",
            description: "Triggered when an email is successfully delivered",
            requiredScopes: [],
            configFields: [],
            tags: ["email", "delivery"]
        });

        this.registerTrigger({
            id: "email_bounced",
            name: "Email Bounced",
            description: "Triggered when an email bounces (hard or soft)",
            requiredScopes: [],
            configFields: [],
            tags: ["email", "bounce"]
        });

        this.registerTrigger({
            id: "email_opened",
            name: "Email Opened",
            description: "Triggered when a recipient opens an email",
            requiredScopes: [],
            configFields: [],
            tags: ["email", "tracking"]
        });

        this.registerTrigger({
            id: "link_clicked",
            name: "Link Clicked",
            description: "Triggered when a recipient clicks a tracked link",
            requiredScopes: [],
            configFields: [],
            tags: ["email", "tracking"]
        });
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "X-Postmark-Server-Token",
            headerTemplate: "{{api_key}}"
        };
    }

    /**
     * Execute an operation
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // Email Operations
            case "sendEmail":
                return executeSendEmail(client, params as never);
            case "sendBatchEmails":
                return executeSendBatchEmails(client, params as never);
            case "sendTemplateEmail":
                return executeSendTemplateEmail(client, params as never);

            // Template Operations
            case "listTemplates":
                return executeListTemplates(client, params as never);
            case "getTemplate":
                return executeGetTemplate(client, params as never);

            // Analytics Operations
            case "getDeliveryStats":
                return executeGetDeliveryStats(client, params as never);

            // Bounce Operations
            case "listBounces":
                return executeListBounces(client, params as never);
            case "activateBounce":
                return executeActivateBounce(client, params as never);

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
     * Get MCP tools for AI agent integration
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute an MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create a client for a connection (with caching)
     */
    private getOrCreateClient(connection: ConnectionWithData): PostmarkClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get API key from connection data
        const data = connection.data as ApiKeyData;

        if (!data.api_key) {
            throw new Error("Postmark Server API Token is required");
        }

        const client = new PostmarkClient({
            serverToken: data.api_key,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    /**
     * Clear cached client
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
