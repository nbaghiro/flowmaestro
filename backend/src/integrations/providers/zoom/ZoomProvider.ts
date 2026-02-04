import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { ZoomClient } from "./client/ZoomClient";
import { ZoomMCPAdapter } from "./mcp/ZoomMCPAdapter";
import {
    // Meetings
    createMeetingOperation,
    executeCreateMeeting,
    listMeetingsOperation,
    executeListMeetings,
    getMeetingOperation,
    executeGetMeeting,
    updateMeetingOperation,
    executeUpdateMeeting,
    deleteMeetingOperation,
    executeDeleteMeeting,
    // Users
    getUserOperation,
    executeGetUser,
    // Recordings
    listRecordingsOperation,
    executeListRecordings,
    getMeetingRecordingsOperation,
    executeGetMeetingRecordings
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
 * Zoom Provider - implements OAuth2 authentication with meeting operations
 *
 * Features:
 * - Meetings (create, list, get, update, delete)
 * - User profile (get)
 * - Recordings (list, get by meeting)
 */
export class ZoomProvider extends BaseProvider {
    readonly name = "zoom";
    readonly displayName = "Zoom";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 1800
        }
    };

    private mcpAdapter: ZoomMCPAdapter;
    private clientPool: Map<string, ZoomClient> = new Map();

    constructor() {
        super();

        // Register meeting operations
        this.registerOperation(createMeetingOperation);
        this.registerOperation(listMeetingsOperation);
        this.registerOperation(getMeetingOperation);
        this.registerOperation(updateMeetingOperation);
        this.registerOperation(deleteMeetingOperation);

        // Register user operations
        this.registerOperation(getUserOperation);

        // Register recording operations
        this.registerOperation(listRecordingsOperation);
        this.registerOperation(getMeetingRecordingsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ZoomMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const oauthConfig: OAuthConfig = {
            authUrl: "https://zoom.us/oauth/authorize",
            tokenUrl: "https://zoom.us/oauth/token",
            scopes: ["meeting:read", "meeting:write", "user:read", "cloud_recording:read"],
            clientId: appConfig.oauth.zoom.clientId,
            clientSecret: appConfig.oauth.zoom.clientSecret,
            redirectUri: getOAuthRedirectUri("zoom"),
            refreshable: true
        };

        return oauthConfig;
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
            // Meetings
            case "createMeeting":
                return await executeCreateMeeting(client, validatedParams as never);
            case "listMeetings":
                return await executeListMeetings(client, validatedParams as never);
            case "getMeeting":
                return await executeGetMeeting(client, validatedParams as never);
            case "updateMeeting":
                return await executeUpdateMeeting(client, validatedParams as never);
            case "deleteMeeting":
                return await executeDeleteMeeting(client, validatedParams as never);

            // Users
            case "getUser":
                return await executeGetUser(client, validatedParams as never);

            // Recordings
            case "listRecordings":
                return await executeListRecordings(client, validatedParams as never);
            case "getMeetingRecordings":
                return await executeGetMeetingRecordings(client, validatedParams as never);

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
     * Get or create Zoom client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): ZoomClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get tokens from connection
        const tokens = connection.data as OAuth2TokenData;

        // Create new client
        const client = new ZoomClient({
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
