import { BaseProvider } from "../../core/BaseProvider";
import { WixClient } from "./client/WixClient";
import { WixMCPAdapter } from "./mcp/WixMCPAdapter";
import {
    // Product operations
    listProductsOperation,
    executeListProducts,
    getProductOperation,
    executeGetProduct,
    createProductOperation,
    executeCreateProduct,
    updateProductOperation,
    executeUpdateProduct,
    deleteProductOperation,
    executeDeleteProduct,
    // Order operations
    listOrdersOperation,
    executeListOrders,
    getOrderOperation,
    executeGetOrder,
    updateOrderOperation,
    executeUpdateOrder,
    cancelOrderOperation,
    executeCancelOrder,
    // Inventory operations
    listInventoryOperation,
    executeListInventory,
    getInventoryOperation,
    executeGetInventory,
    updateInventoryOperation,
    executeUpdateInventory,
    incrementInventoryOperation,
    executeIncrementInventory,
    decrementInventoryOperation,
    executeDecrementInventory,
    // Collection operations
    listCollectionsOperation,
    executeListCollections,
    getCollectionOperation,
    executeGetCollection
} from "./operations";
import type {
    ListProductsParams,
    GetProductParams,
    CreateProductParams,
    UpdateProductParams,
    DeleteProductParams,
    ListOrdersParams,
    GetOrderParams,
    UpdateOrderParams,
    CancelOrderParams,
    ListInventoryParams,
    GetInventoryParams,
    UpdateInventoryParams,
    IncrementInventoryParams,
    DecrementInventoryParams,
    ListCollectionsParams,
    GetCollectionParams
} from "./schemas";
import type {
    ConnectionWithData,
    ConnectionMethod,
    ApiKeyData
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
 * Wix Provider Implementation
 *
 * Provides integration with Wix eCommerce REST API for:
 * - Product management (list, get, create, update, delete)
 * - Order management (list, get, update, cancel)
 * - Inventory management (list, get, update, increment, decrement)
 * - Collection management (list, get)
 */
export class WixProvider extends BaseProvider {
    readonly name = "wix";
    readonly displayName = "Wix";
    readonly authMethod: ConnectionMethod = "api_key";
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 200, // 200 requests per minute
            burstSize: 50
        }
    };

    private clientPool: Map<string, WixClient> = new Map();
    private mcpAdapter: WixMCPAdapter;

    constructor() {
        super();

        // Register all operations
        this.registerOperation(listProductsOperation);
        this.registerOperation(getProductOperation);
        this.registerOperation(createProductOperation);
        this.registerOperation(updateProductOperation);
        this.registerOperation(deleteProductOperation);
        this.registerOperation(listOrdersOperation);
        this.registerOperation(getOrderOperation);
        this.registerOperation(updateOrderOperation);
        this.registerOperation(cancelOrderOperation);
        this.registerOperation(listInventoryOperation);
        this.registerOperation(getInventoryOperation);
        this.registerOperation(updateInventoryOperation);
        this.registerOperation(incrementInventoryOperation);
        this.registerOperation(decrementInventoryOperation);
        this.registerOperation(listCollectionsOperation);
        this.registerOperation(getCollectionOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new WixMCPAdapter(this.operations);
    }

    /**
     * Get authentication configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "{{api_key}}"
        };
        return config;
    }

    /**
     * Get or create client for connection
     */
    private getOrCreateClient(connection: ConnectionWithData): WixClient {
        const cacheKey = connection.id;
        let client = this.clientPool.get(cacheKey);

        if (!client) {
            const data = connection.data as ApiKeyData;

            if (!data.api_key) {
                throw new Error("Missing API key");
            }

            const siteId = connection.metadata?.provider_config?.siteId;
            if (!siteId || typeof siteId !== "string") {
                throw new Error("Missing Site ID");
            }

            client = new WixClient({
                apiKey: data.api_key,
                siteId,
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
            // Product operations
            case "listProducts":
                return executeListProducts(
                    client,
                    this.validateParams<ListProductsParams>(operation, params)
                );
            case "getProduct":
                return executeGetProduct(
                    client,
                    this.validateParams<GetProductParams>(operation, params)
                );
            case "createProduct":
                return executeCreateProduct(
                    client,
                    this.validateParams<CreateProductParams>(operation, params)
                );
            case "updateProduct":
                return executeUpdateProduct(
                    client,
                    this.validateParams<UpdateProductParams>(operation, params)
                );
            case "deleteProduct":
                return executeDeleteProduct(
                    client,
                    this.validateParams<DeleteProductParams>(operation, params)
                );

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
            case "updateOrder":
                return executeUpdateOrder(
                    client,
                    this.validateParams<UpdateOrderParams>(operation, params)
                );
            case "cancelOrder":
                return executeCancelOrder(
                    client,
                    this.validateParams<CancelOrderParams>(operation, params)
                );

            // Inventory operations
            case "listInventory":
                return executeListInventory(
                    client,
                    this.validateParams<ListInventoryParams>(operation, params)
                );
            case "getInventory":
                return executeGetInventory(
                    client,
                    this.validateParams<GetInventoryParams>(operation, params)
                );
            case "updateInventory":
                return executeUpdateInventory(
                    client,
                    this.validateParams<UpdateInventoryParams>(operation, params)
                );
            case "incrementInventory":
                return executeIncrementInventory(
                    client,
                    this.validateParams<IncrementInventoryParams>(operation, params)
                );
            case "decrementInventory":
                return executeDecrementInventory(
                    client,
                    this.validateParams<DecrementInventoryParams>(operation, params)
                );

            // Collection operations
            case "listCollections":
                return executeListCollections(
                    client,
                    this.validateParams<ListCollectionsParams>(operation, params)
                );
            case "getCollection":
                return executeGetCollection(
                    client,
                    this.validateParams<GetCollectionParams>(operation, params)
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
