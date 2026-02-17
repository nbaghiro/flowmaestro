/**
 * ConvertKit Provider
 *
 * Email marketing for creators with:
 * - Subscribers
 * - Tags
 * - Sequences (email courses)
 * - Forms
 * - Broadcasts
 *
 * Uses API Key authentication.
 * Rate Limits: 120 requests per rolling 60-second period
 */

import { BaseProvider } from "../../core/BaseProvider";
import { ConvertKitClient } from "./client/ConvertKitClient";
import { ConvertKitMCPAdapter } from "./mcp/ConvertKitMCPAdapter";
import {
    // Subscriber Operations
    getSubscribersOperation,
    executeGetSubscribers,
    getSubscriberOperation,
    executeGetSubscriber,
    createSubscriberOperation,
    executeCreateSubscriber,
    updateSubscriberOperation,
    executeUpdateSubscriber,
    unsubscribeSubscriberOperation,
    executeUnsubscribeSubscriber,
    // Tag Operations
    getTagsOperation,
    executeGetTags,
    createTagOperation,
    executeCreateTag,
    addTagToSubscriberOperation,
    executeAddTagToSubscriber,
    removeTagFromSubscriberOperation,
    executeRemoveTagFromSubscriber,
    // Sequence Operations
    getSequencesOperation,
    executeGetSequences,
    addSubscriberToSequenceOperation,
    executeAddSubscriberToSequence,
    // Form Operations
    getFormsOperation,
    executeGetForms,
    addSubscriberToFormOperation,
    executeAddSubscriberToForm,
    // Broadcast Operations
    getBroadcastsOperation,
    executeGetBroadcasts,
    getBroadcastOperation,
    executeGetBroadcast
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

interface ConvertKitConnectionData extends ApiKeyData {
    api_secret?: string;
}

export class ConvertKitProvider extends BaseProvider {
    readonly name = "convertkit";
    readonly displayName = "ConvertKit";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 120, // 120 per 60 seconds
            burstSize: 10
        }
    };

    private clientPool: Map<string, ConvertKitClient> = new Map();
    private mcpAdapter: ConvertKitMCPAdapter;

    constructor() {
        super();

        // Register Subscriber Operations
        this.registerOperation(getSubscribersOperation);
        this.registerOperation(getSubscriberOperation);
        this.registerOperation(createSubscriberOperation);
        this.registerOperation(updateSubscriberOperation);
        this.registerOperation(unsubscribeSubscriberOperation);

        // Register Tag Operations
        this.registerOperation(getTagsOperation);
        this.registerOperation(createTagOperation);
        this.registerOperation(addTagToSubscriberOperation);
        this.registerOperation(removeTagFromSubscriberOperation);

        // Register Sequence Operations
        this.registerOperation(getSequencesOperation);
        this.registerOperation(addSubscriberToSequenceOperation);

        // Register Form Operations
        this.registerOperation(getFormsOperation);
        this.registerOperation(addSubscriberToFormOperation);

        // Register Broadcast Operations
        this.registerOperation(getBroadcastsOperation);
        this.registerOperation(getBroadcastOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ConvertKitMCPAdapter(this.operations);
    }

    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
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
            // Subscriber Operations
            case "getSubscribers":
                return executeGetSubscribers(client, params as never);
            case "getSubscriber":
                return executeGetSubscriber(client, params as never);
            case "createSubscriber":
                return executeCreateSubscriber(client, params as never);
            case "updateSubscriber":
                return executeUpdateSubscriber(client, params as never);
            case "unsubscribeSubscriber":
                return executeUnsubscribeSubscriber(client, params as never);

            // Tag Operations
            case "getTags":
                return executeGetTags(client, params as never);
            case "createTag":
                return executeCreateTag(client, params as never);
            case "addTagToSubscriber":
                return executeAddTagToSubscriber(client, params as never);
            case "removeTagFromSubscriber":
                return executeRemoveTagFromSubscriber(client, params as never);

            // Sequence Operations
            case "getSequences":
                return executeGetSequences(client, params as never);
            case "addSubscriberToSequence":
                return executeAddSubscriberToSequence(client, params as never);

            // Form Operations
            case "getForms":
                return executeGetForms(client, params as never);
            case "addSubscriberToForm":
                return executeAddSubscriberToForm(client, params as never);

            // Broadcast Operations
            case "getBroadcasts":
                return executeGetBroadcasts(client, params as never);
            case "getBroadcast":
                return executeGetBroadcast(client, params as never);

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

    private getOrCreateClient(connection: ConnectionWithData): ConvertKitClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as ConvertKitConnectionData;

        if (!data.api_key) {
            throw new Error("ConvertKit API key is required");
        }

        // ConvertKit uses api_key for reads and api_secret for writes
        // If no api_secret provided, use api_key for both
        const apiSecret = data.api_secret || data.api_key;

        const client = new ConvertKitClient({
            apiKey: data.api_key,
            apiSecret: apiSecret,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);
        return client;
    }
}
