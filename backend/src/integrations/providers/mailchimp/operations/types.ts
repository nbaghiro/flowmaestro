/**
 * Mailchimp Operation Types
 *
 * Type definitions used across Mailchimp operations
 */

export interface MailchimpListOutput {
    id: string;
    name: string;
    memberCount: number;
    unsubscribeCount: number;
    cleanedCount: number;
    campaignCount: number;
    dateCreated: string;
    visibility: string;
    doubleOptin: boolean;
}

export interface MailchimpMemberOutput {
    id: string;
    email: string;
    status: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    mergeFields?: Record<string, unknown>;
    language?: string;
    vip: boolean;
    memberRating?: number;
    lastChanged?: string;
    source?: string;
    tagsCount?: number;
    tags?: Array<{ id: number; name: string }>;
}

export interface MailchimpTagOutput {
    id: number;
    name: string;
    memberCount?: number;
}

export interface MailchimpSegmentOutput {
    id: number;
    name: string;
    memberCount: number;
    type: string;
    createdAt: string;
    updatedAt: string;
}

export interface MailchimpCampaignOutput {
    id: string;
    type: string;
    status: string;
    createTime: string;
    sendTime?: string;
    emailsSent?: number;
    subjectLine?: string;
    title?: string;
    fromName?: string;
    replyTo?: string;
    listId?: string;
    listName?: string;
    recipientCount?: number;
    openRate?: number;
    clickRate?: number;
}

export interface MailchimpTemplateOutput {
    id: number;
    name: string;
    type: string;
    category?: string;
    active: boolean;
    dragAndDrop: boolean;
    responsive: boolean;
    dateCreated: string;
    dateEdited?: string;
}
