import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface AmplitudeClientConfig {
    apiKey: string;
    secretKey: string;
}

/**
 * Amplitude API Client
 *
 * Uses Basic Auth with API Key and Secret Key.
 * Authorization: Basic base64(api_key:secret_key)
 */
export class AmplitudeClient extends BaseAPIClient {
    private apiKey: string;
    private secretKey: string;
    private authHeader: string;

    constructor(config: AmplitudeClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api2.amplitude.com",
            timeout: 30000,
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

        this.apiKey = config.apiKey;
        this.secretKey = config.secretKey;

        // Create Basic Auth header: base64(api_key:secret_key)
        const credentials = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString("base64");
        this.authHeader = `Basic ${credentials}`;

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = this.authHeader;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Handle Amplitude-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as {
                error?: string;
                code?: number;
                missing_field?: string;
            };

            // Map common Amplitude errors
            if (error.response.status === 401) {
                throw new Error("Amplitude API key or secret key is invalid. Please reconnect.");
            }

            if (error.response.status === 400) {
                if (data.missing_field) {
                    throw new Error(
                        `Amplitude API error: Missing required field '${data.missing_field}'`
                    );
                }
                throw new Error(`Amplitude API error: ${data.error || "Bad request"}`);
            }

            if (error.response.status === 429) {
                throw new Error("Rate limited by Amplitude. Please try again later.");
            }

            if (data.error) {
                throw new Error(`Amplitude API error: ${data.error}`);
            }
        }

        throw error;
    }
}
