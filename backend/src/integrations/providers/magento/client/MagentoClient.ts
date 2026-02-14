import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface MagentoClientConfig {
    accessToken: string;
    storeUrl: string; // e.g., "https://mystore.com"
    connectionId?: string;
}

/**
 * Magento REST API Client
 *
 * Features:
 * - Bearer token authentication
 * - Search criteria builder for filtered queries
 * - Pagination support
 * - Rate limit handling (429)
 */
export class MagentoClient extends BaseAPIClient {
    private accessToken: string;
    private storeUrl: string;

    constructor(config: MagentoClientConfig) {
        // Ensure storeUrl has no trailing slash
        const normalizedUrl = config.storeUrl.replace(/\/$/, "");
        const baseURL = `${normalizedUrl}/rest/V1`;

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
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.accessToken = config.accessToken;
        this.storeUrl = normalizedUrl;

        // Add request interceptor for Bearer auth
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Build Magento search criteria query string
     */
    private buildSearchCriteria(
        filters: Record<string, unknown>,
        pagination?: { page?: number; pageSize?: number }
    ): string {
        const params: string[] = [];
        let filterIndex = 0;

        for (const [field, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null && value !== "") {
                // Use 'like' for string fields, 'eq' for exact match
                const conditionType =
                    typeof value === "string" && !["status", "type_id"].includes(field)
                        ? "like"
                        : "eq";
                const searchValue = conditionType === "like" ? `%${value}%` : value;

                params.push(
                    `searchCriteria[filter_groups][${filterIndex}][filters][0][field]=${encodeURIComponent(field)}`
                );
                params.push(
                    `searchCriteria[filter_groups][${filterIndex}][filters][0][value]=${encodeURIComponent(String(searchValue))}`
                );
                params.push(
                    `searchCriteria[filter_groups][${filterIndex}][filters][0][condition_type]=${conditionType}`
                );
                filterIndex++;
            }
        }

        // Add pagination
        if (pagination) {
            if (pagination.page) {
                params.push(`searchCriteria[currentPage]=${pagination.page}`);
            }
            if (pagination.pageSize) {
                params.push(`searchCriteria[pageSize]=${pagination.pageSize}`);
            }
        }

        // If no filters, add empty search criteria
        if (params.length === 0) {
            params.push("searchCriteria=");
        }

        return params.join("&");
    }

    /**
     * Override request to handle Magento-specific errors
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
     * Handle Magento-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as Record<string, unknown>;

            if (status === 429) {
                throw new Error("Rate limited. Please wait and try again.");
            }

            if (status === 401) {
                throw new Error("Magento authentication failed. Please check your access token.");
            }

            if (status === 403) {
                throw new Error("Access forbidden. Please check your integration permissions.");
            }

            if (status === 404) {
                throw new Error("Resource not found.");
            }

            // Handle Magento API error format
            if (data.message) {
                const params = data.parameters as Record<string, string> | undefined;
                let message = String(data.message);
                if (params) {
                    // Replace %1, %2, etc. with parameter values
                    for (const [key, value] of Object.entries(params)) {
                        message = message.replace(`%${key}`, value);
                    }
                }
                throw new Error(`Magento API error: ${message}`);
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

    // ==========================================
    // Product Operations
    // ==========================================

    /**
     * List products with filters
     */
    async listProducts(params?: {
        status?: string;
        type_id?: string;
        name?: string;
        sku?: string;
        page?: number;
        pageSize?: number;
    }): Promise<unknown> {
        const { page, pageSize, ...filters } = params || {};
        const query = this.buildSearchCriteria(filters, { page, pageSize });
        return this.get(`/products?${query}`);
    }

    /**
     * Get a single product by SKU
     */
    async getProduct(sku: string): Promise<unknown> {
        return this.get(`/products/${encodeURIComponent(sku)}`);
    }

    /**
     * Create a new product
     */
    async createProduct(product: {
        sku: string;
        name: string;
        price: number;
        attribute_set_id?: number;
        type_id?: string;
        status?: number;
        visibility?: number;
        weight?: number;
        custom_attributes?: Array<{ attribute_code: string; value: string }>;
    }): Promise<unknown> {
        return this.post("/products", { product });
    }

    /**
     * Update a product by SKU
     */
    async updateProduct(
        sku: string,
        product: {
            name?: string;
            price?: number;
            status?: number;
            visibility?: number;
            weight?: number;
            custom_attributes?: Array<{ attribute_code: string; value: string }>;
        }
    ): Promise<unknown> {
        return this.put(`/products/${encodeURIComponent(sku)}`, { product });
    }

    // ==========================================
    // Order Operations
    // ==========================================

    /**
     * List orders with filters
     */
    async listOrders(params?: {
        status?: string;
        customer_email?: string;
        created_at_from?: string;
        created_at_to?: string;
        page?: number;
        pageSize?: number;
    }): Promise<unknown> {
        const { page, pageSize, created_at_from, created_at_to, ...otherFilters } = params || {};
        const filters: Record<string, unknown> = { ...otherFilters };

        // Handle date range filters separately with proper condition types
        const queryParams: string[] = [];
        let filterIndex = 0;

        for (const [field, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null && value !== "") {
                queryParams.push(
                    `searchCriteria[filter_groups][${filterIndex}][filters][0][field]=${encodeURIComponent(field)}`
                );
                queryParams.push(
                    `searchCriteria[filter_groups][${filterIndex}][filters][0][value]=${encodeURIComponent(String(value))}`
                );
                queryParams.push(
                    `searchCriteria[filter_groups][${filterIndex}][filters][0][condition_type]=eq`
                );
                filterIndex++;
            }
        }

        if (created_at_from) {
            queryParams.push(
                `searchCriteria[filter_groups][${filterIndex}][filters][0][field]=created_at`
            );
            queryParams.push(
                `searchCriteria[filter_groups][${filterIndex}][filters][0][value]=${encodeURIComponent(created_at_from)}`
            );
            queryParams.push(
                `searchCriteria[filter_groups][${filterIndex}][filters][0][condition_type]=gteq`
            );
            filterIndex++;
        }

        if (created_at_to) {
            queryParams.push(
                `searchCriteria[filter_groups][${filterIndex}][filters][0][field]=created_at`
            );
            queryParams.push(
                `searchCriteria[filter_groups][${filterIndex}][filters][0][value]=${encodeURIComponent(created_at_to)}`
            );
            queryParams.push(
                `searchCriteria[filter_groups][${filterIndex}][filters][0][condition_type]=lteq`
            );
            filterIndex++;
        }

        if (page) {
            queryParams.push(`searchCriteria[currentPage]=${page}`);
        }
        if (pageSize) {
            queryParams.push(`searchCriteria[pageSize]=${pageSize}`);
        }

        if (queryParams.length === 0) {
            queryParams.push("searchCriteria=");
        }

        return this.get(`/orders?${queryParams.join("&")}`);
    }

    /**
     * Get a single order by ID
     */
    async getOrder(orderId: string): Promise<unknown> {
        return this.get(`/orders/${orderId}`);
    }

    /**
     * Add a comment/status update to an order
     */
    async addOrderComment(
        orderId: string,
        status: string,
        comment?: string,
        notifyCustomer: boolean = false
    ): Promise<unknown> {
        return this.post(`/orders/${orderId}/comments`, {
            statusHistory: {
                comment: comment || "",
                is_customer_notified: notifyCustomer ? 1 : 0,
                is_visible_on_front: 1,
                status
            }
        });
    }

    // ==========================================
    // Customer Operations
    // ==========================================

    /**
     * List customers with filters (search)
     */
    async listCustomers(params?: {
        email?: string;
        firstname?: string;
        lastname?: string;
        group_id?: number;
        page?: number;
        pageSize?: number;
    }): Promise<unknown> {
        const { page, pageSize, ...filters } = params || {};
        const query = this.buildSearchCriteria(filters, { page, pageSize });
        return this.get(`/customers/search?${query}`);
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
        firstname: string;
        lastname: string;
        group_id?: number;
        website_id?: number;
        store_id?: number;
        prefix?: string;
        middlename?: string;
        suffix?: string;
        dob?: string;
        gender?: number;
        taxvat?: string;
    }): Promise<unknown> {
        return this.post("/customers", { customer });
    }

    // ==========================================
    // Inventory Operations
    // ==========================================

    /**
     * Get stock item for a product by SKU
     */
    async getStockItem(sku: string): Promise<unknown> {
        return this.get(`/stockItems/${encodeURIComponent(sku)}`);
    }

    /**
     * Update stock item
     * Note: For MSI, use inventory source items API instead
     */
    async updateStockItem(
        itemId: string,
        stockItem: {
            qty: number;
            is_in_stock: boolean;
        }
    ): Promise<unknown> {
        return this.put(`/stockItems/${itemId}`, { stockItem });
    }

    /**
     * Get inventory source items for a product (MSI)
     */
    async getSourceItems(sku: string): Promise<unknown> {
        const query = this.buildSearchCriteria({ sku }, {});
        return this.get(`/inventory/source-items?${query}`);
    }

    /**
     * Update inventory source item (MSI)
     */
    async updateSourceItem(
        sku: string,
        sourceCode: string,
        quantity: number,
        status: number = 1
    ): Promise<unknown> {
        return this.post("/inventory/source-items", {
            sourceItems: [
                {
                    sku,
                    source_code: sourceCode,
                    quantity,
                    status
                }
            ]
        });
    }

    // ==========================================
    // Category Operations
    // ==========================================

    /**
     * Get category tree
     */
    async getCategoryTree(rootCategoryId?: number, depth?: number): Promise<unknown> {
        let url = "/categories";
        const params: string[] = [];

        if (rootCategoryId !== undefined) {
            params.push(`rootCategoryId=${rootCategoryId}`);
        }
        if (depth !== undefined) {
            params.push(`depth=${depth}`);
        }

        if (params.length > 0) {
            url += `?${params.join("&")}`;
        }

        return this.get(url);
    }
}
