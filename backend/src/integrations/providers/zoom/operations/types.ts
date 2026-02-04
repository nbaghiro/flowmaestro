/**
 * Zoom API v2 response types
 */

// ============================================================================
// MEETINGS
// ============================================================================

export interface ZoomMeeting {
    id: number;
    uuid: string;
    host_id: string;
    topic: string;
    type: number; // 1=instant, 2=scheduled, 3=recurring no fixed, 8=recurring fixed
    status?: string;
    start_time?: string;
    duration?: number;
    timezone?: string;
    agenda?: string;
    created_at: string;
    join_url: string;
    start_url?: string;
    password?: string;
    settings?: ZoomMeetingSettings;
}

export interface ZoomMeetingSettings {
    host_video?: boolean;
    participant_video?: boolean;
    join_before_host?: boolean;
    mute_upon_entry?: boolean;
    auto_recording?: "local" | "cloud" | "none";
    waiting_room?: boolean;
    approval_type?: number;
    audio?: "both" | "telephony" | "voip" | "thirdParty";
}

export interface ZoomMeetingList {
    page_count: number;
    page_number: number;
    page_size: number;
    total_records: number;
    next_page_token?: string;
    meetings: ZoomMeeting[];
}

// ============================================================================
// USERS
// ============================================================================

export interface ZoomUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    type: number;
    status: string;
    pmi: number;
    timezone: string;
    dept?: string;
    created_at: string;
    last_login_time?: string;
    pic_url?: string;
    language?: string;
    account_id: string;
    account_number?: number;
}

// ============================================================================
// RECORDINGS
// ============================================================================

export interface ZoomRecording {
    uuid: string;
    id: number;
    account_id: string;
    host_id: string;
    topic: string;
    type: number;
    start_time: string;
    timezone: string;
    duration: number;
    total_size: number;
    recording_count: number;
    recording_files: ZoomRecordingFile[];
    password?: string;
    share_url?: string;
}

export interface ZoomRecordingFile {
    id: string;
    meeting_id: string;
    recording_start: string;
    recording_end: string;
    file_type: string;
    file_extension: string;
    file_size: number;
    download_url: string;
    play_url?: string;
    status: string;
    recording_type: string;
}

export interface ZoomRecordingList {
    from: string;
    to: string;
    page_count: number;
    page_size: number;
    total_records: number;
    next_page_token?: string;
    meetings: ZoomRecording[];
}

// ============================================================================
// ERRORS
// ============================================================================

export interface ZoomError {
    code: number;
    message: string;
}
