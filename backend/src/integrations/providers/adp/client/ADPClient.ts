import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";
import type {
    ADPWorker,
    ADPDepartment,
    ADPTimeOffRequest,
    ADPTimeOffBalance,
    ADPPayStatement,
    ADPCollectionResponse
} from "../operations/types";

export interface ADPClientConfig {
    accessToken: string;
    connectionId?: string;
}

/**
 * ADP API error response format
 */
interface ADPErrorResponse {
    error?: string;
    error_description?: string;
    confirmMessage?: {
        messageTxt?: string;
    };
}

/**
 * ADP Platform API Client with connection pooling and error handling
 *
 * API Base URL: https://api.adp.com
 * Authentication: Bearer token in Authorization header
 * Rate Limit: 600 requests/minute
 */
export class ADPClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: ADPClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.adp.com",
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
     * Override request to handle ADP-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return super.request<T>(config);
    }

    /**
     * Handle ADP-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as ADPErrorResponse;

            if (error.response.status === 401) {
                throw new Error("ADP authentication failed. Please reconnect your account.");
            }

            if (error.response.status === 403) {
                throw new Error(
                    "You do not have permission to access this ADP resource. Check your app scopes."
                );
            }

            if (error.response.status === 404) {
                throw new Error("The requested ADP resource was not found.");
            }

            if (error.response.status === 429) {
                throw new Error("ADP rate limit exceeded. Please try again later.");
            }

            if (error.response.status === 400) {
                const errorMessage =
                    data.confirmMessage?.messageTxt ||
                    data.error_description ||
                    data.error ||
                    "Invalid request parameters";
                throw new Error(`ADP validation error: ${errorMessage}`);
            }

            if (data.confirmMessage?.messageTxt) {
                throw new Error(`ADP API error: ${data.confirmMessage.messageTxt}`);
            }

            if (data.error_description) {
                throw new Error(`ADP API error: ${data.error_description}`);
            }
        }

        throw error;
    }

    /**
     * List workers
     */
    async listWorkers(params?: {
        limit?: number;
        offset?: number;
    }): Promise<ADPCollectionResponse<ADPWorker>> {
        return this.get("/hr/v2/workers", {
            $top: params?.limit,
            $skip: params?.offset
        });
    }

    /**
     * Get a specific worker by associate OID
     */
    async getWorker(associateOID: string): Promise<ADPCollectionResponse<ADPWorker>> {
        return this.get(`/hr/v2/workers/${associateOID}`);
    }

    /**
     * List organization departments
     */
    async listDepartments(): Promise<ADPCollectionResponse<ADPDepartment>> {
        return this.get("/core/v1/organization-departments");
    }

    /**
     * Get company information (via organization departments endpoint)
     */
    async getCompanyInfo(): Promise<ADPCollectionResponse<ADPDepartment>> {
        return this.get("/core/v1/organization-departments");
    }

    /**
     * List time off requests for a worker
     */
    async listTimeOffRequests(
        associateOID: string,
        params?: { startDate?: string; endDate?: string }
    ): Promise<ADPCollectionResponse<ADPTimeOffRequest>> {
        return this.get(`/time/v2/workers/${associateOID}/time-off-requests`, params);
    }

    /**
     * Get time off balances for a worker
     */
    async getTimeOffBalances(
        associateOID: string
    ): Promise<ADPCollectionResponse<ADPTimeOffBalance>> {
        return this.get(`/time/v2/workers/${associateOID}/time-off-balances`);
    }

    /**
     * Create a time off request for a worker
     */
    async createTimeOffRequest(
        associateOID: string,
        data: {
            policyCode: string;
            startDate: string;
            endDate: string;
            comments?: string;
        }
    ): Promise<ADPCollectionResponse<ADPTimeOffRequest>> {
        return this.post(`/time/v2/workers/${associateOID}/time-off-requests`, {
            timeOffPolicyCode: { codeValue: data.policyCode },
            requestedTimeOff: {
                startDate: data.startDate,
                endDate: data.endDate
            },
            comments: data.comments || null
        });
    }

    /**
     * List pay statements for a worker
     */
    async listPayStatements(
        associateOID: string,
        params?: { startDate?: string; endDate?: string }
    ): Promise<ADPCollectionResponse<ADPPayStatement>> {
        return this.get(`/payroll/v1/workers/${associateOID}/pay-statements`, params);
    }
}
