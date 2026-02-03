import { BaseProvider } from "../../core/BaseProvider";
import { AmazonSellerCentralClient } from "./client/AmazonSellerCentralClient";
import { AmazonSellerCentralMCPAdapter } from "./mcp/AmazonSellerCentralMCPAdapter";
import {
    // Order operations
    listOrdersOperation,
    executeListOrders,
    getOrderOperation,
    executeGetOrder,
    getOrderItemsOperation,
    executeGetOrderItems,
    // Catalog operations
    searchCatalogItemsOperation,
    executeSearchCatalogItems,
    getCatalogItemOperation,
    executeGetCatalogItem,
    // Inventory operations
    getInventorySummariesOperation,
    executeGetInventorySummaries,
    // Pricing operations
    getCompetitivePricingOperation,
    executeGetCompetitivePricing,
    getItemOffersOperation,
    executeGetItemOffers
} from "./operations";
import type {
    ListOrdersParams,
    GetOrderParams,
    GetOrderItemsParams,
    SearchCatalogItemsParams,
    GetCatalogItemParams,
    GetInventorySummariesParams,
    GetCompetitivePricingParams,
    GetItemOffersParams
} from "./operations/schemas";
import type {
    ConnectionWithData,
    ConnectionMethod,
    OAuth2TokenData
} from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ProviderCapabilities,
    ExecutionContext,
    OperationResult,
    MCPTool,
    APIKeyConfig
} from "../../core/types";

/**
 * Amazon Seller Central Provider Implementation
 *
 * Provides integration with Amazon SP-API for:
 * - Order management (list, get, get items)
 * - Catalog search and item details
 * - FBA inventory summaries
 * - Competitive pricing and item offers
 */
export class AmazonSellerCentralProvider extends BaseProvider {
    readonly name = "amazon-seller-central";
    readonly displayName = "Amazon Seller Central";
    readonly authMethod: ConnectionMethod = "oauth2";
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 600,
            burstSize: 60
        }
    };

    private clientPool: Map<string, AmazonSellerCentralClient> = new Map();
    private mcpAdapter: AmazonSellerCentralMCPAdapter;

    constructor() {
        super();

        // Register all operations
        this.registerOperation(listOrdersOperation);
        this.registerOperation(getOrderOperation);
        this.registerOperation(getOrderItemsOperation);
        this.registerOperation(searchCatalogItemsOperation);
        this.registerOperation(getCatalogItemOperation);
        this.registerOperation(getInventorySummariesOperation);
        this.registerOperation(getCompetitivePricingOperation);
        this.registerOperation(getItemOffersOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new AmazonSellerCentralMCPAdapter(this.operations);
    }

    /**
     * Get authentication configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "x-amz-access-token",
            headerTemplate: "{token}"
        };
        return config;
    }

    /**
     * Get or create client for connection
     */
    private getOrCreateClient(connection: ConnectionWithData): AmazonSellerCentralClient {
        const cacheKey = connection.id;
        let client = this.clientPool.get(cacheKey);

        if (!client) {
            const data = connection.data as OAuth2TokenData;

            if (!data.access_token) {
                throw new Error("Missing access token. Please reconnect your Amazon account.");
            }

            client = new AmazonSellerCentralClient({
                accessToken: data.access_token,
                region: (data as unknown as Record<string, unknown>).region as string | undefined,
                connectionId: connection.id
            });

            this.clientPool.set(cacheKey, client);
        }

        return client;
    }

    /**
     * Execute an operation
     */
    async executeOperation(
        operation: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operation) {
            // Order operations
            case "listOrders":
                return executeListOrders(
                    client,
                    this.validateParams<ListOrdersParams>(operation, params)
                );
            case "getOrder":
                return executeGetOrder(
                    client,
                    this.validateParams<GetOrderParams>(operation, params)
                );
            case "getOrderItems":
                return executeGetOrderItems(
                    client,
                    this.validateParams<GetOrderItemsParams>(operation, params)
                );

            // Catalog operations
            case "searchCatalogItems":
                return executeSearchCatalogItems(
                    client,
                    this.validateParams<SearchCatalogItemsParams>(operation, params)
                );
            case "getCatalogItem":
                return executeGetCatalogItem(
                    client,
                    this.validateParams<GetCatalogItemParams>(operation, params)
                );

            // Inventory operations
            case "getInventorySummaries":
                return executeGetInventorySummaries(
                    client,
                    this.validateParams<GetInventorySummariesParams>(operation, params)
                );

            // Pricing operations
            case "getCompetitivePricing":
                return executeGetCompetitivePricing(
                    client,
                    this.validateParams<GetCompetitivePricingParams>(operation, params)
                );
            case "getItemOffers":
                return executeGetItemOffers(
                    client,
                    this.validateParams<GetItemOffersParams>(operation, params)
                );

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operation}`,
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
        return this.mcpAdapter.executeTool(toolName, params, client);
    }
}
