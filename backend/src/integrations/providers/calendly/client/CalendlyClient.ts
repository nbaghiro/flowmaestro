import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type { RequestConfig } from "../../../core/types";
import type {
    CalendlyUser,
    CalendlyEventType,
    CalendlyScheduledEvent,
    CalendlyInvitee,
    CalendlyAvailableTime,
    CalendlyCollectionResponse,
    CalendlyResourceResponse
} from "../operations/types";

export interface CalendlyClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Calendly API error response format
 */
interface CalendlyErrorResponse {
    title?: string;
    message?: string;
    details?: Array<{
        parameter: string;
        message: string;
    }>;
}

/**
 * Calendly API Client with connection pooling and error handling
 *
 * API Base URL: https://api.calendly.com
 * Authentication: Bearer token in Authorization header
 */
export class CalendlyClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: CalendlyClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.calendly.com",
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

        // Add request interceptor to add Authorization header
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
     * Override request to handle Calendly-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return super.request<T>(config);
    }

    /**
     * Handle Calendly-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as CalendlyErrorResponse;

            // Handle authentication errors
            if (error.response.status === 401) {
                throw new Error("Calendly authentication failed. Please reconnect.");
            }

            // Handle forbidden errors
            if (error.response.status === 403) {
                throw new Error("You do not have permission to access this resource.");
            }

            // Handle not found errors
            if (error.response.status === 404) {
                throw new Error("The requested resource was not found.");
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Rate limited. Please try again later.");
            }

            // Handle validation errors
            if (data.details && data.details.length > 0) {
                const errorMessages = data.details.map((d) => `${d.parameter}: ${d.message}`);
                throw new Error(`Validation error: ${errorMessages.join(", ")}`);
            }

            if (data.message) {
                throw new Error(`Calendly API error: ${data.message}`);
            }

            if (data.title) {
                throw new Error(`Calendly API error: ${data.title}`);
            }
        }

        throw error;
    }

    /**
     * Get the current authenticated user
     */
    async getCurrentUser(): Promise<CalendlyResourceResponse<CalendlyUser>> {
        return this.get("/users/me");
    }

    /**
     * List event types for a user or organization
     */
    async listEventTypes(params?: {
        user?: string;
        organization?: string;
        count?: number;
        page_token?: string;
        active?: boolean;
        sort?: string;
    }): Promise<CalendlyCollectionResponse<CalendlyEventType>> {
        return this.get("/event_types", params);
    }

    /**
     * Get a specific event type
     */
    async getEventType(uuid: string): Promise<CalendlyResourceResponse<CalendlyEventType>> {
        return this.get(`/event_types/${uuid}`);
    }

    /**
     * List scheduled events
     */
    async listScheduledEvents(params?: {
        user?: string;
        organization?: string;
        min_start_time?: string;
        max_start_time?: string;
        status?: "active" | "canceled";
        count?: number;
        page_token?: string;
        sort?: string;
        invitee_email?: string;
    }): Promise<CalendlyCollectionResponse<CalendlyScheduledEvent>> {
        return this.get("/scheduled_events", params);
    }

    /**
     * Get a specific scheduled event
     */
    async getScheduledEvent(
        uuid: string
    ): Promise<CalendlyResourceResponse<CalendlyScheduledEvent>> {
        return this.get(`/scheduled_events/${uuid}`);
    }

    /**
     * List invitees for a scheduled event
     */
    async listEventInvitees(
        eventUuid: string,
        params?: {
            status?: "active" | "canceled";
            count?: number;
            page_token?: string;
            sort?: string;
            email?: string;
        }
    ): Promise<CalendlyCollectionResponse<CalendlyInvitee>> {
        return this.get(`/scheduled_events/${eventUuid}/invitees`, params);
    }

    /**
     * Cancel a scheduled event
     */
    async cancelEvent(uuid: string, reason?: string): Promise<CalendlyResourceResponse<null>> {
        return this.post(`/scheduled_events/${uuid}/cancellation`, {
            reason: reason || null
        });
    }

    /**
     * Get available time slots for an event type
     */
    async getAvailability(params: {
        event_type: string;
        start_time: string;
        end_time: string;
    }): Promise<CalendlyCollectionResponse<CalendlyAvailableTime>> {
        return this.get("/event_type_available_times", params);
    }
}
