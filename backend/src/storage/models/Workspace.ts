import type { WorkspaceCategory, WorkspaceType, SubscriptionStatus } from "@flowmaestro/shared";

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

    // Billing / Subscription
    stripe_subscription_id: string | null;
    billing_email: string | null;
    subscription_status: SubscriptionStatus;
    subscription_current_period_start: Date | null;
    subscription_current_period_end: Date | null;
    subscription_trial_end: Date | null;
    subscription_cancel_at_period_end: boolean;

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
    subscription_status?: SubscriptionStatus;
    subscription_current_period_start?: Date | null;
    subscription_current_period_end?: Date | null;
    subscription_trial_end?: Date | null;
    subscription_cancel_at_period_end?: boolean;
    settings?: Record<string, unknown>;
}
