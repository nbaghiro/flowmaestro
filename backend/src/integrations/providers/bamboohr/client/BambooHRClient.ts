import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";
import type {
    BambooHREmployee,
    BambooHRDirectoryEntry,
    BambooHRCompanyInfo,
    BambooHRTimeOffRequest,
    BambooHRWhosOutEntry,
    BambooHRTimeOffPolicy,
    BambooHRCreateTimeOffRequest,
    BambooHRResourceResponse,
    BambooHRCollectionResponse
} from "../operations/types";

export interface BambooHRClientConfig {
    accessToken: string;
    companyDomain: string;
    connectionId?: string;
}

/**
 * BambooHR API error response format
 */
interface BambooHRErrorResponse {
    error?: string;
    message?: string;
    errors?: Array<{
        field?: string;
        message?: string;
    }>;
}

/**
 * BambooHR REST API Client with connection pooling and error handling
 *
 * API Base URL: https://api.bamboohr.com/api/gateway.php/{companyDomain}/v1
 * Authentication: Bearer token in Authorization header
 * Rate Limit: ~600 requests/minute
 */
export class BambooHRClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: BambooHRClientConfig) {
        // BambooHR uses company-domain-specific API URLs
        const baseURL = `https://api.bamboohr.com/api/gateway.php/${config.companyDomain}/v1`;

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
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
     * Override request to handle BambooHR-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return super.request<T>(config);
    }

    /**
     * Handle BambooHR-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as BambooHRErrorResponse;

            if (error.response.status === 401) {
                throw new Error("BambooHR authentication failed. Please reconnect your account.");
            }

            if (error.response.status === 403) {
                throw new Error(
                    "You do not have permission to access this BambooHR resource. Check your API permissions."
                );
            }

            if (error.response.status === 404) {
                throw new Error("The requested BambooHR resource was not found.");
            }

            if (error.response.status === 429) {
                throw new Error("BambooHR rate limit exceeded. Please try again later.");
            }

            if (error.response.status === 400) {
                if (data.errors && data.errors.length > 0) {
                    const messages = data.errors
                        .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
                        .join("; ");
                    throw new Error(`BambooHR validation error: ${messages}`);
                }
                const errorMessage = data.message || data.error || "Invalid request parameters";
                throw new Error(`BambooHR validation error: ${errorMessage}`);
            }

            if (data.message) {
                throw new Error(`BambooHR API error: ${data.message}`);
            }

            if (data.error) {
                throw new Error(`BambooHR API error: ${data.error}`);
            }
        }

        throw error;
    }

    /**
     * List employees
     */
    async listEmployees(params?: {
        limit?: number;
        offset?: number;
    }): Promise<BambooHRCollectionResponse<BambooHREmployee>> {
        return this.get("/employees", params);
    }

    /**
     * Get a specific employee by ID
     */
    async getEmployee(
        employeeId: string,
        fields?: string[]
    ): Promise<BambooHRResourceResponse<BambooHREmployee>> {
        const params = fields ? { fields: fields.join(",") } : undefined;
        return this.get(`/employees/${employeeId}`, params);
    }

    /**
     * Get employee directory
     */
    async getEmployeeDirectory(): Promise<BambooHRCollectionResponse<BambooHRDirectoryEntry>> {
        return this.get("/employees/directory");
    }

    /**
     * Get company information
     */
    async getCompanyInfo(): Promise<BambooHRResourceResponse<BambooHRCompanyInfo>> {
        return this.get("/company_info");
    }

    /**
     * List time off requests
     */
    async listTimeOffRequests(params?: {
        start?: string;
        end?: string;
        status?: string;
    }): Promise<BambooHRCollectionResponse<BambooHRTimeOffRequest>> {
        return this.get("/time_off/requests", params);
    }

    /**
     * Create time off request
     */
    async createTimeOffRequest(
        data: BambooHRCreateTimeOffRequest
    ): Promise<BambooHRResourceResponse<BambooHRTimeOffRequest>> {
        return this.post(`/employees/${data.employeeId}/time_off/request`, {
            start: data.start,
            end: data.end,
            timeOffTypeId: data.timeOffTypeId,
            amount: data.amount,
            notes: data.notes,
            status: data.status
        });
    }

    /**
     * Get who's out
     */
    async getWhosOut(params?: {
        start?: string;
        end?: string;
    }): Promise<BambooHRCollectionResponse<BambooHRWhosOutEntry>> {
        return this.get("/time_off/whos_out", params);
    }

    /**
     * List time off policies
     */
    async listTimeOffPolicies(): Promise<BambooHRCollectionResponse<BambooHRTimeOffPolicy>> {
        return this.get("/time_off/policies");
    }
}
