import type { CreditTransactionType } from "@flowmaestro/shared";

export interface WorkspaceCreditsModel {
    id: string;
    workspace_id: string;
    subscription_balance: number;
    purchased_balance: number;
    bonus_balance: number;
    reserved: number;
    subscription_expires_at: Date | null;
    lifetime_allocated: number;
    lifetime_purchased: number;
    lifetime_used: number;
    created_at: Date;
    updated_at: Date;
}

export interface CreateWorkspaceCreditsInput {
    workspace_id: string;
    subscription_balance?: number;
    purchased_balance?: number;
    bonus_balance?: number;
}

export interface UpdateWorkspaceCreditsInput {
    subscription_balance?: number;
    purchased_balance?: number;
    bonus_balance?: number;
    reserved?: number;
    subscription_expires_at?: Date | null;
    lifetime_allocated?: number;
    lifetime_purchased?: number;
    lifetime_used?: number;
}

// Credit Transaction Model
export interface CreditTransactionModel {
    id: string;
    workspace_id: string;
    user_id: string | null;
    amount: number;
    balance_before: number;
    balance_after: number;
    transaction_type: CreditTransactionType;
    operation_type: string | null;
    operation_id: string | null;
    description: string | null;
    metadata: Record<string, unknown>;
    created_at: Date;
}

export interface CreateCreditTransactionInput {
    workspace_id: string;
    user_id?: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    transaction_type: CreditTransactionType;
    operation_type?: string;
    operation_id?: string;
    description?: string;
    metadata?: Record<string, unknown>;
}
