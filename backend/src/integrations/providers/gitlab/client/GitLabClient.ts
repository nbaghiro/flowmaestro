import { getLogger } from "../../../../core/logging";
import { BaseAPIClient } from "../../../core/BaseAPIClient";

const logger = getLogger();

export interface GitLabClientConfig {
    accessToken: string;
    connectionId: string;
    instanceUrl?: string; // For self-hosted GitLab instances
}

/**
 * GitLab API Client
 *
 * Handles HTTP communication with GitLab REST API v4
 * Base URL: https://gitlab.com/api/v4 (or custom instance URL)
 *
 * Rate Limits:
 * - 7,200 requests per hour for authenticated users
 * - Tracked via RateLimit-* headers
 *
 * @see https://docs.gitlab.com/ee/api/
 */
export class GitLabClient extends BaseAPIClient {
    private instanceUrl: string;

    constructor(config: GitLabClientConfig) {
        // Determine base URL - support self-hosted instances
        const instanceUrl = config.instanceUrl || "https://gitlab.com";
        const baseURL = `${instanceUrl}/api/v4`;

        super({
            baseURL,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 10000
            }
        });

        this.instanceUrl = instanceUrl;

        // Add authorization and GitLab-specific headers
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }

            // GitLab API requires Authorization header
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;

            // Content type
            requestConfig.headers["Content-Type"] = "application/json";

            return requestConfig;
        });

        // Add response interceptor to handle rate limiting
        this.client.addResponseInterceptor(async (response) => {
            // Check rate limit headers (only available on Response objects)
            if (response && typeof response === "object" && "headers" in response) {
                const headers = (response as { headers: { get: (key: string) => string | null } })
                    .headers;
                const remaining = headers.get("ratelimit-remaining");
                const resetTime = headers.get("ratelimit-reset");

                if (remaining && parseInt(remaining) < 100) {
                    logger.warn(
                        {
                            component: "GitLabClient",
                            remaining: parseInt(remaining),
                            resetTime: resetTime
                                ? new Date(parseInt(resetTime) * 1000).toISOString()
                                : undefined
                        },
                        "Rate limit warning: low requests remaining"
                    );
                }
            }

            return response;
        });
    }

    /**
     * Get the instance URL
     */
    getInstanceUrl(): string {
        return this.instanceUrl;
    }

    /**
     * URL-encode a project path for use in API endpoints
     * GitLab accepts both numeric IDs and URL-encoded paths
     */
    encodeProjectPath(projectPath: string): string {
        // If it's a numeric ID, return as-is
        if (/^\d+$/.test(projectPath)) {
            return projectPath;
        }
        // Otherwise URL-encode the path
        return encodeURIComponent(projectPath);
    }

    /**
     * Helper method to handle GitLab pagination
     * @param url - API endpoint URL
     * @param params - Query parameters
     * @param maxPages - Maximum number of pages to fetch (default: 10)
     */
    async getAllPages<T>(
        url: string,
        params: Record<string, unknown> = {},
        maxPages = 10
    ): Promise<T[]> {
        const results: T[] = [];
        let page = 1;
        const perPage = 100; // GitLab max per page

        while (page <= maxPages) {
            const response = await this.get<T[]>(url, {
                ...params,
                per_page: perPage,
                page
            });

            if (!response || response.length === 0) {
                break;
            }

            results.push(...response);

            // If we got less than perPage items, we've reached the last page
            if (response.length < perPage) {
                break;
            }

            page++;
        }

        return results;
    }
}
