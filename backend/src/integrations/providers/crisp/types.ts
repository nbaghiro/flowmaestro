/**
 * Crisp Integration Types
 *
 * Based on Crisp REST API v1:
 * https://docs.crisp.chat/references/rest-api/v1/
 */

import type { ApiKeyData } from "../../../storage/models/Connection";

/**
 * Crisp connection data - stored in connections table
 * Website ID is stored in connection.metadata.website_id
 */
export type CrispConnectionData = ApiKeyData;

/**
 * Crisp connection metadata
 */
export interface CrispConnectionMetadata {
    website_id: string;
}

/**
 * Crisp conversation state
 */
export type CrispConversationState = "pending" | "unresolved" | "resolved";

/**
 * Crisp availability status
 */
export type CrispAvailability = "online" | "away" | "offline";

/**
 * Crisp message type
 */
export type CrispMessageType =
    | "text"
    | "file"
    | "animation"
    | "audio"
    | "picker"
    | "field"
    | "note";

/**
 * Crisp message origin
 */
export type CrispMessageOrigin = "chat" | "email" | "urn";

/**
 * Crisp message sender
 */
export type CrispMessageFrom = "user" | "operator";

/**
 * Crisp operator type
 */
export type CrispOperatorType = "owner" | "admin" | "member";

/**
 * Crisp conversation meta
 */
export interface CrispConversationMeta {
    nickname?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    ip?: string;
    data?: Record<string, unknown>;
    segments?: string[];
}

/**
 * Crisp conversation active status
 */
export interface CrispConversationActive {
    now: boolean;
    last: string;
}

/**
 * Crisp conversation assigned operator
 */
export interface CrispConversationAssigned {
    user_id: string;
}

/**
 * Crisp Conversation object
 */
export interface CrispConversation {
    session_id: string;
    website_id: string;
    people_id?: string;
    state: CrispConversationState;
    is_verified: boolean;
    is_blocked: boolean;
    availability: CrispAvailability;
    active: CrispConversationActive;
    last_message?: string;
    mentions?: string[];
    unread?: {
        operator: number;
        visitor: number;
    };
    assigned?: CrispConversationAssigned;
    meta: CrispConversationMeta;
    created_at: number;
    updated_at: number;
}

/**
 * Crisp Message object
 */
export interface CrispMessage {
    fingerprint: number;
    session_id: string;
    website_id: string;
    type: CrispMessageType;
    from: CrispMessageFrom;
    origin: CrispMessageOrigin;
    content: string | Record<string, unknown>;
    stamped: boolean;
    timestamp: number;
    user?: {
        user_id: string;
        nickname: string;
    };
    read?: string;
    preview?: unknown[];
    delivered?: string;
    edited?: boolean;
    translated?: boolean;
    mentions?: string[];
}

/**
 * Crisp Person/People profile object
 */
export interface CrispPerson {
    people_id: string;
    email?: string;
    phone?: string;
    avatar?: string;
    nickname?: string;
    gender?: string;
    address?: string;
    company?: {
        name?: string;
        url?: string;
        domain?: string;
        legal_name?: string;
        employees?: {
            min?: number;
            max?: number;
        };
        industry?: string;
        geolocation?: {
            country?: string;
            city?: string;
            region?: string;
        };
    };
    employment?: {
        title?: string;
        role?: string;
        seniority?: string;
    };
    geolocation?: {
        country?: string;
        city?: string;
        region?: string;
        timezone?: string;
        coordinates?: {
            latitude?: number;
            longitude?: number;
        };
    };
    locales?: string[];
    active?: number;
    segments?: string[];
    notepad?: string;
    created_at?: number;
    updated_at?: number;
}

/**
 * Crisp Operator object
 */
export interface CrispOperator {
    user_id: string;
    type: CrispOperatorType;
    role?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
    availability?: CrispAvailability;
    timestamp?: number;
}

/**
 * Crisp API response wrapper
 */
export interface CrispApiResponse<T> {
    error: boolean;
    reason: string;
    data: T;
}

/**
 * Crisp paginated list response
 */
export interface CrispListResponse<T> {
    data: T[];
}

/**
 * Crisp error response
 */
export interface CrispErrorResponse {
    error: true;
    reason: string;
    data?: Record<string, unknown>;
}

/**
 * Crisp conversation state values
 */
export const CRISP_CONVERSATION_STATES: Record<CrispConversationState, string> = {
    pending: "Pending",
    unresolved: "Unresolved",
    resolved: "Resolved"
};

/**
 * Crisp availability values
 */
export const CRISP_AVAILABILITY_STATES: Record<CrispAvailability, string> = {
    online: "Online",
    away: "Away",
    offline: "Offline"
};
