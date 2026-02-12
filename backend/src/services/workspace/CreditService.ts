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
    "gpt-4.1": { input: 2.0, output: 8.0 },
    "gpt-4.1-mini": { input: 0.4, output: 1.6 },
    "gpt-4.1-nano": { input: 0.1, output: 0.4 },
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4-turbo": { input: 10, output: 30 },
    "gpt-4": { input: 30, output: 60 },
    "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
    o3: { input: 10, output: 40 },
    "o3-mini": { input: 1.1, output: 4.4 },
    "o4-mini": { input: 1.1, output: 4.4 },

    // Anthropic
    "claude-opus-4-5-20250101": { input: 15, output: 75 },
    "claude-sonnet-4-5-20250101": { input: 3, output: 15 },
    "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
    "claude-3-opus-20240229": { input: 15, output: 75 },
    "claude-3-sonnet-20240229": { input: 3, output: 15 },
    "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },

    // Google
    "gemini-2.5-pro": { input: 1.25, output: 5 },
    "gemini-2.5-flash": { input: 0.15, output: 0.6 },
    "gemini-2.0-flash-exp": { input: 0.1, output: 0.4 },
    "gemini-1.5-pro": { input: 1.25, output: 5 },
    "gemini-1.5-flash": { input: 0.075, output: 0.3 },

    // Groq/Open Source
    "llama-3.1-70b-versatile": { input: 0.59, output: 0.79 },
    "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
    "llama-4-scout": { input: 0.5, output: 1.0 },
    "llama-4-maverick": { input: 1.0, output: 2.0 },
    "mixtral-8x7b-32768": { input: 0.24, output: 0.24 },
    "deepseek-r1": { input: 0.55, output: 2.19 },

    // xAI
    "grok-3": { input: 3, output: 15 },
    "grok-3-fast": { input: 1, output: 5 },

    // Cohere
    "command-a": { input: 2.5, output: 10 },
    "command-r-plus": { input: 2.5, output: 10 },
    "command-r": { input: 0.15, output: 0.6 },

    // Default fallback
    default: { input: 2, output: 8 }
};

// Node type costs (flat credits per execution)
const NODE_COSTS: Record<string, number> = {
    // FREE (0 credits)
    trigger_manual: 0,
    trigger_schedule: 0,
    trigger_webhook: 0,
    trigger_form: 0,
    variable: 0,
    output: 0,
    condition: 0,
    merge: 0,
    delay: 0,
    loop: 0,

    // DATA & LOGIC (5-15 credits)
    data_transform: 5,
    template_output: 5,
    chart_generation: 10,
    code_execution: 15,

    // NETWORK (10-25 credits)
    http_request: 10,
    web_search: 15,
    web_browse: 20,
    screenshot_capture: 15,

    // FILE & DOCUMENT (10-50 credits)
    spreadsheet_generation: 10,
    pdf_generation: 15,
    ocr_extraction: 25,
    file_download: 5,

    // KNOWLEDGE BASE (25-100 credits)
    knowledge_search: 25,
    kb_query: 25,
    knowledge_index: 50,
    kb_index_url: 100,

    // VISION & ANALYSIS (25-75 credits)
    vision: 25,
    vision_detailed: 50,
    document_analysis: 75,

    // IMAGE GENERATION (75-300 credits)
    image_generation: 150,
    image_generation_dalle_2_256: 75,
    image_generation_dalle_2_512: 100,
    image_generation_dalle_2_1024: 125,
    image_generation_dalle_3: 150,
    image_generation_dalle_3_hd: 200,
    image_generation_stable: 100,
    image_generation_flux_schnell: 75,
    image_generation_flux_dev: 100,
    image_generation_flux_pro: 150,
    image_generation_flux_ultra: 250,
    image_generation_midjourney: 300,
    image_generation_ideogram: 150,
    image_generation_recraft: 150,

    // IMAGE EDITING (35-125 credits)
    image_upscale: 50,
    image_remove_background: 35,
    image_inpaint: 100,
    image_outpaint: 125,
    image_style_transfer: 100,

    // VIDEO GENERATION (500-1500 credits)
    video_generation: 750,
    video_generation_stable: 500,
    video_generation_mochi: 500,
    video_generation_hunyuan: 600,
    video_generation_luma: 750,
    video_generation_minimax: 800,
    video_generation_runway: 1000,
    video_generation_kling: 1000,
    video_generation_veo_fast: 1000,
    video_generation_veo: 1500,

    // AUDIO (25-75 credits)
    tts: 25,
    tts_elevenlabs: 50,
    transcription: 50,
    transcription_timestamps: 75,

    // EMBEDDINGS (10-25 per 1K tokens)
    embeddings: 15,
    embeddings_small: 10,
    embeddings_large: 20,

    // INTEGRATIONS (15-50 credits)
    integration_read: 15,
    integration_write: 25,
    integration_complex: 50,
    integration: 20,

    // ROUTING (30-50 credits)
    router: 30,
    router_complex: 50,

    // AGENT (per-turn base, LLM costs added separately)
    agent_turn: 15,
    agent_tool_call: 15,
    agent_memory: 25,

    // Default for unknown nodes
    default: 5
};

// 1 credit = $0.02, with 400% margin (5x cost)
const CREDIT_VALUE_USD = 0.02;
const MARGIN = 5.0;
const MIN_LLM_CREDITS = 25;

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
        // Get balance BEFORE releasing reservation (for accurate transaction log)
        const balanceBefore = await this.creditRepo.getBalance(workspaceId);
        if (!balanceBefore) {
            throw new Error("Workspace credits not found");
        }

        // Release the reservation
        await this.creditRepo.releaseReservation(workspaceId, reservedAmount);

        // Deduct actual credits
        await this.creditRepo.deductCredits(workspaceId, actualAmount);

        // Get balance AFTER all operations
        const balanceAfter = await this.creditRepo.getBalance(workspaceId);

        // Record transaction with accurate before/after values
        await this.creditRepo.createTransaction({
            workspace_id: workspaceId,
            user_id: userId || undefined,
            amount: -actualAmount,
            balance_before: balanceBefore.available,
            balance_after: balanceAfter?.available ?? balanceBefore.available - actualAmount,
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

        // Convert to credits with 3x margin
        const credits = Math.ceil((totalCostUSD / CREDIT_VALUE_USD) * MARGIN);

        return Math.max(MIN_LLM_CREDITS, credits); // Minimum 25 credits
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
