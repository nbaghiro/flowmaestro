/**
 * Gorgias Integration Types
 *
 * Gorgias is an e-commerce helpdesk platform that centralizes customer support
 * across email, live chat, social media, and phone.
 */

import type { OAuth2TokenData } from "../../../storage/models/Connection";

/**
 * Gorgias connection data extends OAuth2 with subdomain
 */
export interface GorgiasConnectionData extends OAuth2TokenData {
    subdomain: string;
}

/**
 * Gorgias ticket status values
 */
export type GorgiasTicketStatus = "open" | "closed";

/**
 * Gorgias ticket priority values
 */
export type GorgiasTicketPriority = "low" | "normal" | "high" | "urgent";

/**
 * Gorgias channel types
 */
export type GorgiasChannel =
    | "email"
    | "chat"
    | "facebook"
    | "facebook-messenger"
    | "instagram"
    | "instagram-mention"
    | "instagram-ad-comment"
    | "phone"
    | "api"
    | "twitter"
    | "twitter-dm"
    | "internal-note"
    | "air-call"
    | "yotpo";

/**
 * Gorgias user reference
 */
export interface GorgiasUserRef {
    id: number;
    email: string;
    name?: string;
}

/**
 * Gorgias team reference
 */
export interface GorgiasTeamRef {
    id: number;
    name: string;
}

/**
 * Gorgias tag
 */
export interface GorgiasTag {
    id: number;
    name: string;
    uri?: string;
}

/**
 * Gorgias attachment
 */
export interface GorgiasAttachment {
    url: string;
    name: string;
    size: number;
    content_type: string;
}

/**
 * Gorgias ticket object
 */
export interface GorgiasTicket {
    id: number;
    uri: string;
    external_id?: string;
    language?: string;
    status: GorgiasTicketStatus;
    priority: GorgiasTicketPriority;
    channel: GorgiasChannel;
    via?: string;
    from_agent: boolean;
    customer: GorgiasCustomerRef;
    assignee_user?: GorgiasUserRef | null;
    assignee_team?: GorgiasTeamRef | null;
    subject?: string;
    tags: GorgiasTag[];
    messages_count: number;
    created_datetime: string;
    updated_datetime: string;
    opened_datetime?: string;
    closed_datetime?: string;
    last_received_message_datetime?: string;
    last_message_datetime?: string;
    snooze_datetime?: string;
    messages?: GorgiasMessage[];
    spam?: boolean;
    is_unread?: boolean;
}

/**
 * Gorgias customer reference (minimal customer data in ticket)
 */
export interface GorgiasCustomerRef {
    id: number;
    email?: string;
    name?: string;
}

/**
 * Gorgias customer channel
 */
export interface GorgiasCustomerChannel {
    type: string;
    address: string;
    id?: number;
    is_preferred?: boolean;
    created_datetime?: string;
    updated_datetime?: string;
}

/**
 * Gorgias customer object
 */
export interface GorgiasCustomer {
    id: number;
    uri?: string;
    email?: string;
    name?: string;
    firstname?: string;
    lastname?: string;
    language?: string;
    timezone?: string;
    external_id?: string;
    note?: string;
    data?: Record<string, unknown>;
    channels: GorgiasCustomerChannel[];
    created_datetime: string;
    updated_datetime: string;
    active?: boolean;
}

/**
 * Gorgias message sender/receiver
 */
export interface GorgiasMessageParticipant {
    id?: number;
    email?: string;
    name?: string;
}

/**
 * Gorgias message object
 */
export interface GorgiasMessage {
    id: number;
    uri: string;
    message_id?: string;
    ticket_id: number;
    channel: GorgiasChannel;
    via?: string;
    source?: {
        type?: string;
        from?: Record<string, unknown>;
        to?: Record<string, unknown>;
    };
    from_agent: boolean;
    sender: GorgiasMessageParticipant;
    receiver?: GorgiasMessageParticipant;
    subject?: string;
    body_text?: string;
    body_html?: string;
    stripped_text?: string;
    stripped_html?: string;
    public?: boolean;
    attachments: GorgiasAttachment[];
    actions?: Array<Record<string, unknown>>;
    macros?: Array<Record<string, unknown>>;
    meta?: Record<string, unknown>;
    created_datetime: string;
    sent_datetime?: string;
    failed_datetime?: string;
    opened_datetime?: string;
    integration_id?: number;
    intents?: Array<{ name: string; confidence: number }>;
    rule_id?: number;
}

/**
 * Gorgias pagination info
 */
export interface GorgiasPagination {
    next_cursor?: string | null;
    prev_cursor?: string | null;
}

/**
 * Gorgias API list response
 */
export interface GorgiasListResponse<T> {
    data: T[];
    meta?: {
        next_cursor?: string | null;
        prev_cursor?: string | null;
    };
}

/**
 * Gorgias error response
 */
export interface GorgiasErrorResponse {
    message?: string;
    errors?: Array<{
        field?: string;
        message?: string;
    }>;
}

/**
 * Status name mapping
 */
export const GORGIAS_STATUS_NAMES: Record<GorgiasTicketStatus, string> = {
    open: "Open",
    closed: "Closed"
};

/**
 * Priority name mapping
 */
export const GORGIAS_PRIORITY_NAMES: Record<GorgiasTicketPriority, string> = {
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent"
};

/**
 * Channel name mapping
 */
export const GORGIAS_CHANNEL_NAMES: Record<string, string> = {
    email: "Email",
    chat: "Chat",
    facebook: "Facebook",
    "facebook-messenger": "Facebook Messenger",
    instagram: "Instagram",
    "instagram-mention": "Instagram Mention",
    "instagram-ad-comment": "Instagram Ad Comment",
    phone: "Phone",
    api: "API",
    twitter: "Twitter",
    "twitter-dm": "Twitter DM",
    "internal-note": "Internal Note",
    "air-call": "Aircall",
    yotpo: "Yotpo"
};
