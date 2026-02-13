/**
 * Microsoft Graph API Base Client
 *
 * Base class for all Microsoft Graph API clients. Provides:
 * - Bearer token authentication
 * - Standardized error handling
 * - Type-safe request/response handling
 * - 204 No Content handling
 *
 * Used by: Teams, Outlook, Excel, OneDrive, PowerPoint, Word
 */

import { parseMicrosoftErrorMessage, parseMicrosoftErrorCode } from "./error-types";

export interface MicrosoftGraphClientConfig {
    /**
     * OAuth2 access token
     */
    accessToken: string;

    /**
     * Service name for error messages (e.g., "Microsoft Teams", "Microsoft Outlook")
     */
    serviceName?: string;
}

/**
 * Base Microsoft Graph API Client with Bearer token authentication
 *
 * This client uses native fetch for simplicity and compatibility with
 * the existing Microsoft provider patterns. It provides standardized
 * error handling and 204 response handling across all Microsoft services.
 */
export abstract class MicrosoftGraphClient {
    protected readonly baseUrl = "https://graph.microsoft.com/v1.0";
    protected readonly accessToken: string;
    protected readonly serviceName: string;

    constructor(config: MicrosoftGraphClientConfig) {
        this.accessToken = config.accessToken;
        this.serviceName = config.serviceName || "Microsoft Graph";
    }

    /**
     * Make authenticated request to Microsoft Graph API
     */
    protected async request<T>(
        endpoint: string,
        options: {
            method?: string;
            body?: unknown;
            headers?: Record<string, string>;
        } = {}
    ): Promise<T> {
        const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
        const { method = "GET", body, headers = {} } = options;

        const response = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
                ...headers
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const errorText = await response.text();
            const errorMessage = parseMicrosoftErrorMessage(errorText);
            const errorCode = parseMicrosoftErrorCode(errorText);

            // Map common HTTP status codes to user-friendly messages
            if (response.status === 401) {
                throw new Error(`${this.serviceName} authentication failed. Please reconnect.`);
            }

            if (response.status === 403) {
                throw new Error(
                    errorMessage ||
                        `Permission denied: You don't have permission to access this ${this.serviceName} resource.`
                );
            }

            if (response.status === 404) {
                throw new Error(errorMessage || `${this.serviceName} resource not found.`);
            }

            if (response.status === 429) {
                const retryAfter = response.headers.get("retry-after");
                throw new Error(
                    `${this.serviceName} rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (response.status === 400) {
                throw new Error(`Invalid request: ${errorMessage || errorCode || "Bad request"}`);
            }

            // Default error message
            throw new Error(errorMessage || `${this.serviceName} API error: ${response.status}`);
        }

        // Handle 204 No Content responses
        if (response.status === 204) {
            return {} as T;
        }

        return (await response.json()) as T;
    }

    /**
     * Make GET request
     */
    protected async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: "GET" });
    }

    /**
     * Make POST request
     */
    protected async post<T>(endpoint: string, body?: unknown): Promise<T> {
        return this.request<T>(endpoint, { method: "POST", body });
    }

    /**
     * Make PATCH request
     */
    protected async patch<T>(endpoint: string, body?: unknown): Promise<T> {
        return this.request<T>(endpoint, { method: "PATCH", body });
    }

    /**
     * Make PUT request
     */
    protected async put<T>(endpoint: string, body?: unknown): Promise<T> {
        return this.request<T>(endpoint, { method: "PUT", body });
    }

    /**
     * Make DELETE request
     */
    protected async delete<T = void>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: "DELETE" });
    }

    /**
     * Make request with binary body (for file uploads)
     */
    protected async requestBinary<T>(
        endpoint: string,
        options: {
            method: string;
            body: string | Buffer | ArrayBuffer;
            contentType: string;
        }
    ): Promise<T> {
        const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            method: options.method,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": options.contentType
            },
            body: options.body
        });

        if (!response.ok) {
            const errorText = await response.text();
            const errorMessage = parseMicrosoftErrorMessage(errorText);
            throw new Error(errorMessage || `${this.serviceName} API error: ${response.status}`);
        }

        if (response.status === 204 || response.status === 202) {
            // For 202, return location header if available
            const location = response.headers.get("Location");
            if (location) {
                return { monitorUrl: location } as T;
            }
            return {} as T;
        }

        return (await response.json()) as T;
    }

    /**
     * Download binary content
     */
    protected async downloadBinary(endpoint: string): Promise<ArrayBuffer> {
        const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            },
            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error(`Failed to download: ${response.status}`);
        }

        return response.arrayBuffer();
    }
}
