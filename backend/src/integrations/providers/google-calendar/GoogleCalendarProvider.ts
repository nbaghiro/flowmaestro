import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { GoogleCalendarClient } from "./client/GoogleCalendarClient";
import {
    // Event operations
    listEventsOperation,
    executeListEvents,
    getEventOperation,
    executeGetEvent,
    createEventOperation,
    executeCreateEvent,
    updateEventOperation,
    executeUpdateEvent,
    deleteEventOperation,
    executeDeleteEvent,
    quickAddOperation,
    executeQuickAdd,
    // Calendar operations
    listCalendarsOperation,
    executeListCalendars,
    getCalendarOperation,
    executeGetCalendar,
    createCalendarOperation,
    executeCreateCalendar,
    // Availability operations
    getFreeBusyOperation,
    executeGetFreeBusy
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    TestResult
} from "../../core/types";

/**
 * Google Calendar Provider - implements OAuth2 authentication with REST API operations
 *
 * ## Setup Instructions
 *
 * ### 1. Create Google Cloud Project
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable Google Calendar API:
 *    - Go to "APIs & Services" > "Library"
 *    - Search for "Google Calendar API"
 *    - Click "Enable"
 *
 * ### 2. Create OAuth 2.0 Credentials
 * 1. Go to "APIs & Services" > "Credentials"
 * 2. Click "Create Credentials" > "OAuth client ID"
 * 3. Configure consent screen if prompted:
 *    - User Type: External (or Internal for Workspace)
 *    - App name: FlowMaestro (or your app name)
 *    - Support email: Your email
 *    - Scopes: Add https://www.googleapis.com/auth/calendar.events
 *    - Test users: Add your email for testing
 * 4. Create OAuth client ID:
 *    - Application type: Web application
 *    - Name: FlowMaestro Google Calendar
 *    - Authorized redirect URIs: http://localhost:3001/api/oauth/google/callback
 *      (replace with your API_URL in production)
 * 5. Copy Client ID and Client Secret
 *
 * ### 3. Configure Environment Variables
 * Add to your `.env` file:
 * ```
 * GOOGLE_CLIENT_ID=your_client_id_here
 * GOOGLE_CLIENT_SECRET=your_client_secret_here
 * ```
 *
 * Note: This uses the shared Google OAuth client (GOOGLE_CLIENT_ID) that also
 * supports Drive, Sheets, Gmail, and user authentication. The consent screen
 * should include the calendar.events scope along with other Google API scopes.
 *
 * ### 4. OAuth Scopes
 * Required scope for this provider:
 * - `https://www.googleapis.com/auth/calendar.events` - Read/write access to events
 *
 * Alternative scopes:
 * - `https://www.googleapis.com/auth/calendar` - Full calendar access (requires verification)
 * - `https://www.googleapis.com/auth/calendar.readonly` - Read-only access
 * - `https://www.googleapis.com/auth/calendar.events.readonly` - Read-only events access
 *
 * The shared Google OAuth client may also include other scopes for Drive,
 * Sheets, Gmail, etc. This is normal and allows multiple Google integrations
 * to use the same OAuth client.
 *
 * ### 5. Rate Limits
 * - Google Calendar API has quota limits per project
 * - Default: 60 requests per minute per user
 * - Monitor usage in Google Cloud Console
 *
 * ### 6. Testing Connection
 * After setup, test the connection by:
 * 1. Creating a connection in FlowMaestro
 * 2. Authorizing via OAuth flow
 * 3. Running "Test Connection" to verify access
 */
export class GoogleCalendarProvider extends BaseProvider {
    readonly name = "google-calendar";
    readonly displayName = "Google Calendar";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 60 // 60 requests per minute per user
        }
    };

    private clientPool: Map<string, GoogleCalendarClient> = new Map();

    constructor() {
        super();

        // Register event operations
        this.registerOperation(listEventsOperation);
        this.registerOperation(getEventOperation);
        this.registerOperation(createEventOperation);
        this.registerOperation(updateEventOperation);
        this.registerOperation(deleteEventOperation);
        this.registerOperation(quickAddOperation);

        // Register calendar operations
        this.registerOperation(listCalendarsOperation);
        this.registerOperation(getCalendarOperation);
        this.registerOperation(createCalendarOperation);

        // Register availability operations
        this.registerOperation(getFreeBusyOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scopes: ["https://www.googleapis.com/auth/calendar.events"],
            clientId: appConfig.oauth.google.clientId,
            clientSecret: appConfig.oauth.google.clientSecret,
            redirectUri: getOAuthRedirectUri("google"),
            refreshable: true
        };

        return config;
    }

    /**
     * Test connection
     */
    async testConnection(connection: ConnectionWithData): Promise<TestResult> {
        try {
            // Create client
            const client = this.getOrCreateClient(connection);

            // Test connection by listing calendars
            await client.listCalendars({ maxResults: 1 });

            return {
                success: true,
                message: "Successfully connected to Google Calendar",
                tested_at: new Date().toISOString(),
                details: {
                    note: "Connection validated. Ready to manage calendar events and calendars."
                }
            };
        } catch (error) {
            return {
                success: false,
                message:
                    error instanceof Error ? error.message : "Failed to connect to Google Calendar",
                tested_at: new Date().toISOString()
            };
        }
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
            // Event operations
            case "listEvents":
                return await executeListEvents(client, validatedParams as never);
            case "getEvent":
                return await executeGetEvent(client, validatedParams as never);
            case "createEvent":
                return await executeCreateEvent(client, validatedParams as never);
            case "updateEvent":
                return await executeUpdateEvent(client, validatedParams as never);
            case "deleteEvent":
                return await executeDeleteEvent(client, validatedParams as never);
            case "quickAdd":
                return await executeQuickAdd(client, validatedParams as never);

            // Calendar operations
            case "listCalendars":
                return await executeListCalendars(client, validatedParams as never);
            case "getCalendar":
                return await executeGetCalendar(client, validatedParams as never);
            case "createCalendar":
                return await executeCreateCalendar(client, validatedParams as never);

            // Availability operations
            case "getFreeBusy":
                return await executeGetFreeBusy(client, validatedParams as never);

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
        // Convert operations to MCP tools with google_calendar_ prefix
        return this.getOperations().map((op) => ({
            name: `google_calendar_${op.id}`,
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
        // Remove google_calendar_ prefix to get operation ID
        const operationId = toolName.replace("google_calendar_", "");

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
     * Get or create Google Calendar client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GoogleCalendarClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new GoogleCalendarClient({
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
