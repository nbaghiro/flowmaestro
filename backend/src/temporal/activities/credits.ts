/**
 * Credit Activities
 *
 * Temporal activities for credit management.
 * These wrap CreditService methods for use in Temporal workflows.
 *
 * Temporal workflows cannot directly call external services (they must be deterministic),
 * so these activities provide the bridge to credit operations.
 */

import { createServiceLogger } from "../../core/logging";
import { creditService } from "../../services/workspace/CreditService";

const logger = createServiceLogger("CreditActivities");

// ============================================================================
// ACTIVITY INPUT TYPES
// ============================================================================

export interface CheckCreditsInput {
    workspaceId: string;
    estimatedCredits: number;
}

export interface ShouldAllowExecutionInput {
    workspaceId: string;
    estimatedCredits: number;
}

export interface ReserveCreditsInput {
    workspaceId: string;
    estimatedCredits: number;
}

export interface FinalizeCreditsInput {
    workspaceId: string;
    userId: string | null;
    reservedAmount: number;
    actualAmount: number;
    operationType: "workflow_execution" | "agent_execution" | "persona_execution";
    operationId: string;
    description: string;
    metadata?: Record<string, unknown>;
}

export interface ReleaseCreditsInput {
    workspaceId: string;
    amount: number;
}

export interface CalculateLLMCreditsInput {
    model: string;
    inputTokens: number;
    outputTokens: number;
}

export interface CalculateNodeCreditsInput {
    nodeType: string;
}

export interface EstimateWorkflowCreditsInput {
    workflowDefinition: {
        // Supports both frontend format (array) and backend format (Record)
        nodes:
            | Array<{ id: string; type: string; data?: Record<string, unknown> }>
            | Record<string, { type: string; data?: Record<string, unknown> }>;
    };
}

export interface GetBalanceInput {
    workspaceId: string;
}

// ============================================================================
// CREDIT CHECK ACTIVITIES
// ============================================================================

/**
 * Check if workspace has enough credits for an operation.
 * Returns true if sufficient credits are available.
 */
export async function checkCredits(input: CheckCreditsInput): Promise<boolean> {
    const { workspaceId, estimatedCredits } = input;

    logger.debug({ workspaceId, estimatedCredits }, "Checking credits availability");

    const hasEnough = await creditService.hasEnoughCredits(workspaceId, estimatedCredits);

    logger.debug({ workspaceId, estimatedCredits, hasEnough }, "Credit check result");

    return hasEnough;
}

/**
 * Check if execution should be allowed with grace period logic.
 * Allows execution if shortfall is < 10% of estimated cost (prevents blocking for rounding).
 * Returns true if execution should proceed.
 */
export async function shouldAllowExecution(input: ShouldAllowExecutionInput): Promise<boolean> {
    const { workspaceId, estimatedCredits } = input;

    logger.debug({ workspaceId, estimatedCredits }, "Checking if execution should be allowed");

    const balance = await creditService.getBalance(workspaceId);
    const available = balance?.available || 0;

    // Allow if sufficient credits
    if (available >= estimatedCredits) {
        logger.debug({ workspaceId, available, estimatedCredits }, "Sufficient credits available");
        return true;
    }

    // Allow small overdraft (< 10% shortfall)
    const shortfall = estimatedCredits - available;
    const shortfallPercent = estimatedCredits > 0 ? (shortfall / estimatedCredits) * 100 : 100;

    const allowed = shortfallPercent < 10;

    logger.debug(
        { workspaceId, available, estimatedCredits, shortfall, shortfallPercent, allowed },
        "Grace period check"
    );

    return allowed;
}

/**
 * Get the current credit balance for a workspace.
 */
export async function getCreditsBalance(input: GetBalanceInput) {
    const { workspaceId } = input;

    logger.debug({ workspaceId }, "Getting credit balance");

    const balance = await creditService.getBalance(workspaceId);

    return balance;
}

// ============================================================================
// CREDIT RESERVATION ACTIVITIES
// ============================================================================

/**
 * Reserve credits before execution.
 * Returns true if reservation was successful.
 */
export async function reserveCredits(input: ReserveCreditsInput): Promise<boolean> {
    const { workspaceId, estimatedCredits } = input;

    logger.info({ workspaceId, estimatedCredits }, "Reserving credits");

    const success = await creditService.reserveCredits(workspaceId, estimatedCredits);

    if (success) {
        logger.info({ workspaceId, estimatedCredits }, "Credits reserved successfully");
    } else {
        logger.warn({ workspaceId, estimatedCredits }, "Failed to reserve credits");
    }

    return success;
}

/**
 * Release reserved credits (when execution is cancelled or fails without doing work).
 */
export async function releaseCredits(input: ReleaseCreditsInput): Promise<void> {
    const { workspaceId, amount } = input;

    logger.info({ workspaceId, amount }, "Releasing reserved credits");

    await creditService.releaseCredits(workspaceId, amount);

    logger.info({ workspaceId, amount }, "Reserved credits released");
}

// ============================================================================
// CREDIT FINALIZATION ACTIVITIES
// ============================================================================

/**
 * Finalize credits after execution.
 * Releases reservation and deducts actual amount used.
 * Records transaction with metadata for audit trail.
 */
export async function finalizeCredits(input: FinalizeCreditsInput): Promise<void> {
    const {
        workspaceId,
        userId,
        reservedAmount,
        actualAmount,
        operationType,
        operationId,
        description,
        metadata
    } = input;

    logger.info(
        {
            workspaceId,
            reservedAmount,
            actualAmount,
            delta: reservedAmount - actualAmount,
            operationType,
            operationId
        },
        "Finalizing credits"
    );

    await creditService.finalizeCredits(
        workspaceId,
        userId,
        reservedAmount,
        actualAmount,
        operationType,
        operationId,
        description
    );

    // Log metadata for debugging (transaction stores subset)
    if (metadata) {
        logger.debug({ workspaceId, operationId, metadata }, "Credit finalization metadata");
    }

    logger.info(
        { workspaceId, actualAmount, operationType, operationId },
        "Credits finalized successfully"
    );
}

// ============================================================================
// CREDIT CALCULATION ACTIVITIES
// ============================================================================

/**
 * Calculate LLM credits for token usage.
 * Made async to work properly with Temporal's proxyActivities.
 */
export async function calculateLLMCredits(input: CalculateLLMCreditsInput): Promise<number> {
    const { model, inputTokens, outputTokens } = input;

    const credits = creditService.calculateLLMCredits(model, inputTokens, outputTokens);

    logger.debug({ model, inputTokens, outputTokens, credits }, "Calculated LLM credits");

    return credits;
}

/**
 * Calculate flat credits for a node type.
 * Made async to work properly with Temporal's proxyActivities.
 */
export async function calculateNodeCredits(input: CalculateNodeCreditsInput): Promise<number> {
    const { nodeType } = input;

    const credits = creditService.calculateNodeCredits(nodeType);

    logger.debug({ nodeType, credits }, "Calculated node credits");

    return credits;
}

/**
 * Estimate total credits for a workflow definition.
 * Handles both frontend (array) and backend (Record) node formats.
 */
export async function estimateWorkflowCredits(input: EstimateWorkflowCreditsInput) {
    const { workflowDefinition } = input;

    // Convert Record format to Array format if needed
    let nodesArray: Array<{ id: string; type: string; data?: Record<string, unknown> }>;

    if (Array.isArray(workflowDefinition.nodes)) {
        nodesArray = workflowDefinition.nodes;
    } else {
        // Convert Record<string, WorkflowNode> to Array
        nodesArray = Object.entries(workflowDefinition.nodes).map(([id, node]) => ({
            id,
            type: node.type,
            data: node.data
        }));
    }

    logger.debug({ nodeCount: nodesArray.length }, "Estimating workflow credits");

    const estimate = await creditService.estimateWorkflowCredits({ nodes: nodesArray });

    logger.debug({ totalCredits: estimate.totalCredits }, "Workflow credit estimate");

    return estimate;
}
