// Folder Types
// Unified organization for workflows, agents, form interfaces, chat interfaces, and knowledge bases

// Maximum folder nesting depth (5 levels: 0, 1, 2, 3, 4)
export const MAX_FOLDER_DEPTH = 5;

// Folder entity
export interface Folder {
    id: string;
    userId: string;
    name: string;
    color: string;
    position: number;
    parentId: string | null; // Parent folder ID (null = root level)
    depth: number; // Nesting depth (0 = root, max 4)
    path: string; // Materialized path for ancestor queries (e.g., '/uuid1/uuid2')
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

// Tree node for sidebar display (recursive structure)
export interface FolderTreeNode extends FolderWithCounts {
    children: FolderTreeNode[];
}

// Folder with ancestors for breadcrumb navigation
export interface FolderWithAncestors extends Folder {
    ancestors: Folder[]; // Ordered from root to immediate parent
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
    parentId?: string | null; // Optional parent folder ID (null/undefined = root level)
}

// Update folder input
export interface UpdateFolderInput {
    name?: string;
    color?: string;
    position?: number;
    parentId?: string | null; // Optional: move folder to new parent (null = root)
}

// Summary types for folder contents
export interface WorkflowSummary {
    id: string;
    name: string;
    description: string | null;
    definition?: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface AgentSummary {
    id: string;
    name: string;
    description: string | null;
    provider: string;
    model: string;
    availableTools?: string[]; // For tool icon list
    systemPrompt?: string; // First 200 chars for DNA preview
    temperature?: number; // For color variation in preview
    createdAt: Date;
    updatedAt: Date;
}

export interface FormInterfaceSummary {
    id: string;
    name: string;
    title: string;
    description?: string | null;
    status: "draft" | "published";
    coverType?: "color" | "image" | "stock";
    coverValue?: string;
    iconUrl?: string | null;
    submissionCount?: number;
    slug?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ChatInterfaceSummary {
    id: string;
    name: string;
    title: string;
    description?: string | null;
    status: "draft" | "published";
    coverType?: "color" | "image" | "gradient";
    coverValue?: string;
    iconUrl?: string | null;
    sessionCount?: number;
    messageCount?: number;
    slug?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface KnowledgeBaseSummary {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    documentCount: number;
    embeddingModel?: string;
    chunkCount?: number;
    totalSizeBytes?: number;
    createdAt: Date;
    updatedAt: Date;
}

// Folder contents response (grouped by type)
export interface FolderContents {
    folder: FolderWithAncestors; // Folder with ancestor chain for breadcrumbs
    items: {
        workflows: WorkflowSummary[];
        agents: AgentSummary[];
        formInterfaces: FormInterfaceSummary[];
        chatInterfaces: ChatInterfaceSummary[];
        knowledgeBases: KnowledgeBaseSummary[];
    };
    itemCounts: FolderItemCounts;
    subfolders: FolderWithCounts[]; // Direct child folders
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

// Move folder to new parent request
export interface MoveFolderInput {
    folderId: string;
    newParentId: string | null; // null = move to root level
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
