import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

/**
 * Salesforce API Version - Update when new versions are released
 */
const SALESFORCE_API_VERSION = "v65.0";

export interface SalesforceClientConfig {
    accessToken: string;
    instanceUrl: string; // Critical: e.g., https://na123.salesforce.com
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

// Salesforce Error Response Structure
interface SalesforceErrorResponse {
    message: string;
    errorCode: string;
    fields?: string[];
}

// =============================================================================
// Salesforce API Response Types
// =============================================================================

export interface SalesforceQueryResult<T = Record<string, unknown>> {
    totalSize: number;
    done: boolean;
    records: T[];
    nextRecordsUrl?: string;
}

export interface SalesforceCreateResult {
    id: string;
    success: boolean;
    errors: SalesforceErrorResponse[];
}

export interface SalesforceDescribeResult {
    name: string;
    label: string;
    labelPlural: string;
    keyPrefix: string;
    queryable: boolean;
    createable: boolean;
    updateable: boolean;
    deletable: boolean;
    searchable: boolean;
    fields: SalesforceFieldDescribe[];
    childRelationships: SalesforceChildRelationship[];
    recordTypeInfos?: SalesforceRecordTypeInfo[];
}

export interface SalesforceFieldDescribe {
    name: string;
    label: string;
    type: string;
    length?: number;
    precision?: number;
    scale?: number;
    nillable: boolean;
    createable: boolean;
    updateable: boolean;
    defaultValue?: unknown;
    picklistValues?: SalesforcePicklistValue[];
    referenceTo?: string[];
    relationshipName?: string;
    externalId: boolean;
    idLookup: boolean;
    unique: boolean;
}

export interface SalesforcePicklistValue {
    value: string;
    label: string;
    active: boolean;
    defaultValue: boolean;
}

export interface SalesforceChildRelationship {
    childSObject: string;
    field: string;
    relationshipName: string;
    cascadeDelete: boolean;
}

export interface SalesforceRecordTypeInfo {
    recordTypeId: string;
    name: string;
    developerName: string;
    available: boolean;
    defaultRecordTypeMapping: boolean;
    master: boolean;
}

export interface SalesforceSObjectInfo {
    name: string;
    label: string;
    labelPlural: string;
    keyPrefix: string;
    queryable: boolean;
    createable: boolean;
    updateable: boolean;
    deletable: boolean;
    searchable: boolean;
    custom: boolean;
    urls: {
        sobject: string;
        describe: string;
        rowTemplate: string;
    };
}

export interface SalesforceGlobalDescribe {
    encoding: string;
    maxBatchSize: number;
    sobjects: SalesforceSObjectInfo[];
}

export interface SalesforceSearchResult {
    searchRecords: Array<{
        Id: string;
        attributes: {
            type: string;
            url: string;
        };
        [key: string]: unknown;
    }>;
}

export interface SalesforceLimitsResult {
    DailyApiRequests: { Max: number; Remaining: number };
    DailyAsyncApexExecutions: { Max: number; Remaining: number };
    DailyBulkApiRequests: { Max: number; Remaining: number };
    DataStorageMB: { Max: number; Remaining: number };
    FileStorageMB: { Max: number; Remaining: number };
    [key: string]: { Max: number; Remaining: number };
}

/**
 * Salesforce REST API Client with connection pooling and error handling
 *
 * API Documentation: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest
 * Base URL: {instanceUrl}/services/data/{apiVersion}
 */
export class SalesforceClient extends BaseAPIClient {
    private accessToken: string;
    private instanceUrl: string;
    private apiVersion: string;

    constructor(config: SalesforceClientConfig) {
        // Validate instanceUrl
        if (!config.instanceUrl) {
            throw new Error(
                "Salesforce instanceUrl is required. This should be obtained from the OAuth token response."
            );
        }

        // Remove trailing slash from instance URL if present
        const instanceUrl = config.instanceUrl.replace(/\/$/, "");

        const clientConfig: BaseAPIClientConfig = {
            baseURL: `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}`,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
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
        this.instanceUrl = instanceUrl;
        this.apiVersion = SALESFORCE_API_VERSION;

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((config) => {
            if (!config.headers) {
                config.headers = {};
            }
            config.headers["Authorization"] = `Bearer ${this.accessToken}`;
            return config;
        });
    }

    /**
     * Handle Salesforce API-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            // Salesforce returns errors as an array
            const errors = Array.isArray(data)
                ? (data as SalesforceErrorResponse[])
                : [data as SalesforceErrorResponse];
            const primaryError = errors[0];

            // Map common Salesforce errors
            if (status === 401) {
                const errorCode = primaryError?.errorCode;
                if (errorCode === "INVALID_SESSION_ID") {
                    throw new Error(
                        "Salesforce session expired or invalid. Please reconnect your Salesforce account."
                    );
                }
                throw new Error(
                    "Salesforce authentication failed. Please reconnect your Salesforce account."
                );
            }

            if (status === 403) {
                const errorCode = primaryError?.errorCode;
                if (errorCode === "INSUFFICIENT_ACCESS_OR_READONLY") {
                    throw new Error(
                        "Insufficient access: You don't have permission to perform this operation."
                    );
                }
                if (errorCode === "REQUEST_LIMIT_EXCEEDED") {
                    throw new Error(
                        "Salesforce API request limit exceeded. Please try again later."
                    );
                }
                throw new Error(
                    `Permission denied: ${primaryError?.message || "You don't have permission to perform this action."}`
                );
            }

            if (status === 404) {
                const errorCode = primaryError?.errorCode;
                if (errorCode === "NOT_FOUND") {
                    throw new Error("Record not found.");
                }
                if (errorCode === "INVALID_TYPE") {
                    throw new Error(
                        `Invalid object type: ${primaryError?.message || "The specified object type does not exist."}`
                    );
                }
                throw new Error(primaryError?.message || "Resource not found.");
            }

            if (status === 400) {
                const errorCode = primaryError?.errorCode;
                if (errorCode === "MALFORMED_QUERY") {
                    throw new Error(
                        `SOQL query error: ${primaryError?.message || "The query is malformed."}`
                    );
                }
                if (errorCode === "INVALID_FIELD") {
                    const fields = primaryError?.fields?.join(", ") || "unknown";
                    throw new Error(`Invalid field(s): ${fields}. ${primaryError?.message || ""}`);
                }
                if (errorCode === "REQUIRED_FIELD_MISSING") {
                    const fields = primaryError?.fields?.join(", ") || "unknown";
                    throw new Error(`Required field(s) missing: ${fields}`);
                }
                if (errorCode === "FIELD_INTEGRITY_EXCEPTION") {
                    throw new Error(`Field integrity error: ${primaryError?.message || ""}`);
                }
                throw new Error(`Invalid request: ${primaryError?.message || "Bad request"}`);
            }

            if (status === 429) {
                throw new Error("Salesforce rate limit exceeded. Please try again later.");
            }

            // Generic error with message from response
            if (primaryError?.message) {
                throw new Error(
                    `Salesforce API error (${primaryError.errorCode || status}): ${primaryError.message}`
                );
            }
        }

        throw error;
    }

    // ==========================================================================
    // Query Operations
    // ==========================================================================

    /**
     * Execute a SOQL query
     */
    async query<T = Record<string, unknown>>(soql: string): Promise<SalesforceQueryResult<T>> {
        const encodedQuery = encodeURIComponent(soql);
        return this.get(`/query?q=${encodedQuery}`);
    }

    /**
     * Get the next page of query results
     */
    async queryMore<T = Record<string, unknown>>(
        nextRecordsUrl: string
    ): Promise<SalesforceQueryResult<T>> {
        // nextRecordsUrl is relative to instance, e.g., /services/data/v65.0/query/01gxx...
        // We need to extract just the part after /services/data/vXX.X
        const match = nextRecordsUrl.match(/\/services\/data\/v[\d.]+(.+)/);
        if (match) {
            return this.get(match[1]);
        }
        // Fallback: try using the URL as-is (relative to our base)
        return this.get(nextRecordsUrl);
    }

    /**
     * Execute a SOQL query and fetch all pages automatically
     */
    async queryAll<T = Record<string, unknown>>(soql: string): Promise<T[]> {
        const allRecords: T[] = [];
        let result = await this.query<T>(soql);

        allRecords.push(...result.records);

        while (!result.done && result.nextRecordsUrl) {
            result = await this.queryMore<T>(result.nextRecordsUrl);
            allRecords.push(...result.records);
        }

        return allRecords;
    }

    // ==========================================================================
    // Search Operations (SOSL)
    // ==========================================================================

    /**
     * Execute a SOSL search
     */
    async search(sosl: string): Promise<SalesforceSearchResult> {
        const encodedSearch = encodeURIComponent(sosl);
        return this.get(`/search?q=${encodedSearch}`);
    }

    // ==========================================================================
    // sObject CRUD Operations
    // ==========================================================================

    /**
     * Create a new record
     */
    async createRecord(
        objectType: string,
        data: Record<string, unknown>
    ): Promise<SalesforceCreateResult> {
        return this.post(`/sobjects/${objectType}`, data);
    }

    /**
     * Get a record by ID
     */
    async getRecord<T = Record<string, unknown>>(
        objectType: string,
        recordId: string,
        fields?: string[]
    ): Promise<T> {
        let url = `/sobjects/${objectType}/${recordId}`;
        if (fields && fields.length > 0) {
            url += `?fields=${fields.join(",")}`;
        }
        return this.get(url);
    }

    /**
     * Update a record
     */
    async updateRecord(
        objectType: string,
        recordId: string,
        data: Record<string, unknown>
    ): Promise<void> {
        await this.patch(`/sobjects/${objectType}/${recordId}`, data);
    }

    /**
     * Delete a record
     */
    async deleteRecord(objectType: string, recordId: string): Promise<void> {
        await this.delete(`/sobjects/${objectType}/${recordId}`);
    }

    /**
     * Upsert a record using an external ID field
     */
    async upsertRecord(
        objectType: string,
        externalIdField: string,
        externalIdValue: string,
        data: Record<string, unknown>
    ): Promise<SalesforceCreateResult> {
        return this.patch(`/sobjects/${objectType}/${externalIdField}/${externalIdValue}`, data);
    }

    // ==========================================================================
    // Metadata Operations
    // ==========================================================================

    /**
     * Get global describe (list of all sObjects)
     */
    async describeGlobal(): Promise<SalesforceGlobalDescribe> {
        return this.get("/sobjects");
    }

    /**
     * Get describe for a specific sObject
     */
    async describeSObject(objectType: string): Promise<SalesforceDescribeResult> {
        return this.get(`/sobjects/${objectType}/describe`);
    }

    /**
     * Get basic info for a specific sObject (lighter than full describe)
     */
    async getSObjectInfo(objectType: string): Promise<SalesforceSObjectInfo> {
        return this.get(`/sobjects/${objectType}`);
    }

    // ==========================================================================
    // Limits & Diagnostics
    // ==========================================================================

    /**
     * Get current org limits
     */
    async getLimits(): Promise<SalesforceLimitsResult> {
        return this.get("/limits");
    }

    /**
     * Get available API versions
     */
    async getVersions(): Promise<Array<{ label: string; url: string; version: string }>> {
        // This endpoint is at the instance root, not under /services/data/vXX.X
        // We need to make a raw request
        const response = await fetch(`${this.instanceUrl}/services/data`, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get API versions: ${response.statusText}`);
        }

        return (await response.json()) as Array<{ label: string; url: string; version: string }>;
    }

    // ==========================================================================
    // Utility Methods
    // ==========================================================================

    /**
     * Get the configured instance URL
     */
    getInstanceUrl(): string {
        return this.instanceUrl;
    }

    /**
     * Get the configured API version
     */
    getApiVersion(): string {
        return this.apiVersion;
    }
}
