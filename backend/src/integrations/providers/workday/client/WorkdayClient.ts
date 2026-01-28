import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";
import type {
    WorkdayWorker,
    WorkdayWorkerDetail,
    WorkdayAbsenceBalance,
    WorkdayAbsenceType,
    WorkdayTimeOffRequest,
    WorkdayPayGroup,
    WorkdayCompanyInfo,
    WorkdayResourceResponse,
    WorkdayCollectionResponse,
    WorkdayCreateTimeOffRequest
} from "../operations/types";

export interface WorkdayClientConfig {
    accessToken: string;
    tenant: string;
    connectionId?: string;
}

/**
 * Workday API error response format
 */
interface WorkdayErrorResponse {
    error?: string;
    error_description?: string;
    errors?: Array<{
        code?: string;
        message?: string;
        field?: string;
    }>;
}

/**
 * Workday REST API Client with connection pooling and error handling
 *
 * API Base URL: https://{tenant}.workday.com/ccx/api/v1/{tenant}
 * Authentication: Bearer token in Authorization header
 * Rate Limit: 600 requests/minute (10 req/sec)
 */
export class WorkdayClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: WorkdayClientConfig) {
        // Workday uses tenant-specific URLs
        const baseURL = `https://${config.tenant}.workday.com/ccx/api/v1/${config.tenant}`;

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
     * Override request to handle Workday-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return super.request<T>(config);
    }

    /**
     * Handle Workday-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as WorkdayErrorResponse;

            // Handle authentication errors
            if (error.response.status === 401) {
                throw new Error("Workday authentication failed. Please reconnect your account.");
            }

            // Handle forbidden errors
            if (error.response.status === 403) {
                throw new Error(
                    "You do not have permission to access this Workday resource. Check your Integration System User security groups."
                );
            }

            // Handle not found errors
            if (error.response.status === 404) {
                throw new Error("The requested Workday resource was not found.");
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Workday rate limit exceeded. Please try again later.");
            }

            // Handle validation errors (400)
            if (error.response.status === 400) {
                if (data.errors && data.errors.length > 0) {
                    const messages = data.errors.map((e) => e.message).join("; ");
                    throw new Error(`Workday validation error: ${messages}`);
                }
                const errorMessage =
                    data.error_description || data.error || "Invalid request parameters";
                throw new Error(`Workday validation error: ${errorMessage}`);
            }

            // Handle other errors with message
            if (data.error_description) {
                throw new Error(`Workday API error: ${data.error_description}`);
            }

            if (data.error) {
                throw new Error(`Workday API error: ${data.error}`);
            }
        }

        throw error;
    }

    /**
     * List workers in the organization
     */
    async listWorkers(params?: {
        limit?: number;
        offset?: number;
    }): Promise<WorkdayCollectionResponse<WorkdayWorker>> {
        return this.get("/workers", params);
    }

    /**
     * Get a specific worker by ID
     */
    async getWorker(workerId: string): Promise<WorkdayResourceResponse<WorkdayWorkerDetail>> {
        return this.get(`/workers/${workerId}`);
    }

    /**
     * List absence balances
     */
    async listAbsenceBalances(params?: {
        workerId?: string;
    }): Promise<WorkdayCollectionResponse<WorkdayAbsenceBalance>> {
        const endpoint = params?.workerId
            ? `/workers/${params.workerId}/absenceBalances`
            : "/absenceBalances";
        return this.get(endpoint);
    }

    /**
     * Get eligible absence types for a worker
     */
    async getEligibleAbsenceTypes(
        workerId: string
    ): Promise<WorkdayCollectionResponse<WorkdayAbsenceType>> {
        return this.get(`/workers/${workerId}/eligibleAbsenceTypes`);
    }

    /**
     * Request time off for a worker
     */
    async requestTimeOff(
        data: WorkdayCreateTimeOffRequest
    ): Promise<WorkdayResourceResponse<WorkdayTimeOffRequest>> {
        return this.post(`/workers/${data.workerId}/timeOffRequests`, {
            absenceTypeId: data.absenceTypeId,
            startDate: data.startDate,
            endDate: data.endDate,
            comment: data.comment
        });
    }

    /**
     * List pay groups
     */
    async listPayGroups(params?: {
        limit?: number;
        offset?: number;
    }): Promise<WorkdayCollectionResponse<WorkdayPayGroup>> {
        return this.get("/payGroups", params);
    }

    /**
     * Get company information
     */
    async getCompanyInfo(): Promise<WorkdayResourceResponse<WorkdayCompanyInfo>> {
        return this.get("/company");
    }
}
