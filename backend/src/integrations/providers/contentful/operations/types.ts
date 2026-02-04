/**
 * Contentful Operation Types
 *
 * Type definitions used across Contentful operations
 */

export interface ContentfulSpaceOutput {
    id: string;
    name: string;
}

export interface ContentfulContentTypeFieldOutput {
    id: string;
    name: string;
    type: string;
    required: boolean;
    localized: boolean;
}

export interface ContentfulContentTypeOutput {
    id: string;
    name: string;
    description: string;
    displayField: string;
    fields: ContentfulContentTypeFieldOutput[];
}

export interface ContentfulEntryOutput {
    id: string;
    contentTypeId?: string;
    version?: number;
    fields: Record<string, Record<string, unknown>>;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string;
}

export interface ContentfulAssetOutput {
    id: string;
    title?: string;
    description?: string;
    fileName?: string;
    contentType?: string;
    url?: string;
    size?: number;
    width?: number;
    height?: number;
    createdAt?: string;
    updatedAt?: string;
}
