/**
 * Google Meet API v2 response types
 *
 * Based on the Google Meet REST API v2:
 * https://developers.google.com/meet/api/reference/rest
 */

// ============================================================================
// SPACES
// ============================================================================

export interface GoogleMeetSpace {
    name: string; // e.g., "spaces/abc123"
    meetingUri: string;
    meetingCode: string;
    config: GoogleMeetSpaceConfig;
    activeConference?: GoogleMeetActiveConference;
}

export interface GoogleMeetSpaceConfig {
    accessType: "ACCESS_TYPE_UNSPECIFIED" | "OPEN" | "TRUSTED" | "RESTRICTED";
    entryPointAccess: "ENTRY_POINT_ACCESS_UNSPECIFIED" | "ALL" | "CREATOR_APP_ONLY";
}

export interface GoogleMeetActiveConference {
    conferenceRecord: string; // resource name
}

// ============================================================================
// CONFERENCE RECORDS
// ============================================================================

export interface GoogleMeetConferenceRecord {
    name: string; // e.g., "conferenceRecords/xyz789"
    startTime: string;
    endTime?: string;
    expireTime: string;
    space: string; // resource name
}

export interface GoogleMeetConferenceRecordList {
    conferenceRecords: GoogleMeetConferenceRecord[];
    nextPageToken?: string;
}

// ============================================================================
// PARTICIPANTS
// ============================================================================

export interface GoogleMeetParticipant {
    name: string; // e.g., "conferenceRecords/xyz/participants/abc"
    earliestStartTime: string;
    latestEndTime?: string;
    signedinUser?: {
        user: string;
        displayName: string;
    };
    anonymousUser?: {
        displayName: string;
    };
    phoneUser?: {
        displayName: string;
    };
}

export interface GoogleMeetParticipantList {
    participants: GoogleMeetParticipant[];
    nextPageToken?: string;
    totalSize?: number;
}

// ============================================================================
// ERRORS
// ============================================================================

export interface GoogleMeetError {
    error: {
        code: number;
        message: string;
        status?: string;
        details?: Array<{
            "@type": string;
            [key: string]: unknown;
        }>;
    };
}
