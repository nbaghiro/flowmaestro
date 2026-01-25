/**
 * Intercom Integration Types
 */

import type { OAuth2TokenData } from "../../../storage/models/Connection";

/**
 * Intercom connection data - stored in connections table
 * Intercom tokens don't expire by default (valid until revoked)
 */
export type IntercomConnectionData = OAuth2TokenData;

/**
 * Intercom Contact object
 */
export interface IntercomContact {
    type: "contact";
    id: string;
    workspace_id: string;
    external_id?: string;
    role: "user" | "lead";
    email?: string;
    phone?: string;
    name?: string;
    avatar?: string;
    owner_id?: number;
    social_profiles?: {
        type: "list";
        data: Array<{
            type: string;
            name: string;
            url: string;
        }>;
    };
    has_hard_bounced?: boolean;
    marked_email_as_spam?: boolean;
    unsubscribed_from_emails?: boolean;
    created_at?: number;
    updated_at?: number;
    signed_up_at?: number;
    last_seen_at?: number;
    last_replied_at?: number;
    last_contacted_at?: number;
    last_email_opened_at?: number;
    last_email_clicked_at?: number;
    language_override?: string;
    browser?: string;
    browser_version?: string;
    browser_language?: string;
    os?: string;
    location?: {
        type: "location";
        country?: string;
        region?: string;
        city?: string;
    };
    android_app_name?: string;
    android_app_version?: string;
    android_device?: string;
    android_os_version?: string;
    android_sdk_version?: string;
    android_last_seen_at?: number;
    ios_app_name?: string;
    ios_app_version?: string;
    ios_device?: string;
    ios_os_version?: string;
    ios_sdk_version?: string;
    ios_last_seen_at?: number;
    custom_attributes?: Record<string, unknown>;
    tags?: {
        type: "list";
        data: Array<{
            type: "tag";
            id: string;
            name?: string;
        }>;
    };
    notes?: {
        type: "list";
        data: Array<{
            type: "note";
            id: string;
        }>;
    };
    companies?: {
        type: "list";
        data: Array<{
            type: "company";
            id: string;
        }>;
    };
}

/**
 * Intercom Conversation object
 */
export interface IntercomConversation {
    type: "conversation";
    id: string;
    created_at: number;
    updated_at: number;
    waiting_since?: number;
    snoozed_until?: number;
    source: {
        type: string;
        id: string;
        delivered_as: string;
        subject?: string;
        body: string;
        author: {
            type: string;
            id: string;
            name?: string;
            email?: string;
        };
        attachments?: Array<{
            type: string;
            name: string;
            url: string;
            content_type: string;
            filesize: number;
            width?: number;
            height?: number;
        }>;
        url?: string;
        redacted?: boolean;
    };
    contacts?: {
        type: "contact.list";
        contacts: Array<{
            type: "contact";
            id: string;
        }>;
    };
    first_contact_reply?: {
        created_at: number;
        type: string;
        url?: string;
    };
    admin_assignee_id?: number;
    team_assignee_id?: string;
    open: boolean;
    state: "open" | "closed" | "snoozed";
    read: boolean;
    tags?: {
        type: "tag.list";
        tags: Array<{
            type: "tag";
            id: string;
            name: string;
        }>;
    };
    priority: "priority" | "not_priority";
    sla_applied?: {
        type: "conversation_sla_summary";
        sla_name: string;
        sla_status: string;
    };
    statistics?: {
        type: "conversation_statistics";
        time_to_assignment?: number;
        time_to_admin_reply?: number;
        time_to_first_close?: number;
        time_to_last_close?: number;
        median_time_to_reply?: number;
        first_contact_reply_at?: number;
        first_assignment_at?: number;
        first_admin_reply_at?: number;
        first_close_at?: number;
        last_assignment_at?: number;
        last_admin_reply_at?: number;
        last_close_at?: number;
        last_contact_reply_at?: number;
        count_reopens?: number;
        count_assignments?: number;
        count_conversation_parts?: number;
    };
    conversation_parts?: {
        type: "conversation_part.list";
        conversation_parts: IntercomConversationPart[];
        total_count: number;
    };
}

/**
 * Intercom Conversation Part object
 */
export interface IntercomConversationPart {
    type: "conversation_part";
    id: string;
    part_type: string;
    body?: string;
    created_at: number;
    updated_at: number;
    notified_at: number;
    assigned_to?: {
        type: string;
        id: string;
    };
    author: {
        type: string;
        id: string;
        name?: string;
        email?: string;
    };
    attachments?: Array<{
        type: string;
        name: string;
        url: string;
        content_type: string;
        filesize: number;
        width?: number;
        height?: number;
    }>;
    external_id?: string;
    redacted?: boolean;
}

/**
 * Intercom Company object
 */
export interface IntercomCompany {
    type: "company";
    id: string;
    company_id: string;
    name?: string;
    created_at?: number;
    updated_at?: number;
    last_request_at?: number;
    monthly_spend?: number;
    session_count?: number;
    user_count?: number;
    size?: number;
    website?: string;
    industry?: string;
    plan?: {
        type: string;
        id: string;
        name: string;
    };
    custom_attributes?: Record<string, unknown>;
    tags?: {
        type: "list";
        data: Array<{
            type: "tag";
            id: string;
            name?: string;
        }>;
    };
    segments?: {
        type: "list";
        data: Array<{
            type: "segment";
            id: string;
        }>;
    };
}

/**
 * Intercom Tag object
 */
export interface IntercomTag {
    type: "tag";
    id: string;
    name: string;
    applied_at?: number;
    applied_by?: {
        type: string;
        id: string;
    };
}

/**
 * Intercom Note object
 */
export interface IntercomNote {
    type: "note";
    id: string;
    created_at: number;
    contact?: {
        type: "contact";
        id: string;
    };
    author?: {
        type: string;
        id: string;
        name?: string;
        email?: string;
    };
    body: string;
}

/**
 * Intercom paginated list response
 */
export interface IntercomListResponse<T> {
    type: "list";
    data: T[];
    total_count?: number;
    pages?: {
        type: "pages";
        page?: number;
        per_page?: number;
        total_pages?: number;
        next?: {
            page?: number;
            starting_after?: string;
        };
    };
}

/**
 * Intercom search response
 */
export interface IntercomSearchResponse<T> {
    type: "list";
    data: T[];
    total_count: number;
    pages?: {
        type: "pages";
        page?: number;
        per_page?: number;
        total_pages?: number;
        next?: {
            page?: number;
            starting_after?: string;
        };
    };
}

/**
 * Intercom error response
 */
export interface IntercomErrorResponse {
    type: "error.list";
    request_id: string;
    errors: Array<{
        code: string;
        message: string;
        field?: string;
    }>;
}
