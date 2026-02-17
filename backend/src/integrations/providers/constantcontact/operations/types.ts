/**
 * Constant Contact Output Types
 *
 * Defines the standardized output types for Constant Contact operations.
 */

export interface ConstantContactContactOutput {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    jobTitle?: string;
    companyName?: string;
    createdAt?: string;
    updatedAt?: string;
    emailConsent?: string;
    customFields?: Array<{
        fieldId: string;
        value: string;
    }>;
}

export interface ConstantContactListOutput {
    id: string;
    name: string;
    description?: string;
    membershipCount: number;
    favorite: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ConstantContactCampaignOutput {
    id: string;
    name: string;
    status: string;
    type: string;
    currentStatus?: string;
    createdAt: string;
    updatedAt?: string;
    scheduledDate?: string;
    sentDate?: string;
}

export interface ConstantContactTagOutput {
    id: string;
    name: string;
    contactCount?: number;
    createdAt: string;
    updatedAt: string;
}
