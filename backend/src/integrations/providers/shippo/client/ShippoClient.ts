import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface ShippoClientConfig {
    apiToken: string;
    connectionId?: string;
}

/**
 * Shippo API Client
 *
 * Features:
 * - ShippoToken authentication
 * - Rate limit handling (500 POST/min, 4000 GET/min)
 * - Automatic retry with exponential backoff
 */
export class ShippoClient extends BaseAPIClient {
    private apiToken: string;

    constructor(config: ShippoClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.goshippo.com",
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

        this.apiToken = config.apiToken;

        // Add request interceptor for ShippoToken auth
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `ShippoToken ${this.apiToken}`;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Override request to handle Shippo-specific errors
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
     * Handle Shippo-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as Record<string, unknown>;

            if (status === 429) {
                throw new Error("Rate limited. Please wait and try again.");
            }

            if (status === 401) {
                throw new Error("Shippo authentication failed. Please check your API token.");
            }

            if (status === 403) {
                throw new Error("Access forbidden. Please check your API permissions.");
            }

            if (status === 404) {
                throw new Error("Resource not found.");
            }

            // Handle Shippo error format
            if (data.detail) {
                throw new Error(`Shippo API error: ${data.detail}`);
            }

            if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
                throw new Error(
                    `Shippo API error: ${(data.non_field_errors as string[]).join(", ")}`
                );
            }

            // Field-specific errors
            const errors: string[] = [];
            for (const [field, messages] of Object.entries(data)) {
                if (Array.isArray(messages) && field !== "non_field_errors") {
                    errors.push(`${field}: ${messages.join(", ")}`);
                }
            }
            if (errors.length > 0) {
                throw new Error(`Shippo validation error: ${errors.join("; ")}`);
            }
        }

        throw error;
    }

    // ==========================================
    // Address Operations
    // ==========================================

    /**
     * Validate an address
     */
    async validateAddress(address: {
        name: string;
        company?: string;
        street1: string;
        street2?: string;
        city: string;
        state: string;
        zip: string;
        country: string;
        phone?: string;
        email?: string;
        is_residential?: boolean;
        validate?: boolean;
    }): Promise<unknown> {
        return this.post("/addresses", address);
    }

    // ==========================================
    // Shipment Operations
    // ==========================================

    /**
     * Create a shipment
     */
    async createShipment(shipment: {
        address_from: Record<string, unknown>;
        address_to: Record<string, unknown>;
        parcels: Array<Record<string, unknown>>;
        async?: boolean;
    }): Promise<unknown> {
        return this.post("/shipments", shipment);
    }

    /**
     * List shipments
     */
    async listShipments(params?: { page?: number; results?: number }): Promise<unknown> {
        return this.get("/shipments", params);
    }

    /**
     * Get a shipment by ID
     */
    async getShipment(shipmentId: string): Promise<unknown> {
        return this.get(`/shipments/${shipmentId}`);
    }

    // ==========================================
    // Rate Operations
    // ==========================================

    /**
     * Get rates for a shipment
     */
    async getRates(shipmentId: string, currencyCode?: string): Promise<unknown> {
        const params: Record<string, string> = {};
        if (currencyCode) {
            params.currency_code = currencyCode;
        }
        return this.get(
            `/shipments/${shipmentId}/rates`,
            Object.keys(params).length > 0 ? params : undefined
        );
    }

    // ==========================================
    // Transaction/Label Operations
    // ==========================================

    /**
     * Create a label (transaction)
     */
    async createLabel(transaction: {
        rate: string;
        label_file_type?: string;
        async?: boolean;
    }): Promise<unknown> {
        return this.post("/transactions", transaction);
    }

    /**
     * Get a label/transaction by ID
     */
    async getLabel(transactionId: string): Promise<unknown> {
        return this.get(`/transactions/${transactionId}`);
    }

    // ==========================================
    // Tracking Operations
    // ==========================================

    /**
     * Register a tracking webhook
     */
    async trackShipment(params: { carrier: string; tracking_number: string }): Promise<unknown> {
        return this.post("/tracks", params);
    }

    /**
     * Get tracking status
     */
    async getTrackingStatus(carrier: string, trackingNumber: string): Promise<unknown> {
        return this.get(`/tracks/${carrier}/${trackingNumber}`);
    }

    // ==========================================
    // Manifest Operations
    // ==========================================

    /**
     * Create a manifest (end-of-day document)
     */
    async createManifest(manifest: {
        carrier_account: string;
        shipment_date: string;
        address_from: Record<string, unknown>;
        transactions?: string[];
        async?: boolean;
    }): Promise<unknown> {
        return this.post("/manifests", manifest);
    }

    // ==========================================
    // Carrier Account Operations
    // ==========================================

    /**
     * List carrier accounts
     */
    async listCarrierAccounts(params?: {
        carrier?: string;
        page?: number;
        results?: number;
    }): Promise<unknown> {
        return this.get("/carrier_accounts", params);
    }
}
