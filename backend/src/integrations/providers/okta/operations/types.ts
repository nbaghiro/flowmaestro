/**
 * Types for Okta operation responses
 */

export interface OktaUserResponse {
    id: string;
    status: string;
    created: string;
    activated?: string;
    statusChanged?: string;
    lastLogin?: string;
    lastUpdated: string;
    passwordChanged?: string;
    type: { id: string };
    profile: {
        login: string;
        email: string;
        firstName?: string;
        lastName?: string;
        displayName?: string;
        mobilePhone?: string;
        secondEmail?: string;
    };
}

export interface OktaGroupResponse {
    id: string;
    created: string;
    lastUpdated: string;
    lastMembershipUpdated: string;
    objectClass: string[];
    type: string;
    profile: {
        name: string;
        description?: string;
    };
}

export interface OktaApplicationResponse {
    id: string;
    name: string;
    label: string;
    status: string;
    created: string;
    lastUpdated: string;
    signOnMode: string;
}
