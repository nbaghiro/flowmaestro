import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { CalComClient } from "./client/CalComClient";
import { CalComMCPAdapter } from "./mcp/CalComMCPAdapter";
import {
    getCurrentUserOperation,
    executeGetCurrentUser,
    listEventTypesOperation,
    executeListEventTypes,
    getEventTypeOperation,
    executeGetEventType,
    listBookingsOperation,
    executeListBookings,
    getBookingOperation,
    executeGetBooking,
    createBookingOperation,
    executeCreateBooking,
    cancelBookingOperation,
    executeCancelBooking,
    rescheduleBookingOperation,
    executeRescheduleBooking,
    getAvailableSlotsOperation,
    executeGetAvailableSlots,
    listSchedulesOperation,
    executeListSchedules
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
 * Cal.com Provider - implements OAuth2 authentication for scheduling management
 */
export class CalComProvider extends BaseProvider {
    readonly name = "cal-com";
    readonly displayName = "Cal.com";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 120
        }
    };

    private mcpAdapter: CalComMCPAdapter;
    private clientPool: Map<string, CalComClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(getCurrentUserOperation);
        this.registerOperation(listEventTypesOperation);
        this.registerOperation(getEventTypeOperation);
        this.registerOperation(listBookingsOperation);
        this.registerOperation(getBookingOperation);
        this.registerOperation(createBookingOperation);
        this.registerOperation(cancelBookingOperation);
        this.registerOperation(rescheduleBookingOperation);
        this.registerOperation(getAvailableSlotsOperation);
        this.registerOperation(listSchedulesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new CalComMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://app.cal.com/oauth/authorize",
            tokenUrl: "https://app.cal.com/oauth/token",
            scopes: ["READ_BOOKING", "READ_PROFILE", "READ_SCHEDULE"],
            clientId: appConfig.oauth.calcom.clientId,
            clientSecret: appConfig.oauth.calcom.clientSecret,
            redirectUri: getOAuthRedirectUri("cal-com"),
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
            signatureHeader: "X-Cal-Signature-256"
        };
    }

    /**
     * Get available triggers
     */
    getTriggers(): TriggerDefinition[] {
        return [
            {
                id: "BOOKING_CREATED",
                name: "Booking Created",
                description: "Triggered when a new booking is scheduled",
                tags: ["booking", "scheduling"]
            },
            {
                id: "BOOKING_CANCELLED",
                name: "Booking Cancelled",
                description: "Triggered when a booking is cancelled",
                tags: ["cancellation", "scheduling"]
            },
            {
                id: "BOOKING_RESCHEDULED",
                name: "Booking Rescheduled",
                description: "Triggered when a booking time is changed",
                tags: ["rescheduling", "scheduling"]
            },
            {
                id: "BOOKING_CONFIRMED",
                name: "Booking Confirmed",
                description: "Triggered when a booking is confirmed",
                tags: ["confirmation", "scheduling"]
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
            case "listBookings":
                return await executeListBookings(client, validatedParams as never);
            case "getBooking":
                return await executeGetBooking(client, validatedParams as never);
            case "createBooking":
                return await executeCreateBooking(client, validatedParams as never);
            case "cancelBooking":
                return await executeCancelBooking(client, validatedParams as never);
            case "rescheduleBooking":
                return await executeRescheduleBooking(client, validatedParams as never);
            case "getAvailableSlots":
                return await executeGetAvailableSlots(client, validatedParams as never);
            case "listSchedules":
                return await executeListSchedules(client, validatedParams as never);
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
     * Get or create Cal.com client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): CalComClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new CalComClient({
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
