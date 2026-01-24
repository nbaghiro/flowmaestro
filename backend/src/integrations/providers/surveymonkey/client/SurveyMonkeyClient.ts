import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type {
    SurveyMonkeySurvey,
    SurveyMonkeySurveyDetail,
    SurveyMonkeyResponse,
    SurveyMonkeySurveysResponse,
    SurveyMonkeyResponsesResponse,
    SurveyMonkeyCollectorsResponse,
    SurveyMonkeyUser,
    SurveyMonkeyError
} from "../types";

export interface SurveyMonkeyClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * SurveyMonkey REST API Client with connection pooling and error handling
 */
export class SurveyMonkeyClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: SurveyMonkeyClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.surveymonkey.com/v3",
            timeout: 60000, // 60s for bulk response endpoints
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503],
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

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle SurveyMonkey-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            // Map common SurveyMonkey errors
            if (status === 401) {
                throw new Error("SurveyMonkey authentication failed. Please reconnect.");
            }

            if (status === 403) {
                // Check if it's a permission error for paid features
                const errorData = data as SurveyMonkeyError | undefined;
                if (
                    errorData?.error?.id === "1014" ||
                    errorData?.error?.message?.includes("permission")
                ) {
                    throw new Error(
                        "This operation requires a paid SurveyMonkey plan. " +
                            "Please upgrade your account or try a different operation."
                    );
                }
                throw new Error("You don't have permission to access this SurveyMonkey resource.");
            }

            if (status === 404) {
                throw new Error("SurveyMonkey resource not found.");
            }

            if (status === 429) {
                const retryAfter =
                    error.response.headers?.["x-ratelimit-app-global-minute-remaining"];
                throw new Error(
                    `SurveyMonkey rate limit exceeded. Retry after ${retryAfter || "a few"} seconds.`
                );
            }

            // Handle error response body
            if (data && typeof data === "object") {
                const errorData = data as SurveyMonkeyError;
                if (errorData.error?.message) {
                    throw new Error(`SurveyMonkey API error: ${errorData.error.message}`);
                }
                if (errorData.error?.name) {
                    throw new Error(`SurveyMonkey API error: ${errorData.error.name}`);
                }
            }
        }

        throw error;
    }

    /**
     * List all surveys in the account
     */
    async listSurveys(params?: {
        page?: number;
        perPage?: number;
    }): Promise<SurveyMonkeySurveysResponse> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.perPage) queryParams.set("per_page", params.perPage.toString());

        const url = queryParams.toString() ? `/surveys?${queryParams.toString()}` : "/surveys";
        return this.get<SurveyMonkeySurveysResponse>(url);
    }

    /**
     * Get a single survey by ID (basic info)
     */
    async getSurvey(surveyId: string): Promise<SurveyMonkeySurvey> {
        return this.get<SurveyMonkeySurvey>(`/surveys/${surveyId}`);
    }

    /**
     * Get survey details including all pages and questions
     */
    async getSurveyDetails(surveyId: string): Promise<SurveyMonkeySurveyDetail> {
        return this.get<SurveyMonkeySurveyDetail>(`/surveys/${surveyId}/details`);
    }

    /**
     * List responses for a survey
     */
    async listResponses(
        surveyId: string,
        params?: {
            page?: number;
            perPage?: number;
            startCreatedAt?: string;
            endCreatedAt?: string;
            status?: string;
        }
    ): Promise<SurveyMonkeyResponsesResponse> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.perPage) queryParams.set("per_page", params.perPage.toString());
        if (params?.startCreatedAt) queryParams.set("start_created_at", params.startCreatedAt);
        if (params?.endCreatedAt) queryParams.set("end_created_at", params.endCreatedAt);
        if (params?.status) queryParams.set("status", params.status);

        const url = queryParams.toString()
            ? `/surveys/${surveyId}/responses?${queryParams.toString()}`
            : `/surveys/${surveyId}/responses`;
        return this.get<SurveyMonkeyResponsesResponse>(url);
    }

    /**
     * Get full response details with answers
     * Note: This requires the responses_read_detail scope (paid plans only)
     */
    async getResponseDetails(surveyId: string, responseId: string): Promise<SurveyMonkeyResponse> {
        return this.get<SurveyMonkeyResponse>(
            `/surveys/${surveyId}/responses/${responseId}/details`
        );
    }

    /**
     * List collectors for a survey
     */
    async listCollectors(
        surveyId: string,
        params?: {
            page?: number;
            perPage?: number;
        }
    ): Promise<SurveyMonkeyCollectorsResponse> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.perPage) queryParams.set("per_page", params.perPage.toString());

        const url = queryParams.toString()
            ? `/surveys/${surveyId}/collectors?${queryParams.toString()}`
            : `/surveys/${surveyId}/collectors`;
        return this.get<SurveyMonkeyCollectorsResponse>(url);
    }

    /**
     * Get current user account info
     */
    async getMe(): Promise<SurveyMonkeyUser> {
        return this.get<SurveyMonkeyUser>("/users/me");
    }
}
