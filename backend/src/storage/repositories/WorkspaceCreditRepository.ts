import type { CreditTransactionType, CreditBalance, CreditTransaction } from "@flowmaestro/shared";
import { db } from "../database";
import {
    WorkspaceCreditsModel,
    CreateWorkspaceCreditsInput,
    UpdateWorkspaceCreditsInput,
    CreditTransactionModel,
    CreateCreditTransactionInput
} from "../models/WorkspaceCredits";

interface WorkspaceCreditsRow {
    id: string;
    workspace_id: string;
    subscription_balance: number;
    purchased_balance: number;
    bonus_balance: number;
    reserved: number;
    subscription_expires_at: string | Date | null;
    lifetime_allocated: number;
    lifetime_purchased: number;
    lifetime_used: number;
    created_at: string | Date;
    updated_at: string | Date;
}

interface CreditTransactionRow {
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
    created_at: string | Date;
}

export class WorkspaceCreditRepository {
    // =========================================================================
    // Credits CRUD
    // =========================================================================

    async create(input: CreateWorkspaceCreditsInput): Promise<WorkspaceCreditsModel> {
        const query = `
            INSERT INTO flowmaestro.workspace_credits (
                workspace_id, subscription_balance, purchased_balance, bonus_balance
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const values = [
            input.workspace_id,
            input.subscription_balance || 0,
            input.purchased_balance || 0,
            input.bonus_balance || 0
        ];

        const result = await db.query<WorkspaceCreditsRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findByWorkspaceId(workspaceId: string): Promise<WorkspaceCreditsModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workspace_credits
            WHERE workspace_id = $1
        `;

        const result = await db.query<WorkspaceCreditsRow>(query, [workspaceId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async update(
        workspaceId: string,
        input: UpdateWorkspaceCreditsInput
    ): Promise<WorkspaceCreditsModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.subscription_balance !== undefined) {
            updates.push(`subscription_balance = $${paramIndex++}`);
            values.push(input.subscription_balance);
        }
        if (input.purchased_balance !== undefined) {
            updates.push(`purchased_balance = $${paramIndex++}`);
            values.push(input.purchased_balance);
        }
        if (input.bonus_balance !== undefined) {
            updates.push(`bonus_balance = $${paramIndex++}`);
            values.push(input.bonus_balance);
        }
        if (input.reserved !== undefined) {
            updates.push(`reserved = $${paramIndex++}`);
            values.push(input.reserved);
        }
        if (input.subscription_expires_at !== undefined) {
            updates.push(`subscription_expires_at = $${paramIndex++}`);
            values.push(input.subscription_expires_at);
        }
        if (input.lifetime_allocated !== undefined) {
            updates.push(`lifetime_allocated = $${paramIndex++}`);
            values.push(input.lifetime_allocated);
        }
        if (input.lifetime_purchased !== undefined) {
            updates.push(`lifetime_purchased = $${paramIndex++}`);
            values.push(input.lifetime_purchased);
        }
        if (input.lifetime_used !== undefined) {
            updates.push(`lifetime_used = $${paramIndex++}`);
            values.push(input.lifetime_used);
        }

        if (updates.length === 0) {
            return this.findByWorkspaceId(workspaceId);
        }

        values.push(workspaceId);
        const query = `
            UPDATE flowmaestro.workspace_credits
            SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE workspace_id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<WorkspaceCreditsRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    // =========================================================================
    // Credit Operations
    // =========================================================================

    async getAvailableCredits(workspaceId: string): Promise<number> {
        const credits = await this.findByWorkspaceId(workspaceId);
        if (!credits) return 0;

        return Math.max(
            0,
            credits.subscription_balance +
                credits.purchased_balance +
                credits.bonus_balance -
                credits.reserved
        );
    }

    async getBalance(workspaceId: string): Promise<CreditBalance | null> {
        const credits = await this.findByWorkspaceId(workspaceId);
        if (!credits) return null;

        // Get usage stats for this month
        const usedThisMonth = await this.getUsedThisMonth(workspaceId);

        return {
            available: Math.max(
                0,
                credits.subscription_balance +
                    credits.purchased_balance +
                    credits.bonus_balance -
                    credits.reserved
            ),
            subscription: credits.subscription_balance,
            purchased: credits.purchased_balance,
            bonus: credits.bonus_balance,
            reserved: credits.reserved,
            subscriptionExpiresAt: credits.subscription_expires_at?.toISOString() || null,
            usedThisMonth,
            usedAllTime: credits.lifetime_used
        };
    }

    async addReservation(workspaceId: string, amount: number): Promise<void> {
        const query = `
            UPDATE flowmaestro.workspace_credits
            SET reserved = reserved + $2, updated_at = CURRENT_TIMESTAMP
            WHERE workspace_id = $1
        `;

        await db.query(query, [workspaceId, amount]);
    }

    async releaseReservation(workspaceId: string, amount: number): Promise<void> {
        const query = `
            UPDATE flowmaestro.workspace_credits
            SET reserved = GREATEST(0, reserved - $2), updated_at = CURRENT_TIMESTAMP
            WHERE workspace_id = $1
        `;

        await db.query(query, [workspaceId, amount]);
    }

    async deductCredits(
        workspaceId: string,
        amount: number
    ): Promise<{ subscription: number; purchased: number; bonus: number }> {
        // Deduct in order: subscription -> bonus -> purchased
        const credits = await this.findByWorkspaceId(workspaceId);
        if (!credits) {
            throw new Error("Workspace credits not found");
        }

        let remaining = amount;
        let fromSubscription = 0;
        let fromBonus = 0;
        let fromPurchased = 0;

        // 1. Subscription credits first
        if (credits.subscription_balance > 0 && remaining > 0) {
            fromSubscription = Math.min(credits.subscription_balance, remaining);
            remaining -= fromSubscription;
        }

        // 2. Bonus credits next
        if (credits.bonus_balance > 0 && remaining > 0) {
            fromBonus = Math.min(credits.bonus_balance, remaining);
            remaining -= fromBonus;
        }

        // 3. Purchased credits last
        if (credits.purchased_balance > 0 && remaining > 0) {
            fromPurchased = Math.min(credits.purchased_balance, remaining);
            remaining -= fromPurchased;
        }

        if (remaining > 0) {
            throw new Error("Insufficient credits");
        }

        // Update balances
        const query = `
            UPDATE flowmaestro.workspace_credits
            SET
                subscription_balance = subscription_balance - $2,
                bonus_balance = bonus_balance - $3,
                purchased_balance = purchased_balance - $4,
                lifetime_used = lifetime_used + $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE workspace_id = $1
        `;

        await db.query(query, [workspaceId, fromSubscription, fromBonus, fromPurchased, amount]);

        return {
            subscription: fromSubscription,
            purchased: fromPurchased,
            bonus: fromBonus
        };
    }

    async addSubscriptionCredits(
        workspaceId: string,
        amount: number,
        expiresAt: Date
    ): Promise<void> {
        const query = `
            UPDATE flowmaestro.workspace_credits
            SET
                subscription_balance = $2,
                subscription_expires_at = $3,
                lifetime_allocated = lifetime_allocated + $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE workspace_id = $1
        `;

        await db.query(query, [workspaceId, amount, expiresAt]);
    }

    async addPurchasedCredits(workspaceId: string, amount: number): Promise<void> {
        const query = `
            UPDATE flowmaestro.workspace_credits
            SET
                purchased_balance = purchased_balance + $2,
                lifetime_purchased = lifetime_purchased + $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE workspace_id = $1
        `;

        await db.query(query, [workspaceId, amount]);
    }

    async addBonusCredits(workspaceId: string, amount: number): Promise<void> {
        const query = `
            UPDATE flowmaestro.workspace_credits
            SET
                bonus_balance = bonus_balance + $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE workspace_id = $1
        `;

        await db.query(query, [workspaceId, amount]);
    }

    // =========================================================================
    // Credit Transactions
    // =========================================================================

    async createTransaction(input: CreateCreditTransactionInput): Promise<CreditTransactionModel> {
        const query = `
            INSERT INTO flowmaestro.credit_transactions (
                workspace_id, user_id, amount, balance_before, balance_after,
                transaction_type, operation_type, operation_id, description, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            input.workspace_id,
            input.user_id || null,
            input.amount,
            input.balance_before,
            input.balance_after,
            input.transaction_type,
            input.operation_type || null,
            input.operation_id || null,
            input.description || null,
            JSON.stringify(input.metadata || {})
        ];

        const result = await db.query<CreditTransactionRow>(query, values);
        return this.mapTransactionRow(result.rows[0]);
    }

    async getTransactions(
        workspaceId: string,
        options: {
            limit?: number;
            offset?: number;
            type?: CreditTransactionType;
        } = {}
    ): Promise<CreditTransactionModel[]> {
        const { limit = 50, offset = 0, type } = options;

        let query = `
            SELECT * FROM flowmaestro.credit_transactions
            WHERE workspace_id = $1
        `;
        const values: unknown[] = [workspaceId];
        let paramIndex = 2;

        if (type) {
            query += ` AND transaction_type = $${paramIndex++}`;
            values.push(type);
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        values.push(limit, offset);

        const result = await db.query<CreditTransactionRow>(query, values);
        return result.rows.map((row) => this.mapTransactionRow(row));
    }

    async getUsedThisMonth(workspaceId: string): Promise<number> {
        const query = `
            SELECT COALESCE(SUM(ABS(amount)), 0) as total
            FROM flowmaestro.credit_transactions
            WHERE workspace_id = $1
              AND transaction_type = 'usage'
              AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
        `;

        const result = await db.query<{ total: string }>(query, [workspaceId]);
        return parseInt(result.rows[0].total);
    }

    // =========================================================================
    // Mappers
    // =========================================================================

    private mapRow(row: WorkspaceCreditsRow): WorkspaceCreditsModel {
        return {
            id: row.id,
            workspace_id: row.workspace_id,
            subscription_balance: row.subscription_balance,
            purchased_balance: row.purchased_balance,
            bonus_balance: row.bonus_balance,
            reserved: row.reserved,
            subscription_expires_at: row.subscription_expires_at
                ? new Date(row.subscription_expires_at)
                : null,
            lifetime_allocated: row.lifetime_allocated,
            lifetime_purchased: row.lifetime_purchased,
            lifetime_used: row.lifetime_used,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    }

    private mapTransactionRow(row: CreditTransactionRow): CreditTransactionModel {
        return {
            id: row.id,
            workspace_id: row.workspace_id,
            user_id: row.user_id,
            amount: row.amount,
            balance_before: row.balance_before,
            balance_after: row.balance_after,
            transaction_type: row.transaction_type,
            operation_type: row.operation_type,
            operation_id: row.operation_id,
            description: row.description,
            metadata: row.metadata || {},
            created_at: new Date(row.created_at)
        };
    }

    // Convert transaction model to shared type
    transactionToShared(model: CreditTransactionModel): CreditTransaction {
        return {
            id: model.id,
            workspaceId: model.workspace_id,
            userId: model.user_id,
            amount: model.amount,
            balanceBefore: model.balance_before,
            balanceAfter: model.balance_after,
            transactionType: model.transaction_type,
            operationType: model.operation_type,
            operationId: model.operation_id,
            description: model.description,
            metadata: model.metadata,
            createdAt: model.created_at
        };
    }
}
