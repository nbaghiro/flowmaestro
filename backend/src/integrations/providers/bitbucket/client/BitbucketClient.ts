import { getLogger } from "../../../../core/logging";
import { BaseAPIClient } from "../../../core/BaseAPIClient";

const logger = getLogger();

export interface BitbucketClientConfig {
    accessToken: string;
    connectionId: string;
    username?: string; // For API key auth (Basic auth)
}

/**
 * Bitbucket API Client
 *
 * Handles HTTP communication with Bitbucket REST API 2.0
 * Base URL: https://api.bitbucket.org/2.0
 *
 * Rate Limits:
 * - 1,000 requests per hour for authenticated users
 *
 * @see https://developer.atlassian.com/cloud/bitbucket/rest/
 */
export class BitbucketClient extends BaseAPIClient {
    constructor(config: BitbucketClientConfig) {
        super({
            baseURL: "https://api.bitbucket.org/2.0",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 10000
            }
        });

        // Add authorization headers
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }

            // OAuth2 Bearer token auth
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;

            // Content type
            requestConfig.headers["Content-Type"] = "application/json";

            return requestConfig;
        });

        // Add response interceptor to handle rate limiting
        this.client.addResponseInterceptor(async (response) => {
            // Check rate limit headers
            if (response && typeof response === "object" && "headers" in response) {
                const headers = (response as { headers: { get: (key: string) => string | null } })
                    .headers;
                const remaining = headers.get("x-ratelimit-remaining");
                const resetTime = headers.get("x-ratelimit-reset");

                if (remaining && parseInt(remaining) < 50) {
                    logger.warn(
                        {
                            component: "BitbucketClient",
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
     * Helper method to handle Bitbucket pagination
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
        const pagelen = 100; // Bitbucket max per page

        while (page <= maxPages) {
            const response = await this.get<{ values: T[]; next?: string }>(url, {
                ...params,
                pagelen,
                page
            });

            if (!response || !response.values || response.values.length === 0) {
                break;
            }

            results.push(...response.values);

            // If there's no next page, we're done
            if (!response.next) {
                break;
            }

            page++;
        }

        return results;
    }
}
