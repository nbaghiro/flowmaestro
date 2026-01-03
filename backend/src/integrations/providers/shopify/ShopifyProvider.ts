import crypto from "crypto";
import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { ShopifyClient } from "./client/ShopifyClient";
import { ShopifyMCPAdapter } from "./mcp/ShopifyMCPAdapter";
import {
    // Order operations
    listOrdersOperation,
    executeListOrders,
    getOrderOperation,
    executeGetOrder,
    updateOrderOperation,
    executeUpdateOrder,
    closeOrderOperation,
    executeCloseOrder,
    cancelOrderOperation,
    executeCancelOrder,
    // Product operations
    listProductsOperation,
    executeListProducts,
    getProductOperation,
    executeGetProduct,
    createProductOperation,
    executeCreateProduct,
    updateProductOperation,
    executeUpdateProduct,
    // Inventory operations
    listInventoryLevelsOperation,
    executeListInventoryLevels,
    adjustInventoryOperation,
    executeAdjustInventory,
    setInventoryOperation,
    executeSetInventory,
    // Webhook operations
    listWebhooksOperation,
    executeListWebhooks,
    createWebhookOperation,
    executeCreateWebhook,
    deleteWebhookOperation,
    executeDeleteWebhook
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    WebhookRequestData
} from "../../core/types";

/**
 * Shopify Provider - implements OAuth2 authentication with e-commerce operations
 *
 * Features:
 * - Order management (list, get, update, close, cancel)
 * - Product catalog (list, get, create, update)
 * - Inventory management (list levels, adjust, set)
 * - Webhook subscriptions (list, create, delete)
 */
export class ShopifyProvider extends BaseProvider {
    readonly name = "shopify";
    readonly displayName = "Shopify";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 40, // 40 requests per minute (2 req/sec refill)
            burstSize: 40
        }
    };

    private mcpAdapter: ShopifyMCPAdapter;
    private clientPool: Map<string, ShopifyClient> = new Map();

    constructor() {
        super();

        // Register order operations
        this.registerOperation(listOrdersOperation);
        this.registerOperation(getOrderOperation);
        this.registerOperation(updateOrderOperation);
        this.registerOperation(closeOrderOperation);
        this.registerOperation(cancelOrderOperation);

        // Register product operations
        this.registerOperation(listProductsOperation);
        this.registerOperation(getProductOperation);
        this.registerOperation(createProductOperation);
        this.registerOperation(updateProductOperation);

        // Register inventory operations
        this.registerOperation(listInventoryLevelsOperation);
        this.registerOperation(adjustInventoryOperation);
        this.registerOperation(setInventoryOperation);

        // Register webhook operations
        this.registerOperation(listWebhooksOperation);
        this.registerOperation(createWebhookOperation);
        this.registerOperation(deleteWebhookOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ShopifyMCPAdapter(this.operations);

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "automatic", // Shopify webhooks registered via API
            signatureType: "hmac_sha256",
            signatureHeader: "X-Shopify-Hmac-SHA256",
            eventHeader: "X-Shopify-Topic"
        });

        // Register order triggers
        this.registerTrigger({
            id: "orders/create",
            name: "Order Created",
            description: "Triggered when a new order is placed",
            requiredScopes: ["read_orders"],
            configFields: [],
            tags: ["orders", "sales"]
        });

        this.registerTrigger({
            id: "orders/updated",
            name: "Order Updated",
            description: "Triggered when an order is modified",
            requiredScopes: ["read_orders"],
            configFields: [],
            tags: ["orders", "sales"]
        });

        this.registerTrigger({
            id: "orders/paid",
            name: "Order Paid",
            description: "Triggered when an order payment is completed",
            requiredScopes: ["read_orders"],
            configFields: [],
            tags: ["orders", "payments"]
        });

        this.registerTrigger({
            id: "orders/fulfilled",
            name: "Order Fulfilled",
            description: "Triggered when an order is fulfilled",
            requiredScopes: ["read_orders"],
            configFields: [],
            tags: ["orders", "fulfillment"]
        });

        this.registerTrigger({
            id: "orders/cancelled",
            name: "Order Cancelled",
            description: "Triggered when an order is cancelled",
            requiredScopes: ["read_orders"],
            configFields: [],
            tags: ["orders", "cancellation"]
        });

        // Register product triggers
        this.registerTrigger({
            id: "products/create",
            name: "Product Created",
            description: "Triggered when a new product is created",
            requiredScopes: ["read_products"],
            configFields: [],
            tags: ["products", "catalog"]
        });

        this.registerTrigger({
            id: "products/update",
            name: "Product Updated",
            description: "Triggered when a product is updated",
            requiredScopes: ["read_products"],
            configFields: [],
            tags: ["products", "catalog"]
        });

        this.registerTrigger({
            id: "products/delete",
            name: "Product Deleted",
            description: "Triggered when a product is deleted",
            requiredScopes: ["read_products"],
            configFields: [],
            tags: ["products", "catalog"]
        });

        // Register inventory triggers
        this.registerTrigger({
            id: "inventory_levels/update",
            name: "Inventory Updated",
            description: "Triggered when inventory levels change",
            requiredScopes: ["read_inventory"],
            configFields: [],
            tags: ["inventory", "stock"]
        });

        // Register customer triggers
        this.registerTrigger({
            id: "customers/create",
            name: "Customer Created",
            description: "Triggered when a new customer is created",
            requiredScopes: ["read_customers"],
            configFields: [],
            tags: ["customers", "crm"]
        });

        this.registerTrigger({
            id: "customers/update",
            name: "Customer Updated",
            description: "Triggered when a customer is updated",
            requiredScopes: ["read_customers"],
            configFields: [],
            tags: ["customers", "crm"]
        });

        // Register checkout triggers
        this.registerTrigger({
            id: "checkouts/create",
            name: "Checkout Created",
            description: "Triggered when a checkout is initiated",
            requiredScopes: ["read_orders"],
            configFields: [],
            tags: ["checkout", "cart"]
        });

        this.registerTrigger({
            id: "carts/create",
            name: "Cart Created",
            description: "Triggered when a cart is created",
            requiredScopes: ["read_orders"],
            configFields: [],
            tags: ["cart", "shopping"]
        });

        this.registerTrigger({
            id: "carts/update",
            name: "Cart Updated",
            description: "Triggered when items are added or removed from a cart",
            requiredScopes: ["read_orders"],
            configFields: [],
            tags: ["cart", "shopping"]
        });
    }

    /**
     * Shopify-specific HMAC-SHA256 verification
     * Uses base64 encoding
     */
    override verifyWebhookSignature(
        secret: string,
        request: WebhookRequestData
    ): { valid: boolean; error?: string } {
        const signatureHeader = this.getHeader(request.headers, "X-Shopify-Hmac-SHA256");

        if (!signatureHeader) {
            return { valid: false, error: "Missing X-Shopify-Hmac-SHA256 header" };
        }

        const body = this.getBodyString(request);

        // Shopify uses HMAC-SHA256 with base64 encoding
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(body, "utf-8");
        const computed = hmac.digest("base64");

        return {
            valid: this.timingSafeEqual(signatureHeader, computed)
        };
    }

    /**
     * Extract event type from Shopify webhook
     */
    override extractEventType(request: WebhookRequestData): string | undefined {
        // Shopify sends event type in X-Shopify-Topic header
        return this.getHeader(request.headers, "X-Shopify-Topic");
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://{shop}.myshopify.com/admin/oauth/authorize",
            tokenUrl: "https://{shop}.myshopify.com/admin/oauth/access_token",
            scopes: [
                "read_products",
                "write_products",
                "read_orders",
                "write_orders",
                "read_customers",
                "write_customers",
                "read_inventory",
                "write_inventory",
                "read_fulfillments",
                "write_fulfillments"
            ],
            clientId: appConfig.oauth.shopify.clientId,
            clientSecret: appConfig.oauth.shopify.clientSecret,
            redirectUri: getOAuthRedirectUri("shopify"),
            refreshable: false // Shopify offline tokens don't expire
        };

        return config;
    }

    /**
     * Execute operation via direct API
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        // Validate parameters
        const validatedParams = this.validateParams(operationId, params);

        // Get or create client
        const client = this.getOrCreateClient(connection);

        // Execute operation
        switch (operationId) {
            // Order operations
            case "listOrders":
                return await executeListOrders(client, validatedParams as never);
            case "getOrder":
                return await executeGetOrder(client, validatedParams as never);
            case "updateOrder":
                return await executeUpdateOrder(client, validatedParams as never);
            case "closeOrder":
                return await executeCloseOrder(client, validatedParams as never);
            case "cancelOrder":
                return await executeCancelOrder(client, validatedParams as never);

            // Product operations
            case "listProducts":
                return await executeListProducts(client, validatedParams as never);
            case "getProduct":
                return await executeGetProduct(client, validatedParams as never);
            case "createProduct":
                return await executeCreateProduct(client, validatedParams as never);
            case "updateProduct":
                return await executeUpdateProduct(client, validatedParams as never);

            // Inventory operations
            case "listInventoryLevels":
                return await executeListInventoryLevels(client, validatedParams as never);
            case "adjustInventory":
                return await executeAdjustInventory(client, validatedParams as never);
            case "setInventory":
                return await executeSetInventory(client, validatedParams as never);

            // Webhook operations
            case "listWebhooks":
                return await executeListWebhooks(client, validatedParams as never);
            case "createWebhook":
                return await executeCreateWebhook(client, validatedParams as never);
            case "deleteWebhook":
                return await executeDeleteWebhook(client, validatedParams as never);

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
     * Get or create Shopify client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): ShopifyClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get tokens and shop name from connection
        const tokens = connection.data as OAuth2TokenData;
        const metadata = connection.metadata as { shop?: string; subdomain?: string } | undefined;

        // Shop name can be stored as 'shop' or 'subdomain' in metadata
        const shop = metadata?.shop || metadata?.subdomain;

        if (!shop) {
            throw new Error("Shop name not found in connection metadata. Please reconnect.");
        }

        // Create new client
        const client = new ShopifyClient({
            accessToken: tokens.access_token,
            shop,
            connectionId: connection.id
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (e.g., when connection is deleted)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
