import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface BigCommerceClientConfig {
    accessToken: string;
    storeHash: string;
    connectionId?: string;
}

/**
 * BigCommerce API Client with token-based auth, rate limiting, and error handling
 *
 * Features:
 * - X-Auth-Token header authentication
 * - Supports both V2 (orders) and V3 (catalog, customers) APIs
 * - Rate limit awareness (150 req/30 sec for Basic, 450 for Plus)
 * - Exponential backoff on errors
 * - Connection pooling for performance
 */
export class BigCommerceClient extends BaseAPIClient {
    private accessToken: string;
    private storeHash: string;

    constructor(config: BigCommerceClientConfig) {
        const baseURL = `https://api.bigcommerce.com/stores/${config.storeHash}`;

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
                maxSockets: 10, // Conservative for rate limiting
                maxFreeSockets: 5,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.accessToken = config.accessToken;
        this.storeHash = config.storeHash;

        // Add request interceptor for authentication
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["X-Auth-Token"] = this.accessToken;
            reqConfig.headers["Content-Type"] = "application/json";
            reqConfig.headers["Accept"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Override request to handle BigCommerce-specific errors
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
     * Handle BigCommerce-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as Record<string, unknown>;

            // Handle rate limiting
            if (status === 429) {
                const retryAfter = error.response.headers?.["x-retry-after"];
                throw new Error(`Rate limited. Retry after ${retryAfter || "30"} seconds.`);
            }

            // Handle authentication errors
            if (status === 401) {
                throw new Error(
                    "BigCommerce authentication failed. Please check your Access Token."
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
            if (status === 400 || status === 422) {
                const errors = data.errors || data.title || data.detail || "Invalid request";
                const message = Array.isArray(errors) ? errors.join(", ") : String(errors);
                throw new Error(`Validation error: ${message}`);
            }

            // Handle BigCommerce API errors
            if (data.title || data.errors) {
                const message =
                    data.title ||
                    (Array.isArray(data.errors) ? data.errors.join(", ") : data.errors);
                throw new Error(`BigCommerce API error: ${message}`);
            }
        }

        throw error;
    }

    /**
     * Get store hash
     */
    getStoreHash(): string {
        return this.storeHash;
    }

    // ==========================================
    // Order Operations (V2 API)
    // ==========================================

    /**
     * List orders with optional filters
     */
    async listOrders(params?: {
        status_id?: number;
        customer_id?: number;
        min_date_created?: string;
        max_date_created?: string;
        min_date_modified?: string;
        max_date_modified?: string;
        min_total?: number;
        max_total?: number;
        is_deleted?: boolean;
        sort?: string;
        page?: number;
        limit?: number;
    }): Promise<unknown> {
        return this.get("/v2/orders", params);
    }

    /**
     * Get a single order by ID
     */
    async getOrder(orderId: string | number): Promise<unknown> {
        return this.get(`/v2/orders/${orderId}`);
    }

    /**
     * Create a new order
     */
    async createOrder(order: {
        customer_id?: number;
        status_id?: number;
        billing_address?: Record<string, unknown>;
        shipping_addresses?: Array<Record<string, unknown>>;
        products?: Array<Record<string, unknown>>;
        staff_notes?: string;
        customer_message?: string;
    }): Promise<unknown> {
        return this.post("/v2/orders", order);
    }

    /**
     * Update an order
     */
    async updateOrder(
        orderId: string | number,
        order: {
            status_id?: number;
            staff_notes?: string;
            customer_message?: string;
        }
    ): Promise<unknown> {
        return this.put(`/v2/orders/${orderId}`, order);
    }

    // ==========================================
    // Product Operations (V3 Catalog API)
    // ==========================================

    /**
     * List products with optional filters
     */
    async listProducts(params?: {
        name?: string;
        sku?: string;
        is_visible?: boolean;
        is_featured?: boolean;
        type?: string;
        categories?: number;
        brand_id?: number;
        availability?: string;
        include_fields?: string;
        sort?: string;
        direction?: string;
        page?: number;
        limit?: number;
    }): Promise<unknown> {
        const response = await this.get<{ data: unknown[]; meta: unknown }>(
            "/v3/catalog/products",
            params
        );
        return response.data;
    }

    /**
     * Get a single product by ID
     */
    async getProduct(productId: string | number, includeFields?: string): Promise<unknown> {
        const params = includeFields ? { include_fields: includeFields } : undefined;
        const response = await this.get<{ data: unknown }>(
            `/v3/catalog/products/${productId}`,
            params
        );
        return response.data;
    }

    /**
     * Create a new product
     */
    async createProduct(product: {
        name: string;
        type?: string;
        sku?: string;
        description?: string;
        price: number;
        cost_price?: number;
        retail_price?: number;
        sale_price?: number;
        weight?: number;
        categories?: number[];
        brand_id?: number;
        inventory_level?: number;
        inventory_tracking?: string;
        is_visible?: boolean;
        variants?: Array<Record<string, unknown>>;
    }): Promise<unknown> {
        const response = await this.post<{ data: unknown }>("/v3/catalog/products", product);
        return response.data;
    }

    /**
     * Update a product
     */
    async updateProduct(
        productId: string | number,
        product: {
            name?: string;
            sku?: string;
            description?: string;
            price?: number;
            cost_price?: number;
            retail_price?: number;
            sale_price?: number;
            weight?: number;
            categories?: number[];
            inventory_level?: number;
            is_visible?: boolean;
        }
    ): Promise<unknown> {
        const response = await this.put<{ data: unknown }>(
            `/v3/catalog/products/${productId}`,
            product
        );
        return response.data;
    }

    // ==========================================
    // Customer Operations (V3 API)
    // ==========================================

    /**
     * List customers with optional filters
     */
    async listCustomers(params?: {
        email?: string;
        name?: string;
        company?: string;
        customer_group_id?: number;
        date_created?: string;
        date_modified?: string;
        include?: string;
        sort?: string;
        page?: number;
        limit?: number;
    }): Promise<unknown> {
        const response = await this.get<{ data: unknown[] }>("/v3/customers", params);
        return response.data;
    }

    /**
     * Get a single customer by ID
     */
    async getCustomer(customerId: string | number, include?: string): Promise<unknown> {
        const params: Record<string, string> = { "id:in": String(customerId) };
        if (include) {
            params.include = include;
        }
        const response = await this.get<{ data: unknown[] }>("/v3/customers", params);
        return response.data[0];
    }

    /**
     * Create a new customer
     */
    async createCustomer(customer: {
        email: string;
        first_name: string;
        last_name: string;
        company?: string;
        phone?: string;
        addresses?: Array<Record<string, unknown>>;
        customer_group_id?: number;
    }): Promise<unknown> {
        // BigCommerce V3 Customers API expects an array
        const response = await this.post<{ data: unknown[] }>("/v3/customers", [customer]);
        return response.data[0];
    }

    /**
     * Update a customer
     */
    async updateCustomer(
        customerId: string | number,
        customer: {
            email?: string;
            first_name?: string;
            last_name?: string;
            company?: string;
            phone?: string;
            customer_group_id?: number;
        }
    ): Promise<unknown> {
        // BigCommerce V3 Customers API expects an array with id
        const response = await this.put<{ data: unknown[] }>("/v3/customers", [
            { id: Number(customerId), ...customer }
        ]);
        return response.data[0];
    }

    // ==========================================
    // Inventory Operations (V3 API)
    // ==========================================

    /**
     * Get product inventory (via product variants)
     */
    async getInventory(productId: string | number): Promise<unknown> {
        const response = await this.get<{ data: unknown[] }>(
            `/v3/catalog/products/${productId}/variants`
        );
        return response.data;
    }

    /**
     * Update variant inventory
     */
    async updateInventory(
        productId: string | number,
        variantId: number,
        inventoryLevel: number
    ): Promise<unknown> {
        const response = await this.put<{ data: unknown }>(
            `/v3/catalog/products/${productId}/variants/${variantId}`,
            { inventory_level: inventoryLevel }
        );
        return response.data;
    }

    /**
     * Update product inventory (for simple products without variants)
     */
    async updateProductInventory(
        productId: string | number,
        inventoryLevel: number
    ): Promise<unknown> {
        const response = await this.put<{ data: unknown }>(`/v3/catalog/products/${productId}`, {
            inventory_level: inventoryLevel
        });
        return response.data;
    }

    // ==========================================
    // Webhook Operations (V3 API)
    // ==========================================

    /**
     * List webhooks
     */
    async listWebhooks(params?: {
        page?: number;
        limit?: number;
        scope?: string;
        is_active?: boolean;
    }): Promise<unknown> {
        const response = await this.get<{ data: unknown[] }>("/v3/hooks", params);
        return response.data;
    }

    /**
     * Create a webhook
     */
    async createWebhook(webhook: {
        scope: string;
        destination: string;
        is_active?: boolean;
        headers?: Record<string, string>;
    }): Promise<unknown> {
        const response = await this.post<{ data: unknown }>("/v3/hooks", webhook);
        return response.data;
    }

    /**
     * Delete a webhook
     */
    async deleteWebhook(webhookId: string | number): Promise<unknown> {
        return this.delete(`/v3/hooks/${webhookId}`);
    }
}
