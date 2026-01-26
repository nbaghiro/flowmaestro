/**
 * PagerDuty HTTP Client
 *
 * Handles all HTTP communication with PagerDuty API.
 * Uses Token authentication with API key.
 *
 * Base URL: https://api.pagerduty.com
 *
 * Rate limit: 960 requests/minute per user
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface PagerDutyClientConfig {
    apiKey: string;
    connectionId?: string;
}

// ============================================
// PagerDuty API Types
// ============================================

export interface PagerDutyReference {
    id: string;
    type: string;
    summary?: string;
    self?: string;
    html_url?: string;
}

export interface PagerDutyIncident {
    id: string;
    type: "incident";
    summary: string;
    self: string;
    html_url: string;
    incident_number: number;
    title: string;
    description?: string;
    created_at: string;
    updated_at?: string;
    status: "triggered" | "acknowledged" | "resolved";
    incident_key?: string;
    urgency: "high" | "low";
    service: PagerDutyReference;
    assignments: Array<{
        at: string;
        assignee: PagerDutyReference;
    }>;
    acknowledgements: Array<{
        at: string;
        acknowledger: PagerDutyReference;
    }>;
    last_status_change_at: string;
    last_status_change_by?: PagerDutyReference;
    escalation_policy: PagerDutyReference;
    teams?: PagerDutyReference[];
    priority?: {
        id: string;
        type: "priority";
        summary: string;
        name: string;
        color?: string;
    };
    resolve_reason?: {
        type: string;
        incident?: PagerDutyReference;
    };
    alert_counts?: {
        all: number;
        triggered: number;
        resolved: number;
    };
    is_mergeable?: boolean;
    pending_actions?: Array<{
        type: string;
        at: string;
    }>;
    conference_bridge?: {
        conference_number?: string;
        conference_url?: string;
    };
    body?: {
        type: "incident_body";
        details?: string;
    };
}

export interface PagerDutyService {
    id: string;
    type: "service";
    summary: string;
    self: string;
    html_url: string;
    name: string;
    description?: string;
    auto_resolve_timeout?: number | null;
    acknowledgement_timeout?: number | null;
    created_at: string;
    status: "active" | "warning" | "critical" | "maintenance" | "disabled";
    alert_creation: "create_incidents" | "create_alerts_and_incidents";
    escalation_policy: PagerDutyReference;
    teams?: PagerDutyReference[];
    integrations?: PagerDutyReference[];
    incident_urgency_rule?: {
        type: string;
        urgency?: "high" | "low";
        during_support_hours?: {
            type: string;
            urgency: "high" | "low";
        };
        outside_support_hours?: {
            type: string;
            urgency: "high" | "low";
        };
    };
    support_hours?: {
        type: string;
        time_zone: string;
        days_of_week: number[];
        start_time: string;
        end_time: string;
    };
    scheduled_actions?: Array<{
        type: string;
        at: {
            type: string;
            name: string;
        };
        to_urgency: "high" | "low";
    }>;
}

export interface PagerDutyEscalationPolicy {
    id: string;
    type: "escalation_policy";
    summary: string;
    self: string;
    html_url: string;
    name: string;
    description?: string;
    num_loops: number;
    on_call_handoff_notifications: "if_has_services" | "always";
    escalation_rules: Array<{
        id: string;
        escalation_delay_in_minutes: number;
        targets: PagerDutyReference[];
    }>;
    services?: PagerDutyReference[];
    teams?: PagerDutyReference[];
}

export interface PagerDutyOnCall {
    escalation_policy: PagerDutyReference;
    escalation_level: number;
    schedule?: PagerDutyReference;
    user: PagerDutyReference & {
        email?: string;
        name?: string;
    };
    start?: string;
    end?: string;
}

export interface PagerDutyUser {
    id: string;
    type: "user";
    summary: string;
    self: string;
    html_url: string;
    name: string;
    email: string;
    time_zone: string;
    color?: string;
    role:
        | "admin"
        | "limited_user"
        | "observer"
        | "owner"
        | "read_only_limited_user"
        | "read_only_user"
        | "restricted_access"
        | "user";
    avatar_url?: string;
    description?: string;
    invitation_sent?: boolean;
    job_title?: string;
    teams?: PagerDutyReference[];
    contact_methods?: PagerDutyReference[];
    notification_rules?: PagerDutyReference[];
}

export interface PagerDutySchedule {
    id: string;
    type: "schedule";
    summary: string;
    self: string;
    html_url: string;
    name: string;
    description?: string;
    time_zone: string;
    escalation_policies?: PagerDutyReference[];
    users?: PagerDutyReference[];
    teams?: PagerDutyReference[];
    schedule_layers?: Array<{
        id: string;
        start: string;
        end?: string;
        rotation_virtual_start: string;
        rotation_turn_length_seconds: number;
        users: PagerDutyReference[];
        restrictions?: Array<{
            type: string;
            start_time_of_day: string;
            duration_seconds: number;
            start_day_of_week?: number;
        }>;
    }>;
    final_schedule?: {
        name: string;
        rendered_schedule_entries: Array<{
            start: string;
            end: string;
            user: PagerDutyReference;
        }>;
        rendered_coverage_percentage: number;
    };
    overrides_subschedule?: {
        name: string;
        rendered_schedule_entries: Array<{
            start: string;
            end: string;
            user: PagerDutyReference;
        }>;
    };
}

interface PagerDutyErrorResponse {
    error?: {
        message: string;
        code?: number;
        errors?: string[];
    };
}

interface PagerDutyPaginatedResponse<T> {
    offset?: number;
    limit?: number;
    more?: boolean;
    total?: number;
    data: T[];
}

export class PagerDutyClient extends BaseAPIClient {
    constructor(config: PagerDutyClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.pagerduty.com",
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

        // Add authorization header using Token authentication
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Token token=${config.apiKey}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override request to handle PagerDuty-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: PagerDutyErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.error) {
                const pdError = response.data.error;
                const errorDetails = pdError.errors?.join(", ") || "";
                throw new Error(
                    `PagerDuty API error: ${pdError.message}${errorDetails ? ` (${errorDetails})` : ""}`
                );
            }

            if (response?.status === 401) {
                throw new Error("PagerDuty authentication failed. Please check your API key.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "PagerDuty permission denied. Your API key may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in PagerDuty.");
            }

            if (response?.status === 429) {
                throw new Error("PagerDuty rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Incident Operations
    // ============================================

    /**
     * List incidents with optional filtering
     */
    async listIncidents(params?: {
        statuses?: Array<"triggered" | "acknowledged" | "resolved">;
        urgencies?: Array<"high" | "low">;
        since?: string;
        until?: string;
        service_ids?: string[];
        user_ids?: string[];
        team_ids?: string[];
        sort_by?: string;
        include?: string[];
        limit?: number;
        offset?: number;
    }): Promise<PagerDutyPaginatedResponse<PagerDutyIncident>> {
        const queryParams: Record<string, string | string[]> = {};

        if (params?.statuses) {
            queryParams["statuses[]"] = params.statuses;
        }
        if (params?.urgencies) {
            queryParams["urgencies[]"] = params.urgencies;
        }
        if (params?.since) {
            queryParams.since = params.since;
        }
        if (params?.until) {
            queryParams.until = params.until;
        }
        if (params?.service_ids) {
            queryParams["service_ids[]"] = params.service_ids;
        }
        if (params?.user_ids) {
            queryParams["user_ids[]"] = params.user_ids;
        }
        if (params?.team_ids) {
            queryParams["team_ids[]"] = params.team_ids;
        }
        if (params?.sort_by) {
            queryParams.sort_by = params.sort_by;
        }
        if (params?.include) {
            queryParams["include[]"] = params.include;
        }
        if (params?.limit) {
            queryParams.limit = String(params.limit);
        }
        if (params?.offset) {
            queryParams.offset = String(params.offset);
        }

        const response = await this.get<{
            incidents: PagerDutyIncident[];
            offset: number;
            limit: number;
            more: boolean;
            total: number;
        }>("/incidents", queryParams);

        return {
            data: response.incidents,
            offset: response.offset,
            limit: response.limit,
            more: response.more,
            total: response.total
        };
    }

    /**
     * Get a single incident by ID
     */
    async getIncident(incidentId: string): Promise<PagerDutyIncident> {
        const response = await this.get<{ incident: PagerDutyIncident }>(
            `/incidents/${incidentId}`
        );
        return response.incident;
    }

    /**
     * Create a new incident
     */
    async createIncident(
        params: {
            title: string;
            service: { id: string; type: "service_reference" };
            urgency?: "high" | "low";
            body?: { type: "incident_body"; details?: string };
            incident_key?: string;
            escalation_policy?: { id: string; type: "escalation_policy_reference" };
            priority?: { id: string; type: "priority_reference" };
            assignments?: Array<{ assignee: { id: string; type: "user_reference" } }>;
            conference_bridge?: { conference_number?: string; conference_url?: string };
        },
        from: string
    ): Promise<PagerDutyIncident> {
        const response = await this.post<{ incident: PagerDutyIncident }>("/incidents", {
            incident: {
                type: "incident",
                ...params
            }
        });

        // Add the From header for incident creation
        this.client.addRequestInterceptor((requestConfig) => {
            if (requestConfig.url === "/incidents" && requestConfig.method === "POST") {
                if (!requestConfig.headers) {
                    requestConfig.headers = {};
                }
                requestConfig.headers["From"] = from;
            }
            return requestConfig;
        });

        return response.incident;
    }

    /**
     * Create a new incident with the From header set
     */
    async createIncidentWithFrom(
        params: {
            title: string;
            service: { id: string; type: "service_reference" };
            urgency?: "high" | "low";
            body?: { type: "incident_body"; details?: string };
            incident_key?: string;
            escalation_policy?: { id: string; type: "escalation_policy_reference" };
            priority?: { id: string; type: "priority_reference" };
            assignments?: Array<{ assignee: { id: string; type: "user_reference" } }>;
            conference_bridge?: { conference_number?: string; conference_url?: string };
        },
        from: string
    ): Promise<PagerDutyIncident> {
        const response = await this.request<{ incident: PagerDutyIncident }>({
            method: "POST",
            url: "/incidents",
            headers: { From: from },
            data: {
                incident: {
                    type: "incident",
                    ...params
                }
            }
        });

        return response.incident;
    }

    /**
     * Update an incident (acknowledge, resolve, reassign, etc.)
     */
    async updateIncident(
        incidentId: string,
        params: {
            status?: "acknowledged" | "resolved";
            resolution?: string;
            title?: string;
            urgency?: "high" | "low";
            escalation_level?: number;
            assignments?: Array<{
                assignee: { id: string; type: "user_reference" | "escalation_policy_reference" };
            }>;
            escalation_policy?: { id: string; type: "escalation_policy_reference" };
            priority?: { id: string; type: "priority_reference" };
            conference_bridge?: { conference_number?: string; conference_url?: string };
        },
        from: string
    ): Promise<PagerDutyIncident> {
        const response = await this.request<{ incident: PagerDutyIncident }>({
            method: "PUT",
            url: `/incidents/${incidentId}`,
            headers: { From: from },
            data: {
                incident: {
                    type: "incident_reference",
                    ...params
                }
            }
        });

        return response.incident;
    }

    // ============================================
    // Service Operations
    // ============================================

    /**
     * List services
     */
    async listServices(params?: {
        query?: string;
        team_ids?: string[];
        include?: string[];
        sort_by?: string;
        limit?: number;
        offset?: number;
    }): Promise<PagerDutyPaginatedResponse<PagerDutyService>> {
        const queryParams: Record<string, string | string[]> = {};

        if (params?.query) {
            queryParams.query = params.query;
        }
        if (params?.team_ids) {
            queryParams["team_ids[]"] = params.team_ids;
        }
        if (params?.include) {
            queryParams["include[]"] = params.include;
        }
        if (params?.sort_by) {
            queryParams.sort_by = params.sort_by;
        }
        if (params?.limit) {
            queryParams.limit = String(params.limit);
        }
        if (params?.offset) {
            queryParams.offset = String(params.offset);
        }

        const response = await this.get<{
            services: PagerDutyService[];
            offset: number;
            limit: number;
            more: boolean;
            total: number;
        }>("/services", queryParams);

        return {
            data: response.services,
            offset: response.offset,
            limit: response.limit,
            more: response.more,
            total: response.total
        };
    }

    /**
     * Get a single service by ID
     */
    async getService(serviceId: string, include?: string[]): Promise<PagerDutyService> {
        const params: Record<string, string[]> = {};
        if (include) {
            params["include[]"] = include;
        }

        const response = await this.get<{ service: PagerDutyService }>(
            `/services/${serviceId}`,
            params
        );
        return response.service;
    }

    // ============================================
    // Escalation Policy Operations
    // ============================================

    /**
     * List escalation policies
     */
    async listEscalationPolicies(params?: {
        query?: string;
        user_ids?: string[];
        team_ids?: string[];
        include?: string[];
        sort_by?: string;
        limit?: number;
        offset?: number;
    }): Promise<PagerDutyPaginatedResponse<PagerDutyEscalationPolicy>> {
        const queryParams: Record<string, string | string[]> = {};

        if (params?.query) {
            queryParams.query = params.query;
        }
        if (params?.user_ids) {
            queryParams["user_ids[]"] = params.user_ids;
        }
        if (params?.team_ids) {
            queryParams["team_ids[]"] = params.team_ids;
        }
        if (params?.include) {
            queryParams["include[]"] = params.include;
        }
        if (params?.sort_by) {
            queryParams.sort_by = params.sort_by;
        }
        if (params?.limit) {
            queryParams.limit = String(params.limit);
        }
        if (params?.offset) {
            queryParams.offset = String(params.offset);
        }

        const response = await this.get<{
            escalation_policies: PagerDutyEscalationPolicy[];
            offset: number;
            limit: number;
            more: boolean;
            total: number;
        }>("/escalation_policies", queryParams);

        return {
            data: response.escalation_policies,
            offset: response.offset,
            limit: response.limit,
            more: response.more,
            total: response.total
        };
    }

    // ============================================
    // On-Call Operations
    // ============================================

    /**
     * List current on-calls
     */
    async listOnCalls(params?: {
        escalation_policy_ids?: string[];
        schedule_ids?: string[];
        user_ids?: string[];
        since?: string;
        until?: string;
        earliest?: boolean;
        include?: string[];
        limit?: number;
        offset?: number;
    }): Promise<PagerDutyPaginatedResponse<PagerDutyOnCall>> {
        const queryParams: Record<string, string | string[]> = {};

        if (params?.escalation_policy_ids) {
            queryParams["escalation_policy_ids[]"] = params.escalation_policy_ids;
        }
        if (params?.schedule_ids) {
            queryParams["schedule_ids[]"] = params.schedule_ids;
        }
        if (params?.user_ids) {
            queryParams["user_ids[]"] = params.user_ids;
        }
        if (params?.since) {
            queryParams.since = params.since;
        }
        if (params?.until) {
            queryParams.until = params.until;
        }
        if (params?.earliest !== undefined) {
            queryParams.earliest = String(params.earliest);
        }
        if (params?.include) {
            queryParams["include[]"] = params.include;
        }
        if (params?.limit) {
            queryParams.limit = String(params.limit);
        }
        if (params?.offset) {
            queryParams.offset = String(params.offset);
        }

        const response = await this.get<{
            oncalls: PagerDutyOnCall[];
            offset: number;
            limit: number;
            more: boolean;
            total: number;
        }>("/oncalls", queryParams);

        return {
            data: response.oncalls,
            offset: response.offset,
            limit: response.limit,
            more: response.more,
            total: response.total
        };
    }

    // ============================================
    // User Operations
    // ============================================

    /**
     * List users
     */
    async listUsers(params?: {
        query?: string;
        team_ids?: string[];
        include?: string[];
        limit?: number;
        offset?: number;
    }): Promise<PagerDutyPaginatedResponse<PagerDutyUser>> {
        const queryParams: Record<string, string | string[]> = {};

        if (params?.query) {
            queryParams.query = params.query;
        }
        if (params?.team_ids) {
            queryParams["team_ids[]"] = params.team_ids;
        }
        if (params?.include) {
            queryParams["include[]"] = params.include;
        }
        if (params?.limit) {
            queryParams.limit = String(params.limit);
        }
        if (params?.offset) {
            queryParams.offset = String(params.offset);
        }

        const response = await this.get<{
            users: PagerDutyUser[];
            offset: number;
            limit: number;
            more: boolean;
            total: number;
        }>("/users", queryParams);

        return {
            data: response.users,
            offset: response.offset,
            limit: response.limit,
            more: response.more,
            total: response.total
        };
    }

    // ============================================
    // Schedule Operations
    // ============================================

    /**
     * List schedules
     */
    async listSchedules(params?: {
        query?: string;
        include?: string[];
        limit?: number;
        offset?: number;
    }): Promise<PagerDutyPaginatedResponse<PagerDutySchedule>> {
        const queryParams: Record<string, string | string[]> = {};

        if (params?.query) {
            queryParams.query = params.query;
        }
        if (params?.include) {
            queryParams["include[]"] = params.include;
        }
        if (params?.limit) {
            queryParams.limit = String(params.limit);
        }
        if (params?.offset) {
            queryParams.offset = String(params.offset);
        }

        const response = await this.get<{
            schedules: PagerDutySchedule[];
            offset: number;
            limit: number;
            more: boolean;
            total: number;
        }>("/schedules", queryParams);

        return {
            data: response.schedules,
            offset: response.offset,
            limit: response.limit,
            more: response.more,
            total: response.total
        };
    }
}
