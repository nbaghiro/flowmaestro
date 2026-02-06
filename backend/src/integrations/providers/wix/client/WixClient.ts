import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface WixClientConfig {
    apiKey: string;
    siteId: string;
    connectionId?: string;
}

/**
 * Wix API Client with API Key authentication
 *
 * Features:
 * - API Key + Site ID header authentication
 * - Offset/limit pagination support
 * - Exponential backoff on errors
 * - Connection pooling for performance
 */
export class WixClient extends BaseAPIClient {
    private apiKey: string;
    private siteId: string;

    constructor(config: WixClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://www.wixapis.com",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 10000
            },
            connectionPool: {
                maxSockets: 25,
                maxFreeSockets: 10,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.apiKey = config.apiKey;
        this.siteId = config.siteId;

        // Add request interceptor for Wix headers
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            // Wix uses raw API key without Bearer prefix
            reqConfig.headers["Authorization"] = this.apiKey;
            reqConfig.headers["wix-site-id"] = this.siteId;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Override request to handle Wix-specific errors
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        try {
            const response = await super.request<T>(config);
            return response;
        } catch (error) {
            await this.handleError(error);
            throw error;
        }
    }

    /**
     * Handle Wix-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as Record<string, unknown>;

            // Handle rate limiting
            if (status === 429) {
                throw new Error("Rate limited. Please wait and try again.");
            }

            // Handle authentication errors
            if (status === 401) {
                throw new Error("Wix authentication failed. Please check your API key.");
            }

            // Handle forbidden
            if (status === 403) {
                throw new Error(
                    "Access forbidden. Please check your API key has the required permissions."
                );
            }

            // Handle not found
            if (status === 404) {
                throw new Error("Resource not found. Please check the ID and try again.");
            }

            // Handle validation errors
            if (status === 400) {
                const message = data.message || "Invalid request";
                throw new Error(`Validation error: ${message}`);
            }

            // Handle Wix API errors
            if (data.message) {
                const details = data.details as Record<string, unknown> | undefined;
                const appError = details?.applicationError as Record<string, unknown> | undefined;
                if (appError?.code) {
                    throw new Error(`Wix API error: ${data.message} (${appError.code})`);
                }
                throw new Error(`Wix API error: ${data.message}`);
            }
        }

        throw error;
    }

    /**
     * Get site ID
     */
    getSiteId(): string {
        return this.siteId;
    }

    // ==========================================
    // Product Operations
    // ==========================================

    /**
     * Query products with filters
     */
    async queryProducts(params?: {
        query?: string;
        includeVariants?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<unknown> {
        const body: Record<string, unknown> = {
            query: {}
        };

        if (params?.query) {
            body.query = {
                filter: {
                    $or: [
                        { name: { $contains: params.query } },
                        { description: { $contains: params.query } }
                    ]
                }
            };
        }

        if (params?.limit || params?.offset) {
            body.query = {
                ...(body.query as Record<string, unknown>),
                paging: {
                    limit: params.limit || 50,
                    offset: params.offset || 0
                }
            };
        }

        if (params?.includeVariants) {
            body.includeVariants = true;
        }

        return this.post("/stores/v1/products/query", body);
    }

    /**
     * Get a single product by ID
     */
    async getProduct(productId: string): Promise<unknown> {
        return this.get(`/stores/v1/products/${productId}`);
    }

    /**
     * Create a new product
     */
    async createProduct(product: {
        name: string;
        productType?: string;
        description?: string;
        sku?: string;
        price?: number;
        currency?: string;
        weight?: number;
        visible?: boolean;
        manageVariants?: boolean;
        variants?: Array<Record<string, unknown>>;
        media?: Array<Record<string, unknown>>;
    }): Promise<unknown> {
        const body: Record<string, unknown> = {
            product: {
                name: product.name,
                productType: product.productType || "physical",
                visible: product.visible !== false
            }
        };

        const productData = body.product as Record<string, unknown>;

        if (product.description) {
            productData.description = product.description;
        }
        if (product.sku) {
            productData.sku = product.sku;
        }
        if (product.price !== undefined) {
            productData.priceData = {
                currency: product.currency || "USD",
                price: product.price
            };
        }
        if (product.weight !== undefined) {
            productData.weight = product.weight;
        }
        if (product.manageVariants !== undefined) {
            productData.manageVariants = product.manageVariants;
        }
        if (product.variants) {
            productData.variants = product.variants;
        }
        if (product.media) {
            productData.media = { items: product.media };
        }

        return this.post("/stores/v1/products", body);
    }

    /**
     * Update a product
     */
    async updateProduct(
        productId: string,
        product: {
            name?: string;
            description?: string;
            sku?: string;
            price?: number;
            weight?: number;
            visible?: boolean;
        }
    ): Promise<unknown> {
        const body: Record<string, unknown> = {
            product: {}
        };

        const productData = body.product as Record<string, unknown>;

        if (product.name !== undefined) {
            productData.name = product.name;
        }
        if (product.description !== undefined) {
            productData.description = product.description;
        }
        if (product.sku !== undefined) {
            productData.sku = product.sku;
        }
        if (product.price !== undefined) {
            productData.priceData = { price: product.price };
        }
        if (product.weight !== undefined) {
            productData.weight = product.weight;
        }
        if (product.visible !== undefined) {
            productData.visible = product.visible;
        }

        return this.patch(`/stores/v1/products/${productId}`, body);
    }

    /**
     * Delete a product
     */
    async deleteProduct(productId: string): Promise<unknown> {
        return this.delete(`/stores/v1/products/${productId}`);
    }

    // ==========================================
    // Order Operations
    // ==========================================

    /**
     * Search orders with filters
     */
    async searchOrders(params?: {
        fulfillmentStatus?: string;
        paymentStatus?: string;
        dateCreatedFrom?: string;
        dateCreatedTo?: string;
        limit?: number;
        offset?: number;
    }): Promise<unknown> {
        const body: Record<string, unknown> = {
            search: {}
        };

        const filters: Record<string, unknown>[] = [];

        if (params?.fulfillmentStatus) {
            filters.push({ fulfillmentStatus: params.fulfillmentStatus });
        }
        if (params?.paymentStatus) {
            filters.push({ paymentStatus: params.paymentStatus });
        }
        if (params?.dateCreatedFrom || params?.dateCreatedTo) {
            const dateFilter: Record<string, string> = {};
            if (params.dateCreatedFrom) {
                dateFilter.$gte = params.dateCreatedFrom;
            }
            if (params.dateCreatedTo) {
                dateFilter.$lte = params.dateCreatedTo;
            }
            filters.push({ createdDate: dateFilter });
        }

        if (filters.length > 0) {
            body.search = {
                filter: { $and: filters }
            };
        }

        if (params?.limit || params?.offset) {
            body.search = {
                ...(body.search as Record<string, unknown>),
                paging: {
                    limit: params.limit || 50,
                    offset: params.offset || 0
                }
            };
        }

        return this.post("/ecom/v1/orders/search", body);
    }

    /**
     * Get a single order by ID
     */
    async getOrder(orderId: string): Promise<unknown> {
        return this.get(`/ecom/v1/orders/${orderId}`);
    }

    /**
     * Update an order
     */
    async updateOrder(
        orderId: string,
        updates: {
            buyerNote?: string;
            fulfilled?: boolean;
        }
    ): Promise<unknown> {
        const body: Record<string, unknown> = {};

        if (updates.buyerNote !== undefined) {
            body.buyerNote = updates.buyerNote;
        }
        if (updates.fulfilled !== undefined) {
            body.fulfillmentStatus = updates.fulfilled ? "FULFILLED" : "NOT_FULFILLED";
        }

        return this.patch(`/ecom/v1/orders/${orderId}`, body);
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderId: string, sendNotification: boolean = true): Promise<unknown> {
        return this.post(`/ecom/v1/orders/${orderId}/cancel`, {
            sendNotification
        });
    }

    // ==========================================
    // Inventory Operations
    // ==========================================

    /**
     * Query inventory items
     */
    async queryInventory(params?: {
        productIds?: string[];
        variantIds?: string[];
        limit?: number;
        offset?: number;
    }): Promise<unknown> {
        const body: Record<string, unknown> = {
            query: {}
        };

        const filters: Record<string, unknown>[] = [];

        if (params?.productIds?.length) {
            filters.push({ productId: { $in: params.productIds } });
        }
        if (params?.variantIds?.length) {
            filters.push({ variantId: { $in: params.variantIds } });
        }

        if (filters.length > 0) {
            body.query = {
                filter: { $and: filters }
            };
        }

        if (params?.limit || params?.offset) {
            body.query = {
                ...(body.query as Record<string, unknown>),
                paging: {
                    limit: params.limit || 50,
                    offset: params.offset || 0
                }
            };
        }

        return this.post("/stores/v1/inventoryItems/query", body);
    }

    /**
     * Get a single inventory item
     */
    async getInventory(inventoryId: string): Promise<unknown> {
        return this.get(`/stores/v1/inventoryItems/${inventoryId}`);
    }

    /**
     * Update inventory item
     */
    async updateInventory(
        inventoryId: string,
        updates: {
            trackQuantity?: boolean;
            quantity?: number;
        }
    ): Promise<unknown> {
        const body: Record<string, unknown> = {
            inventoryItem: {}
        };

        const inventoryData = body.inventoryItem as Record<string, unknown>;

        if (updates.trackQuantity !== undefined) {
            inventoryData.trackQuantity = updates.trackQuantity;
        }
        if (updates.quantity !== undefined) {
            inventoryData.quantity = updates.quantity;
        }

        return this.patch(`/stores/v1/inventoryItems/${inventoryId}`, body);
    }

    /**
     * Increment inventory quantity
     */
    async incrementInventory(inventoryId: string, incrementBy: number): Promise<unknown> {
        return this.post("/stores/v1/inventoryItems/incrementInventory", {
            inventoryId,
            incrementBy
        });
    }

    /**
     * Decrement inventory quantity
     */
    async decrementInventory(inventoryId: string, decrementBy: number): Promise<unknown> {
        return this.post("/stores/v1/inventoryItems/decrementInventory", {
            inventoryId,
            decrementBy
        });
    }

    // ==========================================
    // Collection Operations
    // ==========================================

    /**
     * Query collections
     */
    async queryCollections(params?: {
        query?: string;
        limit?: number;
        offset?: number;
    }): Promise<unknown> {
        const body: Record<string, unknown> = {
            query: {}
        };

        if (params?.query) {
            body.query = {
                filter: {
                    name: { $contains: params.query }
                }
            };
        }

        if (params?.limit || params?.offset) {
            body.query = {
                ...(body.query as Record<string, unknown>),
                paging: {
                    limit: params.limit || 50,
                    offset: params.offset || 0
                }
            };
        }

        return this.post("/stores/v1/collections/query", body);
    }

    /**
     * Get a single collection
     */
    async getCollection(collectionId: string): Promise<unknown> {
        return this.get(`/stores/v1/collections/${collectionId}`);
    }
}
