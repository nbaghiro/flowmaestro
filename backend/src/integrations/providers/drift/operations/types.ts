/**
 * Drift API response types
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface DriftPagination {
    more: boolean;
    next?: string;
}

// ============================================================================
// CONTACTS
// ============================================================================

export interface DriftContact {
    id: number;
    createdAt: number;
    attributes: {
        email?: string;
        name?: string;
        phone?: string;
        company?: string;
        title?: string;
        start_date?: string;
        socialProfiles?: Record<string, string>;
        tags?: string[];
        [key: string]: unknown;
    };
}

export interface DriftContactsResponse {
    data: DriftContact[];
    pagination?: DriftPagination;
}

export interface DriftContactResponse {
    data: DriftContact;
}

// ============================================================================
// CONVERSATIONS
// ============================================================================

export interface DriftConversation {
    id: number;
    createdAt: number;
    updatedAt?: number;
    status: "open" | "closed" | "pending" | "bulk_sent";
    contactId?: number;
    inboxId?: number;
    conversationType?: string;
    relatedPlaybookId?: number;
}

export interface DriftConversationsResponse {
    data: DriftConversation[];
    pagination?: DriftPagination;
}

export interface DriftConversationResponse {
    data: DriftConversation;
}

// ============================================================================
// MESSAGES
// ============================================================================

export interface DriftMessage {
    id: string;
    conversationId: number;
    body: string;
    type: "chat" | "private_note" | "edit";
    createdAt: number;
    author: {
        id: number;
        type: "contact" | "user" | "bot";
        bot?: boolean;
    };
    buttons?: Array<{
        label: string;
        value: string;
        type: string;
        style: string;
        reaction?: {
            type: string;
            message: string;
        };
    }>;
}

export interface DriftMessagesResponse {
    data: {
        messages: DriftMessage[];
    };
    pagination?: DriftPagination;
}

// ============================================================================
// USERS
// ============================================================================

export interface DriftUser {
    id: number;
    orgId: number;
    name?: string;
    email?: string;
    alias?: string;
    role?: string;
    availability?: "ONLINE" | "OFFLINE" | "AWAY";
    createdAt: number;
    updatedAt?: number;
    bot?: boolean;
    avatarUrl?: string;
    phone?: string;
    locale?: string;
    verified?: boolean;
}

export interface DriftUsersResponse {
    data: DriftUser[];
}

export interface DriftUserResponse {
    data: DriftUser;
}

// ============================================================================
// ACCOUNTS
// ============================================================================

export interface DriftAccount {
    accountId: string;
    ownerId?: number;
    name?: string;
    domain?: string;
    targeted?: boolean;
    customProperties?: Array<{
        label: string;
        name: string;
        value: unknown;
        type: string;
    }>;
    createDateTime?: number;
    updateDateTime?: number;
}

export interface DriftAccountsResponse {
    data: {
        accounts: DriftAccount[];
    };
    pagination?: DriftPagination;
}

export interface DriftAccountResponse {
    data: DriftAccount;
}

// ============================================================================
// ERRORS
// ============================================================================

export interface DriftError {
    error?: {
        type: string;
        message: string;
        statusCode?: number;
    };
}
