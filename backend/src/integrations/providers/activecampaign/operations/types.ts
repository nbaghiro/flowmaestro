/**
 * ActiveCampaign Output Types
 *
 * Normalized output types for ActiveCampaign operations
 */

export interface ActiveCampaignContactOutput {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ActiveCampaignListOutput {
    id: string;
    name: string;
    stringId: string;
    senderName: string;
    senderEmail: string;
    senderUrl: string;
    senderReminder: string;
    subscriberCount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface ActiveCampaignTagOutput {
    id: string;
    name: string;
    type?: string;
    description?: string;
    subscriberCount?: number;
    createdAt?: string;
}

export interface ActiveCampaignAutomationOutput {
    id: string;
    name: string;
    status: "active" | "inactive";
    enteredCount?: number;
    exitedCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface ActiveCampaignCampaignOutput {
    id: string;
    name: string;
    type: string;
    status: string;
    sentDate?: string;
    lastSentDate?: string;
    stats?: {
        sent?: number;
        opens?: number;
        uniqueOpens?: number;
        clicks?: number;
        uniqueClicks?: number;
        unsubscribes?: number;
        bounceSoft?: number;
        bounceHard?: number;
    };
}

export interface ActiveCampaignCustomFieldOutput {
    id: string;
    title: string;
    description?: string;
    type: string;
    personalizationTag?: string;
    defaultValue?: string;
    createdAt?: string;
    updatedAt?: string;
}
