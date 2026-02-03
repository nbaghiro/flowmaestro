/**
 * AWS Base Client
 *
 * Base class for all AWS service clients. Provides AWS Signature V4 authentication,
 * connection pooling, retry logic, and error handling.
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../core/BaseAPIClient";
import { parseAWSError } from "./error-parser";
import { AWSSignatureV4 } from "./signature-v4";
import type { RequestConfig } from "../../core/types";

export interface AWSClientConfig extends Omit<BaseAPIClientConfig, "baseURL"> {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    service: string;
    endpoint?: string; // Optional custom endpoint
}

/**
 * Base AWS API Client with Signature V4 authentication
 */
export abstract class AWSBaseClient extends BaseAPIClient {
    protected signer: AWSSignatureV4;
    protected region: string;
    protected service: string;

    constructor(config: AWSClientConfig) {
        // Build service endpoint URL
        const endpoint =
            config.endpoint || `https://${config.service}.${config.region}.amazonaws.com`;

        super({
            baseURL: endpoint,
            timeout: config.timeout || 60000, // AWS default: 60s
            retryConfig: config.retryConfig || {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 10000
            },
            connectionPool: config.connectionPool || {
                keepAlive: true,
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAliveMsecs: 60000
            }
        });

        this.region = config.region;
        this.service = config.service;

        // Initialize AWS Signature V4 signer
        this.signer = new AWSSignatureV4({
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            region: config.region,
            service: config.service
        });

        // Add request interceptor to sign all requests
        this.client.addRequestInterceptor((requestConfig) => {
            return this.signRequest(requestConfig);
        });
    }

    /**
     * Sign request with AWS Signature V4
     */
    protected signRequest(config: RequestConfig): RequestConfig {
        // Build full URL
        const baseURL =
            this.client instanceof Object && "baseURL" in this.client
                ? (this.client as { baseURL?: string }).baseURL
                : this.getEndpoint();
        const url = new URL(config.url, baseURL || this.getEndpoint());

        // Add query parameters
        if (config.params) {
            for (const [key, value] of Object.entries(config.params)) {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            }
        }

        // Prepare headers
        const headers: Record<string, string> = {
            ...(config.headers || {})
        };

        // Prepare body
        let body: string | Buffer | undefined;
        if (config.data) {
            if (Buffer.isBuffer(config.data)) {
                body = config.data;
            } else if (typeof config.data === "string") {
                body = config.data;
            } else {
                // JSON encode objects
                body = JSON.stringify(config.data);
                headers["Content-Type"] = "application/x-amz-json-1.1";
            }
        }

        // Sign the request
        const signedRequest = this.signer.signRequest({
            method: config.method || "GET",
            url: url.toString(),
            headers,
            body
        });

        // Return modified config
        return {
            ...config,
            url: url.toString(),
            headers: signedRequest.headers,
            data: body
        };
    }

    /**
     * Handle AWS-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        // Check if it's a fetch error with response
        if (
            error &&
            typeof error === "object" &&
            "response" in error &&
            error.response instanceof Response
        ) {
            const response = error.response;
            const contentType = response.headers.get("content-type") || "";

            // Get response body
            let body = "";
            try {
                body = await response.text();
            } catch {
                // Ignore body read errors
            }

            // Parse AWS error
            const awsError = parseAWSError(response, body, contentType);

            // Throw with standardized error
            throw new Error(`${awsError.message}${awsError.code ? ` (${awsError.code})` : ""}`);
        }

        // Re-throw other errors
        throw error;
    }

    /**
     * Make XML request (for services like S3, ECS)
     */
    protected async requestXML(config: RequestConfig): Promise<string> {
        const response = await this.client.request<Response>({
            ...config,
            headers: {
                ...config.headers,
                "Content-Type": "application/xml"
            }
        });

        if (response instanceof Response) {
            return response.text();
        }

        return String(response);
    }

    /**
     * Make JSON request (for services like Lambda, CloudWatch Logs)
     */
    protected async requestJSON<T = unknown>(config: RequestConfig): Promise<T> {
        return this.client.request<T>({
            ...config,
            headers: {
                ...config.headers,
                "Content-Type": "application/x-amz-json-1.1"
            }
        });
    }

    /**
     * Get service endpoint URL
     */
    protected getEndpoint(): string {
        return `https://${this.service}.${this.region}.amazonaws.com`;
    }

    /**
     * Get region
     */
    getRegion(): string {
        return this.region;
    }

    /**
     * Get service name
     */
    getService(): string {
        return this.service;
    }
}
