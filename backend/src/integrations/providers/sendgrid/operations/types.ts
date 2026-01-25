/**
 * SendGrid Operation Types
 *
 * Type definitions used across SendGrid operations
 */

export interface SendGridContactOutput {
    id?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    alternateEmails?: string[];
    address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
    };
    phone?: string;
    customFields?: Record<string, string>;
    createdAt?: string;
    updatedAt?: string;
}

export interface SendGridListOutput {
    id: string;
    name: string;
    contactCount: number;
}

export interface SendGridTemplateOutput {
    id: string;
    name: string;
    generation: string;
    updatedAt?: string;
    versions?: Array<{
        id: string;
        name: string;
        active: boolean;
        updatedAt?: string;
    }>;
}

export interface SendGridStatsOutput {
    date: string;
    requests: number;
    delivered: number;
    opens: number;
    uniqueOpens: number;
    clicks: number;
    uniqueClicks: number;
    bounces: number;
    spamReports: number;
    unsubscribes: number;
    blocked: number;
    deferred: number;
}

export interface SendGridValidationOutput {
    email: string;
    verdict: string;
    score: number;
    local: string;
    host: string;
    suggestion?: string;
    hasValidSyntax: boolean;
    hasMxRecord: boolean;
    isDisposable: boolean;
    isRoleAddress: boolean;
    hasKnownBounces: boolean;
}
