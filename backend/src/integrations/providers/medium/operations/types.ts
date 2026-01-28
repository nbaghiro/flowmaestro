/**
 * Medium Operation Types
 *
 * Type definitions used across Medium operations
 */

export interface MediumUserOutput {
    id: string;
    username: string;
    name: string;
    url: string;
    imageUrl: string;
}

export interface MediumPublicationOutput {
    id: string;
    name: string;
    description: string;
    url: string;
    imageUrl: string;
}

export interface MediumContributorOutput {
    publicationId: string;
    userId: string;
    role: string;
}

export interface MediumPostOutput {
    id: string;
    title: string;
    authorId: string;
    url: string;
    canonicalUrl?: string;
    publishStatus: string;
    publishedAt?: string;
    license: string;
    licenseUrl?: string;
    tags?: string[];
}

export interface MediumImageOutput {
    url: string;
    md5: string;
}
