/**
 * Datadog HTTP Client
 *
 * Handles all HTTP communication with Datadog API.
 * Uses dual-key authentication: DD-API-KEY and DD-APPLICATION-KEY headers.
 *
 * Base URL: https://api.{site}/api (configurable per region)
 *
 * Rate limit: 600 requests/minute
 */

import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface DatadogClientConfig {
    apiKey: string;
    applicationKey: string;
    site?: string; // e.g., "datadoghq.com", "datadoghq.eu", "us3.datadoghq.com"
}

// ============================================
// Datadog API Types
// ============================================

export interface DatadogMetricSeries {
    metric: string;
    points: Array<[number, number]>; // [timestamp, value]
    tags?: string[];
    type?: "count" | "gauge" | "rate";
    host?: string;
}

export interface DatadogMetricsPayload {
    series: DatadogMetricSeries[];
}

export interface DatadogMetricQueryResult {
    status: string;
    res_type: string;
    from_date: number;
    to_date: number;
    series: Array<{
        metric: string;
        display_name: string;
        pointlist: Array<[number, number]>;
        unit?: Array<{ family: string; name: string; short_name: string }>;
        scope: string;
        expression: string;
        aggr?: string;
        length?: number;
        start?: number;
        end?: number;
    }>;
    query: string;
    group_by?: string[];
    message?: string;
}

export interface DatadogMonitor {
    id?: number;
    name: string;
    type: string;
    query: string;
    message: string;
    tags?: string[];
    priority?: number;
    options?: {
        notify_no_data?: boolean;
        no_data_timeframe?: number;
        notify_audit?: boolean;
        timeout_h?: number;
        renotify_interval?: number;
        escalation_message?: string;
        thresholds?: Record<string, number>;
        include_tags?: boolean;
        require_full_window?: boolean;
    };
    overall_state?: string;
    created?: string;
    modified?: string;
    created_at?: number;
    modified_at?: number;
    deleted?: string | null;
    restricted_roles?: string[];
}

export interface DatadogEvent {
    id?: number;
    title: string;
    text: string;
    date_happened?: number;
    priority?: "low" | "normal";
    host?: string;
    tags?: string[];
    alert_type?: "info" | "warning" | "error" | "success";
    aggregation_key?: string;
    source_type_name?: string;
    related_event_id?: number;
    device_name?: string;
}

export interface DatadogIncident {
    id?: string;
    type?: string;
    attributes?: {
        title: string;
        customer_impact_scope?: string;
        customer_impact_start?: string;
        customer_impact_end?: string;
        customer_impacted?: boolean;
        detected?: string;
        created?: string;
        modified?: string;
        resolved?: string;
        severity?: string;
        state?: string;
        time_to_detect?: number;
        time_to_repair?: number;
        time_to_internal_response?: number;
        time_to_resolve?: number;
        fields?: Record<string, unknown>;
    };
    relationships?: {
        commander_user?: { data?: { id: string; type: string } };
        created_by_user?: { data?: { id: string; type: string } };
        last_modified_by_user?: { data?: { id: string; type: string } };
    };
}

interface DatadogErrorResponse {
    errors?: string[];
}

export class DatadogClient extends BaseAPIClient {
    private apiKey: string;
    private applicationKey: string;

    constructor(config: DatadogClientConfig) {
        const site = config.site || "datadoghq.com";
        const baseURL = `https://api.${site}/api`;

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
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

        this.apiKey = config.apiKey;
        this.applicationKey = config.applicationKey;

        // Add authorization headers
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["DD-API-KEY"] = this.apiKey;
            requestConfig.headers["DD-APPLICATION-KEY"] = this.applicationKey;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle Datadog-specific errors
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as DatadogErrorResponse;

            if (data?.errors && data.errors.length > 0) {
                throw new Error(`Datadog API error: ${data.errors.join(", ")}`);
            }

            if (error.response.status === 401) {
                throw new Error(
                    "Datadog authentication failed. Please check your API Key and Application Key."
                );
            }

            if (error.response.status === 403) {
                throw new Error(
                    "Datadog permission denied. Your keys may not have access to this resource."
                );
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found in Datadog.");
            }

            if (error.response.status === 429) {
                throw new Error("Datadog rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Metrics Operations
    // ============================================

    /**
     * Query timeseries metric data
     */
    async queryMetrics(params: {
        query: string;
        from: number;
        to: number;
    }): Promise<DatadogMetricQueryResult> {
        return this.get("/v1/query", {
            query: params.query,
            from: params.from,
            to: params.to
        });
    }

    /**
     * Submit custom metric datapoints
     */
    async submitMetrics(payload: DatadogMetricsPayload): Promise<{ status: string }> {
        return this.post("/v2/series", payload);
    }

    // ============================================
    // Monitor Operations
    // ============================================

    /**
     * Get all monitors
     */
    async listMonitors(params?: {
        tags?: string[];
        page?: number;
        page_size?: number;
    }): Promise<DatadogMonitor[]> {
        const queryParams: Record<string, unknown> = {};
        if (params?.tags && params.tags.length > 0) {
            queryParams.monitor_tags = params.tags.join(",");
        }
        if (params?.page !== undefined) {
            queryParams.page = params.page;
        }
        if (params?.page_size !== undefined) {
            queryParams.page_size = params.page_size;
        }
        return this.get("/v1/monitor", queryParams);
    }

    /**
     * Get a specific monitor
     */
    async getMonitor(monitorId: number): Promise<DatadogMonitor> {
        return this.get(`/v1/monitor/${monitorId}`);
    }

    /**
     * Create a new monitor
     */
    async createMonitor(monitor: Omit<DatadogMonitor, "id">): Promise<DatadogMonitor> {
        return this.post("/v1/monitor", monitor);
    }

    /**
     * Mute a monitor
     */
    async muteMonitor(
        monitorId: number,
        options?: { scope?: string; end?: number }
    ): Promise<DatadogMonitor> {
        return this.post(`/v1/monitor/${monitorId}/mute`, options || {});
    }

    // ============================================
    // Event Operations
    // ============================================

    /**
     * List events from the event stream
     */
    async listEvents(params: {
        start: number;
        end: number;
        tags?: string[];
        sources?: string[];
        priority?: "low" | "normal";
    }): Promise<{ events: DatadogEvent[] }> {
        const queryParams: Record<string, unknown> = {
            start: params.start,
            end: params.end
        };
        if (params.tags && params.tags.length > 0) {
            queryParams.tags = params.tags.join(",");
        }
        if (params.sources && params.sources.length > 0) {
            queryParams.sources = params.sources.join(",");
        }
        if (params.priority) {
            queryParams.priority = params.priority;
        }
        return this.get("/v1/events", queryParams);
    }

    /**
     * Post a new event
     */
    async createEvent(event: DatadogEvent): Promise<{ event: DatadogEvent; status: string }> {
        return this.post("/v1/events", event);
    }

    // ============================================
    // Incident Operations
    // ============================================

    /**
     * List incidents
     */
    async listIncidents(params?: { page_offset?: number; page_size?: number }): Promise<{
        data: DatadogIncident[];
        meta?: { pagination?: { offset: number; size: number } };
    }> {
        const queryParams: Record<string, unknown> = {};
        if (params?.page_offset !== undefined) {
            queryParams["page[offset]"] = params.page_offset;
        }
        if (params?.page_size !== undefined) {
            queryParams["page[size]"] = params.page_size;
        }
        return this.get("/v2/incidents", queryParams);
    }

    /**
     * Create a new incident
     */
    async createIncident(incident: {
        title: string;
        customer_impact_scope?: string;
        fields?: Record<string, unknown>;
    }): Promise<{ data: DatadogIncident }> {
        return this.post("/v2/incidents", {
            data: {
                type: "incidents",
                attributes: incident
            }
        });
    }
}
