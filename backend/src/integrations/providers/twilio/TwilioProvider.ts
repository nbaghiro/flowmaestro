/**
 * Twilio Integration Provider
 *
 * SMS messaging platform with API Key (Account SID + Auth Token) authentication.
 * Supports sending SMS messages, managing phone numbers, and phone number lookups.
 *
 * Rate limit: ~20-30 concurrent requests
 */

import { BaseProvider } from "../../core/BaseProvider";
import { TwilioClient } from "./client/TwilioClient";
import { TwilioMCPAdapter } from "./mcp/TwilioMCPAdapter";
import {
    // Messaging Operations
    sendSmsOperation,
    executeSendSms,
    listMessagesOperation,
    executeListMessages,
    getMessageOperation,
    executeGetMessage,
    deleteMessageOperation,
    executeDeleteMessage,
    // Lookup Operations
    lookupPhoneNumberOperation,
    executeLookupPhoneNumber,
    // Phone Number Operations
    listPhoneNumbersOperation,
    executeListPhoneNumbers,
    getPhoneNumberOperation,
    executeGetPhoneNumber
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class TwilioProvider extends BaseProvider {
    readonly name = "twilio";
    readonly displayName = "Twilio";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 1800, // ~30 requests/second
            burstSize: 50
        }
    };

    private clientPool: Map<string, TwilioClient> = new Map();
    private mcpAdapter: TwilioMCPAdapter;

    constructor() {
        super();

        // Register Messaging Operations (4 operations)
        this.registerOperation(sendSmsOperation);
        this.registerOperation(listMessagesOperation);
        this.registerOperation(getMessageOperation);
        this.registerOperation(deleteMessageOperation);

        // Register Lookup Operations (1 operation)
        this.registerOperation(lookupPhoneNumberOperation);

        // Register Phone Number Operations (2 operations)
        this.registerOperation(listPhoneNumbersOperation);
        this.registerOperation(getPhoneNumberOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new TwilioMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "Basic {{credentials}}"
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
            // Messaging Operations
            case "sendSms":
                return executeSendSms(client, params as never);
            case "listMessages":
                return executeListMessages(client, params as never);
            case "getMessage":
                return executeGetMessage(client, params as never);
            case "deleteMessage":
                return executeDeleteMessage(client, params as never);

            // Lookup Operations
            case "lookupPhoneNumber":
                return executeLookupPhoneNumber(client, params as never);

            // Phone Number Operations
            case "listPhoneNumbers":
                return executeListPhoneNumbers(client, params as never);
            case "getPhoneNumber":
                return executeGetPhoneNumber(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): TwilioClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get Account SID and Auth Token from connection data
        const data = connection.data as ApiKeyData;

        if (!data.api_key) {
            throw new Error("Twilio Account SID is required");
        }

        if (!data.api_secret) {
            throw new Error("Twilio Auth Token is required");
        }

        const client = new TwilioClient({
            accountSid: data.api_key,
            authToken: data.api_secret,
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
