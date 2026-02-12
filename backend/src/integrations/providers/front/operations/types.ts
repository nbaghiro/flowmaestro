/**
 * Front Operations Type Definitions
 */

export interface FrontTeammateInfo {
    id: string;
    email: string;
    name: string;
}

export interface FrontTagInfo {
    id: string;
    name: string;
}

export interface FrontHandleInfo {
    handle: string;
    source: string;
}

export interface FrontGroupInfo {
    id: string;
    name: string;
}

export interface FrontRecipientInfo {
    handle: string;
    role: "from" | "to" | "cc" | "bcc";
}

export interface FrontConversationInfo {
    id: string;
    subject: string;
    status: string;
    assignee: FrontTeammateInfo | null;
    tags: FrontTagInfo[];
    createdAt: string;
    isPrivate: boolean;
    lastMessageBlurb?: string;
}

export interface FrontMessageInfo {
    id: string;
    type: string;
    isInbound: boolean;
    body: string;
    blurb: string;
    createdAt: string;
    recipients: FrontRecipientInfo[];
}

export interface FrontCommentInfo {
    id: string;
    body: string;
    postedAt: string;
    author: FrontTeammateInfo | null;
    attachmentCount: number;
}

export interface FrontInboxInfo {
    id: string;
    name: string;
    isPrivate: boolean;
    isPublic: boolean;
}

export interface FrontContactInfo {
    id: string;
    name?: string;
    description?: string;
    avatarUrl?: string;
    isSpammer: boolean;
    handles: FrontHandleInfo[];
    links: string[];
    groups: FrontGroupInfo[];
    customFields?: Record<string, unknown>;
    updatedAt: string;
}

export interface FrontPaginationInfo {
    nextToken?: string;
}
