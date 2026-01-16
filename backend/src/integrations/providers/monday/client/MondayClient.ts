import { FetchClient } from "../../../../core/utils/fetch-client";

export interface MondayClientConfig {
    accessToken: string;
    connectionId: string;
}

/**
 * Monday.com GraphQL response
 */
export interface MondayGraphQLResponse<T = unknown> {
    data?: T;
    errors?: Array<{
        message: string;
        locations?: Array<{ line: number; column: number }>;
        path?: string[];
        extensions?: Record<string, unknown>;
    }>;
    account_id?: number;
}

/**
 * Monday.com GraphQL error
 */
export class MondayGraphQLError extends Error {
    public errors: Array<{
        message: string;
        locations?: Array<{ line: number; column: number }>;
        path?: string[];
    }>;

    constructor(
        errors: Array<{
            message: string;
            locations?: Array<{ line: number; column: number }>;
            path?: string[];
        }>
    ) {
        const messages = errors.map((e) => e.message).join("; ");
        super(`Monday.com API Error: ${messages}`);
        this.name = "MondayGraphQLError";
        this.errors = errors;
    }
}

/**
 * Monday.com GraphQL API Client
 * Handles authentication, GraphQL queries/mutations, and error handling
 */
export class MondayClient {
    private accessToken: string;
    private client: FetchClient;
    private readonly apiUrl = "https://api.monday.com/v2";
    private readonly apiVersion = "2024-10";

    constructor(config: MondayClientConfig) {
        this.accessToken = config.accessToken;

        this.client = new FetchClient({
            baseURL: this.apiUrl,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential"
            }
        });

        // Add request interceptor for authentication
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = this.accessToken;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["API-Version"] = this.apiVersion;
            return requestConfig;
        });
    }

    /**
     * Execute a GraphQL query
     */
    async query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
        const response = await this.client.request<MondayGraphQLResponse<T>>({
            method: "POST",
            url: "",
            data: {
                query,
                variables
            }
        });

        if (response.errors && response.errors.length > 0) {
            throw new MondayGraphQLError(response.errors);
        }

        if (!response.data) {
            throw new Error("No data returned from Monday.com API");
        }

        return response.data;
    }

    /**
     * Execute a GraphQL mutation
     */
    async mutation<T = unknown>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
        return this.query<T>(mutation, variables);
    }

    /**
     * Helper to stringify column values for Monday.com
     * Monday expects column_values as a JSON string
     */
    stringifyColumnValues(columnValues: Record<string, unknown>): string {
        return JSON.stringify(columnValues);
    }

    /**
     * Parse column values from Monday.com response
     * Monday returns column_values as a JSON string
     */
    parseColumnValues(columnValuesStr: string): Record<string, unknown> {
        try {
            return JSON.parse(columnValuesStr);
        } catch {
            return {};
        }
    }
}
