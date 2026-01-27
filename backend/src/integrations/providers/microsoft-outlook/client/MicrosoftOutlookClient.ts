/**
 * Microsoft Outlook Client
 * HTTP client for Microsoft Graph API - Mail and Calendar endpoints
 */

export interface OutlookClientConfig {
    accessToken: string;
}

// ============================================================================
// Mail Types
// ============================================================================

export interface MailFolder {
    id: string;
    displayName: string;
    parentFolderId?: string;
    childFolderCount: number;
    unreadItemCount: number;
    totalItemCount: number;
}

export interface MailFoldersResponse {
    value: MailFolder[];
    "@odata.nextLink"?: string;
}

export interface EmailAddress {
    name?: string;
    address: string;
}

export interface Recipient {
    emailAddress: EmailAddress;
}

export interface MessageBody {
    contentType: "text" | "html";
    content: string;
}

export interface Message {
    id: string;
    subject: string;
    bodyPreview: string;
    body?: MessageBody;
    from?: Recipient;
    toRecipients: Recipient[];
    ccRecipients?: Recipient[];
    bccRecipients?: Recipient[];
    receivedDateTime: string;
    sentDateTime?: string;
    isRead: boolean;
    isDraft: boolean;
    importance: "low" | "normal" | "high";
    webLink?: string;
    hasAttachments: boolean;
}

export interface MessagesResponse {
    value: Message[];
    "@odata.nextLink"?: string;
}

// ============================================================================
// Calendar Types
// ============================================================================

export interface Calendar {
    id: string;
    name: string;
    color?: string;
    isDefaultCalendar?: boolean;
    canEdit: boolean;
    owner?: {
        name: string;
        address: string;
    };
}

export interface CalendarsResponse {
    value: Calendar[];
    "@odata.nextLink"?: string;
}

export interface DateTimeTimeZone {
    dateTime: string;
    timeZone: string;
}

export interface Location {
    displayName?: string;
    locationType?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        countryOrRegion?: string;
        postalCode?: string;
    };
}

export interface Attendee {
    type: "required" | "optional" | "resource";
    status?: {
        response:
            | "none"
            | "organizer"
            | "tentativelyAccepted"
            | "accepted"
            | "declined"
            | "notResponded";
        time?: string;
    };
    emailAddress: EmailAddress;
}

export interface OnlineMeeting {
    joinUrl?: string;
}

export interface Event {
    id: string;
    subject: string;
    bodyPreview?: string;
    body?: MessageBody;
    start: DateTimeTimeZone;
    end: DateTimeTimeZone;
    location?: Location;
    locations?: Location[];
    attendees?: Attendee[];
    organizer?: {
        emailAddress: EmailAddress;
    };
    isOnlineMeeting: boolean;
    onlineMeeting?: OnlineMeeting;
    onlineMeetingUrl?: string;
    webLink?: string;
    isCancelled?: boolean;
    responseStatus?: {
        response:
            | "none"
            | "organizer"
            | "tentativelyAccepted"
            | "accepted"
            | "declined"
            | "notResponded";
        time?: string;
    };
    createdDateTime?: string;
    lastModifiedDateTime?: string;
}

export interface EventsResponse {
    value: Event[];
    "@odata.nextLink"?: string;
}

// ============================================================================
// Client Implementation
// ============================================================================

export class MicrosoftOutlookClient {
    private readonly baseUrl = "https://graph.microsoft.com/v1.0";
    private readonly accessToken: string;

    constructor(config: OutlookClientConfig) {
        this.accessToken = config.accessToken;
    }

    /**
     * Generic request method with error handling
     */
    private async request<T>(
        endpoint: string,
        options: {
            method?: string;
            body?: unknown;
            headers?: Record<string, string>;
        } = {}
    ): Promise<T> {
        const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
        const { method = "GET", body, headers = {} } = options;

        const response = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
                ...headers
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Microsoft Graph API error: ${response.status}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error?.message) {
                    errorMessage = errorJson.error.message;
                }
            } catch {
                // Use default error message
            }

            throw new Error(errorMessage);
        }

        if (response.status === 204) {
            return {} as T;
        }

        return (await response.json()) as T;
    }

    // ============================================================================
    // Mail Folder Operations
    // ============================================================================

    /**
     * List all mail folders
     */
    async listMailFolders(): Promise<MailFoldersResponse> {
        return this.request("/me/mailFolders");
    }

    // ============================================================================
    // Message Operations
    // ============================================================================

    /**
     * List messages in a folder
     */
    async listMessages(
        options: {
            folderId?: string;
            top?: number;
            filter?: string;
            search?: string;
        } = {}
    ): Promise<MessagesResponse> {
        const { folderId = "inbox", top, filter, search } = options;
        const params = new URLSearchParams();

        if (top) {
            params.append("$top", String(Math.min(top, 50)));
        }
        if (filter) {
            params.append("$filter", filter);
        }
        if (search) {
            params.append("$search", `"${search}"`);
        }

        const queryString = params.toString();
        const endpoint = `/me/mailFolders/${folderId}/messages${queryString ? `?${queryString}` : ""}`;

        return this.request(endpoint);
    }

    /**
     * Get a specific message by ID
     */
    async getMessage(messageId: string): Promise<Message> {
        return this.request(`/me/messages/${messageId}`);
    }

    /**
     * Send an email
     */
    async sendMail(options: {
        to: string[];
        subject: string;
        body: string;
        bodyType?: "text" | "html";
        cc?: string[];
        bcc?: string[];
        importance?: "low" | "normal" | "high";
        saveToSentItems?: boolean;
    }): Promise<void> {
        const {
            to,
            subject,
            body,
            bodyType = "html",
            cc,
            bcc,
            importance = "normal",
            saveToSentItems = true
        } = options;

        const message = {
            subject,
            body: {
                contentType: bodyType,
                content: body
            },
            toRecipients: to.map((email) => ({
                emailAddress: { address: email }
            })),
            ccRecipients: cc?.map((email) => ({
                emailAddress: { address: email }
            })),
            bccRecipients: bcc?.map((email) => ({
                emailAddress: { address: email }
            })),
            importance
        };

        await this.request<void>("/me/sendMail", {
            method: "POST",
            body: {
                message,
                saveToSentItems
            }
        });
    }

    /**
     * Reply to a message
     */
    async replyToMessage(
        messageId: string,
        comment: string,
        replyAll: boolean = false
    ): Promise<void> {
        const endpoint = `/me/messages/${messageId}/${replyAll ? "replyAll" : "reply"}`;
        await this.request<void>(endpoint, {
            method: "POST",
            body: { comment }
        });
    }

    /**
     * Forward a message
     */
    async forwardMessage(messageId: string, to: string[], comment?: string): Promise<void> {
        await this.request<void>(`/me/messages/${messageId}/forward`, {
            method: "POST",
            body: {
                comment,
                toRecipients: to.map((email) => ({
                    emailAddress: { address: email }
                }))
            }
        });
    }

    /**
     * Move a message to another folder
     */
    async moveMessage(messageId: string, destinationFolderId: string): Promise<Message> {
        return this.request(`/me/messages/${messageId}/move`, {
            method: "POST",
            body: { destinationId: destinationFolderId }
        });
    }

    /**
     * Delete a message
     */
    async deleteMessage(messageId: string): Promise<void> {
        await this.request<void>(`/me/messages/${messageId}`, {
            method: "DELETE"
        });
    }

    /**
     * Mark a message as read or unread
     */
    async markAsRead(messageId: string, isRead: boolean): Promise<Message> {
        return this.request(`/me/messages/${messageId}`, {
            method: "PATCH",
            body: { isRead }
        });
    }

    // ============================================================================
    // Calendar Operations
    // ============================================================================

    /**
     * List user's calendars
     */
    async listCalendars(): Promise<CalendarsResponse> {
        return this.request("/me/calendars");
    }

    /**
     * List events in a calendar within a time range
     */
    async listEvents(options: {
        calendarId?: string;
        startDateTime: string;
        endDateTime: string;
        top?: number;
    }): Promise<EventsResponse> {
        const { calendarId, startDateTime, endDateTime, top } = options;
        const params = new URLSearchParams();
        params.append("startDateTime", startDateTime);
        params.append("endDateTime", endDateTime);

        if (top) {
            params.append("$top", String(top));
        }

        const baseEndpoint = calendarId
            ? `/me/calendars/${calendarId}/calendarView`
            : "/me/calendarView";

        return this.request(`${baseEndpoint}?${params.toString()}`);
    }

    /**
     * Get a specific event by ID
     */
    async getEvent(eventId: string): Promise<Event> {
        return this.request(`/me/events/${eventId}`);
    }

    /**
     * Create a new calendar event
     */
    async createEvent(options: {
        subject: string;
        start: string;
        end: string;
        timeZone?: string;
        body?: string;
        location?: string;
        attendees?: string[];
        isOnlineMeeting?: boolean;
        calendarId?: string;
    }): Promise<Event> {
        const {
            subject,
            start,
            end,
            timeZone = "UTC",
            body,
            location,
            attendees,
            isOnlineMeeting = false,
            calendarId
        } = options;

        const event: Record<string, unknown> = {
            subject,
            start: {
                dateTime: start,
                timeZone
            },
            end: {
                dateTime: end,
                timeZone
            }
        };

        if (body) {
            event.body = {
                contentType: "html",
                content: body
            };
        }

        if (location) {
            event.location = {
                displayName: location
            };
        }

        if (attendees && attendees.length > 0) {
            event.attendees = attendees.map((email) => ({
                emailAddress: { address: email },
                type: "required"
            }));
        }

        if (isOnlineMeeting) {
            event.isOnlineMeeting = true;
            event.onlineMeetingProvider = "teamsForBusiness";
        }

        const endpoint = calendarId ? `/me/calendars/${calendarId}/events` : "/me/events";

        return this.request(endpoint, {
            method: "POST",
            body: event
        });
    }

    /**
     * Update an existing event
     */
    async updateEvent(
        eventId: string,
        updates: {
            subject?: string;
            start?: string;
            end?: string;
            timeZone?: string;
            body?: string;
            location?: string;
        }
    ): Promise<Event> {
        const event: Record<string, unknown> = {};

        if (updates.subject) {
            event.subject = updates.subject;
        }

        if (updates.start) {
            event.start = {
                dateTime: updates.start,
                timeZone: updates.timeZone || "UTC"
            };
        }

        if (updates.end) {
            event.end = {
                dateTime: updates.end,
                timeZone: updates.timeZone || "UTC"
            };
        }

        if (updates.body) {
            event.body = {
                contentType: "html",
                content: updates.body
            };
        }

        if (updates.location) {
            event.location = {
                displayName: updates.location
            };
        }

        return this.request(`/me/events/${eventId}`, {
            method: "PATCH",
            body: event
        });
    }

    /**
     * Delete a calendar event
     */
    async deleteEvent(eventId: string): Promise<void> {
        await this.request<void>(`/me/events/${eventId}`, {
            method: "DELETE"
        });
    }

    /**
     * Respond to an event invitation
     */
    async respondToEvent(
        eventId: string,
        response: "accept" | "tentativelyAccept" | "decline",
        options?: {
            sendResponse?: boolean;
            comment?: string;
        }
    ): Promise<void> {
        const { sendResponse = true, comment } = options || {};

        await this.request<void>(`/me/events/${eventId}/${response}`, {
            method: "POST",
            body: {
                sendResponse,
                comment
            }
        });
    }
}
