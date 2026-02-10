import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";
import type {
    GustoEmployee,
    GustoCompany,
    GustoDepartment,
    GustoPayroll,
    GustoTimeOffActivity,
    GustoLocation,
    GustoBenefit
} from "../operations/types";

export interface GustoClientConfig {
    accessToken: string;
    connectionId?: string;
}

/**
 * Gusto API error response format
 */
interface GustoErrorResponse {
    error?: string;
    message?: string;
    errors?: Array<{
        field?: string;
        message?: string;
    }>;
}

/**
 * Gusto Platform API Client with connection pooling and error handling
 *
 * API Base URL: https://api.gusto.com/v1
 * Authentication: Bearer token in Authorization header
 * Rate Limit: 200 requests/minute per user
 */
export class GustoClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: GustoClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.gusto.com/v1",
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
     * Override request to handle Gusto-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return super.request<T>(config);
    }

    /**
     * Handle Gusto-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as GustoErrorResponse;

            if (error.response.status === 401) {
                throw new Error("Gusto authentication failed. Please reconnect your account.");
            }

            if (error.response.status === 403) {
                throw new Error(
                    "You do not have permission to access this Gusto resource. Check your app scopes."
                );
            }

            if (error.response.status === 404) {
                throw new Error("The requested Gusto resource was not found.");
            }

            if (error.response.status === 429) {
                throw new Error("Gusto rate limit exceeded. Please try again later.");
            }

            if (error.response.status === 400) {
                if (data.errors && data.errors.length > 0) {
                    const messages = data.errors
                        .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
                        .join("; ");
                    throw new Error(`Gusto validation error: ${messages}`);
                }
                const errorMessage = data.message || data.error || "Invalid request parameters";
                throw new Error(`Gusto validation error: ${errorMessage}`);
            }

            if (data.message) {
                throw new Error(`Gusto API error: ${data.message}`);
            }

            if (data.error) {
                throw new Error(`Gusto API error: ${data.error}`);
            }
        }

        throw error;
    }

    /**
     * List employees for a company
     */
    async listEmployees(
        companyId: string,
        params?: { page?: number; per?: number }
    ): Promise<GustoEmployee[]> {
        return this.get(`/companies/${companyId}/employees`, params);
    }

    /**
     * Get a specific employee by UUID
     */
    async getEmployee(employeeUuid: string): Promise<GustoEmployee> {
        return this.get(`/employees/${employeeUuid}`);
    }

    /**
     * Get company information
     */
    async getCompany(companyId: string): Promise<GustoCompany> {
        return this.get(`/companies/${companyId}`);
    }

    /**
     * List departments for a company
     */
    async listDepartments(companyId: string): Promise<GustoDepartment[]> {
        return this.get(`/companies/${companyId}/departments`);
    }

    /**
     * List payrolls for a company
     */
    async listPayrolls(
        companyId: string,
        params?: { startDate?: string; endDate?: string; processed?: boolean }
    ): Promise<GustoPayroll[]> {
        return this.get(`/companies/${companyId}/payrolls`, {
            start_date: params?.startDate,
            end_date: params?.endDate,
            processed: params?.processed
        });
    }

    /**
     * List time off activities for an employee
     */
    async listTimeOffActivities(employeeUuid: string): Promise<GustoTimeOffActivity[]> {
        return this.get(`/employees/${employeeUuid}/time_off_activities`);
    }

    /**
     * List locations for a company
     */
    async listLocations(companyId: string): Promise<GustoLocation[]> {
        return this.get(`/companies/${companyId}/locations`);
    }

    /**
     * List supported benefits
     */
    async listBenefits(): Promise<GustoBenefit[]> {
        return this.get("/benefits");
    }
}
