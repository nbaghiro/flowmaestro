import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";
import type {
    RipplingEmployee,
    RipplingDepartment,
    RipplingTeam,
    RipplingWorkLocation,
    RipplingCompany,
    RipplingLeaveRequest,
    RipplingLeaveBalance,
    RipplingResourceResponse,
    RipplingCollectionResponse
} from "../operations/types";

export interface RipplingClientConfig {
    accessToken: string;
    connectionId?: string;
}

/**
 * Rippling API error response format
 */
interface RipplingErrorResponse {
    error?: string;
    message?: string;
    errors?: Array<{
        field?: string;
        message?: string;
    }>;
}

/**
 * Rippling Platform API Client with connection pooling and error handling
 *
 * API Base URL: https://api.rippling.com/platform/api
 * Authentication: Bearer token in Authorization header
 * Rate Limit: 1000 requests/minute
 */
export class RipplingClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: RipplingClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.rippling.com/platform/api",
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
     * Override request to handle Rippling-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return super.request<T>(config);
    }

    /**
     * Handle Rippling-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as RipplingErrorResponse;

            // Handle authentication errors
            if (error.response.status === 401) {
                throw new Error("Rippling authentication failed. Please reconnect your account.");
            }

            // Handle forbidden errors
            if (error.response.status === 403) {
                throw new Error(
                    "You do not have permission to access this Rippling resource. Check your app scopes."
                );
            }

            // Handle not found errors
            if (error.response.status === 404) {
                throw new Error("The requested Rippling resource was not found.");
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Rippling rate limit exceeded. Please try again later.");
            }

            // Handle validation errors (400)
            if (error.response.status === 400) {
                if (data.errors && data.errors.length > 0) {
                    const messages = data.errors
                        .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
                        .join("; ");
                    throw new Error(`Rippling validation error: ${messages}`);
                }
                const errorMessage = data.message || data.error || "Invalid request parameters";
                throw new Error(`Rippling validation error: ${errorMessage}`);
            }

            // Handle other errors with message
            if (data.message) {
                throw new Error(`Rippling API error: ${data.message}`);
            }

            if (data.error) {
                throw new Error(`Rippling API error: ${data.error}`);
            }
        }

        throw error;
    }

    /**
     * List active employees
     */
    async listEmployees(params?: {
        limit?: number;
        offset?: number;
    }): Promise<RipplingCollectionResponse<RipplingEmployee>> {
        return this.get("/employees", { ...params, status: "ACTIVE" });
    }

    /**
     * List all employees (including terminated)
     */
    async listAllEmployees(params?: {
        limit?: number;
        offset?: number;
    }): Promise<RipplingCollectionResponse<RipplingEmployee>> {
        return this.get("/employees", params);
    }

    /**
     * Get a specific employee by ID
     */
    async getEmployee(employeeId: string): Promise<RipplingResourceResponse<RipplingEmployee>> {
        return this.get(`/employees/${employeeId}`);
    }

    /**
     * List departments
     */
    async listDepartments(params?: {
        limit?: number;
        offset?: number;
    }): Promise<RipplingCollectionResponse<RipplingDepartment>> {
        return this.get("/departments", params);
    }

    /**
     * List teams
     */
    async listTeams(params?: {
        limit?: number;
        offset?: number;
    }): Promise<RipplingCollectionResponse<RipplingTeam>> {
        return this.get("/teams", params);
    }

    /**
     * List work locations
     */
    async listWorkLocations(): Promise<RipplingCollectionResponse<RipplingWorkLocation>> {
        return this.get("/work-locations");
    }

    /**
     * Get company information
     */
    async getCompany(): Promise<RipplingResourceResponse<RipplingCompany>> {
        return this.get("/company");
    }

    /**
     * List leave requests
     */
    async listLeaveRequests(params?: {
        startDate?: string;
        endDate?: string;
        status?: string;
    }): Promise<RipplingCollectionResponse<RipplingLeaveRequest>> {
        return this.get("/leave-requests", params);
    }

    /**
     * Get leave balances
     */
    async getLeaveBalances(params?: {
        employeeId?: string;
    }): Promise<RipplingCollectionResponse<RipplingLeaveBalance>> {
        const endpoint = params?.employeeId
            ? `/employees/${params.employeeId}/leave-balances`
            : "/leave-balances";
        return this.get(endpoint);
    }

    /**
     * Process (approve/decline) a leave request
     */
    async processLeaveRequest(
        requestId: string,
        action: "approve" | "decline"
    ): Promise<RipplingResourceResponse<RipplingLeaveRequest>> {
        return this.post(`/leave-requests/${requestId}/${action}`, {});
    }
}
