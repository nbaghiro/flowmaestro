import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";
import type {
    LatticeUser,
    LatticeGoal,
    LatticeReviewCycle,
    LatticeDepartment,
    LatticeResourceResponse,
    LatticeCollectionResponse,
    LatticeCreateGoalRequest,
    LatticeUpdateGoalRequest
} from "../operations/types";

export interface LatticeClientConfig {
    apiKey: string;
    connectionId?: string;
}

/**
 * Lattice API error response format
 */
interface LatticeErrorResponse {
    error?: string;
    message?: string;
    errors?: Array<{
        field?: string;
        message?: string;
    }>;
}

/**
 * Lattice API Client with connection pooling and error handling
 *
 * API Base URL: https://api.latticehq.com/v1
 * Authentication: Bearer token in Authorization header
 * Rate Limit: ~600 requests/minute
 */
export class LatticeClient extends BaseAPIClient {
    private apiKey: string;

    constructor(config: LatticeClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.latticehq.com/v1",
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

        this.apiKey = config.apiKey;

        // Add request interceptor to add Authorization header
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.apiKey}`;
            reqConfig.headers["Content-Type"] = "application/json";
            reqConfig.headers["Accept"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Override request to handle Lattice-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return super.request<T>(config);
    }

    /**
     * Handle Lattice-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as LatticeErrorResponse;

            if (error.response.status === 401) {
                throw new Error("Lattice authentication failed. Please check your API key.");
            }

            if (error.response.status === 403) {
                throw new Error(
                    "You do not have permission to access this Lattice resource. Check your API key scopes."
                );
            }

            if (error.response.status === 404) {
                throw new Error("The requested Lattice resource was not found.");
            }

            if (error.response.status === 429) {
                throw new Error("Lattice rate limit exceeded. Please try again later.");
            }

            if (error.response.status === 400) {
                if (data.errors && data.errors.length > 0) {
                    const messages = data.errors
                        .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
                        .join("; ");
                    throw new Error(`Lattice validation error: ${messages}`);
                }
                const errorMessage = data.message || data.error || "Invalid request parameters";
                throw new Error(`Lattice validation error: ${errorMessage}`);
            }

            if (data.message) {
                throw new Error(`Lattice API error: ${data.message}`);
            }

            if (data.error) {
                throw new Error(`Lattice API error: ${data.error}`);
            }
        }

        throw error;
    }

    /**
     * List users
     */
    async listUsers(params?: {
        limit?: number;
        offset?: number;
    }): Promise<LatticeCollectionResponse<LatticeUser>> {
        return this.get("/users", params);
    }

    /**
     * Get a specific user by ID
     */
    async getUser(userId: string): Promise<LatticeResourceResponse<LatticeUser>> {
        return this.get(`/users/${userId}`);
    }

    /**
     * List goals
     */
    async listGoals(params?: {
        limit?: number;
        offset?: number;
    }): Promise<LatticeCollectionResponse<LatticeGoal>> {
        return this.get("/goals", params);
    }

    /**
     * Get a specific goal by ID
     */
    async getGoal(goalId: string): Promise<LatticeResourceResponse<LatticeGoal>> {
        return this.get(`/goals/${goalId}`);
    }

    /**
     * Create a goal
     */
    async createGoal(
        data: LatticeCreateGoalRequest
    ): Promise<LatticeResourceResponse<LatticeGoal>> {
        return this.post("/goals", data);
    }

    /**
     * Update a goal
     */
    async updateGoal(
        goalId: string,
        data: Omit<LatticeUpdateGoalRequest, "goalId">
    ): Promise<LatticeResourceResponse<LatticeGoal>> {
        return this.patch(`/goals/${goalId}`, data);
    }

    /**
     * List review cycles
     */
    async listReviewCycles(params?: {
        limit?: number;
        offset?: number;
    }): Promise<LatticeCollectionResponse<LatticeReviewCycle>> {
        return this.get("/review-cycles", params);
    }

    /**
     * List departments
     */
    async listDepartments(params?: {
        limit?: number;
        offset?: number;
    }): Promise<LatticeCollectionResponse<LatticeDepartment>> {
        return this.get("/departments", params);
    }
}
