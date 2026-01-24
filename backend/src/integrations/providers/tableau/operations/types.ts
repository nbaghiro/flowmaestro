/**
 * Tableau API Response Types
 */

export interface TableauCredentials {
    site: {
        id: string;
        contentUrl: string;
    };
    user: {
        id: string;
        name?: string;
    };
    token: string;
    estimatedTimeToExpiration?: string;
}

export interface TableauSignInResponse {
    credentials: TableauCredentials;
}

export interface TableauSite {
    id: string;
    name: string;
    contentUrl: string;
    adminMode?: string;
    state?: string;
    disableSubscriptions?: boolean;
}

export interface TableauSitesResponse {
    pagination: TableauPagination;
    sites: {
        site: TableauSite[];
    };
}

export interface TableauWorkbook {
    id: string;
    name: string;
    description?: string;
    contentUrl: string;
    webpageUrl?: string;
    showTabs?: boolean;
    size?: number;
    createdAt?: string;
    updatedAt?: string;
    project?: {
        id: string;
        name: string;
    };
    owner?: {
        id: string;
        name: string;
    };
    defaultViewId?: string;
    views?: {
        view: TableauView[];
    };
}

export interface TableauWorkbooksResponse {
    pagination: TableauPagination;
    workbooks: {
        workbook: TableauWorkbook[];
    };
}

export interface TableauView {
    id: string;
    name: string;
    contentUrl: string;
    createdAt?: string;
    updatedAt?: string;
    workbook?: {
        id: string;
        name?: string;
    };
    owner?: {
        id: string;
        name?: string;
    };
    project?: {
        id: string;
        name?: string;
    };
    sheetType?: string;
}

export interface TableauViewsResponse {
    pagination: TableauPagination;
    views: {
        view: TableauView[];
    };
}

export interface TableauDataSource {
    id: string;
    name: string;
    description?: string;
    contentUrl: string;
    type?: string;
    createdAt?: string;
    updatedAt?: string;
    isCertified?: boolean;
    certificationNote?: string;
    project?: {
        id: string;
        name: string;
    };
    owner?: {
        id: string;
        name: string;
    };
}

export interface TableauDataSourcesResponse {
    pagination: TableauPagination;
    datasources: {
        datasource: TableauDataSource[];
    };
}

export interface TableauProject {
    id: string;
    name: string;
    description?: string;
    contentPermissions?: string;
    parentProjectId?: string;
    createdAt?: string;
    updatedAt?: string;
    owner?: {
        id: string;
        name?: string;
    };
}

export interface TableauProjectsResponse {
    pagination: TableauPagination;
    projects: {
        project: TableauProject[];
    };
}

export interface TableauJob {
    id: string;
    mode: string;
    type: string;
    progress?: number;
    createdAt?: string;
    startedAt?: string;
    completedAt?: string;
    finishCode?: number;
}

export interface TableauJobResponse {
    job: TableauJob;
}

export interface TableauPagination {
    pageNumber: string;
    pageSize: string;
    totalAvailable: string;
}

export interface TableauErrorResponse {
    error: {
        summary: string;
        detail: string;
        code: string;
    };
}
