/**
 * HTTP Base Client with retry logic
 */

import { FlowMaestroError, ConnectionError, TimeoutError, parseApiError } from "../errors";
import type { FlowMaestroClientOptions, ApiResponse, PaginatedResponse } from "../types";

const DEFAULT_BASE_URL = "https://api.flowmaestro.io";
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;

// Status codes that should trigger a retry
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

interface RequestOptions {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
    timeout?: number;
    retries?: number;
}

export class HttpClient {
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly timeout: number;
    private readonly maxRetries: number;
    private readonly headers: Record<string, string>;

    constructor(options: FlowMaestroClientOptions) {
        this.apiKey = options.apiKey;
        this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
        this.timeout = options.timeout || DEFAULT_TIMEOUT;
        this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
        this.headers = options.headers || {};
    }

    /**
     * Make a GET request
     */
    async get<T>(
        path: string,
        query?: Record<string, string | number | boolean | undefined>
    ): Promise<ApiResponse<T>> {
        return this.request<ApiResponse<T>>({ method: "GET", path, query });
    }

    /**
     * Make a GET request that returns paginated data
     */
    async getPaginated<T>(
        path: string,
        query?: Record<string, string | number | boolean | undefined>
    ): Promise<PaginatedResponse<T>> {
        return this.request<PaginatedResponse<T>>({ method: "GET", path, query });
    }

    /**
     * Make a POST request
     */
    async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
        return this.request<ApiResponse<T>>({ method: "POST", path, body });
    }

    /**
     * Make a PUT request
     */
    async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
        return this.request<ApiResponse<T>>({ method: "PUT", path, body });
    }

    /**
     * Make a PATCH request
     */
    async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
        return this.request<ApiResponse<T>>({ method: "PATCH", path, body });
    }

    /**
     * Make a DELETE request
     */
    async delete<T>(path: string): Promise<ApiResponse<T>> {
        return this.request<ApiResponse<T>>({ method: "DELETE", path });
    }

    /**
     * Internal request method with retry logic
     */
    private async request<T>(options: RequestOptions, attempt: number = 0): Promise<T> {
        const { method, path, body, query, timeout, retries } = options;
        const maxRetries = retries ?? this.maxRetries;

        // Build URL with query parameters
        const url = this.buildUrl(path, query);

        // Build headers
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "User-Agent": "flowmaestro-sdk-js/0.1.0",
            ...this.headers
        };

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout || this.timeout);

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Get request ID from headers for error reporting
            const requestId = response.headers.get("x-request-id") || undefined;

            // Handle successful response
            if (response.ok) {
                const data = await response.json();
                return data as T;
            }

            // Handle error response
            const errorBody = await response.json().catch(() => ({}));

            // Check if we should retry
            if (RETRYABLE_STATUS_CODES.includes(response.status) && attempt < maxRetries) {
                const delay = this.calculateRetryDelay(response, attempt);
                await this.sleep(delay);
                return this.request<T>(options, attempt + 1);
            }

            // Throw appropriate error
            throw parseApiError(response.status, errorBody, requestId);
        } catch (error) {
            clearTimeout(timeoutId);

            // Handle abort (timeout)
            if (error instanceof Error && error.name === "AbortError") {
                throw new TimeoutError(`Request timed out after ${timeout || this.timeout}ms`);
            }

            // Handle network errors with retry
            if (this.isNetworkError(error) && attempt < maxRetries) {
                const delay = this.calculateBackoff(attempt);
                await this.sleep(delay);
                return this.request<T>(options, attempt + 1);
            }

            // Re-throw FlowMaestro errors
            if (error instanceof FlowMaestroError) {
                throw error;
            }

            // Wrap other errors
            throw new ConnectionError(
                error instanceof Error ? error.message : "Unknown connection error"
            );
        }
    }

    /**
     * Build full URL with query parameters
     */
    private buildUrl(
        path: string,
        query?: Record<string, string | number | boolean | undefined>
    ): string {
        const url = new URL(path, this.baseUrl);

        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) {
                    url.searchParams.set(key, String(value));
                }
            }
        }

        return url.toString();
    }

    /**
     * Calculate retry delay based on response headers or exponential backoff
     */
    private calculateRetryDelay(response: Response, attempt: number): number {
        // Check for Retry-After header (used by rate limiting)
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter) {
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds)) {
                return seconds * 1000;
            }
        }

        // Fall back to exponential backoff
        return this.calculateBackoff(attempt);
    }

    /**
     * Calculate exponential backoff delay
     */
    private calculateBackoff(attempt: number): number {
        // Base delay: 1s, 2s, 4s, etc. with jitter
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 500;
        return baseDelay + jitter;
    }

    /**
     * Check if error is a network error
     */
    private isNetworkError(error: unknown): boolean {
        if (error instanceof TypeError) {
            return true; // fetch throws TypeError for network errors
        }
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return (
                message.includes("network") ||
                message.includes("fetch") ||
                message.includes("connection") ||
                message.includes("econnrefused") ||
                message.includes("enotfound")
            );
        }
        return false;
    }

    /**
     * Sleep for a given duration
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get the base URL (useful for SSE connections)
     */
    getBaseUrl(): string {
        return this.baseUrl;
    }

    /**
     * Get the API key (useful for SSE connections)
     */
    getApiKey(): string {
        return this.apiKey;
    }

    /**
     * Get custom headers (useful for SSE connections)
     */
    getHeaders(): Record<string, string> {
        return this.headers;
    }
}
