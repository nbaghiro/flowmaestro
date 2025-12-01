import { FetchClient, isFetchError } from "../../core/utils/fetch-client";
import type { RequestConfig, RetryConfig, OperationResult, OperationError } from "./types";

export interface BaseAPIClientConfig {
    baseURL: string;
    timeout?: number;
    retryConfig?: RetryConfig;
    connectionPool?: {
        maxSockets?: number;
        maxFreeSockets?: number;
        keepAlive?: boolean;
        keepAliveMsecs?: number;
    };
}

/**
 * Base API client with connection pooling, retry logic, and error handling
 */
export abstract class BaseAPIClient {
    protected client: FetchClient;
    protected retryConfig: RetryConfig;

    constructor(config: BaseAPIClientConfig) {
        // Default retry configuration
        this.retryConfig = config.retryConfig || {
            maxRetries: 3,
            retryableStatuses: [429, 500, 502, 503, 504],
            retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
            backoffStrategy: "exponential",
            initialDelay: 1000,
            maxDelay: 10000
        };

        // Connection pooling configuration
        const poolConfig = config.connectionPool || {};

        // Create fetch client instance with connection pooling
        this.client = new FetchClient({
            baseURL: config.baseURL,
            timeout: config.timeout || 30000,
            retryConfig: this.retryConfig,
            connectionPool: {
                keepAlive: poolConfig.keepAlive !== false,
                maxSockets: poolConfig.maxSockets || 50,
                maxFreeSockets: poolConfig.maxFreeSockets || 10,
                keepAliveMsecs: poolConfig.keepAliveMsecs || 60000
            }
        });

        // Add response interceptor for error handling
        this.client.addResponseInterceptor(async (response) => {
            return response;
        });
    }

    /**
     * Make HTTP request with retry logic
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        try {
            return await this.client.request<T>(config);
        } catch (error) {
            // Give subclasses a chance to handle the error
            await this.handleError(error);
            throw error; // Re-throw if handleError doesn't throw
        }
    }

    /**
     * GET request
     */
    async get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
        return this.request<T>({ method: "GET", url, params });
    }

    /**
     * POST request
     */
    async post<T = unknown>(url: string, data?: unknown): Promise<T> {
        return this.request<T>({ method: "POST", url, data });
    }

    /**
     * PUT request
     */
    async put<T = unknown>(url: string, data?: unknown): Promise<T> {
        return this.request<T>({ method: "PUT", url, data });
    }

    /**
     * PATCH request
     */
    async patch<T = unknown>(url: string, data?: unknown): Promise<T> {
        return this.request<T>({ method: "PATCH", url, data });
    }

    /**
     * DELETE request
     */
    async delete<T = unknown>(url: string): Promise<T> {
        return this.request<T>({ method: "DELETE", url });
    }

    /**
     * Execute function with retry logic
     */
    protected async executeWithRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            if (this.shouldRetry(error, attempt)) {
                const delay = this.getRetryDelay(attempt);
                await this.sleep(delay);
                return this.executeWithRetry(fn, attempt + 1);
            }
            throw error;
        }
    }

    /**
     * Check if error should be retried
     */
    protected shouldRetry(error: unknown, attempt: number): boolean {
        if (attempt >= this.retryConfig.maxRetries) {
            return false;
        }

        // Check for retryable HTTP status codes
        if (isFetchError(error) && error.response) {
            return this.retryConfig.retryableStatuses.includes(error.response.status);
        }

        // Check for retryable network errors
        if (isFetchError(error) && error.code && this.retryConfig.retryableErrors) {
            return this.retryConfig.retryableErrors.includes(error.code);
        }

        return false;
    }

    /**
     * Calculate retry delay based on backoff strategy
     */
    protected getRetryDelay(attempt: number): number {
        const initialDelay = this.retryConfig.initialDelay || 1000;
        const maxDelay = this.retryConfig.maxDelay || 10000;

        let delay: number;

        switch (this.retryConfig.backoffStrategy) {
            case "exponential":
                delay = initialDelay * Math.pow(2, attempt);
                break;
            case "linear":
                delay = initialDelay * (attempt + 1);
                break;
            case "constant":
                delay = initialDelay;
                break;
            default:
                delay = initialDelay;
        }

        return Math.min(delay, maxDelay);
    }

    /**
     * Sleep for specified milliseconds
     */
    protected sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Handle and normalize errors
     * Subclasses can override this to provide provider-specific error handling
     */
    protected async handleError(error: unknown): Promise<never> {
        throw error;
    }

    /**
     * Create standardized error response
     */
    protected createErrorResult(
        type: OperationError["type"],
        message: string,
        retryable = false,
        code?: string,
        details?: Record<string, unknown>
    ): OperationResult {
        return {
            success: false,
            error: {
                type,
                message,
                code,
                retryable,
                details
            }
        };
    }
}
