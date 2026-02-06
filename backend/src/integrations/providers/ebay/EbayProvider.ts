/**
 * eBay Integration Provider
 *
 * eBay marketplace with OAuth2 authentication.
 * Supports Browse, Fulfillment, and Inventory APIs.
 *
 * Rate limit: ~5000 calls/day (~80/min conservative)
 */

import { BaseProvider } from "../../core/BaseProvider";
import { EbayClient } from "./client/EbayClient";
import { EbayMCPAdapter } from "./mcp/EbayMCPAdapter";
import {
    // Browse Operations
    searchItemsOperation,
    executeSearchItems,
    getItemOperation,
    executeGetItem,
    // Fulfillment Operations
    listOrdersOperation,
    executeListOrders,
    getOrderOperation,
    executeGetOrder,
    createShippingFulfillmentOperation,
    executeCreateShippingFulfillment,
    // Inventory Operations
    getInventoryItemOperation,
    executeGetInventoryItem,
    createOrReplaceInventoryItemOperation,
    executeCreateOrReplaceInventoryItem
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class EbayProvider extends BaseProvider {
    readonly name = "ebay";
    readonly displayName = "eBay";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 80,
            burstSize: 10
        }
    };

    private clientPool: Map<string, EbayClient> = new Map();
    private mcpAdapter: EbayMCPAdapter;

    constructor() {
        super();

        // Register Browse Operations (2 operations)
        this.registerOperation(searchItemsOperation);
        this.registerOperation(getItemOperation);

        // Register Fulfillment Operations (3 operations)
        this.registerOperation(listOrdersOperation);
        this.registerOperation(getOrderOperation);
        this.registerOperation(createShippingFulfillmentOperation);

        // Register Inventory Operations (2 operations)
        this.registerOperation(getInventoryItemOperation);
        this.registerOperation(createOrReplaceInventoryItemOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new EbayMCPAdapter(this.operations);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "Bearer {{access_token}}"
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
            // Browse Operations
            case "searchItems":
                return executeSearchItems(client, params as never);
            case "getItem":
                return executeGetItem(client, params as never);

            // Fulfillment Operations
            case "listOrders":
                return executeListOrders(client, params as never);
            case "getOrder":
                return executeGetOrder(client, params as never);
            case "createShippingFulfillment":
                return executeCreateShippingFulfillment(client, params as never);

            // Inventory Operations
            case "getInventoryItem":
                return executeGetInventoryItem(client, params as never);
            case "createOrReplaceInventoryItem":
                return executeCreateOrReplaceInventoryItem(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): EbayClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;

        if (!data.access_token) {
            throw new Error("eBay access token is required");
        }

        const client = new EbayClient({
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
