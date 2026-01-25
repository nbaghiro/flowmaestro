/**
 * Buffer API response types
 */

export interface BufferProfile {
    id: string;
    service: string;
    service_id: string;
    service_username: string;
    avatar: string;
    timezone: string;
    formatted_username: string;
    schedules: Array<{
        days: string[];
        times: string[];
    }>;
    default: boolean;
    counts: {
        pending: number;
        sent: number;
    };
}

export interface BufferUpdate {
    id: string;
    created_at: number;
    text: string;
    text_formatted: string;
    profile_id: string;
    profile_service: string;
    status: string;
    scheduled_at?: number;
    sent_at?: number;
    due_at?: number;
    media?: {
        link?: string;
        photo?: string;
        thumbnail?: string;
    };
}

export interface BufferProfilesResponse {
    profiles?: BufferProfile[];
}

export interface BufferUpdateResponse {
    success: boolean;
    update?: BufferUpdate;
    updates?: BufferUpdate[];
    message?: string;
}

export interface BufferPendingUpdatesResponse {
    total: number;
    updates: BufferUpdate[];
}
