/**
 * Canva Operation Types
 *
 * Type definitions for Canva API operation parameters and responses.
 */

export interface CanvaDesign {
    id: string;
    title: string;
    owner: {
        user_id: string;
        team_id?: string;
    };
    thumbnail?: {
        url: string;
        width: number;
        height: number;
    };
    urls: {
        edit_url: string;
        view_url: string;
    };
    created_at: string;
    updated_at: string;
}

export interface CanvaFolder {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface CanvaAsset {
    id: string;
    name: string;
    tags: string[];
    created_at: string;
    updated_at: string;
    thumbnail?: {
        url: string;
        width: number;
        height: number;
    };
}

export interface CanvaExportJob {
    id: string;
    status: "in_progress" | "success" | "failed";
    urls?: string[];
}

export interface CanvaPaginatedResponse<T> {
    items: T[];
    continuation?: string;
}
