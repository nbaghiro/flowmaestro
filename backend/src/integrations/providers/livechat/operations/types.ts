/**
 * LiveChat API response types
 *
 * LiveChat uses a JSON-RPC style API (Agent Chat API) where requests are
 * POST with an action field, and a REST-style Configuration API.
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface LiveChatUser {
    id: string;
    type: "agent" | "customer";
    name?: string;
    email?: string;
    avatar?: string;
    present?: boolean;
}

export interface LiveChatEvent {
    id: string;
    created_at: string;
    type: "message" | "system_message" | "file" | "rich_message" | "custom" | "filled_form";
    text?: string;
    author_id?: string;
    properties?: Record<string, Record<string, unknown>>;
}

// ============================================================================
// CHATS
// ============================================================================

export interface LiveChatChat {
    id: string;
    snippet?: {
        first_event_created_at?: string;
        last_event_created_at?: string;
        last_event_text?: string;
        last_event_type?: string;
    };
    users?: LiveChatUser[];
    thread?: LiveChatThread;
    threads_summary?: Array<{
        id: string;
        created_at: string;
        active: boolean;
        tags?: string[];
    }>;
    properties?: Record<string, Record<string, unknown>>;
    access?: {
        group_ids?: number[];
    };
}

export interface LiveChatThread {
    id: string;
    active: boolean;
    created_at: string;
    user_ids?: string[];
    events?: LiveChatEvent[];
    tags?: string[];
    properties?: Record<string, Record<string, unknown>>;
    access?: {
        group_ids?: number[];
    };
    queue?: {
        position: number;
        wait_time: number;
    };
}

export interface LiveChatChatsResponse {
    chats_summary: Array<{
        id: string;
        last_thread_summary: {
            id: string;
            created_at: string;
            active: boolean;
            tags?: string[];
        };
        users: LiveChatUser[];
        properties?: Record<string, Record<string, unknown>>;
    }>;
    found_chats: number;
    next_page_id?: string;
    previous_page_id?: string;
}

export interface LiveChatArchivesResponse {
    chats: Array<{
        id: string;
        thread: LiveChatThread;
        users: LiveChatUser[];
        properties?: Record<string, Record<string, unknown>>;
    }>;
    found_chats: number;
    next_page_id?: string;
    previous_page_id?: string;
}

export interface LiveChatChatResponse {
    id: string;
    thread: LiveChatThread;
    users: LiveChatUser[];
    properties?: Record<string, Record<string, unknown>>;
}

export interface LiveChatStartChatResponse {
    chat_id: string;
    thread_id: string;
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export interface LiveChatCustomer {
    id: string;
    type: "customer";
    name?: string;
    email?: string;
    avatar?: string;
    session_fields?: Array<{ key: string; value: string }>;
    last_visit?: {
        started_at?: string;
        ended_at?: string;
        last_pages?: Array<{
            url: string;
            title: string;
            opened_at: string;
        }>;
    };
    statistics?: {
        chats_count?: number;
        threads_count?: number;
        visits_count?: number;
    };
    created_at?: string;
}

// ============================================================================
// AGENTS (Configuration API)
// ============================================================================

export interface LiveChatAgent {
    id: string;
    name: string;
    login: string;
    role: "owner" | "administrator" | "viceowner" | "agent";
    avatar?: string;
    max_chats_count?: number;
    groups?: Array<{
        id: number;
        priority: "first" | "normal" | "last" | "supervisor";
    }>;
    notifications?: string[];
    work_scheduler?: Record<string, unknown>;
}

export interface LiveChatAgentsResponse {
    agents: LiveChatAgent[];
}

// ============================================================================
// ERRORS
// ============================================================================

export interface LiveChatError {
    error?: {
        type: string;
        message: string;
        data?: Record<string, unknown>;
    };
}
