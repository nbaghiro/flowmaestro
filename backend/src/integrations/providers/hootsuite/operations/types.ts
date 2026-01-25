/**
 * Hootsuite API response types
 */

export interface HootsuiteSocialProfile {
    id: string;
    type: string;
    socialNetworkId: string;
    socialNetworkUsername: string;
    avatarUrl?: string;
    ownerId?: string;
    owner?: {
        id: string;
        type: string;
    };
}

export interface HootsuiteMessage {
    id: string;
    state: "SCHEDULED" | "DRAFT" | "SENT" | "SEND_NOW" | "FAILED";
    text: string;
    socialProfile: {
        id: string;
        type: string;
    };
    scheduledSendTime?: string;
    createdAt?: string;
    sentAt?: string;
    mediaUrls?: string[];
    extendedInfo?: {
        targetType?: string;
        postType?: string;
    };
}

export interface HootsuiteMediaUpload {
    id: string;
    uploadUrl: string;
    uploadUrlDurationSeconds: number;
}

export interface HootsuiteMedia {
    id: string;
    state: "PENDING" | "UPLOADING" | "READY" | "FAILED";
    url?: string;
    mimeType?: string;
    sizeBytes?: number;
    videoThumbnailUrl?: string;
}

export interface HootsuiteSocialProfilesResponse {
    data: HootsuiteSocialProfile[];
}

export interface HootsuiteMessageResponse {
    data: HootsuiteMessage;
}

export interface HootsuiteMediaResponse {
    data: HootsuiteMediaUpload | HootsuiteMedia;
}
