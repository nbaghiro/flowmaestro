import { getLogger } from "../../../../core/logging";
import { BaseAPIClient } from "../../../core/BaseAPIClient";

const logger = getLogger();

export interface GitHubClientConfig {
    accessToken: string;
    connectionId: string;
}

/**
 * GitHub API Client
 *
 * Handles HTTP communication with GitHub REST API v3
 * Base URL: https://api.github.com
 *
 * Rate Limits:
 * - 5,000 requests per hour for authenticated users
 * - Tracked via X-RateLimit-* headers
 *
 * @see https://docs.github.com/en/rest
 */
export class GitHubClient extends BaseAPIClient {
    constructor(config: GitHubClientConfig) {
        super({
            baseURL: "https://api.github.com",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 10000
            }
        });

        // Add authorization and GitHub-specific headers
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }

            // GitHub API requires Authorization header
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;

            // GitHub API version (recommended)
            requestConfig.headers["X-GitHub-Api-Version"] = "2022-11-28";

            // Accept header for API v3
            requestConfig.headers["Accept"] = "application/vnd.github+json";

            // User agent (required by GitHub)
            requestConfig.headers["User-Agent"] = "FlowMaestro-Integration";

            return requestConfig;
        });

        // Add response interceptor to handle rate limiting
        this.client.addResponseInterceptor(async (response) => {
            // Check rate limit headers (only available on Response objects)
            if (response && typeof response === "object" && "headers" in response) {
                const headers = (response as { headers: { get: (key: string) => string | null } })
                    .headers;
                const remaining = headers.get("x-ratelimit-remaining");
                const resetTime = headers.get("x-ratelimit-reset");

                if (remaining && parseInt(remaining) < 100) {
                    logger.warn(
                        {
                            component: "GitHubClient",
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
     * Helper method to handle GitHub pagination
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
        const perPage = 100; // GitHub max per page

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
