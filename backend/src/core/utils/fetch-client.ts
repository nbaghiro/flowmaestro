import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";

/**
 * Custom error class for fetch requests
 */
export class FetchError extends Error {
    public response?: {
        status: number;
        statusText: string;
        data: unknown;
        headers: Record<string, string>;
    };
    public request?: RequestConfig;
    public code?: string;

    constructor(
        message: string,
        response?: {
            status: number;
            statusText: string;
            data: unknown;
            headers: Record<string, string>;
        },
        request?: RequestConfig,
        code?: string
    ) {
        super(message);
        this.name = "FetchError";
        this.response = response;
        this.request = request;
        this.code = code;
    }
}

export interface RetryConfig {
    maxRetries: number;
    retryableStatuses: number[];
    retryableErrors?: string[];
    backoffStrategy: "exponential" | "linear" | "constant";
    initialDelay?: number;
    maxDelay?: number;
}

export interface RequestConfig {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    data?: unknown;
    timeout?: number;
    signal?: AbortSignal;
}

export interface FetchClientConfig {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
    retryConfig?: RetryConfig;
    connectionPool?: {
        maxSockets?: number;
        maxFreeSockets?: number;
        keepAlive?: boolean;
        keepAliveMsecs?: number;
    };
}

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = <T>(response: T) => T | Promise<T>;

/**
 * Fetch-based HTTP client with connection pooling, retry logic, and interceptors
 */
export class FetchClient {
    protected config: FetchClientConfig;
    protected retryConfig: RetryConfig;
    protected httpAgent?: HttpAgent;
    protected httpsAgent?: HttpsAgent;
    protected requestInterceptors: RequestInterceptor[] = [];
    protected responseInterceptors: ResponseInterceptor[] = [];

    constructor(config: FetchClientConfig = {}) {
        this.config = config;

        // Default retry configuration
        this.retryConfig = config.retryConfig || {
            maxRetries: 3,
            retryableStatuses: [429, 500, 502, 503, 504],
            retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
            backoffStrategy: "exponential",
            initialDelay: 1000,
            maxDelay: 10000
        };

        // Setup connection pooling
        const poolConfig = config.connectionPool || {};
        this.httpAgent = new HttpAgent({
            keepAlive: poolConfig.keepAlive !== false,
            maxSockets: poolConfig.maxSockets || 50,
            maxFreeSockets: poolConfig.maxFreeSockets || 10,
            timeout: config.timeout || 60000,
            keepAliveMsecs: poolConfig.keepAliveMsecs || 60000
        });

        this.httpsAgent = new HttpsAgent({
            keepAlive: poolConfig.keepAlive !== false,
            maxSockets: poolConfig.maxSockets || 50,
            maxFreeSockets: poolConfig.maxFreeSockets || 10,
            timeout: config.timeout || 60000,
            keepAliveMsecs: poolConfig.keepAliveMsecs || 60000
        });
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor: RequestInterceptor): void {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(interceptor: ResponseInterceptor): void {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * Make HTTP request with retry logic
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return await this.executeWithRetry(async () => {
            // Apply request interceptors
            let requestConfig = config;
            for (const interceptor of this.requestInterceptors) {
                requestConfig = await interceptor(requestConfig);
            }

            // Build URL
            const url = this.buildURL(requestConfig.url, requestConfig.params);

            // Build headers
            const headers = {
                ...this.config.headers,
                ...requestConfig.headers
            };

            // Setup timeout
            const timeout = requestConfig.timeout || this.config.timeout || 30000;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            // Use provided signal or create one from timeout
            const signal = requestConfig.signal || controller.signal;

            try {
                // Build fetch options
                const options: RequestInit = {
                    method: requestConfig.method,
                    headers,
                    signal
                };

                // Add body for non-GET requests
                if (requestConfig.data && requestConfig.method !== "GET") {
                    if (typeof requestConfig.data === "string") {
                        options.body = requestConfig.data;
                    } else if (requestConfig.data instanceof FormData) {
                        options.body = requestConfig.data;
                        // Don't set Content-Type for FormData, browser will set it with boundary
                        delete headers["Content-Type"];
                    } else {
                        options.body = JSON.stringify(requestConfig.data);
                        if (!headers["Content-Type"]) {
                            headers["Content-Type"] = "application/json";
                        }
                    }
                }

                // Use appropriate agent based on protocol
                if (url.startsWith("https://")) {
                    (options as unknown as { agent: HttpsAgent }).agent = this.httpsAgent!;
                } else if (url.startsWith("http://")) {
                    (options as unknown as { agent: HttpAgent }).agent = this.httpAgent!;
                }

                // Make request
                const response = await fetch(url, options);

                clearTimeout(timeoutId);

                // Check if response is ok
                if (!response.ok) {
                    const data = await this.parseResponse(response);
                    throw new FetchError(
                        `HTTP ${response.status}: ${response.statusText}`,
                        {
                            status: response.status,
                            statusText: response.statusText,
                            data,
                            headers: this.headersToObject(response.headers)
                        },
                        requestConfig
                    );
                }

                // Parse response
                let data = await this.parseResponse(response);

                // Apply response interceptors
                for (const interceptor of this.responseInterceptors) {
                    data = await interceptor(data);
                }

                return data as T;
            } catch (error) {
                clearTimeout(timeoutId);

                // Handle abort/timeout errors
                if (error instanceof Error && error.name === "AbortError") {
                    throw new FetchError("Request timeout", undefined, requestConfig, "ETIMEDOUT");
                }

                throw error;
            }
        });
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
     * Build URL with query parameters
     */
    protected buildURL(url: string, params?: Record<string, unknown>): string {
        // Handle absolute URLs
        if (url.startsWith("http://") || url.startsWith("https://")) {
            const urlObj = new URL(url);
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        urlObj.searchParams.append(key, String(value));
                    }
                });
            }
            return urlObj.toString();
        }

        // Handle relative URLs with baseURL
        const baseURL = this.config.baseURL || "";
        const fullURL = baseURL + url;
        const urlObj = new URL(fullURL);

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    urlObj.searchParams.append(key, String(value));
                }
            });
        }

        return urlObj.toString();
    }

    /**
     * Parse response based on content type
     */
    protected async parseResponse(response: Response): Promise<unknown> {
        const contentType = response.headers.get("content-type");

        if (contentType?.includes("application/json")) {
            const text = await response.text();
            return text ? JSON.parse(text) : null;
        }

        if (contentType?.includes("text/")) {
            return await response.text();
        }

        // For other types, return as blob
        return await response.blob();
    }

    /**
     * Convert Headers object to plain object
     */
    protected headersToObject(headers: Headers): Record<string, string> {
        const obj: Record<string, string> = {};
        headers.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
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
        if (error instanceof FetchError && error.response) {
            return this.retryConfig.retryableStatuses.includes(error.response.status);
        }

        // Check for retryable network errors
        if (error instanceof FetchError && error.code && this.retryConfig.retryableErrors) {
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
}

/**
 * Helper to check if error is a FetchError
 */
export function isFetchError(error: unknown): error is FetchError {
    return error instanceof FetchError;
}
