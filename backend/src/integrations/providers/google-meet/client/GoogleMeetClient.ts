import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type {
    GoogleMeetSpace,
    GoogleMeetConferenceRecord,
    GoogleMeetConferenceRecordList,
    GoogleMeetParticipantList,
    GoogleMeetParticipant,
    GoogleMeetError
} from "../operations/types";

export interface GoogleMeetClientConfig {
    accessToken: string;
}

/**
 * Google Meet API Client
 *
 * Provides methods to interact with Google Meet REST API v2
 * https://developers.google.com/meet/api/reference/rest
 */
export class GoogleMeetClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: GoogleMeetClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://meet.googleapis.com",
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

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle Google Meet API-specific errors
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const { status, data } = error.response;

            if (status === 401) {
                throw new Error("Google Meet authentication failed. " + "Please reconnect.");
            }

            if (status === 403) {
                const errorData = data as GoogleMeetError | undefined;
                throw new Error(
                    `Permission denied: ${errorData?.error?.message || "You don't have permission to access this resource."}`
                );
            }

            if (status === 404) {
                throw new Error("Google Meet resource not found.");
            }

            if (status === 429) {
                const headers = error.response.headers as Record<string, string> | undefined;
                const retryAfter = headers?.["retry-after"];
                throw new Error(
                    "Google Meet rate limit exceeded. " +
                        `Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (status === 400) {
                const errorData = data as GoogleMeetError | undefined;
                throw new Error(`Invalid request: ${errorData?.error?.message || "Bad request"}`);
            }

            // Handle structured error response
            if ((data as GoogleMeetError)?.error) {
                const errorData = data as GoogleMeetError;
                throw new Error(`Google Meet API error: ${errorData.error.message}`);
            }
        }

        throw error;
    }

    // ================================================================
    // SPACES
    // ================================================================

    /**
     * Normalize a space name to just the ID portion.
     * Handles both "spaces/abc123" and "abc123" formats.
     */
    private normalizeSpaceName(spaceName: string): string {
        if (spaceName.startsWith("spaces/")) {
            return spaceName.substring("spaces/".length);
        }
        return spaceName;
    }

    /**
     * Create a new meeting space
     * POST /v2/spaces
     */
    async createSpace(config?: {
        accessType?: string;
        entryPointAccess?: string;
    }): Promise<GoogleMeetSpace> {
        const body: Record<string, unknown> = {};
        if (config) {
            body.config = config;
        }
        return await this.post<GoogleMeetSpace>("/v2/spaces", body);
    }

    /**
     * Get a meeting space
     * GET /v2/spaces/{spaceId}
     */
    async getSpace(spaceName: string): Promise<GoogleMeetSpace> {
        const spaceId = this.normalizeSpaceName(spaceName);
        return await this.get<GoogleMeetSpace>(`/v2/spaces/${encodeURIComponent(spaceId)}`);
    }

    /**
     * Update a meeting space configuration
     * PATCH /v2/spaces/{spaceId}?updateMask={updateMask}
     */
    async updateSpace(
        spaceName: string,
        config: Record<string, unknown>,
        updateMask: string
    ): Promise<GoogleMeetSpace> {
        const spaceId = this.normalizeSpaceName(spaceName);
        const url =
            `/v2/spaces/${encodeURIComponent(spaceId)}` +
            `?updateMask=${encodeURIComponent(updateMask)}`;
        return await this.patch<GoogleMeetSpace>(url, { config });
    }

    /**
     * End the active conference in a space
     * POST /v2/spaces/{spaceId}:endActiveConference
     */
    async endActiveConference(spaceName: string): Promise<void> {
        const spaceId = this.normalizeSpaceName(spaceName);
        await this.post(`/v2/spaces/${encodeURIComponent(spaceId)}:endActiveConference`, {});
    }

    // ================================================================
    // CONFERENCE RECORDS
    // ================================================================

    /**
     * List conference records
     * GET /v2/conferenceRecords
     */
    async listConferenceRecords(params?: {
        filter?: string;
        pageSize?: number;
        pageToken?: string;
    }): Promise<GoogleMeetConferenceRecordList> {
        return await this.get<GoogleMeetConferenceRecordList>("/v2/conferenceRecords", { params });
    }

    /**
     * Get a conference record
     * GET /v2/{name}
     */
    async getConferenceRecord(name: string): Promise<GoogleMeetConferenceRecord> {
        return await this.get<GoogleMeetConferenceRecord>(`/v2/${name}`);
    }

    // ================================================================
    // PARTICIPANTS
    // ================================================================

    /**
     * List participants for a conference record
     * GET /v2/{conferenceRecordName}/participants
     */
    async listParticipants(
        conferenceRecordName: string,
        params?: {
            pageSize?: number;
            pageToken?: string;
            filter?: string;
        }
    ): Promise<GoogleMeetParticipantList> {
        return await this.get<GoogleMeetParticipantList>(
            `/v2/${conferenceRecordName}/participants`,
            { params }
        );
    }

    /**
     * Get a participant
     * GET /v2/{name}
     */
    async getParticipant(name: string): Promise<GoogleMeetParticipant> {
        return await this.get<GoogleMeetParticipant>(`/v2/${name}`);
    }
}
