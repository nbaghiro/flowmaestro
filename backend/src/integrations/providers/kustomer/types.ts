/**
 * Kustomer Integration Types
 *
 * Kustomer is a CRM-powered customer service platform with a customer-centric
 * data model (unified customer timelines vs ticket-centric approach).
 */

import type { ApiKeyData } from "../../../storage/models/Connection";

/**
 * Kustomer connection data - stored in connections table
 * Organization name is stored in connection.metadata.orgName
 */
export type KustomerConnectionData = ApiKeyData;

/**
 * Kustomer API response wrapper for single objects
 */
export interface KustomerSingleResponse<T> {
    data: T;
}

/**
 * Kustomer API response wrapper for collections
 */
export interface KustomerListResponse<T> {
    data: T[];
    links?: {
        self?: string;
        first?: string;
        prev?: string;
        next?: string;
    };
    meta?: {
        total?: number;
    };
}

/**
 * Kustomer Customer object
 * Customers are the central entity in Kustomer's data model
 */
export interface KustomerCustomer {
    type: "customer";
    id: string;
    attributes: {
        name?: string;
        displayName?: string;
        displayColor?: string;
        displayIcon?: string;
        externalId?: string;
        externalIds?: Array<{
            externalId: string;
            verified: boolean;
        }>;
        username?: string;
        emails?: Array<{
            email: string;
            type?: string;
            verified?: boolean;
        }>;
        phones?: Array<{
            phone: string;
            type?: string;
            verified?: boolean;
        }>;
        socials?: Array<{
            type: string;
            username?: string;
            url?: string;
        }>;
        urls?: Array<{
            url: string;
        }>;
        locations?: Array<{
            type?: string;
            address?: string;
            city?: string;
            state?: string;
            zip?: string;
            country?: string;
        }>;
        locale?: string;
        timeZone?: string;
        birthdayAt?: string;
        gender?: string;
        company?: string;
        signedUpAt?: string;
        lastActivityAt?: string;
        lastCustomerActivityAt?: string;
        lastSeenAt?: string;
        avatarUrl?: string;
        tags?: string[];
        custom?: Record<string, unknown>;
        rev?: number;
        createdAt?: string;
        updatedAt?: string;
        modifiedAt?: string;
        importedAt?: string;
    };
    relationships?: {
        org?: { data: { type: string; id: string } };
        conversations?: { data: Array<{ type: string; id: string }> };
        messages?: { data: Array<{ type: string; id: string }> };
    };
}

/**
 * Kustomer Conversation object
 * Conversations contain the interaction history with customers
 */
export interface KustomerConversation {
    type: "conversation";
    id: string;
    attributes: {
        name?: string;
        preview?: string;
        status?: KustomerConversationStatus;
        priority?: number;
        channel?: string;
        direction?: "in" | "out";
        firstMessageIn?: {
            sentAt?: string;
        };
        firstMessageOut?: {
            sentAt?: string;
        };
        lastMessageIn?: {
            sentAt?: string;
        };
        lastMessageOut?: {
            sentAt?: string;
        };
        messageCount?: number;
        noteCount?: number;
        satisfaction?: number;
        satisfactionLevel?: {
            sentiment?: string;
            sentimentPolarity?: string;
        };
        assignedUsers?: string[];
        assignedTeams?: string[];
        tags?: string[];
        snooze?: {
            snoozedAt?: string;
            snoozeUntil?: string;
        };
        custom?: Record<string, unknown>;
        createdAt?: string;
        updatedAt?: string;
        endedAt?: string;
        closedAt?: string;
        deletedAt?: string;
        firstResponse?: {
            respondedAt?: string;
            responseTime?: number;
        };
    };
    relationships?: {
        org?: { data: { type: string; id: string } };
        customer?: { data: { type: string; id: string } };
        messages?: { data: Array<{ type: string; id: string }> };
        assignedUsers?: { data: Array<{ type: string; id: string }> };
        assignedTeams?: { data: Array<{ type: string; id: string }> };
    };
}

/**
 * Kustomer Conversation status values
 */
export type KustomerConversationStatus = "open" | "snoozed" | "done";

/**
 * Kustomer Message object
 */
export interface KustomerMessage {
    type: "message";
    id: string;
    attributes: {
        channel?: string;
        direction?: "in" | "out";
        app?: string;
        preview?: string;
        subject?: string;
        body?: string;
        bodyText?: string;
        bodyHtml?: string;
        status?: string;
        size?: number;
        sentiment?: {
            confidence?: number;
            polarity?: string;
        };
        meta?: Record<string, unknown>;
        attachments?: Array<{
            contentType?: string;
            name?: string;
            url?: string;
            size?: number;
        }>;
        createdAt?: string;
        updatedAt?: string;
        sentAt?: string;
        deliveredAt?: string;
        readAt?: string;
    };
    relationships?: {
        org?: { data: { type: string; id: string } };
        customer?: { data: { type: string; id: string } };
        conversation?: { data: { type: string; id: string } };
        createdBy?: { data: { type: string; id: string } };
        createdByTeam?: { data: { type: string; id: string } };
    };
}

/**
 * Kustomer search query parameters
 */
export interface KustomerSearchQuery {
    and?: Array<KustomerSearchCondition | KustomerSearchQuery>;
    or?: Array<KustomerSearchCondition | KustomerSearchQuery>;
}

export interface KustomerSearchCondition {
    [field: string]: string | number | boolean | { [operator: string]: unknown };
}

/**
 * Kustomer error response
 */
export interface KustomerErrorResponse {
    errors?: Array<{
        status?: number;
        source?: { pointer?: string };
        title?: string;
        detail?: string;
        code?: string;
    }>;
}

/**
 * Conversation status name mapping
 */
export const KUSTOMER_STATUS_NAMES: Record<KustomerConversationStatus, string> = {
    open: "Open",
    snoozed: "Snoozed",
    done: "Done"
};

/**
 * Priority name mapping (1-5)
 */
export const KUSTOMER_PRIORITY_NAMES: Record<number, string> = {
    1: "Low",
    2: "Normal",
    3: "Medium",
    4: "High",
    5: "Critical"
};
