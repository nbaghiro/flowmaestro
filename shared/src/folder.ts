// Folder Types
// Unified organization for workflows, agents, form interfaces, chat interfaces, and knowledge bases

// Folder entity
export interface Folder {
    id: string;
    userId: string;
    name: string;
    color: string;
    position: number;
    createdAt: Date;
    updatedAt: Date;
}

// Item counts per resource type
export interface FolderItemCounts {
    workflows: number;
    agents: number;
    formInterfaces: number;
    chatInterfaces: number;
    knowledgeBases: number;
    total: number;
}

// Folder with item counts (for list display)
export interface FolderWithCounts extends Folder {
    itemCounts: FolderItemCounts;
}

// Resource type identifiers
export type FolderResourceType =
    | "workflow"
    | "agent"
    | "form-interface"
    | "chat-interface"
    | "knowledge-base";

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

// Summary types for folder contents
export interface WorkflowSummary {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface AgentSummary {
    id: string;
    name: string;
    description: string | null;
    provider: string;
    model: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FormInterfaceSummary {
    id: string;
    name: string;
    title: string;
    status: "draft" | "published";
    createdAt: Date;
    updatedAt: Date;
}

export interface ChatInterfaceSummary {
    id: string;
    name: string;
    title: string;
    status: "draft" | "published";
    createdAt: Date;
    updatedAt: Date;
}

export interface KnowledgeBaseSummary {
    id: string;
    name: string;
    description: string | null;
    documentCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// Folder contents response (grouped by type)
export interface FolderContents {
    folder: Folder;
    items: {
        workflows: WorkflowSummary[];
        agents: AgentSummary[];
        formInterfaces: FormInterfaceSummary[];
        chatInterfaces: ChatInterfaceSummary[];
        knowledgeBases: KnowledgeBaseSummary[];
    };
    itemCounts: FolderItemCounts;
}

// Move items to folder request
export interface MoveItemsToFolderInput {
    itemIds: string[];
    itemType: FolderResourceType;
    folderId: string; // Required: folder to add items to
}

// Remove items from folder request
export interface RemoveItemsFromFolderInput {
    itemIds: string[];
    itemType: FolderResourceType;
    folderId?: string; // Optional: when provided, removes from specific folder only; when omitted, removes from all folders
}

// Color palette (predefined options)
export const FOLDER_COLORS = [
    "#6366f1", // Indigo (default)
    "#22c55e", // Green
    "#eab308", // Yellow
    "#f97316", // Orange
    "#ef4444", // Red
    "#a855f7", // Purple
    "#0ea5e9" // Sky
] as const;

export type FolderColor = (typeof FOLDER_COLORS)[number];
