import { BaseAPIClient } from "../../../core/BaseAPIClient";

export interface JiraClientConfig {
    accessToken: string;
    cloudId: string;
    connectionId: string;
}

/**
 * Jira Cloud API Client
 * Handles authentication, cloudId-based routing, and error handling
 */
export class JiraClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: JiraClientConfig) {
        super({
            baseURL: `https://api.atlassian.com/ex/jira/${config.cloudId}`,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential"
            }
        });

        this.accessToken = config.accessToken;

        // Add request interceptor for authentication
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["Accept"] = "application/json";

            // Set Content-Type only for JSON payloads
            if (
                requestConfig.data &&
                !(requestConfig.data instanceof FormData) &&
                typeof requestConfig.data === "object"
            ) {
                requestConfig.headers["Content-Type"] = "application/json";
            }

            return requestConfig;
        });
    }

    /**
     * Upload attachment to issue (multipart/form-data)
     */
    async uploadAttachment(
        issueIdOrKey: string,
        fileContent: string,
        filename: string,
        mimeType?: string
    ): Promise<unknown> {
        // Convert base64 to Blob
        const byteString = atob(fileContent);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeType || "application/octet-stream" });

        const formData = new FormData();
        formData.append("file", blob, filename);

        // Don't set Content-Type - browser/Node sets it with boundary
        return this.request({
            method: "POST",
            url: `/rest/api/3/issue/${issueIdOrKey}/attachments`,
            data: formData,
            headers: {
                "X-Atlassian-Token": "no-check" // Required for attachments
            }
        });
    }

    /**
     * Override handleError to map Jira-specific errors
     */
    protected handleError(error: unknown): never {
        if (error && typeof error === "object") {
            const err = error as {
                response?: {
                    status?: number;
                    data?: {
                        errorMessages?: string[];
                        errors?: Record<string, string>;
                        message?: string;
                    };
                };
                message?: string;
            };

            const status = err.response?.status;
            const errorData = err.response?.data;

            // Map Jira errors to standard error types
            if (status === 401) {
                throw new Error("Invalid or expired Jira credentials");
            } else if (status === 403) {
                throw new Error("Insufficient permissions for this Jira operation");
            } else if (status === 404) {
                throw new Error("Resource not found in Jira");
            } else if (status === 429) {
                throw new Error("Jira rate limit exceeded. Please try again later.");
            } else if (errorData?.errorMessages && errorData.errorMessages.length > 0) {
                throw new Error(errorData.errorMessages.join(", "));
            } else if (errorData?.errors) {
                const errorMessages = Object.entries(errorData.errors)
                    .map(([field, message]) => `${field}: ${message}`)
                    .join(", ");
                throw new Error(errorMessages);
            } else if (errorData?.message) {
                throw new Error(errorData.message);
            } else if (err.message) {
                throw new Error(err.message);
            }
        }

        throw new Error("Unknown Jira API error");
    }
}
