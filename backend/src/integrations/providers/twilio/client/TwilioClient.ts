/**
 * Twilio HTTP Client
 *
 * Handles all HTTP communication with Twilio API.
 * Uses HTTP Basic Authentication with Account SID and Auth Token.
 *
 * Base URL: https://api.twilio.com/2010-04-01/Accounts/{AccountSid}
 * Lookups API: https://lookups.twilio.com/v1
 *
 * Rate limit: ~20-30 concurrent requests
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface TwilioClientConfig {
    accountSid: string;
    authToken: string;
    connectionId?: string;
}

// ============================================
// Twilio API Types
// ============================================

export interface TwilioMessage {
    sid: string;
    account_sid: string;
    messaging_service_sid: string | null;
    from: string;
    to: string;
    body: string;
    status:
        | "queued"
        | "sending"
        | "sent"
        | "delivered"
        | "failed"
        | "undelivered"
        | "receiving"
        | "received";
    num_segments: string;
    num_media: string;
    direction: "inbound" | "outbound-api" | "outbound-call" | "outbound-reply";
    api_version: string;
    price: string | null;
    price_unit: string | null;
    error_code: string | null;
    error_message: string | null;
    uri: string;
    date_created: string;
    date_updated: string;
    date_sent: string | null;
}

export interface TwilioMessageListResponse {
    messages: TwilioMessage[];
    first_page_uri: string;
    end: number;
    next_page_uri: string | null;
    previous_page_uri: string | null;
    page: number;
    page_size: number;
    start: number;
    uri: string;
}

export interface TwilioPhoneNumber {
    sid: string;
    account_sid: string;
    friendly_name: string;
    phone_number: string;
    capabilities: {
        voice: boolean;
        SMS: boolean;
        MMS: boolean;
        fax: boolean;
    };
    status: string;
    api_version: string;
    voice_url: string | null;
    voice_method: string;
    voice_fallback_url: string | null;
    voice_fallback_method: string;
    sms_url: string | null;
    sms_method: string;
    sms_fallback_url: string | null;
    sms_fallback_method: string;
    address_requirements: "none" | "any" | "local" | "foreign";
    beta: boolean;
    uri: string;
    date_created: string;
    date_updated: string;
}

export interface TwilioPhoneNumberListResponse {
    incoming_phone_numbers: TwilioPhoneNumber[];
    first_page_uri: string;
    end: number;
    next_page_uri: string | null;
    previous_page_uri: string | null;
    page: number;
    page_size: number;
    start: number;
    uri: string;
}

export interface TwilioLookupResult {
    calling_country_code: string;
    country_code: string;
    phone_number: string;
    national_format: string;
    valid: boolean;
    validation_errors: string[] | null;
    caller_name?: {
        caller_name: string | null;
        caller_type: "CONSUMER" | "BUSINESS" | null;
        error_code: string | null;
    } | null;
    carrier?: {
        mobile_country_code: string | null;
        mobile_network_code: string | null;
        name: string | null;
        type: "landline" | "mobile" | "voip" | null;
        error_code: string | null;
    } | null;
    line_type_intelligence?: {
        carrier_name: string | null;
        error_code: string | null;
        mobile_country_code: string | null;
        mobile_network_code: string | null;
        type: string | null;
    } | null;
    url: string;
}

interface TwilioErrorResponse {
    code?: number;
    message?: string;
    more_info?: string;
    status?: number;
}

export class TwilioClient extends BaseAPIClient {
    private accountSid: string;
    private authToken: string;

    constructor(config: TwilioClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`,
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
                maxSockets: 30,
                maxFreeSockets: 10,
                keepAliveMsecs: 60000
            }
        };

        super(clientConfig);

        this.accountSid = config.accountSid;
        this.authToken = config.authToken;

        // Add Basic Auth header
        const credentials = Buffer.from(`${config.accountSid}:${config.authToken}`).toString(
            "base64"
        );

        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Basic ${credentials}`;
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override request to handle Twilio-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: TwilioErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.message) {
                const twilioError = response.data;
                throw new Error(
                    `Twilio API error (${twilioError.code || response.status}): ${twilioError.message}`
                );
            }

            if (response?.status === 401) {
                throw new Error(
                    "Twilio authentication failed. Please check your Account SID and Auth Token."
                );
            }

            if (response?.status === 403) {
                throw new Error(
                    "Twilio permission denied. Your account may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Twilio.");
            }

            if (response?.status === 429) {
                throw new Error("Twilio rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    /**
     * Make a form-encoded POST request (Twilio uses form encoding, not JSON)
     */
    async postForm<T = unknown>(url: string, data: Record<string, string>): Promise<T> {
        const formBody = new URLSearchParams(data).toString();
        return this.request<T>({
            method: "POST",
            url,
            data: formBody,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
    }

    // ============================================
    // Message Operations
    // ============================================

    /**
     * Send an SMS message
     */
    async sendMessage(params: {
        to: string;
        from: string;
        body: string;
        statusCallback?: string;
        messagingServiceSid?: string;
    }): Promise<TwilioMessage> {
        const formData: Record<string, string> = {
            To: params.to,
            From: params.from,
            Body: params.body
        };

        if (params.statusCallback) {
            formData["StatusCallback"] = params.statusCallback;
        }

        if (params.messagingServiceSid) {
            formData["MessagingServiceSid"] = params.messagingServiceSid;
        }

        return this.postForm<TwilioMessage>("/Messages.json", formData);
    }

    /**
     * List messages with pagination
     */
    async listMessages(params?: {
        to?: string;
        from?: string;
        dateSent?: string;
        dateSentBefore?: string;
        dateSentAfter?: string;
        pageSize?: number;
        pageToken?: string;
    }): Promise<TwilioMessageListResponse> {
        const queryParams: Record<string, unknown> = {};

        if (params?.to) queryParams["To"] = params.to;
        if (params?.from) queryParams["From"] = params.from;
        if (params?.dateSent) queryParams["DateSent"] = params.dateSent;
        if (params?.dateSentBefore) queryParams["DateSent<"] = params.dateSentBefore;
        if (params?.dateSentAfter) queryParams["DateSent>"] = params.dateSentAfter;
        if (params?.pageSize) queryParams["PageSize"] = params.pageSize;
        if (params?.pageToken) queryParams["PageToken"] = params.pageToken;

        return this.get<TwilioMessageListResponse>("/Messages.json", queryParams);
    }

    /**
     * Get a single message by SID
     */
    async getMessage(messageSid: string): Promise<TwilioMessage> {
        return this.get<TwilioMessage>(`/Messages/${messageSid}.json`);
    }

    /**
     * Delete a message
     */
    async deleteMessage(messageSid: string): Promise<void> {
        await this.request({
            method: "DELETE",
            url: `/Messages/${messageSid}.json`
        });
    }

    // ============================================
    // Phone Number Operations
    // ============================================

    /**
     * List account phone numbers
     */
    async listPhoneNumbers(params?: {
        friendlyName?: string;
        phoneNumber?: string;
        pageSize?: number;
        pageToken?: string;
    }): Promise<TwilioPhoneNumberListResponse> {
        const queryParams: Record<string, unknown> = {};

        if (params?.friendlyName) queryParams["FriendlyName"] = params.friendlyName;
        if (params?.phoneNumber) queryParams["PhoneNumber"] = params.phoneNumber;
        if (params?.pageSize) queryParams["PageSize"] = params.pageSize;
        if (params?.pageToken) queryParams["PageToken"] = params.pageToken;

        return this.get<TwilioPhoneNumberListResponse>("/IncomingPhoneNumbers.json", queryParams);
    }

    /**
     * Get a single phone number by SID
     */
    async getPhoneNumber(phoneNumberSid: string): Promise<TwilioPhoneNumber> {
        return this.get<TwilioPhoneNumber>(`/IncomingPhoneNumbers/${phoneNumberSid}.json`);
    }

    // ============================================
    // Lookup Operations (uses different base URL)
    // ============================================

    /**
     * Look up phone number information (carrier, caller name, etc.)
     * Uses the Lookups API v2 which has a different base URL
     */
    async lookupPhoneNumber(phoneNumber: string, fields?: string[]): Promise<TwilioLookupResult> {
        // Build the fields query param (e.g., "carrier,caller_name,line_type_intelligence")
        const fieldsParam = fields && fields.length > 0 ? fields.join(",") : undefined;

        // Lookups API v2 uses a different base URL
        const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phoneNumber)}`;

        // Need to make a direct request with Basic Auth
        const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");

        const queryString = fieldsParam ? `?Fields=${fieldsParam}` : "";

        const response = await fetch(`${url}${queryString}`, {
            method: "GET",
            headers: {
                Authorization: `Basic ${credentials}`,
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as TwilioErrorResponse;
            throw new Error(
                `Twilio Lookup API error (${errorData.code || response.status}): ${errorData.message || response.statusText}`
            );
        }

        return response.json() as Promise<TwilioLookupResult>;
    }
}
