import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { LiveChatError } from "../operations/types";

export interface LiveChatClientConfig {
    accessToken: string;
}

/**
 * LiveChat API Client
 *
 * LiveChat Agent Chat API uses a JSON-RPC style pattern:
 * POST requests to a base URL with action in the URL path.
 * The Configuration API is REST-based at a different base URL.
 *
 * Base URL (Agent Chat API): https://api.livechatinc.com/v3.6/agent/action
 * Base URL (Configuration API): https://api.livechatinc.com/v3.6/configuration/action
 */
export class LiveChatClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: LiveChatClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.livechatinc.com",
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

        this.accessToken = config.accessToken;

        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Execute an Agent Chat API action
     */
    async agentAction<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
        return this.post<T>(`/v3.6/agent/action/${action}`, payload);
    }

    /**
     * Execute a Configuration API action
     */
    async configAction<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
        return this.post<T>(`/v3.6/configuration/action/${action}`, payload);
    }

    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as LiveChatError | undefined;

            if (error.response.status === 401) {
                throw new Error("LiveChat access token is invalid. Please reconnect.");
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check your LiveChat OAuth scopes.");
            }

            if (error.response.status === 429) {
                throw new Error("Rate limited by LiveChat. Please try again later.");
            }

            if (data?.error?.message) {
                throw new Error(`LiveChat API error: ${data.error.type} - ${data.error.message}`);
            }
        }

        throw error;
    }
}
