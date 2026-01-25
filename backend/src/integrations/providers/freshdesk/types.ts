/**
 * Freshdesk Integration Types
 */

import type { ApiKeyData } from "../../../storage/models/Connection";

/**
 * Freshdesk connection data - stored in connections table
 * Subdomain is stored in connection.metadata.subdomain
 */
export type FreshdeskConnectionData = ApiKeyData;

/**
 * Freshdesk Ticket object
 */
export interface FreshdeskTicket {
    id: number;
    subject: string;
    description: string;
    description_text?: string;
    status: FreshdeskTicketStatus;
    priority: FreshdeskTicketPriority;
    source: FreshdeskTicketSource;
    type?: string;
    requester_id: number;
    responder_id?: number;
    company_id?: number;
    group_id?: number;
    product_id?: number;
    email_config_id?: number;
    fr_due_by?: string;
    fr_escalated?: boolean;
    due_by?: string;
    is_escalated?: boolean;
    tags?: string[];
    cc_emails?: string[];
    fwd_emails?: string[];
    reply_cc_emails?: string[];
    ticket_cc_emails?: string[];
    spam?: boolean;
    created_at: string;
    updated_at: string;
    attachments?: FreshdeskAttachment[];
    custom_fields?: Record<string, unknown>;
    requester?: FreshdeskRequester;
    stats?: FreshdeskTicketStats;
}

/**
 * Freshdesk Ticket Status (2-5)
 */
export type FreshdeskTicketStatus = 2 | 3 | 4 | 5;

/**
 * Freshdesk Ticket Priority (1-4)
 */
export type FreshdeskTicketPriority = 1 | 2 | 3 | 4;

/**
 * Freshdesk Ticket Source
 */
export type FreshdeskTicketSource = 1 | 2 | 3 | 7 | 8 | 9 | 10;

/**
 * Freshdesk Attachment object
 */
export interface FreshdeskAttachment {
    id: number;
    content_type: string;
    size: number;
    name: string;
    attachment_url: string;
    created_at: string;
    updated_at: string;
}

/**
 * Freshdesk Requester (embedded in ticket)
 */
export interface FreshdeskRequester {
    id: number;
    name: string;
    email: string;
    mobile?: string;
    phone?: string;
}

/**
 * Freshdesk Ticket Stats
 */
export interface FreshdeskTicketStats {
    agent_responded_at?: string;
    requester_responded_at?: string;
    first_responded_at?: string;
    status_updated_at?: string;
    reopened_at?: string;
    resolved_at?: string;
    closed_at?: string;
    pending_since?: string;
}

/**
 * Freshdesk Contact object
 */
export interface FreshdeskContact {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    mobile?: string;
    twitter_id?: string;
    unique_external_id?: string;
    other_emails?: string[];
    company_id?: number;
    view_all_tickets?: boolean;
    other_companies?: Array<{
        company_id: number;
        view_all_tickets: boolean;
    }>;
    address?: string;
    avatar?: FreshdeskAvatar;
    language?: string;
    time_zone?: string;
    description?: string;
    job_title?: string;
    tags?: string[];
    active?: boolean;
    deleted?: boolean;
    created_at: string;
    updated_at: string;
    custom_fields?: Record<string, unknown>;
}

/**
 * Freshdesk Avatar object
 */
export interface FreshdeskAvatar {
    id: number;
    content_type: string;
    size: number;
    name: string;
    avatar_url: string;
    created_at: string;
    updated_at: string;
}

/**
 * Freshdesk Company object
 */
export interface FreshdeskCompany {
    id: number;
    name: string;
    description?: string;
    domains?: string[];
    note?: string;
    health_score?: string;
    account_tier?: string;
    renewal_date?: string;
    industry?: string;
    created_at: string;
    updated_at: string;
    custom_fields?: Record<string, unknown>;
}

/**
 * Freshdesk Agent object
 */
export interface FreshdeskAgent {
    id: number;
    available?: boolean;
    occasional?: boolean;
    signature?: string;
    ticket_scope: number;
    skill_ids?: number[];
    group_ids?: number[];
    role_ids?: number[];
    type: "support_agent" | "field_agent" | "collaborator";
    available_since?: string;
    created_at: string;
    updated_at: string;
    last_active_at?: string;
    contact: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        mobile?: string;
        active: boolean;
        job_title?: string;
    };
}

/**
 * Freshdesk Conversation (reply/note)
 */
export interface FreshdeskConversation {
    id: number;
    body: string;
    body_text?: string;
    incoming: boolean;
    private: boolean;
    user_id: number;
    support_email?: string;
    source: number;
    category?: number;
    ticket_id: number;
    to_emails?: string[];
    from_email?: string;
    cc_emails?: string[];
    bcc_emails?: string[];
    created_at: string;
    updated_at: string;
    attachments?: FreshdeskAttachment[];
}

/**
 * Freshdesk paginated list response
 */
export interface FreshdeskListResponse<T> {
    results?: T[];
    total?: number;
}

/**
 * Freshdesk search results response
 */
export interface FreshdeskSearchResponse<T> {
    results: T[];
    total: number;
}

/**
 * Freshdesk error response
 */
export interface FreshdeskErrorResponse {
    description?: string;
    errors?: Array<{
        field?: string;
        message: string;
        code: string;
    }>;
}

/**
 * Status name mapping
 */
export const FRESHDESK_STATUS_NAMES: Record<FreshdeskTicketStatus, string> = {
    2: "Open",
    3: "Pending",
    4: "Resolved",
    5: "Closed"
};

/**
 * Priority name mapping
 */
export const FRESHDESK_PRIORITY_NAMES: Record<FreshdeskTicketPriority, string> = {
    1: "Low",
    2: "Medium",
    3: "High",
    4: "Urgent"
};

/**
 * Source name mapping
 */
export const FRESHDESK_SOURCE_NAMES: Record<FreshdeskTicketSource, string> = {
    1: "Email",
    2: "Portal",
    3: "Phone",
    7: "Chat",
    8: "Mobihelp",
    9: "Feedback Widget",
    10: "Outbound Email"
};
