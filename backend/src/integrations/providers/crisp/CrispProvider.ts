/**
 * Crisp Integration Provider
 *
 * Customer messaging platform with API Key authentication.
 * Supports conversations, messages, people profiles, and operator management.
 */

import { BaseProvider } from "../../core/BaseProvider";
import { CrispClient } from "./client/CrispClient";
import { CrispMCPAdapter } from "./mcp/CrispMCPAdapter";
import {
    // Conversations
    listConversationsOperation,
    executeListConversations,
    getConversationOperation,
    executeGetConversation,
    createConversationOperation,
    executeCreateConversation,
    changeConversationStateOperation,
    executeChangeConversationState,
    getMessagesOperation,
    executeGetMessages,
    sendMessageOperation,
    executeSendMessage,
    searchConversationsOperation,
    executeSearchConversations,
    addNoteOperation,
    executeAddNote,
    // People
    listPeopleOperation,
    executeListPeople,
    getPersonOperation,
    executeGetPerson,
    createPersonOperation,
    executeCreatePerson,
    updatePersonOperation,
    executeUpdatePerson,
    // Operators
    listOperatorsOperation,
    executeListOperators,
    getOperatorAvailabilityOperation,
    executeGetOperatorAvailability,
    assignConversationOperation,
    executeAssignConversation,
    unassignConversationOperation,
    executeUnassignConversation
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities
} from "../../core/types";

export class CrispProvider extends BaseProvider {
    readonly name = "crisp";
    readonly displayName = "Crisp";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 200,
            burstSize: 50
        }
    };

    private clientPool: Map<string, CrispClient> = new Map();
    private mcpAdapter: CrispMCPAdapter;

    constructor() {
        super();

        // Register all operations

        // Conversations
        this.registerOperation(listConversationsOperation);
        this.registerOperation(getConversationOperation);
        this.registerOperation(createConversationOperation);
        this.registerOperation(changeConversationStateOperation);
        this.registerOperation(getMessagesOperation);
        this.registerOperation(sendMessageOperation);
        this.registerOperation(searchConversationsOperation);
        this.registerOperation(addNoteOperation);

        // People
        this.registerOperation(listPeopleOperation);
        this.registerOperation(getPersonOperation);
        this.registerOperation(createPersonOperation);
        this.registerOperation(updatePersonOperation);

        // Operators
        this.registerOperation(listOperatorsOperation);
        this.registerOperation(getOperatorAvailabilityOperation);
        this.registerOperation(assignConversationOperation);
        this.registerOperation(unassignConversationOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new CrispMCPAdapter(this.operations);
    }

    /**
     * Get API Key authentication configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Basic {{base64(api_key)}}"
        };

        return config;
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
            // Conversations
            case "listConversations":
                return executeListConversations(client, params as never);
            case "getConversation":
                return executeGetConversation(client, params as never);
            case "createConversation":
                return executeCreateConversation(client, params as never);
            case "changeConversationState":
                return executeChangeConversationState(client, params as never);
            case "getMessages":
                return executeGetMessages(client, params as never);
            case "sendMessage":
                return executeSendMessage(client, params as never);
            case "searchConversations":
                return executeSearchConversations(client, params as never);
            case "addNote":
                return executeAddNote(client, params as never);

            // People
            case "listPeople":
                return executeListPeople(client, params as never);
            case "getPerson":
                return executeGetPerson(client, params as never);
            case "createPerson":
                return executeCreatePerson(client, params as never);
            case "updatePerson":
                return executeUpdatePerson(client, params as never);

            // Operators
            case "listOperators":
                return executeListOperators(client, params as never);
            case "getOperatorAvailability":
                return executeGetOperatorAvailability(client, params as never);
            case "assignConversation":
                return executeAssignConversation(client, params as never);
            case "unassignConversation":
                return executeUnassignConversation(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): CrispClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get API key from connection data
        const data = connection.data as ApiKeyData;

        // Get website_id from metadata
        const metadata = connection.metadata as Record<string, unknown> | undefined;
        const websiteId = metadata?.website_id as string;

        if (!websiteId) {
            throw new Error("Crisp website_id is required");
        }

        const client = new CrispClient({
            apiKey: data.api_key,
            websiteId,
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
