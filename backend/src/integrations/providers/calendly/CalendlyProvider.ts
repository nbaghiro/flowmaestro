import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { CalendlyClient } from "./client/CalendlyClient";
import { CalendlyMCPAdapter } from "./mcp/CalendlyMCPAdapter";
import {
    getCurrentUserOperation,
    executeGetCurrentUser,
    listEventTypesOperation,
    executeListEventTypes,
    getEventTypeOperation,
    executeGetEventType,
    listScheduledEventsOperation,
    executeListScheduledEvents,
    getScheduledEventOperation,
    executeGetScheduledEvent,
    listEventInviteesOperation,
    executeListEventInvitees,
    cancelEventOperation,
    executeCancelEvent,
    getAvailabilityOperation,
    executeGetAvailability
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    WebhookConfig,
    TriggerDefinition
} from "../../core/types";

/**
 * Calendly Provider - implements OAuth2 authentication for scheduling management
 */
export class CalendlyProvider extends BaseProvider {
    readonly name = "calendly";
    readonly displayName = "Calendly";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 500
        }
    };

    private mcpAdapter: CalendlyMCPAdapter;
    private clientPool: Map<string, CalendlyClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(getCurrentUserOperation);
        this.registerOperation(listEventTypesOperation);
        this.registerOperation(getEventTypeOperation);
        this.registerOperation(listScheduledEventsOperation);
        this.registerOperation(getScheduledEventOperation);
        this.registerOperation(listEventInviteesOperation);
        this.registerOperation(cancelEventOperation);
        this.registerOperation(getAvailabilityOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new CalendlyMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://auth.calendly.com/oauth/authorize",
            tokenUrl: "https://auth.calendly.com/oauth/token",
            scopes: [], // Calendly doesn't use traditional scopes - access based on user role
            clientId: appConfig.oauth.calendly.clientId,
            clientSecret: appConfig.oauth.calendly.clientSecret,
            redirectUri: getOAuthRedirectUri("calendly"),
            refreshable: true
        };

        return config;
    }

    /**
     * Get webhook configuration
     */
    getWebhookConfig(): WebhookConfig {
        return {
            setupType: "manual",
            signatureType: "hmac_sha256",
            signatureHeader: "Calendly-Webhook-Signature"
        };
    }

    /**
     * Get available triggers
     */
    getTriggers(): TriggerDefinition[] {
        return [
            {
                id: "invitee.created",
                name: "Invitee Created",
                description: "Triggered when a new event is scheduled (invitee created)",
                tags: ["booking", "scheduling"]
            },
            {
                id: "invitee.canceled",
                name: "Invitee Canceled",
                description: "Triggered when an event is canceled",
                tags: ["cancellation", "scheduling"]
            },
            {
                id: "routing_form_submission.created",
                name: "Routing Form Submitted",
                description: "Triggered when a routing form is submitted",
                tags: ["form", "routing"]
            }
        ];
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
            case "getCurrentUser":
                return await executeGetCurrentUser(client, validatedParams as never);
            case "listEventTypes":
                return await executeListEventTypes(client, validatedParams as never);
            case "getEventType":
                return await executeGetEventType(client, validatedParams as never);
            case "listScheduledEvents":
                return await executeListScheduledEvents(client, validatedParams as never);
            case "getScheduledEvent":
                return await executeGetScheduledEvent(client, validatedParams as never);
            case "listEventInvitees":
                return await executeListEventInvitees(client, validatedParams as never);
            case "cancelEvent":
                return await executeCancelEvent(client, validatedParams as never);
            case "getAvailability":
                return await executeGetAvailability(client, validatedParams as never);
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
     * Get or create Calendly client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): CalendlyClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new CalendlyClient({
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
