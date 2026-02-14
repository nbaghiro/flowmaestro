import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface ShipStationClientConfig {
    apiKey: string;
    apiSecret: string;
    connectionId?: string;
}

/**
 * ShipStation API Client
 *
 * Features:
 * - Basic Auth (base64 encoded key:secret)
 * - Strict rate limit handling (40 req/min)
 * - Aggressive exponential backoff
 */
export class ShipStationClient extends BaseAPIClient {
    private apiKey: string;
    private apiSecret: string;

    constructor(config: ShipStationClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://ssapi.shipstation.com",
            timeout: 30000,
            retryConfig: {
                maxRetries: 5, // More retries due to strict rate limit
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential",
                initialDelay: 2000, // Start with longer delay
                maxDelay: 30000 // Max 30 seconds
            },
            connectionPool: {
                maxSockets: 10, // Fewer concurrent connections due to rate limit
                maxFreeSockets: 5,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;

        // Add request interceptor for Basic Auth
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString("base64");
            reqConfig.headers["Authorization"] = `Basic ${credentials}`;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Override request to handle ShipStation-specific errors
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
     * Handle ShipStation-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as Record<string, unknown>;

            if (status === 429) {
                // ShipStation rate limit - get retry-after header
                const retryAfter = error.response.headers?.["retry-after"];
                const delay = retryAfter ? parseInt(retryAfter as string, 10) : 60;
                throw new Error(`Rate limited. Please wait ${delay} seconds.`);
            }

            if (status === 401) {
                throw new Error(
                    "ShipStation authentication failed. Please check your API credentials."
                );
            }

            if (status === 403) {
                throw new Error("Access forbidden. Please check your API permissions.");
            }

            if (status === 404) {
                throw new Error("Resource not found.");
            }

            // Handle ShipStation error format
            if (data.Message) {
                throw new Error(`ShipStation API error: ${data.Message}`);
            }

            if (data.ExceptionMessage) {
                throw new Error(`ShipStation error: ${data.ExceptionMessage}`);
            }
        }

        throw error;
    }

    // ==========================================
    // Order Operations
    // ==========================================

    /**
     * List orders with filters
     */
    async listOrders(params?: {
        customerName?: string;
        orderNumber?: string;
        orderStatus?: string;
        storeId?: number;
        sortBy?: string;
        sortDir?: string;
        createDateStart?: string;
        createDateEnd?: string;
        modifyDateStart?: string;
        modifyDateEnd?: string;
        page?: number;
        pageSize?: number;
    }): Promise<unknown> {
        return this.get("/orders", params);
    }

    /**
     * Get a single order by ID
     */
    async getOrder(orderId: number): Promise<unknown> {
        return this.get(`/orders/${orderId}`);
    }

    /**
     * Create a new order
     */
    async createOrder(order: {
        orderNumber: string;
        orderDate: string;
        orderStatus: string;
        billTo: Record<string, unknown>;
        shipTo: Record<string, unknown>;
        items: Array<Record<string, unknown>>;
        amountPaid?: number;
        shippingAmount?: number;
        customerEmail?: string;
        customerNotes?: string;
        internalNotes?: string;
        requestedShippingService?: string;
    }): Promise<unknown> {
        return this.post("/orders/createorder", order);
    }

    /**
     * Mark order as shipped
     */
    async markOrderShipped(params: {
        orderId: number;
        carrierCode: string;
        shipDate: string;
        trackingNumber?: string;
        notifyCustomer?: boolean;
        notifySalesChannel?: boolean;
    }): Promise<unknown> {
        return this.post("/orders/markasshipped", params);
    }

    // ==========================================
    // Shipment Operations
    // ==========================================

    /**
     * Create a shipment with label
     */
    async createShipment(params: {
        orderId: number;
        carrierCode: string;
        serviceCode: string;
        packageCode?: string;
        confirmation?: string;
        shipDate: string;
        weight: { value: number; units: string };
        dimensions?: { length: number; width: number; height: number; units: string };
        testLabel?: boolean;
    }): Promise<unknown> {
        return this.post("/shipments/createlabel", params);
    }

    // ==========================================
    // Rate Operations
    // ==========================================

    /**
     * Get shipping rates
     */
    async getRates(params: {
        carrierCode?: string;
        fromPostalCode: string;
        toPostalCode: string;
        toCountry: string;
        weight: { value: number; units: string };
        dimensions?: { length: number; width: number; height: number; units: string };
        residential?: boolean;
    }): Promise<unknown> {
        return this.post("/shipments/getrates", params);
    }

    // ==========================================
    // Label Operations
    // ==========================================

    /**
     * Create a label for an order
     */
    async createLabel(params: {
        orderId: number;
        carrierCode: string;
        serviceCode: string;
        packageCode?: string;
        confirmation?: string;
        shipDate: string;
        weight: { value: number; units: string };
        dimensions?: { length: number; width: number; height: number; units: string };
        testLabel?: boolean;
    }): Promise<unknown> {
        return this.post("/orders/createlabelfororder", params);
    }

    /**
     * Void a label
     */
    async voidLabel(shipmentId: number): Promise<unknown> {
        return this.post("/shipments/voidlabel", { shipmentId });
    }

    // ==========================================
    // Carrier Operations
    // ==========================================

    /**
     * List carriers
     */
    async listCarriers(): Promise<unknown> {
        return this.get("/carriers");
    }

    /**
     * List services for a carrier
     */
    async listServices(carrierCode: string): Promise<unknown> {
        return this.get(`/carriers/listservices?carrierCode=${encodeURIComponent(carrierCode)}`);
    }

    // ==========================================
    // Warehouse Operations
    // ==========================================

    /**
     * List warehouses
     */
    async listWarehouses(): Promise<unknown> {
        return this.get("/warehouses");
    }

    // ==========================================
    // Store Operations
    // ==========================================

    /**
     * List stores
     */
    async listStores(showInactive?: boolean): Promise<unknown> {
        const params: Record<string, string> = {};
        if (showInactive) {
            params.showInactive = "true";
        }
        return this.get("/stores", Object.keys(params).length > 0 ? params : undefined);
    }
}
