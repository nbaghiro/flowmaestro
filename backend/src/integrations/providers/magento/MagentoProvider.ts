import { BaseProvider } from "../../core/BaseProvider";
import { MagentoClient } from "./client/MagentoClient";
import { MagentoMCPAdapter } from "./mcp/MagentoMCPAdapter";
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
    // Order operations
    listOrdersOperation,
    executeListOrders,
    getOrderOperation,
    executeGetOrder,
    updateOrderStatusOperation,
    executeUpdateOrderStatus,
    // Customer operations
    listCustomersOperation,
    executeListCustomers,
    getCustomerOperation,
    executeGetCustomer,
    createCustomerOperation,
    executeCreateCustomer,
    // Inventory operations
    getInventoryOperation,
    executeGetInventory,
    updateInventoryOperation,
    executeUpdateInventory,
    // Category operations
    listCategoriesOperation,
    executeListCategories
} from "./operations";
import type {
    ListProductsParams,
    GetProductParams,
    CreateProductParams,
    UpdateProductParams,
    ListOrdersParams,
    GetOrderParams,
    UpdateOrderStatusParams,
    ListCustomersParams,
    GetCustomerParams,
    CreateCustomerParams,
    GetInventoryParams,
    UpdateInventoryParams,
    ListCategoriesParams
} from "./schemas";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Magento (Adobe Commerce) Provider
 *
 * Features:
 * - Product management (list, get, create, update)
 * - Order management (list, get, update status)
 * - Customer management (list, get, create)
 * - Inventory management (get, update via MSI)
 * - Category browsing
 */
export class MagentoProvider extends BaseProvider {
    readonly name = "magento";
    readonly displayName = "Magento";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 1800, // ~30 req/sec typical limit
            burstSize: 60
        }
    };

    private mcpAdapter: MagentoMCPAdapter;
    private clientPool: Map<string, MagentoClient> = new Map();

    constructor() {
        super();

        // Register product operations
        this.registerOperation(listProductsOperation);
        this.registerOperation(getProductOperation);
        this.registerOperation(createProductOperation);
        this.registerOperation(updateProductOperation);

        // Register order operations
        this.registerOperation(listOrdersOperation);
        this.registerOperation(getOrderOperation);
        this.registerOperation(updateOrderStatusOperation);

        // Register customer operations
        this.registerOperation(listCustomersOperation);
        this.registerOperation(getCustomerOperation);
        this.registerOperation(createCustomerOperation);

        // Register inventory operations
        this.registerOperation(getInventoryOperation);
        this.registerOperation(updateInventoryOperation);

        // Register category operations
        this.registerOperation(listCategoriesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new MagentoMCPAdapter(this.operations);

        // Configure webhook settings (manual setup required in Magento)
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "hmac_sha256",
            signatureHeader: "X-Magento-Signature"
        });

        // Register triggers
        this.registerTrigger({
            id: "order.created",
            name: "Order Created",
            description: "Triggered when a new order is placed",
            configFields: [],
            tags: ["orders", "sales"]
        });

        this.registerTrigger({
            id: "order.updated",
            name: "Order Updated",
            description: "Triggered when an order is modified",
            configFields: [],
            tags: ["orders", "sales"]
        });

        this.registerTrigger({
            id: "product.created",
            name: "Product Created",
            description: "Triggered when a new product is created",
            configFields: [],
            tags: ["products", "catalog"]
        });

        this.registerTrigger({
            id: "product.updated",
            name: "Product Updated",
            description: "Triggered when a product is updated",
            configFields: [],
            tags: ["products", "catalog"]
        });

        this.registerTrigger({
            id: "inventory.updated",
            name: "Inventory Updated",
            description: "Triggered when inventory levels change",
            configFields: [],
            tags: ["inventory", "stock"]
        });
    }

    /**
     * Get API Key configuration
     * Magento uses Bearer token authentication
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
        };
        return config;
    }

    /**
     * Execute operation
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // Product operations
            case "listProducts":
                return await executeListProducts(
                    client,
                    this.validateParams<ListProductsParams>(operationId, params)
                );
            case "getProduct":
                return await executeGetProduct(
                    client,
                    this.validateParams<GetProductParams>(operationId, params)
                );
            case "createProduct":
                return await executeCreateProduct(
                    client,
                    this.validateParams<CreateProductParams>(operationId, params)
                );
            case "updateProduct":
                return await executeUpdateProduct(
                    client,
                    this.validateParams<UpdateProductParams>(operationId, params)
                );

            // Order operations
            case "listOrders":
                return await executeListOrders(
                    client,
                    this.validateParams<ListOrdersParams>(operationId, params)
                );
            case "getOrder":
                return await executeGetOrder(
                    client,
                    this.validateParams<GetOrderParams>(operationId, params)
                );
            case "updateOrderStatus":
                return await executeUpdateOrderStatus(
                    client,
                    this.validateParams<UpdateOrderStatusParams>(operationId, params)
                );

            // Customer operations
            case "listCustomers":
                return await executeListCustomers(
                    client,
                    this.validateParams<ListCustomersParams>(operationId, params)
                );
            case "getCustomer":
                return await executeGetCustomer(
                    client,
                    this.validateParams<GetCustomerParams>(operationId, params)
                );
            case "createCustomer":
                return await executeCreateCustomer(
                    client,
                    this.validateParams<CreateCustomerParams>(operationId, params)
                );

            // Inventory operations
            case "getInventory":
                return await executeGetInventory(
                    client,
                    this.validateParams<GetInventoryParams>(operationId, params)
                );
            case "updateInventory":
                return await executeUpdateInventory(
                    client,
                    this.validateParams<UpdateInventoryParams>(operationId, params)
                );

            // Category operations
            case "listCategories":
                return await executeListCategories(
                    client,
                    this.validateParams<ListCategoriesParams>(operationId, params)
                );

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
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if ((result as { success?: boolean }).success) {
            return (result as { data?: unknown }).data;
        } else {
            throw new Error(
                (result as { error?: { message?: string } }).error?.message ||
                    "MCP tool execution failed"
            );
        }
    }

    /**
     * Get or create Magento client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): MagentoClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as ApiKeyData;

        // Store URL is stored in api_secret field (using "requiresSecret" pattern)
        const storeUrl = data.api_secret;

        if (!storeUrl) {
            throw new Error("Store URL not found. Please reconnect with your Magento store URL.");
        }

        const client = new MagentoClient({
            accessToken: data.api_key,
            storeUrl,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    /**
     * Clear client from pool
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
