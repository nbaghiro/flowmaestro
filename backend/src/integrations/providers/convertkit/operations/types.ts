/**
 * ConvertKit Output Types
 *
 * Defines the standardized output types for ConvertKit operations.
 */

export interface ConvertKitSubscriberOutput {
    id: string;
    email: string;
    firstName?: string;
    state: string;
    createdAt: string;
    fields?: Record<string, string>;
}

export interface ConvertKitTagOutput {
    id: string;
    name: string;
    createdAt?: string;
}

export interface ConvertKitSequenceOutput {
    id: string;
    name: string;
    createdAt?: string;
}

export interface ConvertKitFormOutput {
    id: string;
    name: string;
    type: string;
    format?: string;
    embedJs?: string;
    embedUrl?: string;
    archived: boolean;
    uid: string;
}

export interface ConvertKitBroadcastOutput {
    id: string;
    subject: string;
    description?: string;
    content?: string;
    public: boolean;
    publishedAt?: string;
    sendAt?: string;
    thumbnailUrl?: string;
    createdAt: string;
}
