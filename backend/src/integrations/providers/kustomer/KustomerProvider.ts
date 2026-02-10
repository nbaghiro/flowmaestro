/**
 * Kustomer Integration Provider
 *
 * CRM-powered customer service platform with a customer-centric data model.
 * Uses API Key authentication with organization-specific subdomains.
 */

import { BaseProvider } from "../../core/BaseProvider";
import { KustomerClient } from "./client/KustomerClient";
import { KustomerMCPAdapter } from "./mcp/KustomerMCPAdapter";
import {
    // Customers
    listCustomersOperation,
    executeListCustomers,
    getCustomerOperation,
    executeGetCustomer,
    createCustomerOperation,
    executeCreateCustomer,
    updateCustomerOperation,
    executeUpdateCustomer,
    deleteCustomerOperation,
    executeDeleteCustomer,
    searchCustomersOperation,
    executeSearchCustomers,
    // Conversations
    listConversationsOperation,
    executeListConversations,
    getConversationOperation,
    executeGetConversation,
    createConversationOperation,
    executeCreateConversation,
    updateConversationOperation,
    executeUpdateConversation,
    addConversationTagsOperation,
    executeAddConversationTags,
    removeConversationTagsOperation,
    executeRemoveConversationTags,
    // Messages
    listMessagesOperation,
    executeListMessages,
    createMessageOperation,
    executeCreateMessage,
    createMessageByCustomerOperation,
    executeCreateMessageByCustomer
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

export class KustomerProvider extends BaseProvider {
    readonly name = "kustomer";
    readonly displayName = "Kustomer";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            // Conservative Professional plan default: 300 rpm
            // Enterprise plans can have 1000-2000 rpm
            tokensPerMinute: 300,
            burstSize: 50
        }
    };

    private clientPool: Map<string, KustomerClient> = new Map();
    private mcpAdapter: KustomerMCPAdapter;

    constructor() {
        super();

        // Register all operations
        // Customers
        this.registerOperation(listCustomersOperation);
        this.registerOperation(getCustomerOperation);
        this.registerOperation(createCustomerOperation);
        this.registerOperation(updateCustomerOperation);
        this.registerOperation(deleteCustomerOperation);
        this.registerOperation(searchCustomersOperation);

        // Conversations
        this.registerOperation(listConversationsOperation);
        this.registerOperation(getConversationOperation);
        this.registerOperation(createConversationOperation);
        this.registerOperation(updateConversationOperation);
        this.registerOperation(addConversationTagsOperation);
        this.registerOperation(removeConversationTagsOperation);

        // Messages
        this.registerOperation(listMessagesOperation);
        this.registerOperation(createMessageOperation);
        this.registerOperation(createMessageByCustomerOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new KustomerMCPAdapter(this.operations);
    }

    /**
     * Get API Key authentication configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
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
            // Customers
            case "listCustomers":
                return executeListCustomers(client, params as never);
            case "getCustomer":
                return executeGetCustomer(client, params as never);
            case "createCustomer":
                return executeCreateCustomer(client, params as never);
            case "updateCustomer":
                return executeUpdateCustomer(client, params as never);
            case "deleteCustomer":
                return executeDeleteCustomer(client, params as never);
            case "searchCustomers":
                return executeSearchCustomers(client, params as never);

            // Conversations
            case "listConversations":
                return executeListConversations(client, params as never);
            case "getConversation":
                return executeGetConversation(client, params as never);
            case "createConversation":
                return executeCreateConversation(client, params as never);
            case "updateConversation":
                return executeUpdateConversation(client, params as never);
            case "addConversationTags":
                return executeAddConversationTags(client, params as never);
            case "removeConversationTags":
                return executeRemoveConversationTags(client, params as never);

            // Messages
            case "listMessages":
                return executeListMessages(client, params as never);
            case "createMessage":
                return executeCreateMessage(client, params as never);
            case "createMessageByCustomer":
                return executeCreateMessageByCustomer(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): KustomerClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get API key from connection data
        const data = connection.data as ApiKeyData;

        // Get organization name from metadata
        const metadata = connection.metadata as Record<string, unknown> | undefined;
        const orgName = metadata?.orgName as string;

        if (!orgName) {
            throw new Error("Kustomer organization name is required");
        }

        const client = new KustomerClient({
            apiKey: data.api_key,
            orgName,
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
