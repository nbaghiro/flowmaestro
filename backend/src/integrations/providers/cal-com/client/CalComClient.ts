import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type { RequestConfig } from "../../../core/types";
import type {
    CalComUser,
    CalComEventType,
    CalComBooking,
    CalComSchedule,
    CalComResourceResponse,
    CalComCollectionResponse,
    CalComPaginatedResponse,
    CalComSlotsResponse,
    CalComCreateBookingRequest
} from "../operations/types";

export interface CalComClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Cal.com API error response format
 */
interface CalComErrorResponse {
    status?: string;
    error?: {
        code?: string;
        message?: string;
        details?: unknown;
    };
    message?: string;
}

/**
 * Cal.com API Client with connection pooling and error handling
 *
 * API Base URL: https://api.cal.com/v2
 * Authentication: Bearer token in Authorization header
 * Rate Limit: 120 requests/minute
 */
export class CalComClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: CalComClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.cal.com/v2",
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
            reqConfig.headers["cal-api-version"] = "2024-08-13";
            return reqConfig;
        });
    }

    /**
     * Override request to handle Cal.com-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return super.request<T>(config);
    }

    /**
     * Handle Cal.com-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as CalComErrorResponse;

            // Handle authentication errors
            if (error.response.status === 401) {
                throw new Error("Cal.com authentication failed. Please reconnect.");
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

            // Handle validation errors (400)
            if (error.response.status === 400) {
                const errorMessage =
                    data.error?.message || data.message || "Invalid request parameters";
                throw new Error(`Validation error: ${errorMessage}`);
            }

            // Handle other errors with message
            if (data.error?.message) {
                throw new Error(`Cal.com API error: ${data.error.message}`);
            }

            if (data.message) {
                throw new Error(`Cal.com API error: ${data.message}`);
            }
        }

        throw error;
    }

    /**
     * Get the current authenticated user
     */
    async getCurrentUser(): Promise<CalComResourceResponse<CalComUser>> {
        return this.get("/me");
    }

    /**
     * List event types
     */
    async listEventTypes(params?: {
        take?: number;
        skip?: number;
    }): Promise<CalComPaginatedResponse<CalComEventType>> {
        return this.get("/event-types", params);
    }

    /**
     * Get a specific event type
     */
    async getEventType(id: number): Promise<CalComResourceResponse<CalComEventType>> {
        return this.get(`/event-types/${id}`);
    }

    /**
     * List bookings
     */
    async listBookings(params?: {
        take?: number;
        skip?: number;
        status?: string;
        eventTypeId?: number;
        afterStart?: string;
        beforeEnd?: string;
        sortStart?: "asc" | "desc";
        sortEnd?: "asc" | "desc";
        sortCreated?: "asc" | "desc";
    }): Promise<CalComPaginatedResponse<CalComBooking>> {
        return this.get("/bookings", params);
    }

    /**
     * Get a specific booking by UID
     */
    async getBooking(uid: string): Promise<CalComResourceResponse<CalComBooking>> {
        return this.get(`/bookings/${uid}`);
    }

    /**
     * Create a new booking
     */
    async createBooking(
        data: CalComCreateBookingRequest
    ): Promise<CalComResourceResponse<CalComBooking>> {
        return this.post("/bookings", data);
    }

    /**
     * Cancel a booking
     */
    async cancelBooking(
        uid: string,
        cancellationReason?: string
    ): Promise<CalComResourceResponse<CalComBooking>> {
        return this.post(`/bookings/${uid}/cancel`, {
            cancellationReason: cancellationReason || null
        });
    }

    /**
     * Reschedule a booking
     */
    async rescheduleBooking(
        uid: string,
        data: {
            start: string;
            rescheduledReason?: string;
        }
    ): Promise<CalComResourceResponse<CalComBooking>> {
        return this.post(`/bookings/${uid}/reschedule`, data);
    }

    /**
     * Get available slots for an event type
     */
    async getAvailableSlots(params: {
        eventTypeId: number;
        startTime: string;
        endTime: string;
        timeZone?: string;
    }): Promise<CalComSlotsResponse> {
        return this.get("/slots/available", {
            eventTypeId: params.eventTypeId,
            startTime: params.startTime,
            endTime: params.endTime,
            timeZone: params.timeZone
        });
    }

    /**
     * List user's schedules
     */
    async listSchedules(): Promise<CalComCollectionResponse<CalComSchedule>> {
        return this.get("/schedules");
    }
}
