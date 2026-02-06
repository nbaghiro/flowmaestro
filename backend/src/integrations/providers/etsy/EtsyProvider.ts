import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { EtsyClient } from "./client/EtsyClient";
import { EtsyMCPAdapter } from "./mcp/EtsyMCPAdapter";
import {
    // Listing operations
    listListingsOperation,
    executeListListings,
    getListingOperation,
    executeGetListing,
    createListingOperation,
    executeCreateListing,
    updateListingOperation,
    executeUpdateListing,
    deleteListingOperation,
    executeDeleteListing,
    // Inventory operations
    getListingInventoryOperation,
    executeGetListingInventory,
    updateListingInventoryOperation,
    executeUpdateListingInventory,
    // Receipt operations
    listReceiptsOperation,
    executeListReceipts,
    getReceiptOperation,
    executeGetReceipt,
    createReceiptShipmentOperation,
    executeCreateReceiptShipment,
    // Shop operations
    getShopOperation,
    executeGetShop
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
 * Etsy Provider - implements OAuth2 with PKCE authentication for e-commerce operations
 *
 * Features:
 * - Listing management (list, get, create, update, delete)
 * - Inventory management (get, update)
 * - Receipt/Order management (list, get, add shipment tracking)
 * - Shop information retrieval
 */
export class EtsyProvider extends BaseProvider {
    readonly name = "etsy";
    readonly displayName = "Etsy";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false, // Etsy webhooks require app approval
        rateLimit: {
            tokensPerMinute: 600, // ~10 req/sec conservative estimate
            burstSize: 30
        }
    };

    private mcpAdapter: EtsyMCPAdapter;
    private clientPool: Map<string, EtsyClient> = new Map();

    constructor() {
        super();

        // Register listing operations
        this.registerOperation(listListingsOperation);
        this.registerOperation(getListingOperation);
        this.registerOperation(createListingOperation);
        this.registerOperation(updateListingOperation);
        this.registerOperation(deleteListingOperation);

        // Register inventory operations
        this.registerOperation(getListingInventoryOperation);
        this.registerOperation(updateListingInventoryOperation);

        // Register receipt operations
        this.registerOperation(listReceiptsOperation);
        this.registerOperation(getReceiptOperation);
        this.registerOperation(createReceiptShipmentOperation);

        // Register shop operations
        this.registerOperation(getShopOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new EtsyMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     * Note: Etsy requires PKCE (pkceEnabled: true)
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://www.etsy.com/oauth/connect",
            tokenUrl: "https://api.etsy.com/v3/public/oauth/token",
            scopes: [
                "listings_r",
                "listings_w",
                "listings_d",
                "transactions_r",
                "transactions_w",
                "shops_r",
                "shops_w",
                "email_r"
            ],
            clientId: appConfig.oauth.etsy.clientId,
            clientSecret: appConfig.oauth.etsy.clientSecret,
            redirectUri: getOAuthRedirectUri("etsy"),
            refreshable: true
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
            // Listing operations
            case "listListings":
                return await executeListListings(client, validatedParams as never);
            case "getListing":
                return await executeGetListing(client, validatedParams as never);
            case "createListing":
                return await executeCreateListing(client, validatedParams as never);
            case "updateListing":
                return await executeUpdateListing(client, validatedParams as never);
            case "deleteListing":
                return await executeDeleteListing(client, validatedParams as never);

            // Inventory operations
            case "getListingInventory":
                return await executeGetListingInventory(client, validatedParams as never);
            case "updateListingInventory":
                return await executeUpdateListingInventory(client, validatedParams as never);

            // Receipt operations
            case "listReceipts":
                return await executeListReceipts(client, validatedParams as never);
            case "getReceipt":
                return await executeGetReceipt(client, validatedParams as never);
            case "createReceiptShipment":
                return await executeCreateReceiptShipment(client, validatedParams as never);

            // Shop operations
            case "getShop":
                return await executeGetShop(client, validatedParams as never);

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
     * Get or create Etsy client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): EtsyClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get tokens and shop info from connection
        const tokens = connection.data as OAuth2TokenData;
        const metadata = connection.metadata as { shop_id?: string; shopId?: string } | undefined;

        // Shop ID can be stored as 'shop_id' or 'shopId' in metadata
        const shopId = metadata?.shop_id || metadata?.shopId;

        // Create new client
        const client = new EtsyClient({
            accessToken: tokens.access_token,
            clientId: appConfig.oauth.etsy.clientId,
            shopId
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
