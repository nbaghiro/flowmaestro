/**
 * Webflow API response types
 */

/**
 * Webflow Site
 */
export interface WebflowSite {
    id: string;
    workspaceId: string;
    displayName: string;
    shortName: string;
    previewUrl: string;
    timeZone: string;
    createdOn: string;
    lastUpdated: string;
    lastPublished: string | null;
    customDomains?: WebflowCustomDomain[];
    locales?: WebflowLocale;
}

export interface WebflowCustomDomain {
    id: string;
    url: string;
    registeredOn?: string;
}

export interface WebflowLocale {
    primary: {
        id: string;
        cmsId: string;
        enabled: boolean;
        displayName: string;
        redirect: boolean;
        subdirectory: string;
        tag: string;
    };
    secondary?: Array<{
        id: string;
        cmsId: string;
        enabled: boolean;
        displayName: string;
        redirect: boolean;
        subdirectory: string;
        tag: string;
    }>;
}

/**
 * List sites response
 */
export interface WebflowListSitesResponse {
    sites: WebflowSite[];
}

/**
 * Get site response
 */
export interface WebflowGetSiteResponse extends WebflowSite {}

/**
 * Publish site response
 */
export interface WebflowPublishSiteResponse {
    publishedOn: string;
    customDomains?: string[];
}

/**
 * Webflow Collection
 */
export interface WebflowCollection {
    id: string;
    displayName: string;
    singularName: string;
    slug: string;
    createdOn: string;
    lastUpdated: string;
    fields?: WebflowCollectionField[];
}

export interface WebflowCollectionField {
    id: string;
    isEditable: boolean;
    isRequired: boolean;
    type: string;
    slug: string;
    displayName: string;
    helpText?: string;
    validations?: Record<string, unknown>;
}

/**
 * List collections response
 */
export interface WebflowListCollectionsResponse {
    collections: WebflowCollection[];
}

/**
 * Get collection response
 */
export interface WebflowGetCollectionResponse extends WebflowCollection {}

/**
 * Webflow Collection Item
 */
export interface WebflowCollectionItem {
    id: string;
    cmsLocaleId?: string;
    lastPublished: string | null;
    lastUpdated: string;
    createdOn: string;
    isArchived: boolean;
    isDraft: boolean;
    fieldData: Record<string, unknown>;
}

/**
 * List collection items response
 */
export interface WebflowListItemsResponse {
    items: WebflowCollectionItem[];
    pagination: {
        offset: number;
        limit: number;
        total: number;
    };
}

/**
 * Get/Create/Update item response
 */
export interface WebflowItemResponse extends WebflowCollectionItem {}

/**
 * Delete item response
 */
export interface WebflowDeleteItemResponse {
    deleted: number;
}

/**
 * Publish items response
 */
export interface WebflowPublishItemsResponse {
    publishedItemIds: string[];
}

/**
 * Authorized user response
 */
export interface WebflowAuthorizedUserResponse {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

/**
 * Token info response
 */
export interface WebflowTokenInfoResponse {
    authorization: {
        id: string;
        createdOn: string;
        grantType: string;
        lastUsed?: string;
        revokedOn?: string;
        authorizedTo?: {
            userId?: string;
            siteIds?: string[];
            workspaceIds?: string[];
        };
    };
}
