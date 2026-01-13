import type { WorkspaceCategory, WorkspaceType } from "@flowmaestro/shared";

export interface WorkspaceModel {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: WorkspaceCategory;
    type: WorkspaceType;
    owner_id: string;

    // Limits
    max_workflows: number;
    max_agents: number;
    max_knowledge_bases: number;
    max_kb_chunks: number;
    max_members: number;
    max_connections: number;
    execution_history_days: number;

    // Billing
    stripe_subscription_id: string | null;
    billing_email: string | null;

    // Settings
    settings: Record<string, unknown>;

    // Timestamps
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateWorkspaceInput {
    owner_id: string;
    name: string;
    slug: string;
    description?: string;
    category?: WorkspaceCategory;
    type?: WorkspaceType;
}

export interface UpdateWorkspaceInput {
    name?: string;
    description?: string;
    type?: WorkspaceType;
    max_workflows?: number;
    max_agents?: number;
    max_knowledge_bases?: number;
    max_kb_chunks?: number;
    max_members?: number;
    max_connections?: number;
    execution_history_days?: number;
    stripe_subscription_id?: string | null;
    billing_email?: string;
    settings?: Record<string, unknown>;
}
