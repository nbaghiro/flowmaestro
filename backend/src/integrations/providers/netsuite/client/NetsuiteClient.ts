import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";
import type {
    NetsuiteCustomer,
    NetsuiteSalesOrder,
    NetsuitePurchaseOrder,
    NetsuiteInvoice,
    NetsuiteItem,
    NetsuiteCollectionResponse,
    NetsuitePaginationParams
} from "../operations/types";

export interface NetsuiteClientConfig {
    accountId: string;
    accessToken: string;
    connectionId?: string;
}

/**
 * NetSuite API error response format
 */
interface NetsuiteErrorResponse {
    type?: string;
    title?: string;
    status?: number;
    "o:errorDetails"?: Array<{
        detail?: string;
        "o:errorCode"?: string;
    }>;
}

/**
 * NetSuite REST API Client
 *
 * Base URL: https://{accountId}.suitetalk.api.netsuite.com/services/rest/record/v1
 * Authentication: Bearer token
 * Format: JSON
 * Rate Limit: ~300 requests/minute
 */
export class NetsuiteClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: NetsuiteClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://${config.accountId}.suitetalk.api.netsuite.com/services/rest/record/v1`,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential"
            },
            connectionPool: {
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.accessToken = config.accessToken;

        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            reqConfig.headers["Accept"] = "application/json";
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return super.request<T>(config);
    }

    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as NetsuiteErrorResponse;

            if (error.response.status === 401) {
                throw new Error("NetSuite authentication failed. Please check your credentials.");
            }

            if (error.response.status === 403) {
                throw new Error(
                    "You do not have permission to access this NetSuite resource. Check your role permissions."
                );
            }

            if (error.response.status === 404) {
                throw new Error("The requested NetSuite resource was not found.");
            }

            if (error.response.status === 429) {
                throw new Error("NetSuite rate limit exceeded. Please try again later.");
            }

            if (data["o:errorDetails"]?.length) {
                const messages = data["o:errorDetails"]
                    .map((d) => d.detail)
                    .filter(Boolean)
                    .join("; ");
                throw new Error(`NetSuite API error: ${messages}`);
            }

            if (data.title) {
                throw new Error(`NetSuite API error: ${data.title}`);
            }
        }

        throw error;
    }

    private buildQueryParams(params?: NetsuitePaginationParams): Record<string, unknown> {
        const queryParams: Record<string, unknown> = {};

        if (params?.limit) queryParams["limit"] = params.limit;
        if (params?.offset) queryParams["offset"] = params.offset;
        if (params?.q) queryParams["q"] = params.q;

        return queryParams;
    }

    // =========================================================================
    // Customers
    // =========================================================================

    async listCustomers(
        params?: NetsuitePaginationParams
    ): Promise<NetsuiteCollectionResponse<NetsuiteCustomer>> {
        return this.get("/customer", this.buildQueryParams(params));
    }

    async getCustomer(id: string): Promise<NetsuiteCustomer> {
        return this.get(`/customer/${id}`);
    }

    async createCustomer(data: Record<string, unknown>): Promise<NetsuiteCustomer> {
        return this.post("/customer", data);
    }

    async updateCustomer(id: string, data: Record<string, unknown>): Promise<NetsuiteCustomer> {
        return this.patch(`/customer/${id}`, data);
    }

    // =========================================================================
    // Sales Orders
    // =========================================================================

    async listSalesOrders(
        params?: NetsuitePaginationParams
    ): Promise<NetsuiteCollectionResponse<NetsuiteSalesOrder>> {
        return this.get("/salesOrder", this.buildQueryParams(params));
    }

    async getSalesOrder(id: string): Promise<NetsuiteSalesOrder> {
        return this.get(`/salesOrder/${id}`);
    }

    async createSalesOrder(data: Record<string, unknown>): Promise<NetsuiteSalesOrder> {
        return this.post("/salesOrder", data);
    }

    // =========================================================================
    // Purchase Orders
    // =========================================================================

    async listPurchaseOrders(
        params?: NetsuitePaginationParams
    ): Promise<NetsuiteCollectionResponse<NetsuitePurchaseOrder>> {
        return this.get("/purchaseOrder", this.buildQueryParams(params));
    }

    async getPurchaseOrder(id: string): Promise<NetsuitePurchaseOrder> {
        return this.get(`/purchaseOrder/${id}`);
    }

    async createPurchaseOrder(data: Record<string, unknown>): Promise<NetsuitePurchaseOrder> {
        return this.post("/purchaseOrder", data);
    }

    // =========================================================================
    // Invoices
    // =========================================================================

    async listInvoices(
        params?: NetsuitePaginationParams
    ): Promise<NetsuiteCollectionResponse<NetsuiteInvoice>> {
        return this.get("/invoice", this.buildQueryParams(params));
    }

    async getInvoice(id: string): Promise<NetsuiteInvoice> {
        return this.get(`/invoice/${id}`);
    }

    async createInvoice(data: Record<string, unknown>): Promise<NetsuiteInvoice> {
        return this.post("/invoice", data);
    }

    // =========================================================================
    // Items
    // =========================================================================

    async listItems(
        params?: NetsuitePaginationParams
    ): Promise<NetsuiteCollectionResponse<NetsuiteItem>> {
        return this.get("/inventoryItem", this.buildQueryParams(params));
    }

    async getItem(id: string): Promise<NetsuiteItem> {
        return this.get(`/inventoryItem/${id}`);
    }
}
