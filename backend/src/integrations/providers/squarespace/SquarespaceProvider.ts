import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { SquarespaceClient } from "./client/SquarespaceClient";
import { SquarespaceMCPAdapter } from "./mcp/SquarespaceMCPAdapter";
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
    fulfillOrderOperation,
    executeFulfillOrder,
    // Inventory operations
    listInventoryOperation,
    executeListInventory,
    getInventoryItemOperation,
    executeGetInventoryItem,
    adjustInventoryOperation,
    executeAdjustInventory,
    // Transaction operations
    listTransactionsOperation,
    executeListTransactions,
    // Site operations
    getSiteInfoOperation,
    executeGetSiteInfo
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Squarespace Provider - implements OAuth2 authentication with e-commerce operations
 *
 * Features:
 * - Product management (list, get, create, update, delete)
 * - Order management (list, get, fulfill)
 * - Inventory management (list, get, adjust)
 * - Transaction viewing
 * - Site information
 *
 * API Notes:
 * - Rate limit: 300 requests/minute (5 req/sec)
 * - Access tokens expire after 30 minutes
 * - Refresh tokens expire after 7 days
 * - All endpoints require site ID
 * - Uses POST for updates (not PATCH)
 * - Cursor-based pagination
 */
export class SquarespaceProvider extends BaseProvider {
    readonly name = "squarespace";
    readonly displayName = "Squarespace";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 300, // 5 req/sec
            burstSize: 50
        }
    };

    private mcpAdapter: SquarespaceMCPAdapter;
    private clientPool: Map<string, SquarespaceClient> = new Map();

    constructor() {
        super();

        // Register product operations
        this.registerOperation(listProductsOperation);
        this.registerOperation(getProductOperation);
        this.registerOperation(createProductOperation);
        this.registerOperation(updateProductOperation);
        this.registerOperation(deleteProductOperation);

        // Register order operations
        this.registerOperation(listOrdersOperation);
        this.registerOperation(getOrderOperation);
        this.registerOperation(fulfillOrderOperation);

        // Register inventory operations
        this.registerOperation(listInventoryOperation);
        this.registerOperation(getInventoryItemOperation);
        this.registerOperation(adjustInventoryOperation);

        // Register transaction operations
        this.registerOperation(listTransactionsOperation);

        // Register site operations
        this.registerOperation(getSiteInfoOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new SquarespaceMCPAdapter(this.operations);

        // Configure webhook settings (Squarespace uses Extension Points for webhooks)
        this.setWebhookConfig({
            setupType: "manual", // Squarespace webhooks configured via Extensions
            signatureType: "hmac_sha256",
            signatureHeader: "X-Squarespace-Signature",
            eventHeader: "X-Squarespace-Event-Type"
        });

        // Register order triggers
        this.registerTrigger({
            id: "order.create",
            name: "Order Created",
            description: "Triggered when a new order is placed",
            requiredScopes: ["website.orders.read"],
            configFields: [],
            tags: ["orders", "sales"]
        });

        this.registerTrigger({
            id: "order.update",
            name: "Order Updated",
            description: "Triggered when an order is modified",
            requiredScopes: ["website.orders.read"],
            configFields: [],
            tags: ["orders", "sales"]
        });

        // Register product triggers
        this.registerTrigger({
            id: "product.create",
            name: "Product Created",
            description: "Triggered when a new product is created",
            requiredScopes: ["website.products.read"],
            configFields: [],
            tags: ["products", "catalog"]
        });

        this.registerTrigger({
            id: "product.update",
            name: "Product Updated",
            description: "Triggered when a product is updated",
            requiredScopes: ["website.products.read"],
            configFields: [],
            tags: ["products", "catalog"]
        });

        this.registerTrigger({
            id: "product.delete",
            name: "Product Deleted",
            description: "Triggered when a product is deleted",
            requiredScopes: ["website.products.read"],
            configFields: [],
            tags: ["products", "catalog"]
        });

        // Register inventory triggers
        this.registerTrigger({
            id: "inventory.update",
            name: "Inventory Updated",
            description: "Triggered when inventory levels change",
            requiredScopes: ["website.inventory.read"],
            configFields: [],
            tags: ["inventory", "stock"]
        });
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://login.squarespace.com/api/1/login/oauth/provider/authorize",
            tokenUrl: "https://login.squarespace.com/api/1/login/oauth/provider/tokens",
            scopes: [
                "website.orders",
                "website.orders.read",
                "website.products",
                "website.products.read",
                "website.inventory",
                "website.inventory.read",
                "website.transactions.read"
            ],
            clientId: appConfig.oauth.squarespace.clientId,
            clientSecret: appConfig.oauth.squarespace.clientSecret,
            redirectUri: getOAuthRedirectUri("squarespace"),
            refreshable: true // Squarespace tokens can be refreshed (7 day refresh token)
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
            // Product operations
            case "listProducts":
                return await executeListProducts(client, validatedParams as never);
            case "getProduct":
                return await executeGetProduct(client, validatedParams as never);
            case "createProduct":
                return await executeCreateProduct(client, validatedParams as never);
            case "updateProduct":
                return await executeUpdateProduct(client, validatedParams as never);
            case "deleteProduct":
                return await executeDeleteProduct(client, validatedParams as never);

            // Order operations
            case "listOrders":
                return await executeListOrders(client, validatedParams as never);
            case "getOrder":
                return await executeGetOrder(client, validatedParams as never);
            case "fulfillOrder":
                return await executeFulfillOrder(client, validatedParams as never);

            // Inventory operations
            case "listInventory":
                return await executeListInventory(client, validatedParams as never);
            case "getInventoryItem":
                return await executeGetInventoryItem(client, validatedParams as never);
            case "adjustInventory":
                return await executeAdjustInventory(client, validatedParams as never);

            // Transaction operations
            case "listTransactions":
                return await executeListTransactions(client, validatedParams as never);

            // Site operations
            case "getSiteInfo":
                return await executeGetSiteInfo(client, validatedParams as never);

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
     * Get or create Squarespace client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): SquarespaceClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get tokens and site ID from connection
        const tokens = connection.data as OAuth2TokenData;
        const metadata = connection.metadata as { siteId?: string } | undefined;

        // Create new client
        const client = new SquarespaceClient({
            accessToken: tokens.access_token,
            siteId: metadata?.siteId,
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
