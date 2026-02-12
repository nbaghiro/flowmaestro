/**
 * RingCentral Operations Type Definitions
 */

export interface RingCentralMessageInfo {
    id: string;
    type: string;
    direction: string;
    status: string;
    readStatus: string;
    from: string;
    to: string[];
    subject?: string;
    createdAt: string;
    conversationId?: string;
}

export interface RingCentralCallLogInfo {
    id: string;
    sessionId?: string;
    startTime: string;
    duration?: number;
    type: string;
    direction: string;
    action: string;
    result: string;
    from: {
        phoneNumber?: string;
        name?: string;
        location?: string;
    } | null;
    to: {
        phoneNumber?: string;
        name?: string;
        location?: string;
    } | null;
    hasRecording: boolean;
}

export interface RingCentralVoicemailInfo {
    id: string;
    direction: string;
    readStatus: string;
    from: string;
    fromName?: string;
    createdAt: string;
    subject?: string;
    hasAttachments: boolean;
}

export interface RingCentralChatInfo {
    id: string;
    type: string;
    name?: string;
    description?: string;
    status?: string;
    createdAt: string;
    lastModifiedAt: string;
    memberCount: number;
}

export interface RingCentralTeamMessageInfo {
    messageId: string;
    groupId: string;
    type: string;
    text?: string;
    creatorId: string;
    createdAt: string;
}

export interface RingCentralMeetingInfo {
    meetingId: string;
    uuid: string;
    topic: string;
    startTime?: string;
    duration?: number;
    password?: string;
    status?: string;
    joinUrl?: string;
    startUrl?: string;
}

export interface RingCentralRingOutInfo {
    ringOutId: string;
    callStatus: string;
    callerStatus: string;
    calleeStatus: string;
}

export interface RingCentralPaginationInfo {
    page: number;
    perPage: number;
    totalPages: number;
    totalElements: number;
    hasNext: boolean;
}

export interface RingCentralTokenPaginationInfo {
    nextToken?: string;
}
