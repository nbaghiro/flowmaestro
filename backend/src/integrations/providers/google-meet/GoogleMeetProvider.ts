import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { GoogleMeetClient } from "./client/GoogleMeetClient";
import { GoogleMeetMCPAdapter } from "./mcp/GoogleMeetMCPAdapter";
import {
    // Space operations
    createSpaceOperation,
    executeCreateSpace,
    getSpaceOperation,
    executeGetSpace,
    updateSpaceOperation,
    executeUpdateSpace,
    endActiveConferenceOperation,
    executeEndActiveConference,
    // Conference record operations
    listConferenceRecordsOperation,
    executeListConferenceRecords,
    getConferenceRecordOperation,
    executeGetConferenceRecord,
    // Participant operations
    listParticipantsOperation,
    executeListParticipants,
    getParticipantOperation,
    executeGetParticipant
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
 * Google Meet Provider - implements OAuth2 authentication with Meet API v2 operations
 *
 * ## Setup Instructions
 *
 * ### 1. Create Google Cloud Project
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable Google Meet REST API:
 *    - Go to "APIs & Services" > "Library"
 *    - Search for "Google Meet REST API"
 *    - Click "Enable"
 *
 * ### 2. Create OAuth 2.0 Credentials
 * Uses the shared Google OAuth client (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET).
 * The consent screen should include the Meet API scopes along with other
 * Google API scopes.
 *
 * ### 3. OAuth Scopes
 * Required scopes for this provider:
 * - `https://www.googleapis.com/auth/meetings.space.created` - Create and manage spaces
 * - `https://www.googleapis.com/auth/meetings.space.readonly` - Read-only access to spaces
 *
 * ### 4. Rate Limits
 * - Google Meet API has quota limits per project
 * - Default: ~600 requests per minute
 * - Monitor usage in Google Cloud Console
 *
 * ### 5. Notes
 * - Google Meet API v2 does not support push notifications / webhooks
 * - Conference records and participants are available after meetings end
 */
export class GoogleMeetProvider extends BaseProvider {
    readonly name = "google-meet";
    readonly displayName = "Google Meet";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        supportsPolling: true,
        rateLimit: {
            tokensPerMinute: 600
        }
    };

    private mcpAdapter: GoogleMeetMCPAdapter;
    private clientPool: Map<string, GoogleMeetClient> = new Map();

    constructor() {
        super();

        // Register space operations
        this.registerOperation(createSpaceOperation);
        this.registerOperation(getSpaceOperation);
        this.registerOperation(updateSpaceOperation);
        this.registerOperation(endActiveConferenceOperation);

        // Register conference record operations
        this.registerOperation(listConferenceRecordsOperation);
        this.registerOperation(getConferenceRecordOperation);

        // Register participant operations
        this.registerOperation(listParticipantsOperation);
        this.registerOperation(getParticipantOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new GoogleMeetMCPAdapter(this.operations);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scopes: [
                "https://www.googleapis.com/auth/meetings.space.created",
                "https://www.googleapis.com/auth/meetings.space.readonly"
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
            // Spaces
            case "createSpace":
                return await executeCreateSpace(client, validatedParams as never);
            case "getSpace":
                return await executeGetSpace(client, validatedParams as never);
            case "updateSpace":
                return await executeUpdateSpace(client, validatedParams as never);
            case "endActiveConference":
                return await executeEndActiveConference(client, validatedParams as never);

            // Conference Records
            case "listConferenceRecords":
                return await executeListConferenceRecords(client, validatedParams as never);
            case "getConferenceRecord":
                return await executeGetConferenceRecord(client, validatedParams as never);

            // Participants
            case "listParticipants":
                return await executeListParticipants(client, validatedParams as never);
            case "getParticipant":
                return await executeGetParticipant(client, validatedParams as never);

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
     * Get or create Google Meet client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GoogleMeetClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get tokens from connection
        const tokens = connection.data as OAuth2TokenData;

        // Create new client
        const client = new GoogleMeetClient({
            accessToken: tokens.access_token
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
