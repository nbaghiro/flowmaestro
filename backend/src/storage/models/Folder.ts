export interface FolderModel {
    id: string;
    user_id: string;
    name: string;
    color: string;
    position: number;
    parent_id: string | null; // Parent folder ID (null = root level)
    depth: number; // Nesting depth (0 = root, max 4)
    path: string; // Materialized path for ancestor queries
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateFolderInput {
    user_id: string;
    name: string;
    color?: string;
    parent_id?: string | null; // Optional parent folder ID
}

export interface UpdateFolderInput {
    name?: string;
    color?: string;
    position?: number;
    parent_id?: string | null; // Move folder to new parent
}
