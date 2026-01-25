/**
 * Marketo API Types
 */

export interface MarketoLead {
    id: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface MarketoList {
    id: number;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    folder?: {
        id: number;
        type: string;
    };
    computedUrl?: string;
}

export interface MarketoCampaign {
    id: number;
    name: string;
    description?: string;
    type: string;
    programName?: string;
    programId?: number;
    workspaceName?: string;
    createdAt: string;
    updatedAt: string;
    active: boolean;
}

export interface MarketoApiResponse<T> {
    success: boolean;
    result?: T[];
    requestId?: string;
    nextPageToken?: string;
    moreResult?: boolean;
    errors?: Array<{
        code: string;
        message: string;
    }>;
    warnings?: Array<{
        code: string;
        message: string;
    }>;
}

export interface MarketoLeadResult {
    id: number;
    status: string;
    reasons?: Array<{
        code: string;
        message: string;
    }>;
}
