/**
 * RingCentral HTTP Client
 *
 * Handles all HTTP communication with RingCentral API.
 * Uses Bearer token authentication (OAuth2 with PKCE).
 *
 * Base URL: https://platform.ringcentral.com
 *
 * Rate limits vary by API group (Light/Medium/Heavy)
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface RingCentralClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: { accessToken: string; refreshToken?: string }) => Promise<void>;
}

// ============================================
// RingCentral API Types
// ============================================

export interface RingCentralSMSRequest {
    from: { phoneNumber: string };
    to: Array<{ phoneNumber: string }>;
    text: string;
    country?: { isoCode: string };
}

export interface RingCentralMMSRequest extends RingCentralSMSRequest {
    attachments?: Array<{
        fileName: string;
        contentType: string;
        content: string; // Base64 encoded
    }>;
}

export interface RingCentralMessageResponse {
    id: string;
    uri: string;
    type: "SMS" | "MMS" | "Pager" | "Fax" | "VoiceMail" | "Text";
    direction: "Inbound" | "Outbound";
    availability: "Alive" | "Deleted" | "Purged";
    messageStatus:
        | "Queued"
        | "Sent"
        | "Delivered"
        | "DeliveryFailed"
        | "SendingFailed"
        | "Received";
    readStatus: "Read" | "Unread";
    creationTime: string;
    lastModifiedTime: string;
    from: { phoneNumber: string; name?: string };
    to: Array<{ phoneNumber: string; name?: string }>;
    subject?: string;
    conversationId?: string;
    conversation?: { id: string; uri: string };
    attachments?: RingCentralAttachment[];
    smsSendingAttemptsCount?: number;
}

export interface RingCentralAttachment {
    id: string;
    uri: string;
    type: string;
    contentType?: string;
    size?: number;
}

export interface RingCentralMessageList {
    uri: string;
    records: RingCentralMessageResponse[];
    paging: {
        page: number;
        perPage: number;
        pageStart: number;
        pageEnd: number;
        totalPages: number;
        totalElements: number;
    };
    navigation: {
        firstPage?: { uri: string };
        nextPage?: { uri: string };
        previousPage?: { uri: string };
        lastPage?: { uri: string };
    };
}

export interface RingCentralRingOutRequest {
    from: { phoneNumber: string };
    to: { phoneNumber: string };
    playPrompt?: boolean;
    callerId?: { phoneNumber: string };
    country?: { id: string };
}

export interface RingCentralRingOutResponse {
    id: string;
    uri: string;
    status: {
        callStatus:
            | "Invalid"
            | "Success"
            | "InProgress"
            | "Busy"
            | "NoAnswer"
            | "Rejected"
            | "GenericError"
            | "Finished"
            | "InternationalDisabled"
            | "DestinationBlocked"
            | "NotEnoughFunds"
            | "NoSuchUser";
        callerStatus: string;
        calleeStatus: string;
    };
}

export interface RingCentralCallLogRecord {
    id: string;
    uri: string;
    sessionId?: string;
    telephonySessionId?: string;
    startTime: string;
    duration?: number;
    type: "Voice" | "Fax";
    direction: "Inbound" | "Outbound";
    action:
        | "Unknown"
        | "Phone Call"
        | "Phone Login"
        | "Incoming Fax"
        | "Accept Call"
        | "FindMe"
        | "FollowMe"
        | "Outgoing Fax"
        | "Call Return"
        | "Calling Card"
        | "Ring Directly"
        | "RingOut PC"
        | "RingOut Mobile"
        | "Emergency"
        | "RingOut Web"
        | "Fax Computer"
        | "Sip Call";
    result:
        | "Unknown"
        | "ResultInProgress"
        | "Missed"
        | "Call Accepted"
        | "Voicemail"
        | "Rejected"
        | "Reply"
        | "Received"
        | "Receive Error"
        | "Fax on Demand"
        | "Partial Receive"
        | "Blocked"
        | "Call Connected"
        | "No Answer"
        | "International Disabled"
        | "Busy"
        | "Send Error"
        | "Sent"
        | "No Fax Machine"
        | "ResultEmpty"
        | "Account Suspended"
        | "Call Failed"
        | "Call Failure"
        | "Internal Error"
        | "IP Phone offline"
        | "Restricted Number"
        | "Wrong Number"
        | "Stopped"
        | "Hang up"
        | "Poor Line Quality"
        | "Partially Sent"
        | "International Restriction"
        | "Abandoned"
        | "Declined"
        | "Fax Receipt Error"
        | "Fax Send Error";
    from?: { phoneNumber?: string; name?: string; location?: string };
    to?: { phoneNumber?: string; name?: string; location?: string };
    transport?: "PSTN" | "VoIP";
    recording?: {
        id: string;
        uri: string;
        type: string;
        contentUri: string;
    };
    lastModifiedTime?: string;
    billing?: {
        costIncluded: number;
        costPurchased: number;
    };
}

export interface RingCentralCallLogList {
    uri: string;
    records: RingCentralCallLogRecord[];
    paging: {
        page: number;
        perPage: number;
        pageStart: number;
        pageEnd: number;
        totalPages: number;
        totalElements: number;
    };
    navigation: {
        firstPage?: { uri: string };
        nextPage?: { uri: string };
        previousPage?: { uri: string };
        lastPage?: { uri: string };
    };
}

export interface RingCentralVoicemail extends RingCentralMessageResponse {
    vmTranscriptionStatus?:
        | "NotAvailable"
        | "InProgress"
        | "TimedOut"
        | "Completed"
        | "CompletedPartially"
        | "Failed"
        | "Unknown";
    attachments: RingCentralAttachment[];
}

export interface RingCentralTeamMessage {
    id: string;
    groupId: string;
    type: "TextMessage" | "PersonJoined" | "PersonsAdded" | "PersonsRemoved" | "Card";
    text?: string;
    creatorId: string;
    addedPersonIds?: string[];
    removedPersonIds?: string[];
    creationTime: string;
    lastModifiedTime: string;
    attachments?: RingCentralTeamAttachment[];
    mentions?: RingCentralTeamMention[];
    eventType?: string;
}

export interface RingCentralTeamAttachment {
    id: string;
    type: "File" | "Event" | "Task" | "Card";
    contentUri?: string;
    name?: string;
}

export interface RingCentralTeamMention {
    id: string;
    type: "Person" | "Team" | "File" | "Link" | "Event" | "Task" | "Note" | "Card";
    name?: string;
}

export interface RingCentralChat {
    id: string;
    type: "Everyone" | "Group" | "Personal" | "Direct" | "Team";
    name?: string;
    description?: string;
    status?: "Active" | "Archived";
    creationTime: string;
    lastModifiedTime: string;
    members?: Array<{
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
    }>;
}

export interface RingCentralChatList {
    records: RingCentralChat[];
    navigation?: {
        prevPageToken?: string;
        nextPageToken?: string;
    };
}

export interface RingCentralMeeting {
    id: string;
    uuid: string;
    uri: string;
    topic: string;
    startTime?: string;
    duration?: number;
    timezone?: { id: string };
    password?: string;
    h323Password?: string;
    status?: "NotStarted" | "Started";
    links?: {
        startUri?: string;
        joinUri?: string;
    };
    allowJoinBeforeHost?: boolean;
    enableWaitingRoom?: boolean;
    muteParticipantsOnEntry?: boolean;
    usePersonalMeetingId?: boolean;
    audioOptions?: string[];
    recurrence?: {
        recurrenceType: "Daily" | "Weekly" | "Monthly";
        endDateTime?: string;
    };
}

interface RingCentralErrorResponse {
    errorCode?: string;
    message?: string;
    errors?: Array<{
        errorCode: string;
        message: string;
        parameterName?: string;
    }>;
}

export class RingCentralClient extends BaseAPIClient {
    constructor(config: RingCentralClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://platform.ringcentral.com",
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

        // Add authorization header using Bearer token
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override request to handle RingCentral-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: RingCentralErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.errors && response.data.errors.length > 0) {
                const rcError = response.data.errors[0];
                throw new Error(`RingCentral API error: ${rcError.message} (${rcError.errorCode})`);
            }

            if (response?.data?.message) {
                throw new Error(`RingCentral API error: ${response.data.message}`);
            }

            if (response?.status === 401) {
                throw new Error(
                    "RingCentral authentication failed. Please reconnect your account."
                );
            }

            if (response?.status === 403) {
                throw new Error(
                    "RingCentral permission denied. Check your OAuth scopes or account permissions."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in RingCentral.");
            }

            if (response?.status === 429) {
                throw new Error("RingCentral rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // SMS/MMS Operations
    // ============================================

    /**
     * Send an SMS message
     */
    async sendSMS(request: RingCentralSMSRequest): Promise<RingCentralMessageResponse> {
        return this.post("/restapi/v1.0/account/~/extension/~/sms", request);
    }

    /**
     * Send an MMS message
     */
    async sendMMS(request: RingCentralMMSRequest): Promise<RingCentralMessageResponse> {
        return this.post("/restapi/v1.0/account/~/extension/~/sms", request);
    }

    /**
     * List SMS/MMS messages
     */
    async listMessages(params?: {
        messageType?: "SMS" | "MMS" | "Pager" | "Fax" | "VoiceMail" | "Text";
        direction?: "Inbound" | "Outbound";
        dateFrom?: string;
        dateTo?: string;
        page?: number;
        perPage?: number;
    }): Promise<RingCentralMessageList> {
        return this.get("/restapi/v1.0/account/~/extension/~/message-store", params);
    }

    // ============================================
    // Voice Operations
    // ============================================

    /**
     * Make a RingOut call
     */
    async makeRingOutCall(request: RingCentralRingOutRequest): Promise<RingCentralRingOutResponse> {
        return this.post("/restapi/v1.0/account/~/extension/~/ring-out", request);
    }

    /**
     * Cancel a RingOut call
     */
    async cancelRingOutCall(ringOutId: string): Promise<void> {
        await this.request({
            method: "DELETE",
            url: `/restapi/v1.0/account/~/extension/~/ring-out/${ringOutId}`
        });
    }

    /**
     * Get RingOut call status
     */
    async getRingOutStatus(ringOutId: string): Promise<RingCentralRingOutResponse> {
        return this.get(`/restapi/v1.0/account/~/extension/~/ring-out/${ringOutId}`);
    }

    /**
     * Get call logs
     */
    async getCallLogs(params?: {
        type?: "Voice" | "Fax";
        direction?: "Inbound" | "Outbound";
        dateFrom?: string;
        dateTo?: string;
        page?: number;
        perPage?: number;
        view?: "Simple" | "Detailed";
    }): Promise<RingCentralCallLogList> {
        return this.get("/restapi/v1.0/account/~/extension/~/call-log", params);
    }

    /**
     * List voicemail messages
     */
    async listVoicemails(params?: {
        page?: number;
        perPage?: number;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<RingCentralMessageList> {
        return this.get("/restapi/v1.0/account/~/extension/~/message-store", {
            ...params,
            messageType: "VoiceMail"
        });
    }

    // ============================================
    // Team Messaging (Glip) Operations
    // ============================================

    /**
     * Send a message to a team chat
     */
    async sendTeamMessage(
        chatId: string,
        data: {
            text?: string;
            attachments?: Array<{
                type: "File" | "Event" | "Card";
                id?: string;
            }>;
        }
    ): Promise<RingCentralTeamMessage> {
        return this.post(`/restapi/v1.0/glip/chats/${chatId}/posts`, data);
    }

    /**
     * List team chats
     */
    async listChats(params?: {
        type?: Array<"Everyone" | "Group" | "Personal" | "Direct" | "Team">;
        pageToken?: string;
        recordCount?: number;
    }): Promise<RingCentralChatList> {
        return this.get("/restapi/v1.0/glip/chats", params);
    }

    /**
     * Get a specific chat
     */
    async getChat(chatId: string): Promise<RingCentralChat> {
        return this.get(`/restapi/v1.0/glip/chats/${chatId}`);
    }

    // ============================================
    // Meeting Operations
    // ============================================

    /**
     * Schedule a meeting
     */
    async scheduleMeeting(data: {
        topic: string;
        meetingType?: "Scheduled" | "Instant" | "Recurring";
        schedule?: {
            startTime: string;
            durationInMinutes: number;
            timeZone?: { id: string };
        };
        password?: string;
        allowJoinBeforeHost?: boolean;
        enableWaitingRoom?: boolean;
        muteParticipantsOnEntry?: boolean;
        usePersonalMeetingId?: boolean;
        audioOptions?: string[];
    }): Promise<RingCentralMeeting> {
        return this.post("/restapi/v1.0/account/~/extension/~/meeting", data);
    }

    /**
     * Get a meeting
     */
    async getMeeting(meetingId: string): Promise<RingCentralMeeting> {
        return this.get(`/restapi/v1.0/account/~/extension/~/meeting/${meetingId}`);
    }

    /**
     * Delete/cancel a meeting
     */
    async cancelMeeting(meetingId: string): Promise<void> {
        await this.request({
            method: "DELETE",
            url: `/restapi/v1.0/account/~/extension/~/meeting/${meetingId}`
        });
    }
}
