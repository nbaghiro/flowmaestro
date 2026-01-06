export interface FolderModel {
    id: string;
    user_id: string;
    name: string;
    color: string;
    position: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateFolderInput {
    user_id: string;
    name: string;
    color?: string;
    position?: number;
}

export interface UpdateFolderInput {
    name?: string;
    color?: string;
    position?: number;
}
