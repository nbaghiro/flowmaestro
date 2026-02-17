/**
 * HubSpot Marketing Output Types
 *
 * Normalized output types for HubSpot Marketing operations
 */

export interface HubspotMarketingListOutput {
    id: number;
    name: string;
    listType: "static" | "dynamic";
    size: number;
    createdAt: string;
    updatedAt: string;
    deletable: boolean;
}

export interface HubspotMarketingContactOutput {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
    lifecycleStage?: string;
    properties: Record<string, string | null>;
    createdAt: string;
    updatedAt: string;
}

export interface HubspotMarketingCampaignOutput {
    id: string;
    name: string;
    subject?: string;
    type?: string;
    appName: string;
    numIncluded?: number;
    numQueued?: number;
    lastUpdatedTime?: string;
}

export interface HubspotMarketingFormOutput {
    id: string;
    name: string;
    formType: string;
    submitText?: string;
    createdAt: string;
    updatedAt: string;
    fields: Array<{
        name: string;
        label: string;
        type: string;
        required: boolean;
    }>;
}

export interface HubspotMarketingFormSubmissionOutput {
    submittedAt: string;
    values: Record<string, string>;
    pageUrl?: string;
    pageName?: string;
}

export interface HubspotMarketingEmailOutput {
    id: number;
    name: string;
    subject: string;
    state: string;
    type: string;
    campaignId?: number;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
    stats?: {
        sent?: number;
        delivered?: number;
        bounced?: number;
        opened?: number;
        clicked?: number;
        unsubscribed?: number;
        openRate?: number;
        clickRate?: number;
    };
}

export interface HubspotMarketingWorkflowOutput {
    id: number;
    name: string;
    type: string;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    enrolledCount?: number;
    activeCount?: number;
    completedCount?: number;
}
