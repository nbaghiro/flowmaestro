/**
 * Postmark Operations Type Definitions
 */

export interface PostmarkEmailResult {
    messageId: string;
    to: string;
    submittedAt: string;
}

export interface PostmarkBatchEmailResult {
    messageId?: string;
    to?: string;
    submittedAt?: string;
    errorCode: number;
    message: string;
}

export interface PostmarkTemplateInfo {
    templateId: number;
    name: string;
    alias: string | null;
    subject: string;
    active: boolean;
    templateType: "Standard" | "Layout";
    layoutTemplate: string | null;
}

export interface PostmarkTemplateDetail extends PostmarkTemplateInfo {
    htmlBody: string | null;
    textBody: string | null;
}

export interface PostmarkBounceInfo {
    id: number;
    type: string;
    typeCode: number;
    name: string;
    tag: string | null;
    messageId: string;
    email: string;
    from: string;
    bouncedAt: string;
    description: string;
    details: string;
    inactive: boolean;
    canActivate: boolean;
    subject: string;
    messageStream: string;
}

export interface PostmarkBounceSummary {
    name: string;
    count: number;
    type?: string;
}

export interface PostmarkDeliveryStatsResult {
    inactiveMails: number;
    bounces: PostmarkBounceSummary[];
}
