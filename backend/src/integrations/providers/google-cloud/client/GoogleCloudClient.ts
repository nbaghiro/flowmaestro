/**
 * Google Cloud Multi-Service Client
 *
 * Unified client for GCP Cloud Build, Secret Manager, Compute Engine, and Cloud Run.
 * Uses OAuth2 authentication and handles service-specific endpoints.
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface GoogleCloudClientConfig {
    accessToken: string;
    projectId: string;
}

/**
 * Google Cloud Client for multiple services
 */
export class GoogleCloudClient {
    private clients: Map<string, BaseAPIClient>;
    private accessToken: string;
    public readonly projectId: string;

    constructor(config: GoogleCloudClientConfig) {
        this.accessToken = config.accessToken;
        this.projectId = config.projectId;
        this.clients = new Map();
    }

    /**
     * Get or create a service-specific client
     */
    private getServiceClient(service: string, baseURL: string): BaseAPIClient {
        if (!this.clients.has(service)) {
            const clientConfig: BaseAPIClientConfig = {
                baseURL,
                timeout: 60000,
                retryConfig: {
                    maxRetries: 3,
                    retryableStatuses: [429, 500, 502, 503, 504],
                    backoffStrategy: "exponential",
                    initialDelay: 1000,
                    maxDelay: 10000
                }
            };

            const client = new (class extends BaseAPIClient {
                constructor(config: BaseAPIClientConfig, accessToken: string) {
                    super(config);
                    // Add authorization header to all requests
                    this.client.addRequestInterceptor((requestConfig) => {
                        if (!requestConfig.headers) {
                            requestConfig.headers = {};
                        }
                        requestConfig.headers["Authorization"] = `Bearer ${accessToken}`;
                        return requestConfig;
                    });
                }
            })(clientConfig, this.accessToken);

            this.clients.set(service, client);
        }

        return this.clients.get(service)!;
    }

    /**
     * Cloud Build client
     */
    get cloudBuild(): BaseAPIClient {
        return this.getServiceClient("cloudbuild", "https://cloudbuild.googleapis.com/v1");
    }

    /**
     * Secret Manager client
     */
    get secretManager(): BaseAPIClient {
        return this.getServiceClient("secretmanager", "https://secretmanager.googleapis.com/v1");
    }

    /**
     * Compute Engine client
     */
    get compute(): BaseAPIClient {
        return this.getServiceClient("compute", "https://compute.googleapis.com/compute/v1");
    }

    /**
     * Cloud Run client
     */
    get cloudRun(): BaseAPIClient {
        return this.getServiceClient("run", "https://run.googleapis.com/v2");
    }

    /**
     * Update access token (for token refresh)
     */
    updateAccessToken(newToken: string): void {
        this.accessToken = newToken;
        // Clear cached clients so they get recreated with new token
        this.clients.clear();
    }
}
