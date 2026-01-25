/**
 * Sentry Operation Types
 *
 * Type definitions used across Sentry operations
 */

export interface SentryOrganizationOutput {
    id: string;
    slug: string;
    name: string;
    dateCreated: string;
    status?: string;
}

export interface SentryProjectOutput {
    id: string;
    slug: string;
    name: string;
    platform?: string;
    dateCreated: string;
    organization?: {
        id: string;
        slug: string;
        name: string;
    };
}

export interface SentryIssueOutput {
    id: string;
    shortId: string;
    title: string;
    culprit?: string;
    level?: string;
    status?: string;
    platform?: string;
    project?: {
        id: string;
        name: string;
        slug: string;
    };
    count: number;
    userCount?: number;
    firstSeen?: string;
    lastSeen?: string;
    isBookmarked?: boolean;
    isSubscribed?: boolean;
    hasSeen?: boolean;
    assignedTo?: string;
}

export interface SentryEventOutput {
    id: string;
    eventId: string;
    dateCreated: string;
    message?: string;
    title?: string;
    platform?: string;
    user?: {
        id?: string;
        email?: string;
        username?: string;
        ipAddress?: string;
    };
    tags?: Array<{ key: string; value: string }>;
}

export interface SentryReleaseOutput {
    version: string;
    shortVersion?: string;
    ref?: string;
    url?: string;
    dateCreated?: string;
    dateReleased?: string;
    projects?: Array<{
        id: string;
        slug: string;
        name: string;
    }>;
}

export interface SentryAlertRuleOutput {
    id: string;
    name: string;
    dateCreated?: string;
    status?: string;
    environment?: string;
    frequency?: number;
}
