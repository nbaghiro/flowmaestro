/**
 * Ghost Operation Types
 *
 * Type definitions used across Ghost operations
 */

export interface GhostPostOutput {
    id: string;
    uuid: string;
    title: string;
    slug: string;
    html: string;
    status: string;
    visibility: string;
    url: string;
    excerpt?: string;
    featureImage?: string | null;
    featured: boolean;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    tags?: Array<{ id: string; name: string; slug: string }>;
    authors?: Array<{ id: string; name: string; slug: string }>;
}

export interface GhostTagOutput {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    visibility: string;
    url: string;
}

export interface GhostMemberOutput {
    id: string;
    uuid: string;
    email: string;
    name: string | null;
    status: string;
    subscribed: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface GhostSiteInfoOutput {
    title: string;
    description: string;
    logo: string | null;
    url: string;
    version: string;
}
