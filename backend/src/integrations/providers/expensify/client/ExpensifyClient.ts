import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { ExpensifyJobRequest, ExpensifyJobResponse } from "../operations/types";

export interface ExpensifyClientConfig {
    partnerUserID: string;
    partnerUserSecret: string;
}

/**
 * Expensify API Client
 *
 * Expensify uses a unique job-based API where all requests are POST
 * with a requestJobDescription JSON payload.
 *
 * Rate limit: 50 requests/minute
 */
export class ExpensifyClient extends BaseAPIClient {
    private partnerUserID: string;
    private partnerUserSecret: string;

    constructor(config: ExpensifyClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://integrations.expensify.com/Integration-Server/ExpensifyIntegrations",
            timeout: 60000, // Expensify can be slow for large exports
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503],
                backoffStrategy: "exponential"
            },
            connectionPool: {
                maxSockets: 20,
                maxFreeSockets: 5,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.partnerUserID = config.partnerUserID;
        this.partnerUserSecret = config.partnerUserSecret;
    }

    /**
     * Execute an Expensify job
     */
    async executeJob(
        type: ExpensifyJobRequest["type"],
        inputSettings?: Record<string, unknown>
    ): Promise<ExpensifyJobResponse> {
        const jobDescription: ExpensifyJobRequest = {
            type,
            credentials: {
                partnerUserID: this.partnerUserID,
                partnerUserSecret: this.partnerUserSecret
            },
            inputSettings: inputSettings || {},
            onReceive: {
                immediateResponse: ["returnRandomFileName"]
            }
        };

        // Expensify expects form-encoded data
        const formData = new URLSearchParams();
        formData.append("requestJobDescription", JSON.stringify(jobDescription));

        const response = await this.client.request<ExpensifyJobResponse>({
            method: "POST",
            url: "",
            data: formData.toString(),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });

        if (response.responseCode !== 200) {
            throw new Error(
                response.responseMessage || `Expensify error: ${response.responseCode}`
            );
        }

        return response;
    }

    /**
     * Handle Expensify-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as ExpensifyJobResponse;

            if (error.response.status === 401 || data.responseCode === 401) {
                throw new Error(
                    "Expensify credentials are invalid. Please check your Partner User ID and Secret."
                );
            }

            if (error.response.status === 403 || data.responseCode === 403) {
                throw new Error("Permission denied. Check your Expensify integration permissions.");
            }

            if (error.response.status === 429 || data.responseCode === 429) {
                throw new Error("Expensify rate limit exceeded. Please try again later.");
            }

            if (data.responseMessage) {
                throw new Error(`Expensify API error: ${data.responseMessage}`);
            }
        }

        throw error;
    }
}
