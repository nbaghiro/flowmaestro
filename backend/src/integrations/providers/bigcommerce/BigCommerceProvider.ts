import crypto from "crypto";
import { BaseProvider } from "../../core/BaseProvider";
import { BigCommerceClient } from "./client/BigCommerceClient";
import { BigCommerceMCPAdapter } from "./mcp/BigCommerceMCPAdapter";
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
    getInventoryOperation,
    executeGetInventory,
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
    GetInventoryParams,
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
 * BigCommerce Provider Implementation
 *
 * Provides integration with BigCommerce APIs for:
 * - Order management (V2 API: list, get, create, update)
 * - Product management (V3 Catalog API: list, get, create, update)
 * - Customer management (V3 API: list, get, create, update)
 * - Inventory management (V3 API: get, update)
 * - Webhook management (V3 API: list, create, delete)
 */
export class BigCommerceProvider extends BaseProvider {
    readonly name = "bigcommerce";
    readonly displayName = "BigCommerce";
    readonly authMethod: ConnectionMethod = "api_key";
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 300, // Conservative for Basic tier (150/30sec = 5/sec)
            burstSize: 30
        }
    };

    private clientPool: Map<string, BigCommerceClient> = new Map();
    private mcpAdapter: BigCommerceMCPAdapter;

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
        this.registerOperation(getInventoryOperation);
        this.registerOperation(updateInventoryOperation);
        this.registerOperation(listWebhooksOperation);
        this.registerOperation(createWebhookOperation);
        this.registerOperation(deleteWebhookOperation);

        // Register triggers (webhook events)
        this.registerTrigger({
            id: "store/order/created",
            name: "Order Created",
            description: "Triggered when a new order is placed",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "store/order/updated",
            name: "Order Updated",
            description: "Triggered when an order is modified",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "store/order/statusUpdated",
            name: "Order Status Updated",
            description: "Triggered when an order status changes",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "store/product/created",
            name: "Product Created",
            description: "Triggered when a new product is created",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "store/product/updated",
            name: "Product Updated",
            description: "Triggered when a product is modified",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "store/product/deleted",
            name: "Product Deleted",
            description: "Triggered when a product is deleted",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "store/product/inventory/updated",
            name: "Inventory Updated",
            description: "Triggered when product inventory changes",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "store/customer/created",
            name: "Customer Created",
            description: "Triggered when a new customer is registered",
            payloadSchema: { type: "object" }
        });
        this.registerTrigger({
            id: "store/customer/updated",
            name: "Customer Updated",
            description: "Triggered when a customer is modified",
            payloadSchema: { type: "object" }
        });

        // Configure webhook handling
        // BigCommerce uses X-BC-Webhook-Payload-Hash for signature verification
        this.setWebhookConfig({
            setupType: "automatic",
            signatureType: "hmac_sha256",
            signatureHeader: "X-BC-Webhook-Payload-Hash"
            // Note: BigCommerce doesn't have a standard event header,
            // the scope is embedded in the webhook configuration
        });

        // Initialize MCP adapter
        this.mcpAdapter = new BigCommerceMCPAdapter(this.operations);
    }

    /**
     * Get authentication configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "X-Auth-Token",
            headerTemplate: "{{api_key}}"
        };
        return config;
    }

    /**
     * Get or create client for connection
     */
    private getOrCreateClient(connection: ConnectionWithData): BigCommerceClient {
        const cacheKey = connection.id;
        let client = this.clientPool.get(cacheKey);

        if (!client) {
            const data = connection.data as ApiKeyData;

            if (!data.api_key) {
                throw new Error("Missing Access Token");
            }

            if (!data.api_secret) {
                throw new Error("Missing Store Hash");
            }

            client = new BigCommerceClient({
                accessToken: data.api_key,
                storeHash: data.api_secret,
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
     * Verify BigCommerce webhook signature
     * BigCommerce uses HMAC-SHA256 hash in X-BC-Webhook-Payload-Hash header
     */
    verifyWebhookSignature(secret: string, request: WebhookRequestData): WebhookVerificationResult {
        const signatureHeader = "X-BC-Webhook-Payload-Hash";
        const signature = this.getHeader(request.headers, signatureHeader);

        if (!signature) {
            return { valid: false, error: `Missing signature header: ${signatureHeader}` };
        }

        const bodyString = this.getBodyString(request);

        // BigCommerce uses hex-encoded HMAC-SHA256
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(bodyString, "utf-8");
        const computed = hmac.digest("hex");

        return {
            valid: this.timingSafeEqual(signature.toLowerCase(), computed.toLowerCase())
        };
    }

    /**
     * Extract event type from BigCommerce webhook
     * BigCommerce doesn't send the scope in headers, but includes it in the payload
     */
    extractEventType(request: WebhookRequestData): string | undefined {
        // BigCommerce sends scope in the webhook payload
        const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
        return body?.scope as string | undefined;
    }
}
