import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";
import type {
    DeelPerson,
    DeelContract,
    DeelTimeOffRequest,
    DeelTimeOffEntitlement,
    DeelTimesheet,
    DeelResourceResponse,
    DeelCollectionResponse,
    CreateTimeOffRequestPayload
} from "../operations/types";

export interface DeelClientConfig {
    accessToken: string;
    connectionId?: string;
}

/**
 * Deel API error response format
 */
interface DeelErrorResponse {
    error?: {
        code?: string;
        message?: string;
    };
    message?: string;
    errors?: Array<{
        field?: string;
        message?: string;
    }>;
}

/**
 * Deel REST API v2 Client with connection pooling and error handling
 *
 * API Base URL: https://api.letsdeel.com/rest/v2
 * Authentication: Bearer token in Authorization header
 */
export class DeelClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: DeelClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.letsdeel.com/rest/v2",
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

        // Add request interceptor to add Authorization header
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            reqConfig.headers["Content-Type"] = "application/json";
            reqConfig.headers["Accept"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Override request to handle Deel-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return super.request<T>(config);
    }

    /**
     * Handle Deel-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as DeelErrorResponse;

            // Handle authentication errors
            if (error.response.status === 401) {
                throw new Error(
                    "Deel authentication failed. Please check your API key and reconnect."
                );
            }

            // Handle forbidden errors
            if (error.response.status === 403) {
                throw new Error(
                    "You do not have permission to access this Deel resource. Check your API token permissions."
                );
            }

            // Handle not found errors
            if (error.response.status === 404) {
                throw new Error("The requested Deel resource was not found.");
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Deel rate limit exceeded. Please try again later.");
            }

            // Handle validation errors (400)
            if (error.response.status === 400) {
                if (data.errors && data.errors.length > 0) {
                    const messages = data.errors
                        .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
                        .join("; ");
                    throw new Error(`Deel validation error: ${messages}`);
                }
                const errorMessage =
                    data.message || data.error?.message || "Invalid request parameters";
                throw new Error(`Deel validation error: ${errorMessage}`);
            }

            // Handle other errors with message
            if (data.error?.message) {
                throw new Error(`Deel API error: ${data.error.message}`);
            }

            if (data.message) {
                throw new Error(`Deel API error: ${data.message}`);
            }
        }

        throw error;
    }

    // ========================================================================
    // People (Workers) API
    // ========================================================================

    /**
     * List all people (employees, contractors, EOR workers)
     */
    async listPeople(params?: {
        page?: number;
        page_size?: number;
        worker_type?: string;
        status?: string;
    }): Promise<DeelCollectionResponse<DeelPerson>> {
        return this.get("/people", params);
    }

    /**
     * Get a specific person by ID
     */
    async getPerson(personId: string): Promise<DeelResourceResponse<DeelPerson>> {
        return this.get(`/people/${personId}`);
    }

    // ========================================================================
    // Contracts API
    // ========================================================================

    /**
     * List contracts
     */
    async listContracts(params?: {
        page?: number;
        page_size?: number;
        type?: string;
        status?: string;
    }): Promise<DeelCollectionResponse<DeelContract>> {
        return this.get("/contracts", params);
    }

    /**
     * Get a specific contract by ID
     */
    async getContract(contractId: string): Promise<DeelResourceResponse<DeelContract>> {
        return this.get(`/contracts/${contractId}`);
    }

    // ========================================================================
    // Time Off API
    // ========================================================================

    /**
     * List time off requests for a person
     */
    async listTimeOffRequests(params: {
        person_id: string;
        status?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<DeelCollectionResponse<DeelTimeOffRequest>> {
        const { person_id, ...queryParams } = params;
        return this.get(`/time_offs/profile/${person_id}`, queryParams);
    }

    /**
     * Create a time off request
     */
    async createTimeOffRequest(
        payload: CreateTimeOffRequestPayload
    ): Promise<DeelResourceResponse<DeelTimeOffRequest>> {
        return this.post("/time_offs", payload);
    }

    /**
     * Get time off entitlements/balance for a person
     */
    async getTimeOffBalance(
        personId: string
    ): Promise<DeelCollectionResponse<DeelTimeOffEntitlement>> {
        return this.get(`/time_offs/profile/${personId}/entitlements`);
    }

    // ========================================================================
    // Timesheets API
    // ========================================================================

    /**
     * List timesheets
     */
    async listTimesheets(params?: {
        page?: number;
        page_size?: number;
        person_id?: string;
        status?: string;
        period_start?: string;
        period_end?: string;
    }): Promise<DeelCollectionResponse<DeelTimesheet>> {
        return this.get("/timesheets", params);
    }
}
