/**
 * Help Scout API response types
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface HelpScoutPage {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
}

export interface HelpScoutLinks {
    self?: { href: string };
    next?: { href: string };
    previous?: { href: string };
    first?: { href: string };
    last?: { href: string };
}

// ============================================================================
// CONVERSATIONS
// ============================================================================

export interface HelpScoutConversation {
    id: number;
    number: number;
    threads?: number;
    type: "email" | "phone" | "chat";
    folderId?: number;
    status: "active" | "pending" | "closed" | "spam";
    state: "draft" | "published" | "deleted";
    subject: string;
    preview?: string;
    mailboxId: number;
    assignee?: {
        id: number;
        first: string;
        last: string;
        email: string;
    };
    createdBy?: {
        id: number;
        type: "customer" | "user";
        email?: string;
    };
    primaryCustomer?: {
        id: number;
        first?: string;
        last?: string;
        email?: string;
    };
    tags?: Array<{ id: number; tag: string; color?: string }>;
    createdAt: string;
    closedAt?: string;
    closedBy?: number;
    userUpdatedAt?: string;
    customerWaitingSince?: { time: string; friendly: string };
    _embedded?: {
        threads?: HelpScoutThread[];
    };
    _links?: HelpScoutLinks;
}

export interface HelpScoutThread {
    id: number;
    type: "customer" | "note" | "reply" | "lineitem" | "phone" | "chat";
    status: "active" | "closed" | "nochange" | "pending" | "spam";
    state: "draft" | "published" | "underReview";
    body: string;
    source?: {
        type: string;
        via: string;
    };
    customer?: {
        id: number;
        first?: string;
        last?: string;
        email?: string;
    };
    createdBy?: {
        id: number;
        type: "customer" | "user";
        email?: string;
    };
    assignedTo?: {
        id: number;
        first: string;
        last: string;
        email: string;
    };
    createdAt: string;
}

export interface HelpScoutConversationsResponse {
    _embedded: {
        conversations: HelpScoutConversation[];
    };
    page: HelpScoutPage;
    _links: HelpScoutLinks;
}

export interface HelpScoutConversationResponse {
    id: number;
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export interface HelpScoutCustomer {
    id: number;
    firstName?: string;
    lastName?: string;
    gender?: string;
    jobTitle?: string;
    location?: string;
    organization?: string;
    photoType?: string;
    photoUrl?: string;
    createdAt: string;
    updatedAt: string;
    background?: string;
    age?: string;
    _embedded?: {
        emails?: Array<{ id: number; value: string; type: string }>;
        phones?: Array<{ id: number; value: string; type: string }>;
        social_profiles?: Array<{ id: number; value: string; type: string }>;
        websites?: Array<{ id: number; value: string }>;
    };
    _links?: HelpScoutLinks;
}

export interface HelpScoutCustomersResponse {
    _embedded: {
        customers: HelpScoutCustomer[];
    };
    page: HelpScoutPage;
    _links: HelpScoutLinks;
}

// ============================================================================
// MAILBOXES
// ============================================================================

export interface HelpScoutMailbox {
    id: number;
    name: string;
    slug: string;
    email: string;
    createdAt: string;
    updatedAt: string;
    _links?: HelpScoutLinks;
}

export interface HelpScoutMailboxesResponse {
    _embedded: {
        mailboxes: HelpScoutMailbox[];
    };
    page: HelpScoutPage;
    _links: HelpScoutLinks;
}

// ============================================================================
// USERS
// ============================================================================

export interface HelpScoutUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: "owner" | "admin" | "user";
    timezone: string;
    createdAt: string;
    updatedAt: string;
    type: "team" | "user";
    _links?: HelpScoutLinks;
}

export interface HelpScoutUsersResponse {
    _embedded: {
        users: HelpScoutUser[];
    };
    page: HelpScoutPage;
    _links: HelpScoutLinks;
}

// ============================================================================
// ERRORS
// ============================================================================

export interface HelpScoutError {
    status?: number;
    error?: string;
    message?: string;
    path?: string;
    logRef?: string;
    _embedded?: {
        errors?: Array<{
            path: string;
            message: string;
            rejectedValue?: string;
        }>;
    };
}
