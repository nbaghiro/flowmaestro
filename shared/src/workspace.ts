// Workspace Types
// ================

export type WorkspaceCategory = "personal" | "team";
export type WorkspaceType = "free" | "pro" | "team";
export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";
export type CreditTransactionType =
    | "subscription"
    | "purchase"
    | "usage"
    | "refund"
    | "bonus"
    | "expiration";

// Permission types
export type WorkspacePermission =
    | "view"
    | "create"
    | "edit"
    | "delete"
    | "execute"
    | "invite_members"
    | "remove_members"
    | "change_roles"
    | "edit_settings"
    | "view_billing"
    | "upgrade"
    | "manage_billing"
    | "delete_workspace"
    | "transfer_ownership";

// Workspace limits by plan type
export const WORKSPACE_LIMITS = {
    free: {
        max_workflows: 5,
        max_agents: 2,
        max_knowledge_bases: 1,
        max_kb_chunks: 100,
        max_members: 1,
        max_connections: 5,
        monthly_credits: 100,
        execution_history_days: 7
    },
    pro: {
        max_workflows: 50,
        max_agents: 20,
        max_knowledge_bases: 10,
        max_kb_chunks: 5000,
        max_members: 5,
        max_connections: 25,
        monthly_credits: 2500,
        execution_history_days: 30
    },
    team: {
        max_workflows: -1, // unlimited
        max_agents: -1,
        max_knowledge_bases: 50,
        max_kb_chunks: 50000,
        max_members: -1,
        max_connections: -1,
        monthly_credits: 10000,
        execution_history_days: 90
    }
} as const;

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<WorkspaceRole, WorkspacePermission[]> = {
    owner: [
        "view",
        "create",
        "edit",
        "delete",
        "execute",
        "invite_members",
        "remove_members",
        "change_roles",
        "edit_settings",
        "view_billing",
        "upgrade",
        "manage_billing",
        "delete_workspace",
        "transfer_ownership"
    ],
    admin: [
        "view",
        "create",
        "edit",
        "delete",
        "execute",
        "invite_members",
        "remove_members",
        "change_roles",
        "edit_settings",
        "view_billing"
    ],
    member: ["view", "create", "edit", "execute"],
    viewer: ["view"]
};

// Check if a role has a specific permission
export function hasPermission(role: WorkspaceRole, permission: WorkspacePermission): boolean {
    return ROLE_PERMISSIONS[role].includes(permission);
}

// ============================================================================
// Workspace Entity Types
// ============================================================================

export interface Workspace {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: WorkspaceCategory;
    type: WorkspaceType;
    ownerId: string;

    // Limits
    maxWorkflows: number;
    maxAgents: number;
    maxKnowledgeBases: number;
    maxKbChunks: number;
    maxMembers: number;
    maxConnections: number;
    executionHistoryDays: number;

    // Billing
    stripeSubscriptionId: string | null;
    billingEmail: string | null;

    // Settings
    settings: Record<string, unknown>;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceWithStats extends Workspace {
    memberCount: number;
    workflowCount?: number;
    agentCount?: number;
    _count?: {
        members?: number;
        workflows?: number;
        agents?: number;
        knowledgeBases?: number;
    };
}

export interface WorkspaceMember {
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    invitedBy: string | null;
    invitedAt: Date | null;
    acceptedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceMemberWithUser extends WorkspaceMember {
    user: {
        id: string;
        name: string | null;
        email: string;
    };
}

export interface WorkspaceInvitation {
    id: string;
    workspaceId: string;
    email: string;
    role: WorkspaceRole;
    token: string;
    invitedBy: string;
    message: string | null;
    status: InvitationStatus;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
}

export interface WorkspaceInvitationWithDetails extends WorkspaceInvitation {
    workspace: {
        id: string;
        name: string;
        slug: string;
    };
    inviter: {
        id: string;
        name: string | null;
        email: string;
    };
}

// ============================================================================
// Credit Types
// ============================================================================

export interface WorkspaceCredits {
    id: string;
    workspaceId: string;
    subscriptionBalance: number;
    purchasedBalance: number;
    bonusBalance: number;
    reserved: number;
    subscriptionExpiresAt: Date | null;
    lifetimeAllocated: number;
    lifetimePurchased: number;
    lifetimeUsed: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreditBalance {
    available: number;
    subscription: number;
    purchased: number;
    bonus: number;
    reserved: number;
    subscriptionExpiresAt: string | null;
    usedThisMonth: number;
    usedAllTime: number;
}

export interface CreditTransaction {
    id: string;
    workspaceId: string;
    userId: string | null;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    transactionType: CreditTransactionType;
    operationType: string | null;
    operationId: string | null;
    description: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

export interface CreditEstimate {
    totalCredits: number;
    breakdown: CreditBreakdownItem[];
    confidence: "estimate" | "exact";
}

export interface CreditBreakdownItem {
    nodeId?: string;
    nodeType?: string;
    credits: number;
    description: string;
}

// ============================================================================
// Credit Packs
// ============================================================================

export interface CreditPack {
    id: string;
    credits: number;
    priceInCents: number;
    label: string;
    savingsPercent: number;
}

export const CREDIT_PACKS: CreditPack[] = [
    { id: "starter", credits: 500, priceInCents: 500, label: "Starter", savingsPercent: 0 },
    { id: "growth", credits: 2500, priceInCents: 2250, label: "Growth", savingsPercent: 10 },
    { id: "scale", credits: 10000, priceInCents: 8000, label: "Scale", savingsPercent: 20 },
    {
        id: "enterprise",
        credits: 50000,
        priceInCents: 35000,
        label: "Enterprise",
        savingsPercent: 30
    }
];

// ============================================================================
// API Input/Output Types
// ============================================================================

export interface CreateWorkspaceInput {
    name: string;
    description?: string;
    category?: WorkspaceCategory;
}

export interface UpdateWorkspaceInput {
    name?: string;
    description?: string;
    billingEmail?: string;
    settings?: Record<string, unknown>;
}

export interface InviteMemberInput {
    email: string;
    role: WorkspaceRole;
    message?: string;
}

export interface UpdateMemberRoleInput {
    role: WorkspaceRole;
}

export interface GetWorkspacesResponse {
    owned: WorkspaceWithStats[];
    member: WorkspaceWithStats[];
}

// ============================================================================
// Workspace Context (for middleware)
// ============================================================================

export interface WorkspaceContext {
    id: string;
    type: WorkspaceType;
    role: WorkspaceRole;
    isOwner: boolean;
    limits: {
        maxWorkflows: number;
        maxAgents: number;
        maxKnowledgeBases: number;
        maxKbChunks: number;
        maxMembers: number;
        maxConnections: number;
    };
}
