/**
 * Looker API Response Types
 */

export interface LookerDashboard {
    id: string;
    title: string;
    description?: string;
    folder?: LookerFolder;
    user_id?: string;
    readonly?: boolean;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
    dashboard_elements?: LookerDashboardElement[];
    dashboard_filters?: LookerDashboardFilter[];
}

export interface LookerDashboardElement {
    id: string;
    type?: string;
    title?: string;
    subtitle_text?: string;
    look_id?: string;
    query_id?: number;
    result_maker_id?: number;
}

export interface LookerDashboardFilter {
    id: string;
    name: string;
    title: string;
    type: string;
    default_value?: string;
    required?: boolean;
}

export interface LookerFolder {
    id: string;
    name: string;
    parent_id?: string;
    content_metadata_id?: number;
    created_at?: string;
    creator_id?: string;
}

export interface LookerLook {
    id: number;
    title: string;
    description?: string;
    folder?: LookerFolder;
    user_id?: string;
    query_id?: number;
    public?: boolean;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export interface LookerQuery {
    id: number;
    model: string;
    view: string;
    fields?: string[];
    pivots?: string[];
    fill_fields?: string[];
    filters?: Record<string, string>;
    sorts?: string[];
    limit?: string;
    column_limit?: string;
    total?: boolean;
    row_total?: string;
    subtotals?: string[];
    dynamic_fields?: string;
}

export interface LookerExplore {
    id: string;
    name: string;
    label?: string;
    description?: string;
    model_name: string;
    hidden?: boolean;
}

export interface LookerModel {
    name: string;
    label?: string;
    explores?: LookerExplore[];
}

export interface LookerQueryResult {
    data: Record<string, unknown>[];
    fields?: Record<string, unknown>;
    pivots?: unknown[];
    sql?: string;
}

export interface LookerSearchResult {
    dashboards?: LookerDashboard[];
    looks?: LookerLook[];
    folders?: LookerFolder[];
}

export interface LookerAccessToken {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface LookerErrorResponse {
    message: string;
    documentation_url?: string;
}
