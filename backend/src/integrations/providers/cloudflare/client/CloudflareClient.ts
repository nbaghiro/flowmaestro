/**
 * Cloudflare HTTP Client
 *
 * Handles all HTTP communication with Cloudflare API.
 * Uses Bearer token authentication with API Token.
 *
 * Base URL: https://api.cloudflare.com/client/v4/
 *
 * Rate limit: 1200 requests/5 minutes (240/minute)
 */

import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface CloudflareClientConfig {
    apiToken: string;
    accountId: string;
}

// ============================================
// Cloudflare API Types
// ============================================

export interface CloudflareZone {
    id: string;
    name: string;
    status: "active" | "pending" | "initializing" | "moved" | "deleted" | "deactivated";
    paused: boolean;
    type: "full" | "partial" | "secondary";
    development_mode: number;
    name_servers: string[];
    original_name_servers: string[];
    original_registrar: string;
    original_dnshost: string;
    modified_on: string;
    created_on: string;
    activated_on: string;
    plan?: {
        id: string;
        name: string;
        price: number;
        currency: string;
        frequency: string;
    };
    account: {
        id: string;
        name: string;
    };
}

export interface CloudflareDNSRecord {
    id: string;
    zone_id: string;
    zone_name: string;
    name: string;
    type: "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS" | "SRV" | "CAA" | "PTR" | "SPF";
    content: string;
    proxiable: boolean;
    proxied: boolean;
    ttl: number;
    locked: boolean;
    meta: {
        auto_added: boolean;
        managed_by_apps: boolean;
        managed_by_argo_tunnel: boolean;
    };
    created_on: string;
    modified_on: string;
    priority?: number; // For MX records
}

export interface CloudflareWorkerScript {
    id: string;
    etag: string;
    handlers: string[];
    modified_on: string;
    created_on?: string;
    usage_model?: string;
    compatibility_date?: string;
    compatibility_flags?: string[];
}

export interface CloudflareWorkerSettings {
    bindings: Array<{
        name: string;
        type: string;
        namespace_id?: string;
        text?: string;
        json?: unknown;
    }>;
    compatibility_date?: string;
    compatibility_flags?: string[];
    usage_model?: string;
}

export interface CloudflareKVNamespace {
    id: string;
    title: string;
    supports_url_encoding?: boolean;
}

export interface CloudflareKVKey {
    name: string;
    expiration?: number;
    metadata?: Record<string, unknown>;
}

interface CloudflareResponse<T> {
    success: boolean;
    errors: Array<{ code: number; message: string }>;
    messages: Array<{ code: number; message: string }>;
    result: T;
    result_info?: {
        page: number;
        per_page: number;
        total_pages: number;
        count: number;
        total_count: number;
    };
}

export class CloudflareClient extends BaseAPIClient {
    private accountId: string;

    constructor(config: CloudflareClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.cloudflare.com/client/v4",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 30000
            },
            connectionPool: {
                keepAlive: true,
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAliveMsecs: 60000
            }
        };

        super(clientConfig);

        this.accountId = config.accountId;

        // Add authorization header using Bearer token
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.apiToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Get account ID
     */
    getAccountId(): string {
        return this.accountId;
    }

    /**
     * Handle Cloudflare-specific errors
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as CloudflareResponse<unknown>;

            if (data?.errors?.length > 0) {
                const errorMessages = data.errors.map((e) => e.message).join(", ");
                throw new Error(`Cloudflare API error: ${errorMessages}`);
            }

            if (error.response.status === 401) {
                throw new Error("Cloudflare authentication failed. Please check your API token.");
            }

            if (error.response.status === 403) {
                throw new Error(
                    "Cloudflare permission denied. Your token may not have access to this resource."
                );
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found in Cloudflare.");
            }

            if (error.response.status === 429) {
                throw new Error("Cloudflare rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Zone Operations
    // ============================================

    /**
     * List all zones in account
     */
    async listZones(params?: {
        page?: number;
        per_page?: number;
        name?: string;
        status?: string;
    }): Promise<{
        zones: CloudflareZone[];
        result_info?: CloudflareResponse<unknown>["result_info"];
    }> {
        const response = await this.get<CloudflareResponse<CloudflareZone[]>>("/zones", {
            account_id: this.accountId,
            ...params
        });
        return { zones: response.result || [], result_info: response.result_info };
    }

    /**
     * Get a specific zone
     */
    async getZone(zoneId: string): Promise<CloudflareZone> {
        const response = await this.get<CloudflareResponse<CloudflareZone>>(`/zones/${zoneId}`);
        return response.result;
    }

    // ============================================
    // DNS Operations
    // ============================================

    /**
     * List DNS records for a zone
     */
    async listDNSRecords(
        zoneId: string,
        params?: {
            page?: number;
            per_page?: number;
            type?: string;
            name?: string;
            content?: string;
        }
    ): Promise<{
        records: CloudflareDNSRecord[];
        result_info?: CloudflareResponse<unknown>["result_info"];
    }> {
        const response = await this.get<CloudflareResponse<CloudflareDNSRecord[]>>(
            `/zones/${zoneId}/dns_records`,
            params
        );
        return { records: response.result || [], result_info: response.result_info };
    }

    /**
     * Get a specific DNS record
     */
    async getDNSRecord(zoneId: string, recordId: string): Promise<CloudflareDNSRecord> {
        const response = await this.get<CloudflareResponse<CloudflareDNSRecord>>(
            `/zones/${zoneId}/dns_records/${recordId}`
        );
        return response.result;
    }

    /**
     * Create a DNS record
     */
    async createDNSRecord(
        zoneId: string,
        record: {
            type: string;
            name: string;
            content: string;
            ttl?: number;
            proxied?: boolean;
            priority?: number;
        }
    ): Promise<CloudflareDNSRecord> {
        const response = await this.post<CloudflareResponse<CloudflareDNSRecord>>(
            `/zones/${zoneId}/dns_records`,
            record
        );
        return response.result;
    }

    /**
     * Update a DNS record
     */
    async updateDNSRecord(
        zoneId: string,
        recordId: string,
        record: {
            type?: string;
            name?: string;
            content?: string;
            ttl?: number;
            proxied?: boolean;
            priority?: number;
        }
    ): Promise<CloudflareDNSRecord> {
        const response = await this.patch<CloudflareResponse<CloudflareDNSRecord>>(
            `/zones/${zoneId}/dns_records/${recordId}`,
            record
        );
        return response.result;
    }

    /**
     * Delete a DNS record
     */
    async deleteDNSRecord(zoneId: string, recordId: string): Promise<{ id: string }> {
        const response = await this.delete<CloudflareResponse<{ id: string }>>(
            `/zones/${zoneId}/dns_records/${recordId}`
        );
        return response.result;
    }

    // ============================================
    // Workers Operations
    // ============================================

    /**
     * List Worker scripts
     */
    async listWorkers(): Promise<CloudflareWorkerScript[]> {
        const response = await this.get<CloudflareResponse<CloudflareWorkerScript[]>>(
            `/accounts/${this.accountId}/workers/scripts`
        );
        return response.result || [];
    }

    /**
     * Get Worker script content
     */
    async getWorker(scriptName: string): Promise<string> {
        // This endpoint returns raw script content, not JSON
        const response = await this.client.request<string>({
            method: "GET",
            url: `/accounts/${this.accountId}/workers/scripts/${scriptName}`,
            headers: {
                Accept: "application/javascript"
            }
        });
        return response;
    }

    /**
     * Upload Worker script
     */
    async uploadWorker(
        scriptName: string,
        scriptContent: string,
        metadata?: {
            bindings?: CloudflareWorkerSettings["bindings"];
            compatibility_date?: string;
            compatibility_flags?: string[];
        }
    ): Promise<CloudflareWorkerScript> {
        // Workers API requires multipart form data for scripts with bindings
        const formData = new FormData();

        // Add the script content
        formData.append(
            "script",
            new Blob([scriptContent], { type: "application/javascript" }),
            "worker.js"
        );

        // Add metadata if provided
        if (metadata) {
            formData.append(
                "metadata",
                new Blob([JSON.stringify(metadata)], { type: "application/json" })
            );
        }

        const response = await this.client.put<CloudflareResponse<CloudflareWorkerScript>>(
            `/accounts/${this.accountId}/workers/scripts/${scriptName}`,
            formData
        );
        return response.result;
    }

    /**
     * Delete Worker script
     */
    async deleteWorker(scriptName: string): Promise<void> {
        await this.delete<CloudflareResponse<null>>(
            `/accounts/${this.accountId}/workers/scripts/${scriptName}`
        );
    }

    /**
     * Get Worker settings
     */
    async getWorkerSettings(scriptName: string): Promise<CloudflareWorkerSettings> {
        const response = await this.get<CloudflareResponse<CloudflareWorkerSettings>>(
            `/accounts/${this.accountId}/workers/scripts/${scriptName}/settings`
        );
        return response.result;
    }

    // ============================================
    // KV Operations
    // ============================================

    /**
     * List KV namespaces
     */
    async listKVNamespaces(params?: { page?: number; per_page?: number }): Promise<{
        namespaces: CloudflareKVNamespace[];
        result_info?: CloudflareResponse<unknown>["result_info"];
    }> {
        const response = await this.get<CloudflareResponse<CloudflareKVNamespace[]>>(
            `/accounts/${this.accountId}/storage/kv/namespaces`,
            params
        );
        return { namespaces: response.result || [], result_info: response.result_info };
    }

    /**
     * Create KV namespace
     */
    async createKVNamespace(title: string): Promise<CloudflareKVNamespace> {
        const response = await this.post<CloudflareResponse<CloudflareKVNamespace>>(
            `/accounts/${this.accountId}/storage/kv/namespaces`,
            { title }
        );
        return response.result;
    }

    /**
     * Delete KV namespace
     */
    async deleteKVNamespace(namespaceId: string): Promise<void> {
        await this.delete<CloudflareResponse<null>>(
            `/accounts/${this.accountId}/storage/kv/namespaces/${namespaceId}`
        );
    }

    /**
     * List keys in KV namespace
     */
    async listKVKeys(
        namespaceId: string,
        params?: {
            prefix?: string;
            limit?: number;
            cursor?: string;
        }
    ): Promise<{ keys: CloudflareKVKey[]; cursor?: string }> {
        const response = await this.get<
            CloudflareResponse<CloudflareKVKey[]> & { result_cursor?: string }
        >(`/accounts/${this.accountId}/storage/kv/namespaces/${namespaceId}/keys`, params);
        return { keys: response.result || [], cursor: response.result_cursor };
    }

    /**
     * Get KV value
     */
    async getKVValue(namespaceId: string, key: string): Promise<string> {
        // This endpoint returns raw value, not JSON
        const response = await this.client.request<string>({
            method: "GET",
            url: `/accounts/${this.accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
            headers: {
                Accept: "text/plain"
            }
        });
        return response;
    }

    /**
     * Put KV value
     */
    async putKVValue(
        namespaceId: string,
        key: string,
        value: string,
        options?: {
            expiration?: number;
            expiration_ttl?: number;
            metadata?: Record<string, unknown>;
        }
    ): Promise<void> {
        const params: Record<string, string | number> = {};
        if (options?.expiration) {
            params.expiration = options.expiration;
        }
        if (options?.expiration_ttl) {
            params.expiration_ttl = options.expiration_ttl;
        }

        const queryString = Object.keys(params).length
            ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
            : "";

        await this.client.request<CloudflareResponse<null>>({
            method: "PUT",
            url: `/accounts/${this.accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}${queryString}`,
            data: value,
            headers: {
                "Content-Type": "text/plain"
            }
        });
    }

    /**
     * Delete KV key
     */
    async deleteKVKey(namespaceId: string, key: string): Promise<void> {
        await this.delete<CloudflareResponse<null>>(
            `/accounts/${this.accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`
        );
    }

    /**
     * Bulk write KV pairs
     */
    async bulkWriteKV(
        namespaceId: string,
        pairs: Array<{
            key: string;
            value: string;
            expiration?: number;
            expiration_ttl?: number;
            metadata?: Record<string, unknown>;
            base64?: boolean;
        }>
    ): Promise<void> {
        await this.client.put<CloudflareResponse<null>>(
            `/accounts/${this.accountId}/storage/kv/namespaces/${namespaceId}/bulk`,
            pairs
        );
    }
}
