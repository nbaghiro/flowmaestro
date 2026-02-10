import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface WooCommerceClientConfig {
    consumerKey: string;
    consumerSecret: string;
    storeUrl: string; // e.g., "https://mystore.com"
    connectionId?: string;
}

/**
 * WooCommerce API response headers for pagination
 */
interface WooCommercePaginationInfo {
    total: number;
    totalPages: number;
}

/**
 * WooCommerce API Client with Basic Auth, pagination support, and error handling
 *
 * Features:
 * - HTTP Basic Auth with Consumer Key/Secret
 * - Pagination via X-WP-Total and X-WP-TotalPages headers
 * - Exponential backoff on errors
 * - Connection pooling for performance
 */
export class WooCommerceClient extends BaseAPIClient {
    private consumerKey: string;
    private consumerSecret: string;
    private storeUrl: string;
    private lastPaginationInfo: WooCommercePaginationInfo | null = null;

    constructor(config: WooCommerceClientConfig) {
        // Ensure storeUrl has no trailing slash and construct base URL
        const normalizedUrl = config.storeUrl.replace(/\/$/, "");
        const baseURL = `${normalizedUrl}/wp-json/wc/v3`;

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 10000
            },
            connectionPool: {
                maxSockets: 25, // WooCommerce recommends max 25 concurrent
                maxFreeSockets: 10,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.consumerKey = config.consumerKey;
        this.consumerSecret = config.consumerSecret;
        this.storeUrl = normalizedUrl;

        // Add request interceptor for Basic Auth
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            // WooCommerce uses HTTP Basic Auth
            const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString(
                "base64"
            );
            reqConfig.headers["Authorization"] = `Basic ${credentials}`;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Override request to handle WooCommerce-specific pagination headers
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
     * Handle WooCommerce-specific errors
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
                throw new Error(
                    "WooCommerce authentication failed. Please check your Consumer Key and Secret."
                );
            }

            // Handle forbidden
            if (status === 403) {
                throw new Error(
                    "Access forbidden. Please check your API credentials have the required permissions."
                );
            }

            // Handle not found
            if (status === 404) {
                throw new Error("Resource not found. Please check the ID and try again.");
            }

            // Handle validation errors
            if (status === 400) {
                const message = data.message || data.error || "Invalid request";
                throw new Error(`Validation error: ${message}`);
            }

            // Handle WooCommerce API errors
            if (data.code && data.message) {
                throw new Error(`WooCommerce API error: ${data.message} (${data.code})`);
            }
        }

        throw error;
    }

    /**
     * Get store URL
     */
    getStoreUrl(): string {
        return this.storeUrl;
    }

    /**
     * Get last pagination info
     */
    getPaginationInfo(): WooCommercePaginationInfo | null {
        return this.lastPaginationInfo;
    }

    // ==========================================
    // Order Operations
    // ==========================================

    /**
     * List orders with optional filters
     */
    async listOrders(params?: {
        status?: string;
        customer?: number;
        product?: number;
        after?: string;
        before?: string;
        page?: number;
        per_page?: number;
        order?: "asc" | "desc";
        orderby?: string;
    }): Promise<unknown> {
        return this.get("/orders", params);
    }

    /**
     * Get a single order by ID
     */
    async getOrder(orderId: string): Promise<unknown> {
        return this.get(`/orders/${orderId}`);
    }

    /**
     * Create a new order
     */
    async createOrder(order: {
        payment_method?: string;
        payment_method_title?: string;
        set_paid?: boolean;
        status?: string;
        customer_id?: number;
        billing?: Record<string, unknown>;
        shipping?: Record<string, unknown>;
        line_items?: Array<Record<string, unknown>>;
    }): Promise<unknown> {
        return this.post("/orders", order);
    }

    /**
     * Update an order
     */
    async updateOrder(
        orderId: string,
        order: {
            status?: string;
            customer_note?: string;
            billing?: Record<string, unknown>;
            shipping?: Record<string, unknown>;
        }
    ): Promise<unknown> {
        return this.put(`/orders/${orderId}`, order);
    }

    // ==========================================
    // Product Operations
    // ==========================================

    /**
     * List products with optional filters
     */
    async listProducts(params?: {
        status?: string;
        type?: string;
        category?: number;
        tag?: number;
        sku?: string;
        stock_status?: string;
        on_sale?: boolean;
        page?: number;
        per_page?: number;
        order?: "asc" | "desc";
        orderby?: string;
    }): Promise<unknown> {
        return this.get("/products", params);
    }

    /**
     * Get a single product by ID
     */
    async getProduct(productId: string): Promise<unknown> {
        return this.get(`/products/${productId}`);
    }

    /**
     * Create a new product
     */
    async createProduct(product: {
        name: string;
        type?: string;
        status?: string;
        description?: string;
        short_description?: string;
        sku?: string;
        regular_price?: string;
        sale_price?: string;
        manage_stock?: boolean;
        stock_quantity?: number;
        stock_status?: string;
        categories?: Array<{ id: number }>;
        tags?: Array<{ id: number }>;
        images?: Array<{ src?: string; name?: string; alt?: string }>;
        attributes?: Array<Record<string, unknown>>;
    }): Promise<unknown> {
        return this.post("/products", product);
    }

    /**
     * Update a product
     */
    async updateProduct(
        productId: string,
        product: {
            name?: string;
            status?: string;
            description?: string;
            short_description?: string;
            sku?: string;
            regular_price?: string;
            sale_price?: string;
            manage_stock?: boolean;
            stock_quantity?: number;
            stock_status?: string;
        }
    ): Promise<unknown> {
        return this.put(`/products/${productId}`, product);
    }

    // ==========================================
    // Customer Operations
    // ==========================================

    /**
     * List customers with optional filters
     */
    async listCustomers(params?: {
        email?: string;
        role?: string;
        page?: number;
        per_page?: number;
        order?: "asc" | "desc";
        orderby?: string;
    }): Promise<unknown> {
        return this.get("/customers", params);
    }

    /**
     * Get a single customer by ID
     */
    async getCustomer(customerId: string): Promise<unknown> {
        return this.get(`/customers/${customerId}`);
    }

    /**
     * Create a new customer
     */
    async createCustomer(customer: {
        email: string;
        first_name?: string;
        last_name?: string;
        username?: string;
        password?: string;
        billing?: Record<string, unknown>;
        shipping?: Record<string, unknown>;
    }): Promise<unknown> {
        return this.post("/customers", customer);
    }

    /**
     * Update a customer
     */
    async updateCustomer(
        customerId: string,
        customer: {
            email?: string;
            first_name?: string;
            last_name?: string;
            billing?: Record<string, unknown>;
            shipping?: Record<string, unknown>;
        }
    ): Promise<unknown> {
        return this.put(`/customers/${customerId}`, customer);
    }

    // ==========================================
    // Inventory Operations
    // ==========================================

    /**
     * Update inventory (via product update)
     */
    async updateInventory(
        productId: string,
        inventory: {
            stock_quantity?: number;
            stock_status?: string;
            manage_stock?: boolean;
        }
    ): Promise<unknown> {
        return this.put(`/products/${productId}`, inventory);
    }

    // ==========================================
    // Webhook Operations
    // ==========================================

    /**
     * List webhooks
     */
    async listWebhooks(params?: {
        status?: string;
        page?: number;
        per_page?: number;
    }): Promise<unknown> {
        return this.get("/webhooks", params);
    }

    /**
     * Create a webhook
     */
    async createWebhook(webhook: {
        name?: string;
        topic: string;
        delivery_url: string;
        secret?: string;
        status?: string;
    }): Promise<unknown> {
        return this.post("/webhooks", webhook);
    }

    /**
     * Delete a webhook
     */
    async deleteWebhook(webhookId: string, force: boolean = true): Promise<unknown> {
        const params = new URLSearchParams();
        if (force) {
            params.append("force", "true");
        }
        const queryString = params.toString();
        const url = `/webhooks/${webhookId}${queryString ? `?${queryString}` : ""}`;
        return this.delete(url);
    }
}
