/**
 * Marketo Integration Provider
 *
 * Adobe's enterprise marketing automation platform with API Key authentication.
 * Uses 2-legged OAuth (client credentials) for token management.
 *
 * Supports leads, lists, and campaigns management.
 */

import { BaseProvider } from "../../core/BaseProvider";
import { MarketoClient } from "./client/MarketoClient";
import { MarketoMCPAdapter } from "./mcp/MarketoMCPAdapter";
import {
    // Lead Operations
    getLeadOperation,
    executeGetLead,
    getLeadsOperation,
    executeGetLeads,
    createLeadOperation,
    executeCreateLead,
    updateLeadOperation,
    executeUpdateLead,
    // List Operations
    getListsOperation,
    executeGetLists,
    getListMembersOperation,
    executeGetListMembers,
    addToListOperation,
    executeAddToList,
    removeFromListOperation,
    executeRemoveFromList,
    // Campaign Operations
    getCampaignsOperation,
    executeGetCampaigns,
    requestCampaignOperation,
    executeRequestCampaign
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

export class MarketoProvider extends BaseProvider {
    readonly name = "marketo";
    readonly displayName = "Marketo";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 300, // 100 requests per 20 seconds = 300/min
            burstSize: 20
        }
    };

    private clientPool: Map<string, MarketoClient> = new Map();
    private mcpAdapter: MarketoMCPAdapter;

    constructor() {
        super();

        // Register Lead Operations (4 operations)
        this.registerOperation(getLeadOperation);
        this.registerOperation(getLeadsOperation);
        this.registerOperation(createLeadOperation);
        this.registerOperation(updateLeadOperation);

        // Register List Operations (4 operations)
        this.registerOperation(getListsOperation);
        this.registerOperation(getListMembersOperation);
        this.registerOperation(addToListOperation);
        this.registerOperation(removeFromListOperation);

        // Register Campaign Operations (2 operations)
        this.registerOperation(getCampaignsOperation);
        this.registerOperation(requestCampaignOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new MarketoMCPAdapter(this.operations);
    }

    /**
     * Get API Key authentication configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Bearer {{access_token}}"
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
            // Lead Operations
            case "getLead":
                return executeGetLead(client, params as never);
            case "getLeads":
                return executeGetLeads(client, params as never);
            case "createLead":
                return executeCreateLead(client, params as never);
            case "updateLead":
                return executeUpdateLead(client, params as never);

            // List Operations
            case "getLists":
                return executeGetLists(client, params as never);
            case "getListMembers":
                return executeGetListMembers(client, params as never);
            case "addToList":
                return executeAddToList(client, params as never);
            case "removeFromList":
                return executeRemoveFromList(client, params as never);

            // Campaign Operations
            case "getCampaigns":
                return executeGetCampaigns(client, params as never);
            case "requestCampaign":
                return executeRequestCampaign(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): MarketoClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get API key (Client ID) and secret (Client Secret) from connection data
        const data = connection.data as ApiKeyData;

        // Get instance URL from metadata
        const metadata = connection.metadata as Record<string, unknown> | undefined;
        const instanceUrl = metadata?.instanceUrl as string;

        if (!instanceUrl) {
            throw new Error("Marketo instance URL is required");
        }

        if (!data.api_key) {
            throw new Error("Marketo Client ID is required");
        }

        if (!data.api_secret) {
            throw new Error("Marketo Client Secret is required");
        }

        const client = new MarketoClient({
            instanceUrl,
            clientId: data.api_key,
            clientSecret: data.api_secret,
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
