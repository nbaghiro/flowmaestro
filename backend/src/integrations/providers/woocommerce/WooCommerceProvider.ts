import crypto from "crypto";
import { BaseProvider } from "../../core/BaseProvider";
import { WooCommerceClient } from "./client/WooCommerceClient";
import { WooCommerceMCPAdapter } from "./mcp/WooCommerceMCPAdapter";
import {
    // Order operations
    listOrdersOperation,
    executeListOrders,
    getOrderOperation,
    executeGetOrder,
    createOrderOperation,
    executeCreateOrder,
    updateOrderOperation,
    executeUpdateOrder,
    // Product operations
    listProductsOperation,
    executeListProducts,
    getProductOperation,
    executeGetProduct,
    createProductOperation,
    executeCreateProduct,
    updateProductOperation,
    executeUpdateProduct,
    // Customer operations
    listCustomersOperation,
    executeListCustomers,
    getCustomerOperation,
    executeGetCustomer,
    createCustomerOperation,
    executeCreateCustomer,
    updateCustomerOperation,
    executeUpdateCustomer,
    // Inventory operations
    updateInventoryOperation,
    executeUpdateInventory,
    // Webhook operations
    listWebhooksOperation,
    executeListWebhooks,
    createWebhookOperation,
    executeCreateWebhook,
    deleteWebhookOperation,
    executeDeleteWebhook
} from "./operations";
import type {
    ListOrdersParams,
    GetOrderParams,
    CreateOrderParams,
    UpdateOrderParams,
    ListProductsParams,
    GetProductParams,
    CreateProductParams,
    UpdateProductParams,
    ListCustomersParams,
    GetCustomerParams,
    CreateCustomerParams,
    UpdateCustomerParams,
    UpdateInventoryParams,
    ListWebhooksParams,
    CreateWebhookParams,
    DeleteWebhookParams
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
    WebhookRequestData,
    WebhookVerificationResult,
    APIKeyConfig
} from "../../core/types";

/**
 * WooCommerce Provider Implementation
 *
 * Provides integration with WooCommerce REST API v3 for:
 * - Order management (list, get, create, update)
 * - Product management (list, get, create, update)
 * - Customer management (list, get, create, update)
 * - Inventory management (update stock)
 * - Webhook management (list, create, delete)
 */
export class WooCommerceProvider extends BaseProvider {
    readonly name = "woocommerce";
    readonly displayName = "WooCommerce";
    readonly authMethod: ConnectionMethod = "api_key";
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 1500, // WooCommerce recommends max 25 concurrent
            burstSize: 25
        }
    };

    private clientPool: Map<string, WooCommerceClient> = new Map();
    private mcpAdapter: WooCommerceMCPAdapter;

    constructor() {
        super();

        // Register all operations
        this.registerOperation(listOrdersOperation);
        this.registerOperation(getOrderOperation);
        this.registerOperation(createOrderOperation);
        this.registerOperation(updateOrderOperation);
        this.registerOperation(listProductsOperation);
        this.registerOperation(getProductOperation);
        this.registerOperation(createProductOperation);
        this.registerOperation(updateProductOperation);
        this.registerOperation(listCustomersOperation);
        this.registerOperation(getCustomerOperation);
        this.registerOperation(createCustomerOperation);
        this.registerOperation(updateCustomerOperation);
        this.registerOperation(updateInventoryOperation);
        this.registerOperation(listWebhooksOperation);
        this.registerOperation(createWebhookOperation);
        this.registerOperation(deleteWebhookOperation);

        // Register triggers (webhook events)
        this.registerTrigger({
            id: "order.created",
            name: "Order Created",
            description: "Triggered when a new order is placed",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "order.updated",
            name: "Order Updated",
            description: "Triggered when an order is modified",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "order.deleted",
            name: "Order Deleted",
            description: "Triggered when an order is deleted",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "product.created",
            name: "Product Created",
            description: "Triggered when a new product is created",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "product.updated",
            name: "Product Updated",
            description: "Triggered when a product is modified",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "product.deleted",
            name: "Product Deleted",
            description: "Triggered when a product is deleted",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "customer.created",
            name: "Customer Created",
            description: "Triggered when a new customer is registered",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "customer.updated",
            name: "Customer Updated",
            description: "Triggered when a customer is modified",
            payloadSchema: { type: "object" }
        });

        // Configure webhook handling
        this.setWebhookConfig({
            setupType: "automatic",
            signatureType: "hmac_sha256",
            signatureHeader: "X-WC-Webhook-Signature",
            eventHeader: "X-WC-Webhook-Topic"
        });

        // Initialize MCP adapter
        this.mcpAdapter = new WooCommerceMCPAdapter(this.operations);
    }

    /**
     * Get authentication configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Basic {{base64(api_key:api_secret)}}"
        };
        return config;
    }

    /**
     * Get or create client for connection
     */
    private getOrCreateClient(connection: ConnectionWithData): WooCommerceClient {
        const cacheKey = connection.id;
        let client = this.clientPool.get(cacheKey);

        if (!client) {
            const data = connection.data as ApiKeyData;

            if (!data.api_key || !data.api_secret) {
                throw new Error("Missing Consumer Key or Consumer Secret");
            }

            const storeUrl = connection.metadata?.provider_config?.storeUrl;
            if (!storeUrl || typeof storeUrl !== "string") {
                throw new Error("Missing store URL");
            }

            client = new WooCommerceClient({
                consumerKey: data.api_key,
                consumerSecret: data.api_secret,
                storeUrl,
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
            case "createOrder":
                return executeCreateOrder(
                    client,
                    this.validateParams<CreateOrderParams>(operation, params)
                );
            case "updateOrder":
                return executeUpdateOrder(
                    client,
                    this.validateParams<UpdateOrderParams>(operation, params)
                );

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

            // Customer operations
            case "listCustomers":
                return executeListCustomers(
                    client,
                    this.validateParams<ListCustomersParams>(operation, params)
                );
            case "getCustomer":
                return executeGetCustomer(
                    client,
                    this.validateParams<GetCustomerParams>(operation, params)
                );
            case "createCustomer":
                return executeCreateCustomer(
                    client,
                    this.validateParams<CreateCustomerParams>(operation, params)
                );
            case "updateCustomer":
                return executeUpdateCustomer(
                    client,
                    this.validateParams<UpdateCustomerParams>(operation, params)
                );

            // Inventory operations
            case "updateInventory":
                return executeUpdateInventory(
                    client,
                    this.validateParams<UpdateInventoryParams>(operation, params)
                );

            // Webhook operations
            case "listWebhooks":
                return executeListWebhooks(
                    client,
                    this.validateParams<ListWebhooksParams>(operation, params)
                );
            case "createWebhook":
                return executeCreateWebhook(
                    client,
                    this.validateParams<CreateWebhookParams>(operation, params)
                );
            case "deleteWebhook":
                return executeDeleteWebhook(
                    client,
                    this.validateParams<DeleteWebhookParams>(operation, params)
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

    /**
     * Verify WooCommerce webhook signature
     * WooCommerce uses base64-encoded HMAC-SHA256
     */
    verifyWebhookSignature(secret: string, request: WebhookRequestData): WebhookVerificationResult {
        const signatureHeader = "X-WC-Webhook-Signature";
        const signature = this.getHeader(request.headers, signatureHeader);

        if (!signature) {
            return { valid: false, error: `Missing signature header: ${signatureHeader}` };
        }

        const bodyString = this.getBodyString(request);

        // WooCommerce uses base64-encoded HMAC-SHA256
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(bodyString, "utf-8");
        const computed = hmac.digest("base64");

        return {
            valid: this.timingSafeEqual(signature, computed)
        };
    }

    /**
     * Extract event type from WooCommerce webhook
     */
    extractEventType(request: WebhookRequestData): string | undefined {
        // WooCommerce sends topic in X-WC-Webhook-Topic header (e.g., "order.created")
        const topic = this.getHeader(request.headers, "X-WC-Webhook-Topic");
        return topic;
    }
}
