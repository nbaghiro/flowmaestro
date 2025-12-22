/**
 * LinkedIn API response types and interfaces
 */

/**
 * LinkedIn API response wrapper
 */
export interface LinkedInAPIResponse<T> {
    data?: T;
    errors?: LinkedInAPIError[];
}

/**
 * LinkedIn API error format
 */
export interface LinkedInAPIError {
    message: string;
    status: number;
    serviceErrorCode?: number;
    code?: string;
}

/**
 * LinkedIn Post visibility options
 */
export type LinkedInVisibility = "PUBLIC" | "CONNECTIONS" | "LOGGED_IN";

/**
 * LinkedIn Post lifecycle state
 */
export type LinkedInLifecycleState = "PUBLISHED" | "DRAFT";

/**
 * LinkedIn media category
 */
export type LinkedInMediaCategory = "ARTICLE" | "IMAGE" | "VIDEO" | "NONE";

/**
 * LinkedIn Post object
 */
export interface LinkedInPost {
    id: string;
    author: string;
    commentary?: string;
    visibility: LinkedInVisibility;
    lifecycleState: LinkedInLifecycleState;
    publishedAt?: string;
    lastModifiedAt?: string;
    content?: {
        article?: {
            source: string;
            title?: string;
            description?: string;
            thumbnail?: string;
        };
        media?: {
            id: string;
            title?: string;
        };
    };
    distribution?: {
        feedDistribution: string;
    };
}

/**
 * LinkedIn User Profile (from OpenID Connect userinfo)
 */
export interface LinkedInUserProfile {
    sub: string;
    name: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email?: string;
    email_verified?: boolean;
    locale?: string;
}

/**
 * LinkedIn Organization
 */
export interface LinkedInOrganization {
    id: string;
    localizedName: string;
    vanityName?: string;
    logoV2?: {
        original?: string;
    };
}

/**
 * LinkedIn Comment
 */
export interface LinkedInComment {
    id: string;
    actor: string;
    message: {
        text: string;
    };
    created: {
        time: number;
    };
    lastModified?: {
        time: number;
    };
}

/**
 * LinkedIn Reaction types
 */
export type LinkedInReactionType =
    | "LIKE"
    | "CELEBRATE"
    | "SUPPORT"
    | "LOVE"
    | "INSIGHTFUL"
    | "FUNNY";

/**
 * Response for creating a post
 */
export interface CreatePostResponse {
    id: string;
}

/**
 * Response for getting profile
 */
export type GetProfileResponse = LinkedInUserProfile;

/**
 * Response for getting organizations
 */
export interface GetOrganizationsResponse {
    elements: LinkedInOrganization[];
}

/**
 * Response for image upload initialization
 */
export interface InitializeUploadResponse {
    value: {
        uploadUrl: string;
        image?: string;
        video?: string;
    };
}

/**
 * Response for getting comments
 */
export interface GetCommentsResponse {
    elements: LinkedInComment[];
    paging?: {
        count: number;
        start: number;
        links?: Array<{
            rel: string;
            href: string;
        }>;
    };
}
