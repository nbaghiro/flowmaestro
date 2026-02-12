/**
 * RingCentral Integration Provider
 *
 * Business phone, SMS, and video communications platform with OAuth2 + PKCE authentication.
 * Supports SMS/MMS, voice calls (RingOut), call logs, voicemail, team messaging, and meetings.
 *
 * Rate limits vary by API group (Light/Medium/Heavy)
 */

import { config, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { RingCentralClient } from "./client/RingCentralClient";
import { RingCentralMCPAdapter } from "./mcp/RingCentralMCPAdapter";
import {
    // SMS/MMS Operations
    sendSmsOperation,
    executeSendSms,
    sendMmsOperation,
    executeSendMms,
    listMessagesOperation,
    executeListMessages,
    // Voice Operations
    makeCallOperation,
    executeMakeCall,
    cancelCallOperation,
    executeCancelCall,
    getCallLogsOperation,
    executeGetCallLogs,
    listVoicemailsOperation,
    executeListVoicemails,
    // Team Messaging Operations
    sendTeamMessageOperation,
    executeSendTeamMessage,
    listChatsOperation,
    executeListChats,
    // Meeting Operations
    scheduleMeetingOperation,
    executeScheduleMeeting
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OAuthConfig,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class RingCentralProvider extends BaseProvider {
    readonly name = "ringcentral";
    readonly displayName = "RingCentral";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 60, // Conservative default, varies by API
            burstSize: 10
        }
    };

    private clientPool: Map<string, RingCentralClient> = new Map();
    private mcpAdapter: RingCentralMCPAdapter;

    constructor() {
        super();

        // Register SMS/MMS Operations (3 operations)
        this.registerOperation(sendSmsOperation);
        this.registerOperation(sendMmsOperation);
        this.registerOperation(listMessagesOperation);

        // Register Voice Operations (4 operations)
        this.registerOperation(makeCallOperation);
        this.registerOperation(cancelCallOperation);
        this.registerOperation(getCallLogsOperation);
        this.registerOperation(listVoicemailsOperation);

        // Register Team Messaging Operations (2 operations)
        this.registerOperation(sendTeamMessageOperation);
        this.registerOperation(listChatsOperation);

        // Register Meeting Operations (1 operation)
        this.registerOperation(scheduleMeetingOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new RingCentralMCPAdapter(this.operations);

        // Configure webhooks (RingCentral uses subscription API)
        this.setWebhookConfig({
            setupType: "automatic",
            signatureType: "none" // RingCentral uses subscription validation
        });

        // Register webhook triggers
        this.registerTrigger({
            id: "sms_received",
            name: "SMS Received",
            description: "Triggered when an incoming SMS message is received",
            requiredScopes: ["ReadMessages"],
            configFields: [],
            tags: ["messages", "sms", "inbound"]
        });

        this.registerTrigger({
            id: "voicemail_received",
            name: "Voicemail Received",
            description: "Triggered when a new voicemail message is received",
            requiredScopes: ["ReadMessages"],
            configFields: [],
            tags: ["voicemail", "inbound"]
        });

        this.registerTrigger({
            id: "call_started",
            name: "Call Started",
            description: "Triggered when an inbound or outbound call is initiated",
            requiredScopes: ["ReadCallLog"],
            configFields: [],
            tags: ["calls", "voice"]
        });

        this.registerTrigger({
            id: "call_ended",
            name: "Call Ended",
            description: "Triggered when a call is completed",
            requiredScopes: ["ReadCallLog"],
            configFields: [],
            tags: ["calls", "voice"]
        });

        this.registerTrigger({
            id: "team_message_received",
            name: "Team Message Received",
            description: "Triggered when a message is posted in a team chat",
            requiredScopes: ["TeamMessaging"],
            configFields: [],
            tags: ["team", "messaging"]
        });

        this.registerTrigger({
            id: "meeting_started",
            name: "Meeting Started",
            description: "Triggered when a video meeting begins",
            requiredScopes: ["Meetings"],
            configFields: [],
            tags: ["meetings", "video"]
        });
    }

    /**
     * Get OAuth2 configuration with PKCE support
     */
    getAuthConfig(): AuthConfig {
        const oauthConfig: OAuthConfig = {
            authUrl: "https://platform.ringcentral.com/restapi/oauth/authorize",
            tokenUrl: "https://platform.ringcentral.com/restapi/oauth/token",
            scopes: ["ReadMessages", "SMS", "RingOut", "ReadCallLog", "Meetings", "TeamMessaging"],
            clientId: config.oauth.ringcentral?.clientId || "",
            clientSecret: config.oauth.ringcentral?.clientSecret || "",
            redirectUri: getOAuthRedirectUri("ringcentral"),
            refreshable: true
        };
        return oauthConfig;
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
            // SMS/MMS Operations
            case "sendSms":
                return executeSendSms(client, params as never);
            case "sendMms":
                return executeSendMms(client, params as never);
            case "listMessages":
                return executeListMessages(client, params as never);

            // Voice Operations
            case "makeCall":
                return executeMakeCall(client, params as never);
            case "cancelCall":
                return executeCancelCall(client, params as never);
            case "getCallLogs":
                return executeGetCallLogs(client, params as never);
            case "listVoicemails":
                return executeListVoicemails(client, params as never);

            // Team Messaging Operations
            case "sendTeamMessage":
                return executeSendTeamMessage(client, params as never);
            case "listChats":
                return executeListChats(client, params as never);

            // Meeting Operations
            case "scheduleMeeting":
                return executeScheduleMeeting(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): RingCentralClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get access token from connection data
        const data = connection.data as OAuth2TokenData;

        if (!data.access_token) {
            throw new Error("RingCentral access token is required");
        }

        const client = new RingCentralClient({
            accessToken: data.access_token,
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
