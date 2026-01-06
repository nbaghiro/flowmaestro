export interface Folder {
    id: string;
    userId: string;
    name: string;
    color: string;
    position: number;
    createdAt: Date;
    updatedAt: Date;
}

// Create folder input
export interface CreateFolderInput {
    name: string;
    color?: string;
}

// Update folder input
export interface UpdateFolderInput {
    name?: string;
    color?: string;
    position?: number;
}

// Folder with item counts (for display)
export interface FolderWithCounts extends Folder {
    itemCounts: {
        workflows: number;
        agents: number;
        formInterfaces: number;
        chatInterfaces: number;
        knowledgeBases: number;
        total: number;
    };
}

// Folder contents response
// Note: Using any[] for now since summary types don't exist yet
// These will be replaced with proper summary types in the future
export interface FolderContents {
    folder: Folder;
    items: {
        workflows: unknown[];
        agents: unknown[];
        formInterfaces: unknown[];
        chatInterfaces: unknown[];
        knowledgeBases: unknown[];
    };
}

// Move items request
export interface MoveItemsToFolderInput {
    itemIds: string[];
    itemType: "workflow" | "agent" | "form-interface" | "chat-interface" | "knowledge-base";
    folderId: string | null; // null = move to root
}

// Color palette (predefined options)
export const FOLDER_COLORS = [
    "#6366f1", // Indigo (default)
    "#22c55e", // Green
    "#eab308", // Yellow
    "#f97316", // Orange
    "#ef4444", // Red
    "#a855f7", // Purple
    "#64748b", // Slate
    "#0ea5e9" // Sky
] as const;
