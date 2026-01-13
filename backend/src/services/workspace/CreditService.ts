import type {
    CreditBalance,
    CreditEstimate,
    CreditBreakdownItem,
    CreditTransaction
} from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import { WorkspaceCreditRepository } from "../../storage/repositories/WorkspaceCreditRepository";

const logger = createServiceLogger("CreditService");

// LLM pricing per 1M tokens (in USD)
const LLM_PRICING: Record<string, { input: number; output: number }> = {
    // OpenAI
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4-turbo": { input: 10, output: 30 },
    "gpt-4": { input: 30, output: 60 },
    "gpt-3.5-turbo": { input: 0.5, output: 1.5 },

    // Anthropic
    "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
    "claude-3-opus-20240229": { input: 15, output: 75 },
    "claude-3-sonnet-20240229": { input: 3, output: 15 },
    "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },

    // Google
    "gemini-1.5-pro": { input: 1.25, output: 5 },
    "gemini-1.5-flash": { input: 0.075, output: 0.3 },
    "gemini-2.0-flash-exp": { input: 0.1, output: 0.4 },

    // Groq
    "llama-3.1-70b-versatile": { input: 0.59, output: 0.79 },
    "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
    "mixtral-8x7b-32768": { input: 0.24, output: 0.24 },

    // Default fallback
    default: { input: 1, output: 3 }
};

// Node type costs (flat credits per execution)
const NODE_COSTS: Record<string, number> = {
    // Free nodes
    trigger_manual: 0,
    trigger_schedule: 0,
    trigger_webhook: 0,
    variable: 0,
    output: 0,
    condition: 0,
    merge: 0,
    delay: 0,

    // Data processing (1-5 credits)
    data_transform: 1,
    http_request: 2,
    code_execution: 3,
    database_query: 3,

    // Knowledge base (5-10 credits)
    knowledge_search: 5,
    knowledge_index: 10,

    // Image generation (50-200 credits)
    image_generation_dalle: 50,
    image_generation_midjourney: 100,
    image_generation_stable: 30,

    // Default for unknown nodes
    default: 1
};

// 1 credit = $0.01, with 20% margin
const CREDIT_VALUE_USD = 0.01;
const MARGIN = 1.2;

export class CreditService {
    private creditRepo: WorkspaceCreditRepository;

    constructor() {
        this.creditRepo = new WorkspaceCreditRepository();
    }

    /**
     * Get credit balance for a workspace.
     */
    async getBalance(workspaceId: string): Promise<CreditBalance | null> {
        return this.creditRepo.getBalance(workspaceId);
    }

    /**
     * Check if workspace has enough credits for an operation.
     */
    async hasEnoughCredits(workspaceId: string, amount: number): Promise<boolean> {
        const available = await this.creditRepo.getAvailableCredits(workspaceId);
        return available >= amount;
    }

    /**
     * Reserve credits before execution.
     * Returns true if reservation was successful.
     */
    async reserveCredits(workspaceId: string, estimatedAmount: number): Promise<boolean> {
        const available = await this.creditRepo.getAvailableCredits(workspaceId);

        if (available < estimatedAmount) {
            logger.warn(
                { workspaceId, estimated: estimatedAmount, available },
                "Insufficient credits for reservation"
            );
            return false;
        }

        await this.creditRepo.addReservation(workspaceId, estimatedAmount);
        logger.debug({ workspaceId, amount: estimatedAmount }, "Credits reserved");
        return true;
    }

    /**
     * Release reserved credits (when execution is cancelled or fails).
     */
    async releaseCredits(workspaceId: string, amount: number): Promise<void> {
        await this.creditRepo.releaseReservation(workspaceId, amount);
        logger.debug({ workspaceId, amount }, "Reserved credits released");
    }

    /**
     * Finalize credits after execution.
     * Releases reservation and deducts actual amount used.
     */
    async finalizeCredits(
        workspaceId: string,
        userId: string | null,
        reservedAmount: number,
        actualAmount: number,
        operationType: string,
        operationId?: string,
        description?: string
    ): Promise<void> {
        // Release the reservation
        await this.creditRepo.releaseReservation(workspaceId, reservedAmount);

        // Get current balance for transaction record
        const balance = await this.creditRepo.getBalance(workspaceId);
        if (!balance) {
            throw new Error("Workspace credits not found");
        }

        const balanceBefore = balance.available + reservedAmount;

        // Deduct actual credits
        await this.creditRepo.deductCredits(workspaceId, actualAmount);

        // Record transaction
        await this.creditRepo.createTransaction({
            workspace_id: workspaceId,
            user_id: userId || undefined,
            amount: -actualAmount,
            balance_before: balanceBefore,
            balance_after: balanceBefore - actualAmount,
            transaction_type: "usage",
            operation_type: operationType,
            operation_id: operationId,
            description
        });

        logger.info({ workspaceId, actualAmount, operationType, operationId }, "Credits finalized");
    }

    /**
     * Calculate LLM credits for token usage.
     */
    calculateLLMCredits(model: string, inputTokens: number, outputTokens: number): number {
        const pricing = LLM_PRICING[model] || LLM_PRICING["default"];

        const inputCostUSD = (inputTokens / 1_000_000) * pricing.input;
        const outputCostUSD = (outputTokens / 1_000_000) * pricing.output;
        const totalCostUSD = inputCostUSD + outputCostUSD;

        // Convert to credits with margin
        const credits = Math.ceil((totalCostUSD / CREDIT_VALUE_USD) * MARGIN);

        return Math.max(1, credits); // Minimum 1 credit
    }

    /**
     * Calculate flat credits for a node type.
     */
    calculateNodeCredits(nodeType: string): number {
        return NODE_COSTS[nodeType] || NODE_COSTS["default"];
    }

    /**
     * Estimate credits for a workflow execution.
     */
    async estimateWorkflowCredits(workflowDefinition: {
        nodes: Array<{ id: string; type: string; data?: Record<string, unknown> }>;
    }): Promise<CreditEstimate> {
        const breakdown: CreditBreakdownItem[] = [];
        let totalCredits = 0;

        for (const node of workflowDefinition.nodes) {
            const nodeType = node.type;
            let credits = this.calculateNodeCredits(nodeType);

            // If it's an LLM node, estimate token usage
            if (nodeType === "llm" || nodeType === "agent") {
                const model = (node.data?.model as string) || "gpt-4o-mini";
                // Estimate ~500 input tokens, ~200 output tokens per call
                credits = this.calculateLLMCredits(model, 500, 200);
            }

            breakdown.push({
                nodeId: node.id,
                nodeType,
                credits,
                description: `${nodeType} execution`
            });

            totalCredits += credits;
        }

        return {
            totalCredits,
            breakdown,
            confidence: "estimate"
        };
    }

    /**
     * Add subscription credits (monthly refresh).
     */
    async addSubscriptionCredits(
        workspaceId: string,
        amount: number,
        expiresAt: Date
    ): Promise<void> {
        // Get current balance for transaction
        const balance = await this.creditRepo.getBalance(workspaceId);
        if (!balance) {
            throw new Error("Workspace credits not found");
        }

        await this.creditRepo.addSubscriptionCredits(workspaceId, amount, expiresAt);

        // Record transaction
        await this.creditRepo.createTransaction({
            workspace_id: workspaceId,
            amount,
            balance_before: balance.available,
            balance_after: balance.available + amount,
            transaction_type: "subscription",
            description: `Monthly subscription credits (${amount} credits)`
        });

        logger.info({ workspaceId, amount }, "Subscription credits added");
    }

    /**
     * Add purchased credits.
     */
    async addPurchasedCredits(
        workspaceId: string,
        userId: string,
        amount: number,
        packId: string
    ): Promise<void> {
        const balance = await this.creditRepo.getBalance(workspaceId);
        if (!balance) {
            throw new Error("Workspace credits not found");
        }

        await this.creditRepo.addPurchasedCredits(workspaceId, amount);

        // Record transaction
        await this.creditRepo.createTransaction({
            workspace_id: workspaceId,
            user_id: userId,
            amount,
            balance_before: balance.available,
            balance_after: balance.available + amount,
            transaction_type: "purchase",
            description: `Credit pack purchase: ${packId}`,
            metadata: { packId }
        });

        logger.info({ workspaceId, userId, amount, packId }, "Purchased credits added");
    }

    /**
     * Add bonus credits (promotions, referrals, etc.).
     */
    async addBonusCredits(workspaceId: string, amount: number, reason: string): Promise<void> {
        const balance = await this.creditRepo.getBalance(workspaceId);
        if (!balance) {
            throw new Error("Workspace credits not found");
        }

        await this.creditRepo.addBonusCredits(workspaceId, amount);

        // Record transaction
        await this.creditRepo.createTransaction({
            workspace_id: workspaceId,
            amount,
            balance_before: balance.available,
            balance_after: balance.available + amount,
            transaction_type: "bonus",
            description: reason
        });

        logger.info({ workspaceId, amount, reason }, "Bonus credits added");
    }

    /**
     * Get credit transaction history.
     */
    async getTransactions(
        workspaceId: string,
        options?: { limit?: number; offset?: number }
    ): Promise<CreditTransaction[]> {
        const transactions = await this.creditRepo.getTransactions(workspaceId, options);
        return transactions.map((t) => this.creditRepo.transactionToShared(t));
    }
}

// Singleton instance
export const creditService = new CreditService();
