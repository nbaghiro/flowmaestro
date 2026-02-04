import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";
import type {
    SapBusinessPartner,
    SapSalesOrder,
    SapPurchaseOrder,
    SapMaterial,
    SapInvoice,
    SapODataResponse,
    SapODataEntityResponse,
    SapPaginationParams
} from "../operations/types";

export interface SapClientConfig {
    host: string;
    accessToken: string;
    connectionId?: string;
}

/**
 * SAP API error response format
 */
interface SapErrorResponse {
    error?: {
        code?: string;
        message?: {
            value?: string;
        };
        innererror?: {
            errordetails?: Array<{
                code?: string;
                message?: string;
                severity?: string;
            }>;
        };
    };
}

/**
 * SAP S/4HANA Cloud API Client
 *
 * Base URL: https://{host}/sap/opu/odata/sap
 * Authentication: Bearer token
 * Format: OData v2 JSON
 * Rate Limit: ~300 requests/minute
 */
export class SapClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: SapClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://${config.host}/sap/opu/odata/sap`,
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

    /**
     * Override request to handle SAP-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return super.request<T>(config);
    }

    /**
     * Handle SAP-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as SapErrorResponse;

            if (error.response.status === 401) {
                throw new Error("SAP authentication failed. Please check your credentials.");
            }

            if (error.response.status === 403) {
                throw new Error(
                    "You do not have permission to access this SAP resource. Check your authorization scopes."
                );
            }

            if (error.response.status === 404) {
                throw new Error("The requested SAP resource was not found.");
            }

            if (error.response.status === 429) {
                throw new Error("SAP rate limit exceeded. Please try again later.");
            }

            if (data.error?.message?.value) {
                throw new Error(`SAP API error: ${data.error.message.value}`);
            }

            if (data.error?.innererror?.errordetails?.length) {
                const messages = data.error.innererror.errordetails
                    .map((d) => d.message)
                    .filter(Boolean)
                    .join("; ");
                throw new Error(`SAP API error: ${messages}`);
            }
        }

        throw error;
    }

    /**
     * Build OData query params
     */
    private buildODataParams(params?: SapPaginationParams): Record<string, unknown> {
        const queryParams: Record<string, unknown> = {
            $format: "json"
        };

        if (params?.top) queryParams["$top"] = params.top;
        if (params?.skip) queryParams["$skip"] = params.skip;
        if (params?.filter) queryParams["$filter"] = params.filter;
        if (params?.select) queryParams["$select"] = params.select;
        if (params?.expand) queryParams["$expand"] = params.expand;
        queryParams["$inlinecount"] = "allpages";

        return queryParams;
    }

    // =========================================================================
    // Business Partners
    // =========================================================================

    async listBusinessPartners(
        params?: SapPaginationParams
    ): Promise<SapODataResponse<SapBusinessPartner>> {
        return this.get("/API_BUSINESS_PARTNER/A_BusinessPartner", this.buildODataParams(params));
    }

    async getBusinessPartner(id: string): Promise<SapODataEntityResponse<SapBusinessPartner>> {
        return this.get(`/API_BUSINESS_PARTNER/A_BusinessPartner('${id}')`, { $format: "json" });
    }

    async createBusinessPartner(
        data: Record<string, unknown>
    ): Promise<SapODataEntityResponse<SapBusinessPartner>> {
        return this.post("/API_BUSINESS_PARTNER/A_BusinessPartner", data);
    }

    async updateBusinessPartner(
        id: string,
        data: Record<string, unknown>
    ): Promise<SapODataEntityResponse<SapBusinessPartner>> {
        return this.patch(`/API_BUSINESS_PARTNER/A_BusinessPartner('${id}')`, data);
    }

    // =========================================================================
    // Sales Orders
    // =========================================================================

    async listSalesOrders(params?: SapPaginationParams): Promise<SapODataResponse<SapSalesOrder>> {
        return this.get("/API_SALES_ORDER_SRV/A_SalesOrder", this.buildODataParams(params));
    }

    async getSalesOrder(id: string): Promise<SapODataEntityResponse<SapSalesOrder>> {
        return this.get(`/API_SALES_ORDER_SRV/A_SalesOrder('${id}')`, { $format: "json" });
    }

    async createSalesOrder(
        data: Record<string, unknown>
    ): Promise<SapODataEntityResponse<SapSalesOrder>> {
        return this.post("/API_SALES_ORDER_SRV/A_SalesOrder", data);
    }

    // =========================================================================
    // Purchase Orders
    // =========================================================================

    async listPurchaseOrders(
        params?: SapPaginationParams
    ): Promise<SapODataResponse<SapPurchaseOrder>> {
        return this.get(
            "/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder",
            this.buildODataParams(params)
        );
    }

    async getPurchaseOrder(id: string): Promise<SapODataEntityResponse<SapPurchaseOrder>> {
        return this.get(`/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder('${id}')`, {
            $format: "json"
        });
    }

    async createPurchaseOrder(
        data: Record<string, unknown>
    ): Promise<SapODataEntityResponse<SapPurchaseOrder>> {
        return this.post("/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder", data);
    }

    // =========================================================================
    // Materials / Products
    // =========================================================================

    async listMaterials(params?: SapPaginationParams): Promise<SapODataResponse<SapMaterial>> {
        return this.get("/API_PRODUCT_SRV/A_Product", this.buildODataParams(params));
    }

    async getMaterial(id: string): Promise<SapODataEntityResponse<SapMaterial>> {
        return this.get(`/API_PRODUCT_SRV/A_Product('${id}')`, { $format: "json" });
    }

    // =========================================================================
    // Invoices (Billing Documents)
    // =========================================================================

    async listInvoices(params?: SapPaginationParams): Promise<SapODataResponse<SapInvoice>> {
        return this.get(
            "/API_BILLING_DOCUMENT_SRV/A_BillingDocument",
            this.buildODataParams(params)
        );
    }

    async getInvoice(id: string): Promise<SapODataEntityResponse<SapInvoice>> {
        return this.get(`/API_BILLING_DOCUMENT_SRV/A_BillingDocument('${id}')`, {
            $format: "json"
        });
    }
}
