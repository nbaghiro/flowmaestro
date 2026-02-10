/**
 * Elasticsearch REST API Client
 *
 * Implements the Elasticsearch REST APIs for document operations,
 * search, and index management.
 *
 * @see https://www.elastic.co/docs/reference/elasticsearch/rest-apis
 */

import { createServiceLogger } from "../../../../core/logging";

const logger = createServiceLogger("ElasticsearchClient");

export interface ElasticsearchConfig {
    host: string;
    port?: number;
    username?: string;
    password?: string;
    apiKey?: string;
    cloudId?: string;
    sslEnabled?: boolean;
    defaultIndex?: string;
}

export interface SearchHit {
    _index: string;
    _id: string;
    _score: number | null;
    _source: Record<string, unknown>;
    highlight?: Record<string, string[]>;
}

export interface SearchResponse {
    took: number;
    timed_out: boolean;
    hits: {
        total: { value: number; relation: string } | number;
        max_score: number | null;
        hits: SearchHit[];
    };
    aggregations?: Record<string, unknown>;
}

export interface IndexResponse {
    _index: string;
    _id: string;
    _version: number;
    result: "created" | "updated" | "deleted" | "noop";
    _shards: {
        total: number;
        successful: number;
        failed: number;
    };
}

export interface BulkResponse {
    took: number;
    errors: boolean;
    items: Array<{
        [key: string]: {
            _index: string;
            _id: string;
            _version?: number;
            result?: string;
            status: number;
            error?: {
                type: string;
                reason: string;
            };
        };
    }>;
}

export interface IndexInfo {
    index: string;
    health: string;
    status: string;
    pri: string;
    rep: string;
    "docs.count": string;
    "docs.deleted": string;
    "store.size": string;
    "pri.store.size": string;
}

export class ElasticsearchClient {
    private readonly baseUrl: string;
    private readonly authHeader: string | null;
    private readonly defaultIndex?: string;

    constructor(config: ElasticsearchConfig) {
        // Handle Cloud ID resolution
        if (config.cloudId) {
            this.baseUrl = this.resolveCloudId(config.cloudId);
        } else {
            const protocol = config.sslEnabled !== false ? "https" : "http";
            const port = config.port || (config.sslEnabled !== false ? 443 : 9200);
            const host = config.host.replace(/^https?:\/\//, "");
            this.baseUrl = `${protocol}://${host}:${port}`;
        }

        // Set up authentication
        if (config.apiKey) {
            this.authHeader = `ApiKey ${config.apiKey}`;
        } else if (config.username && config.password) {
            const credentials = Buffer.from(`${config.username}:${config.password}`).toString(
                "base64"
            );
            this.authHeader = `Basic ${credentials}`;
        } else {
            this.authHeader = null;
        }

        this.defaultIndex = config.defaultIndex;
    }

    /**
     * Search documents using Query DSL
     */
    async search(
        index: string,
        query?: Record<string, unknown>,
        options?: {
            size?: number;
            from?: number;
            sort?: Array<Record<string, unknown>>;
            _source?: boolean | string[];
            aggregations?: Record<string, unknown>;
            highlight?: Record<string, unknown>;
        }
    ): Promise<SearchResponse> {
        const url = `${this.baseUrl}/${index}/_search`;

        const body: Record<string, unknown> = {};

        if (query) {
            body.query = query;
        }
        if (options?.size !== undefined) {
            body.size = options.size;
        }
        if (options?.from !== undefined) {
            body.from = options.from;
        }
        if (options?.sort) {
            body.sort = options.sort;
        }
        if (options?._source !== undefined) {
            body._source = options._source;
        }
        if (options?.aggregations) {
            body.aggs = options.aggregations;
        }
        if (options?.highlight) {
            body.highlight = options.highlight;
        }

        const response = await this.request("POST", url, body);
        return response as SearchResponse;
    }

    /**
     * Get a document by ID
     */
    async getDocument(
        index: string,
        id: string
    ): Promise<{ found: boolean; _source?: Record<string, unknown>; _id: string; _index: string }> {
        const url = `${this.baseUrl}/${index}/_doc/${id}`;
        const response = await this.request("GET", url);
        return response as {
            found: boolean;
            _source?: Record<string, unknown>;
            _id: string;
            _index: string;
        };
    }

    /**
     * Index (create or update) a document
     */
    async indexDocument(
        index: string,
        document: Record<string, unknown>,
        id?: string
    ): Promise<IndexResponse> {
        const url = id ? `${this.baseUrl}/${index}/_doc/${id}` : `${this.baseUrl}/${index}/_doc`;

        const method = id ? "PUT" : "POST";
        const response = await this.request(method, url, document);
        return response as IndexResponse;
    }

    /**
     * Partial update a document
     */
    async updateDocument(
        index: string,
        id: string,
        doc: Record<string, unknown>,
        options?: { upsert?: boolean }
    ): Promise<IndexResponse> {
        const url = `${this.baseUrl}/${index}/_update/${id}`;

        const body: Record<string, unknown> = { doc };
        if (options?.upsert) {
            body.doc_as_upsert = true;
        }

        const response = await this.request("POST", url, body);
        return response as IndexResponse;
    }

    /**
     * Delete a document by ID
     */
    async deleteDocument(index: string, id: string): Promise<IndexResponse> {
        const url = `${this.baseUrl}/${index}/_doc/${id}`;
        const response = await this.request("DELETE", url);
        return response as IndexResponse;
    }

    /**
     * Delete documents by query
     */
    async deleteByQuery(
        index: string,
        query: Record<string, unknown>
    ): Promise<{ deleted: number; total: number; failures: unknown[] }> {
        const url = `${this.baseUrl}/${index}/_delete_by_query`;
        const response = await this.request("POST", url, { query });
        return response as { deleted: number; total: number; failures: unknown[] };
    }

    /**
     * Bulk operations
     */
    async bulk(
        operations: Array<{
            action: "index" | "create" | "update" | "delete";
            index: string;
            id?: string;
            document?: Record<string, unknown>;
        }>
    ): Promise<BulkResponse> {
        const url = `${this.baseUrl}/_bulk`;

        // Build NDJSON body
        const lines: string[] = [];
        for (const op of operations) {
            const actionObj: Record<string, Record<string, unknown>> = {
                [op.action]: {
                    _index: op.index,
                    ...(op.id && { _id: op.id })
                }
            };
            lines.push(JSON.stringify(actionObj));

            if (op.action !== "delete" && op.document) {
                if (op.action === "update") {
                    lines.push(JSON.stringify({ doc: op.document }));
                } else {
                    lines.push(JSON.stringify(op.document));
                }
            }
        }

        const body = lines.join("\n") + "\n";

        const response = await this.request("POST", url, body, {
            "Content-Type": "application/x-ndjson"
        });
        return response as BulkResponse;
    }

    /**
     * Create an index
     */
    async createIndex(
        index: string,
        settings?: Record<string, unknown>,
        mappings?: Record<string, unknown>
    ): Promise<{ acknowledged: boolean; shards_acknowledged: boolean; index: string }> {
        const url = `${this.baseUrl}/${index}`;

        const body: Record<string, unknown> = {};
        if (settings) {
            body.settings = settings;
        }
        if (mappings) {
            body.mappings = mappings;
        }

        const response = await this.request(
            "PUT",
            url,
            Object.keys(body).length > 0 ? body : undefined
        );
        return response as { acknowledged: boolean; shards_acknowledged: boolean; index: string };
    }

    /**
     * Delete an index
     */
    async deleteIndex(index: string): Promise<{ acknowledged: boolean }> {
        const url = `${this.baseUrl}/${index}`;
        const response = await this.request("DELETE", url);
        return response as { acknowledged: boolean };
    }

    /**
     * List all indices
     */
    async listIndices(pattern?: string): Promise<IndexInfo[]> {
        const indexPattern = pattern || "*";
        const url = `${this.baseUrl}/_cat/indices/${indexPattern}?format=json&h=index,health,status,pri,rep,docs.count,docs.deleted,store.size,pri.store.size`;
        const response = await this.request("GET", url);
        return (response as IndexInfo[]) || [];
    }

    /**
     * Get the default index
     */
    getDefaultIndex(): string | undefined {
        return this.defaultIndex;
    }

    /**
     * Close the client (cleanup)
     */
    async close(): Promise<void> {
        // No persistent connections to close
    }

    /**
     * Make an HTTP request
     */
    private async request(
        method: string,
        url: string,
        body?: unknown,
        additionalHeaders?: Record<string, string>
    ): Promise<unknown> {
        const headers: Record<string, string> = {
            Accept: "application/json",
            ...additionalHeaders
        };

        if (this.authHeader) {
            headers.Authorization = this.authHeader;
        }

        if (body && typeof body !== "string") {
            headers["Content-Type"] = "application/json";
        }

        const fetchOptions: RequestInit = {
            method,
            headers
        };

        if (body) {
            fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);

        // Handle errors
        if (!response.ok) {
            const errorBody = await response.text();
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.error) {
                    if (typeof errorJson.error === "string") {
                        errorMessage = errorJson.error;
                    } else if (errorJson.error.reason) {
                        errorMessage = errorJson.error.reason;
                    } else if (errorJson.error.root_cause?.[0]?.reason) {
                        errorMessage = errorJson.error.root_cause[0].reason;
                    }
                }
            } catch {
                // Use default error message
            }

            logger.error(
                { status: response.status, body: errorBody },
                "Elasticsearch request failed"
            );
            throw new ElasticsearchError(errorMessage, response.status);
        }

        const text = await response.text();
        if (!text) {
            return {};
        }

        try {
            return JSON.parse(text);
        } catch {
            return { raw: text };
        }
    }

    /**
     * Resolve Elastic Cloud ID to URL
     */
    private resolveCloudId(cloudId: string): string {
        // Cloud ID format: deployment-name:base64(cloud-host$es-id$kibana-id)
        const colonIndex = cloudId.indexOf(":");
        if (colonIndex === -1) {
            throw new Error("Invalid Cloud ID format");
        }

        const encoded = cloudId.slice(colonIndex + 1);
        const decoded = Buffer.from(encoded, "base64").toString("utf8");
        const parts = decoded.split("$");

        if (parts.length < 2) {
            throw new Error("Invalid Cloud ID format");
        }

        const cloudHost = parts[0];
        const esId = parts[1];

        return `https://${esId}.${cloudHost}`;
    }
}

/**
 * Custom error class for Elasticsearch errors
 */
export class ElasticsearchError extends Error {
    readonly statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = "ElasticsearchError";
        this.statusCode = statusCode;
    }
}
