/**
 * ActiveCampaign Provider
 *
 * Email marketing automation provider with:
 * - Contact management
 * - Lists and segments
 * - Tags
 * - Automations
 * - Campaigns
 * - Custom fields
 *
 * Uses API Key authentication with account subdomain.
 */

import { BaseProvider } from "../../core/BaseProvider";
import { ActiveCampaignClient } from "./client/ActiveCampaignClient";
import { ActiveCampaignMCPAdapter } from "./mcp/ActiveCampaignMCPAdapter";
import {
    // Contact Operations
    getContactsOperation,
    executeGetContacts,
    getContactOperation,
    executeGetContact,
    createContactOperation,
    executeCreateContact,
    updateContactOperation,
    executeUpdateContact,
    deleteContactOperation,
    executeDeleteContact,
    // List Operations
    getListsOperation,
    executeGetLists,
    getListOperation,
    executeGetList,
    createListOperation,
    executeCreateList,
    addToListOperation,
    executeAddToList,
    removeFromListOperation,
    executeRemoveFromList,
    // Tag Operations
    getTagsOperation,
    executeGetTags,
    addTagOperation,
    executeAddTag,
    removeTagOperation,
    executeRemoveTag,
    // Automation Operations
    getAutomationsOperation,
    executeGetAutomations,
    addContactToAutomationOperation,
    executeAddContactToAutomation,
    // Campaign Operations
    getCampaignsOperation,
    executeGetCampaigns,
    getCampaignStatsOperation,
    executeGetCampaignStats,
    // Custom Field Operations
    getCustomFieldsOperation,
    executeGetCustomFields
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

interface ActiveCampaignConnectionData extends ApiKeyData {
    account?: string; // Account subdomain
}

export class ActiveCampaignProvider extends BaseProvider {
    readonly name = "activecampaign";
    readonly displayName = "ActiveCampaign";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 300, // 5 requests per second
            burstSize: 5
        }
    };

    private clientPool: Map<string, ActiveCampaignClient> = new Map();
    private mcpAdapter: ActiveCampaignMCPAdapter;

    constructor() {
        super();

        // Register Contact Operations
        this.registerOperation(getContactsOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(createContactOperation);
        this.registerOperation(updateContactOperation);
        this.registerOperation(deleteContactOperation);

        // Register List Operations
        this.registerOperation(getListsOperation);
        this.registerOperation(getListOperation);
        this.registerOperation(createListOperation);
        this.registerOperation(addToListOperation);
        this.registerOperation(removeFromListOperation);

        // Register Tag Operations
        this.registerOperation(getTagsOperation);
        this.registerOperation(addTagOperation);
        this.registerOperation(removeTagOperation);

        // Register Automation Operations
        this.registerOperation(getAutomationsOperation);
        this.registerOperation(addContactToAutomationOperation);

        // Register Campaign Operations
        this.registerOperation(getCampaignsOperation);
        this.registerOperation(getCampaignStatsOperation);

        // Register Custom Field Operations
        this.registerOperation(getCustomFieldsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ActiveCampaignMCPAdapter(this.operations);
    }

    getAuthConfig(): AuthConfig {
        return {
            headerName: "Api-Token",
            headerTemplate: "{{api_key}}"
        };
    }

    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // Contact Operations
            case "getContacts":
                return executeGetContacts(client, params as never);
            case "getContact":
                return executeGetContact(client, params as never);
            case "createContact":
                return executeCreateContact(client, params as never);
            case "updateContact":
                return executeUpdateContact(client, params as never);
            case "deleteContact":
                return executeDeleteContact(client, params as never);

            // List Operations
            case "getLists":
                return executeGetLists(client, params as never);
            case "getList":
                return executeGetList(client, params as never);
            case "createList":
                return executeCreateList(client, params as never);
            case "addToList":
                return executeAddToList(client, params as never);
            case "removeFromList":
                return executeRemoveFromList(client, params as never);

            // Tag Operations
            case "getTags":
                return executeGetTags(client, params as never);
            case "addTag":
                return executeAddTag(client, params as never);
            case "removeTag":
                return executeRemoveTag(client, params as never);

            // Automation Operations
            case "getAutomations":
                return executeGetAutomations(client, params as never);
            case "addContactToAutomation":
                return executeAddContactToAutomation(client, params as never);

            // Campaign Operations
            case "getCampaigns":
                return executeGetCampaigns(client, params as never);
            case "getCampaignStats":
                return executeGetCampaignStats(client, params as never);

            // Custom Field Operations
            case "getCustomFields":
                return executeGetCustomFields(client, params as never);

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

    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if (!result.success) {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }

        return result.data;
    }

    private getOrCreateClient(connection: ConnectionWithData): ActiveCampaignClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as ActiveCampaignConnectionData;

        if (!data.api_key) {
            throw new Error("ActiveCampaign API key is required");
        }

        if (!data.account) {
            throw new Error("ActiveCampaign account name is required");
        }

        const client = new ActiveCampaignClient({
            apiKey: data.api_key,
            accountName: data.account,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);
        return client;
    }
}
