import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import { ODataQueryBuilder, SapODataErrorResponse } from "../../../core/sap";
import type { RequestConfig } from "../../../core/types";
import type {
    SFUser,
    SFDepartment,
    SFEmpJob,
    SFEmployeeTime,
    SFTimeAccountDetail,
    ODataCollectionResponse,
    ODataEntityResponse
} from "../operations/types";

export interface SAPSuccessFactorsClientConfig {
    accessToken: string;
    apiServer: string;
    connectionId?: string;
}

/**
 * SAP SuccessFactors OData v2 API Client
 *
 * API Base URL: https://{apiServer}/odata/v2
 * Authentication: Bearer token in Authorization header
 */
export class SAPSuccessFactorsClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: SAPSuccessFactorsClientConfig) {
        // Construct base URL from api server
        const baseURL = `https://${config.apiServer}/odata/v2`;

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
            timeout: 60000, // SAP APIs can be slow
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

        // Add request interceptor to add Authorization header and OData headers
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
     * Handle SAP SuccessFactors-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as SapODataErrorResponse;

            // Handle authentication errors
            if (error.response.status === 401) {
                throw new Error(
                    "SAP SuccessFactors authentication failed. Please reconnect your account."
                );
            }

            // Handle forbidden errors
            if (error.response.status === 403) {
                throw new Error(
                    "You do not have permission to access this SAP SuccessFactors resource. Check your API permissions."
                );
            }

            // Handle not found errors
            if (error.response.status === 404) {
                throw new Error("The requested SAP SuccessFactors resource was not found.");
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("SAP SuccessFactors rate limit exceeded. Please try again later.");
            }

            // Handle OData errors
            if (data.error) {
                const message = data.error.message?.value || "Unknown error";
                const code = data.error.code || "";

                // Check for specific OData error codes
                if (code === "SYS_AUTH_REQUIRED") {
                    throw new Error(
                        "SAP SuccessFactors authentication required. Please reconnect."
                    );
                }

                // Include error details if available
                if (data.error.innererror?.errordetails?.length) {
                    const details = data.error.innererror.errordetails
                        .map((d) => d.message)
                        .filter(Boolean)
                        .join("; ");
                    throw new Error(`SAP SuccessFactors error: ${message}. Details: ${details}`);
                }

                throw new Error(`SAP SuccessFactors error: ${message}`);
            }
        }

        throw error;
    }

    // ========================================================================
    // User (Employee) API
    // ========================================================================

    /**
     * List employees using the User entity
     */
    async listEmployees(params?: {
        top?: number;
        skip?: number;
        filter?: string;
        select?: string[];
        expand?: string[];
    }): Promise<ODataCollectionResponse<SFUser>> {
        const query = ODataQueryBuilder.create().formatJson().inlineCount();

        if (params?.top) query.top(params.top);
        if (params?.skip) query.skip(params.skip);
        if (params?.filter) query.filter(params.filter);
        if (params?.select) query.select(params.select);
        if (params?.expand) query.expand(params.expand);

        const url = `/User${query.buildWithPrefix()}`;
        return this.get(url);
    }

    /**
     * Get a specific employee by userId
     */
    async getEmployee(
        userId: string,
        params?: {
            select?: string[];
            expand?: string[];
        }
    ): Promise<ODataEntityResponse<SFUser>> {
        const query = ODataQueryBuilder.create().formatJson();

        if (params?.select) query.select(params.select);
        if (params?.expand) query.expand(params.expand);

        const url = `/User('${userId}')${query.buildWithPrefix()}`;
        return this.get(url);
    }

    // ========================================================================
    // Department API
    // ========================================================================

    /**
     * List departments using the FODepartment entity
     */
    async listDepartments(params?: {
        top?: number;
        skip?: number;
        filter?: string;
        select?: string[];
    }): Promise<ODataCollectionResponse<SFDepartment>> {
        const query = ODataQueryBuilder.create().formatJson().inlineCount();

        if (params?.top) query.top(params.top);
        if (params?.skip) query.skip(params.skip);
        if (params?.filter) query.filter(params.filter);
        if (params?.select) query.select(params.select);

        const url = `/FODepartment${query.buildWithPrefix()}`;
        return this.get(url);
    }

    // ========================================================================
    // Time Off API
    // ========================================================================

    /**
     * List time off requests using EmployeeTime entity
     */
    async listTimeOffRequests(params?: {
        top?: number;
        skip?: number;
        filter?: string;
        userId?: string;
    }): Promise<ODataCollectionResponse<SFEmployeeTime>> {
        const query = ODataQueryBuilder.create().formatJson().inlineCount();

        if (params?.top) query.top(params.top);
        if (params?.skip) query.skip(params.skip);

        // Build filter combining user filter with any custom filter
        const filters: string[] = [];
        if (params?.userId) {
            filters.push(`userId eq '${params.userId}'`);
        }
        if (params?.filter) {
            filters.push(params.filter);
        }
        if (filters.length > 0) {
            query.filter(filters.join(" and "));
        }

        const url = `/EmployeeTime${query.buildWithPrefix()}`;
        return this.get(url);
    }

    /**
     * Get time off balances using TimeAccountDetail entity
     */
    async getTimeOffBalance(params: {
        userId: string;
        top?: number;
        skip?: number;
    }): Promise<ODataCollectionResponse<SFTimeAccountDetail>> {
        const query = ODataQueryBuilder.create()
            .formatJson()
            .inlineCount()
            .filter(`userId eq '${params.userId}'`);

        if (params.top) query.top(params.top);
        if (params.skip) query.skip(params.skip);

        const url = `/TimeAccountDetail${query.buildWithPrefix()}`;
        return this.get(url);
    }

    // ========================================================================
    // Job API
    // ========================================================================

    /**
     * List job assignments using EmpJob entity
     */
    async listJobs(params?: {
        top?: number;
        skip?: number;
        filter?: string;
        userId?: string;
    }): Promise<ODataCollectionResponse<SFEmpJob>> {
        const query = ODataQueryBuilder.create().formatJson().inlineCount();

        if (params?.top) query.top(params.top);
        if (params?.skip) query.skip(params.skip);

        // Build filter
        const filters: string[] = [];
        if (params?.userId) {
            filters.push(`userId eq '${params.userId}'`);
        }
        if (params?.filter) {
            filters.push(params.filter);
        }
        if (filters.length > 0) {
            query.filter(filters.join(" and "));
        }

        const url = `/EmpJob${query.buildWithPrefix()}`;
        return this.get(url);
    }
}
