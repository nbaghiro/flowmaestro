/**
 * GitBook Integration Types
 *
 * GitBook is a documentation platform for technical content, API docs,
 * and knowledge bases. Uses Personal Access Token authentication.
 */

/**
 * GitBook connection data for API key authentication
 */
export interface GitBookConnectionData {
    api_key: string;
}

/**
 * GitBook organization
 */
export interface GitBookOrganization {
    id: string;
    title: string;
    type: "organization" | "user";
    createdAt?: string;
    updatedAt?: string;
    urls?: {
        app?: string;
        published?: string;
    };
}

/**
 * GitBook space visibility options
 */
export type GitBookSpaceVisibility =
    | "public"
    | "unlisted"
    | "share-link"
    | "visitor-auth"
    | "in-collection"
    | "private";

/**
 * GitBook space
 */
export interface GitBookSpace {
    id: string;
    title: string;
    visibility: GitBookSpaceVisibility;
    createdAt?: string;
    updatedAt?: string;
    urls?: {
        app?: string;
        published?: string;
    };
    organization?: {
        id: string;
    };
    parent?: {
        id: string;
    };
}

/**
 * GitBook page type
 */
export type GitBookPageType = "document" | "link" | "group";

/**
 * GitBook page/document
 */
export interface GitBookPage {
    id: string;
    title: string;
    kind: GitBookPageType;
    type: "document" | "page";
    path?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    pages?: GitBookPage[];
    document?: GitBookDocument;
    urls?: {
        app?: string;
        published?: string;
    };
}

/**
 * GitBook document content
 */
export interface GitBookDocument {
    nodes?: GitBookDocumentNode[];
}

/**
 * GitBook document node types
 */
export type GitBookDocumentNodeType =
    | "paragraph"
    | "heading-1"
    | "heading-2"
    | "heading-3"
    | "list-ordered"
    | "list-unordered"
    | "list-tasks"
    | "code-block"
    | "blockquote"
    | "hint"
    | "table"
    | "image"
    | "embed"
    | "file"
    | "expandable"
    | "tabs"
    | "swagger"
    | "openapi"
    | "math"
    | "drawing";

/**
 * GitBook document node
 */
export interface GitBookDocumentNode {
    type: GitBookDocumentNodeType;
    object: "block" | "text";
    nodes?: GitBookDocumentNode[];
    leaves?: Array<{
        text: string;
        marks?: Array<{
            type: string;
        }>;
    }>;
    data?: Record<string, unknown>;
}

/**
 * GitBook content revision
 */
export interface GitBookRevision {
    id: string;
    createdAt?: string;
    pages?: GitBookPage[];
    files?: Array<{
        id: string;
        name: string;
        downloadURL?: string;
    }>;
}

/**
 * GitBook search result
 */
export interface GitBookSearchResult {
    id: string;
    title: string;
    path?: string;
    body?: string;
    page?: {
        id: string;
        title: string;
        path?: string;
    };
    space?: {
        id: string;
        title: string;
    };
    sections?: Array<{
        id: string;
        title?: string;
        body?: string;
    }>;
    urls?: {
        app?: string;
        published?: string;
    };
}

/**
 * GitBook user/member
 */
export interface GitBookUser {
    id: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
}

/**
 * GitBook API pagination
 */
export interface GitBookPagination {
    next?: string | null;
    page?: string;
}

/**
 * GitBook API list response
 */
export interface GitBookListResponse<T> {
    items: T[];
    next?: GitBookPagination;
}

/**
 * GitBook API error response
 */
export interface GitBookErrorResponse {
    error?: {
        code?: string;
        message?: string;
    };
    message?: string;
}
