/**
 * Klaviyo HTTP Client
 *
 * Handles all HTTP communication with Klaviyo API.
 * Uses JSON:API format for requests and responses.
 *
 * Base URL: https://a.klaviyo.com/api
 *
 * Important: All requests must include the revision header for API versioning.
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface KlaviyoClientConfig {
    accessToken: string;
    connectionId?: string;
}

export interface KlaviyoProfile {
    id: string;
    type: "profile";
    attributes: {
        email?: string;
        phone_number?: string;
        external_id?: string;
        first_name?: string;
        last_name?: string;
        organization?: string;
        title?: string;
        image?: string;
        created?: string;
        updated?: string;
        location?: {
            address1?: string;
            address2?: string;
            city?: string;
            country?: string;
            region?: string;
            zip?: string;
            timezone?: string;
        };
        properties?: Record<string, unknown>;
    };
}

export interface KlaviyoList {
    id: string;
    type: "list";
    attributes: {
        name: string;
        created?: string;
        updated?: string;
    };
}

export interface KlaviyoCampaign {
    id: string;
    type: "campaign";
    attributes: {
        name: string;
        status: string;
        archived: boolean;
        channel: string;
        send_time?: string;
        created_at?: string;
        updated_at?: string;
    };
}

interface KlaviyoErrorResponse {
    errors?: Array<{
        id?: string;
        status?: number;
        code?: string;
        title?: string;
        detail?: string;
        source?: {
            pointer?: string;
            parameter?: string;
        };
    }>;
}

export class KlaviyoClient extends BaseAPIClient {
    private static readonly API_REVISION = "2024-10-15";

    constructor(config: KlaviyoClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://a.klaviyo.com/api",
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

        // Add authorization and revision headers to all requests
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;
            requestConfig.headers["revision"] = KlaviyoClient.API_REVISION;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override request to handle Klaviyo-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: KlaviyoErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.errors && response.data.errors.length > 0) {
                const klaviyoError = response.data.errors[0];
                throw new Error(
                    `Klaviyo API error: ${klaviyoError.title || "Unknown error"} - ${klaviyoError.detail || ""}`
                );
            }

            if (response?.status === 401) {
                throw new Error("Klaviyo authentication failed. Please reconnect your account.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "Klaviyo permission denied. Your account may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Klaviyo.");
            }

            if (response?.status === 429) {
                throw new Error("Klaviyo rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Profile Operations
    // ============================================

    /**
     * Get profiles with optional filters
     */
    async getProfiles(params?: {
        filter?: string;
        pageSize?: number;
        pageCursor?: string;
        sort?: string;
    }): Promise<{
        data: KlaviyoProfile[];
        links?: {
            self?: string;
            next?: string;
            prev?: string;
        };
    }> {
        const queryParams: Record<string, string> = {};

        if (params?.filter) {
            queryParams["filter"] = params.filter;
        }
        if (params?.pageSize) {
            queryParams["page[size]"] = params.pageSize.toString();
        }
        if (params?.pageCursor) {
            queryParams["page[cursor]"] = params.pageCursor;
        }
        if (params?.sort) {
            queryParams["sort"] = params.sort;
        }

        return this.get("/profiles/", queryParams);
    }

    /**
     * Get a single profile by ID
     */
    async getProfile(profileId: string): Promise<{ data: KlaviyoProfile }> {
        return this.get(`/profiles/${profileId}/`);
    }

    /**
     * Create a new profile
     */
    async createProfile(data: {
        email?: string;
        phone_number?: string;
        external_id?: string;
        first_name?: string;
        last_name?: string;
        organization?: string;
        title?: string;
        properties?: Record<string, unknown>;
        location?: {
            address1?: string;
            address2?: string;
            city?: string;
            country?: string;
            region?: string;
            zip?: string;
            timezone?: string;
        };
    }): Promise<{ data: KlaviyoProfile }> {
        return this.post("/profiles/", {
            data: {
                type: "profile",
                attributes: data
            }
        });
    }

    /**
     * Update a profile
     */
    async updateProfile(
        profileId: string,
        data: {
            email?: string;
            phone_number?: string;
            external_id?: string;
            first_name?: string;
            last_name?: string;
            organization?: string;
            title?: string;
            properties?: Record<string, unknown>;
            location?: {
                address1?: string;
                address2?: string;
                city?: string;
                country?: string;
                region?: string;
                zip?: string;
                timezone?: string;
            };
        }
    ): Promise<{ data: KlaviyoProfile }> {
        return this.patch(`/profiles/${profileId}/`, {
            data: {
                type: "profile",
                id: profileId,
                attributes: data
            }
        });
    }

    /**
     * Subscribe a profile to email/SMS
     */
    async subscribeProfile(
        listId: string,
        data: {
            email?: string;
            phone_number?: string;
            custom_source?: string;
        }
    ): Promise<unknown> {
        const channels: Record<string, unknown> = {};

        if (data.email) {
            channels.email = ["MARKETING"];
        }
        if (data.phone_number) {
            channels.sms = ["MARKETING"];
        }

        return this.post("/profile-subscription-bulk-create-jobs/", {
            data: {
                type: "profile-subscription-bulk-create-job",
                attributes: {
                    profiles: {
                        data: [
                            {
                                type: "profile",
                                attributes: {
                                    email: data.email,
                                    phone_number: data.phone_number,
                                    subscriptions: {
                                        email: data.email
                                            ? {
                                                  marketing: {
                                                      consent: "SUBSCRIBED",
                                                      custom_method_detail: data.custom_source
                                                  }
                                              }
                                            : undefined,
                                        sms: data.phone_number
                                            ? {
                                                  marketing: {
                                                      consent: "SUBSCRIBED",
                                                      custom_method_detail: data.custom_source
                                                  }
                                              }
                                            : undefined
                                    }
                                }
                            }
                        ]
                    }
                },
                relationships: {
                    list: {
                        data: {
                            type: "list",
                            id: listId
                        }
                    }
                }
            }
        });
    }

    // ============================================
    // List Operations
    // ============================================

    /**
     * Get all lists
     */
    async getLists(params?: { pageSize?: number; pageCursor?: string }): Promise<{
        data: KlaviyoList[];
        links?: {
            self?: string;
            next?: string;
            prev?: string;
        };
    }> {
        const queryParams: Record<string, string> = {};

        if (params?.pageSize) {
            queryParams["page[size]"] = params.pageSize.toString();
        }
        if (params?.pageCursor) {
            queryParams["page[cursor]"] = params.pageCursor;
        }

        return this.get("/lists/", queryParams);
    }

    /**
     * Get profiles in a list
     */
    async getListProfiles(
        listId: string,
        params?: {
            pageSize?: number;
            pageCursor?: string;
        }
    ): Promise<{
        data: KlaviyoProfile[];
        links?: {
            self?: string;
            next?: string;
            prev?: string;
        };
    }> {
        const queryParams: Record<string, string> = {};

        if (params?.pageSize) {
            queryParams["page[size]"] = params.pageSize.toString();
        }
        if (params?.pageCursor) {
            queryParams["page[cursor]"] = params.pageCursor;
        }

        return this.get(`/lists/${listId}/profiles/`, queryParams);
    }

    /**
     * Add profiles to a list
     */
    async addProfilesToList(listId: string, profileIds: string[]): Promise<void> {
        await this.post(`/lists/${listId}/relationships/profiles/`, {
            data: profileIds.map((id) => ({
                type: "profile",
                id
            }))
        });
    }

    /**
     * Remove profiles from a list
     */
    async removeProfilesFromList(listId: string, profileIds: string[]): Promise<void> {
        // Klaviyo uses DELETE with a body for relationship removals
        await this.request({
            method: "DELETE",
            url: `/lists/${listId}/relationships/profiles/`,
            data: {
                data: profileIds.map((id) => ({
                    type: "profile",
                    id
                }))
            }
        });
    }

    // ============================================
    // Event Operations
    // ============================================

    /**
     * Create an event (track)
     */
    async createEvent(data: {
        profile: {
            email?: string;
            phone_number?: string;
            id?: string;
        };
        metric: {
            name: string;
        };
        properties?: Record<string, unknown>;
        time?: string;
        value?: number;
        unique_id?: string;
    }): Promise<unknown> {
        // Build profile identifier
        const profileData: Record<string, unknown> = {};
        if (data.profile.email) {
            profileData.email = data.profile.email;
        }
        if (data.profile.phone_number) {
            profileData.phone_number = data.profile.phone_number;
        }
        if (data.profile.id) {
            profileData.$id = data.profile.id;
        }

        return this.post("/events/", {
            data: {
                type: "event",
                attributes: {
                    profile: profileData,
                    metric: {
                        data: {
                            type: "metric",
                            attributes: {
                                name: data.metric.name
                            }
                        }
                    },
                    properties: data.properties || {},
                    time: data.time || new Date().toISOString(),
                    value: data.value,
                    unique_id: data.unique_id
                }
            }
        });
    }

    // ============================================
    // Campaign Operations
    // ============================================

    /**
     * Get campaigns
     */
    async getCampaigns(params?: {
        filter?: string;
        pageSize?: number;
        pageCursor?: string;
        sort?: string;
    }): Promise<{
        data: KlaviyoCampaign[];
        links?: {
            self?: string;
            next?: string;
            prev?: string;
        };
    }> {
        const queryParams: Record<string, string> = {};

        if (params?.filter) {
            queryParams["filter"] = params.filter;
        }
        if (params?.pageSize) {
            queryParams["page[size]"] = params.pageSize.toString();
        }
        if (params?.pageCursor) {
            queryParams["page[cursor]"] = params.pageCursor;
        }
        if (params?.sort) {
            queryParams["sort"] = params.sort;
        }

        return this.get("/campaigns/", queryParams);
    }
}
