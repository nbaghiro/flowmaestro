/**
 * Persona Approval Activities
 *
 * Activities for handling tool approval requests during persona execution.
 */

import type {
    PersonaApprovalActionType,
    PersonaApprovalRequestRiskLevel,
    PersonaApprovalSignalPayload
} from "@flowmaestro/shared";
import { PersonaApprovalRequestRepository } from "../../../storage/repositories/PersonaApprovalRequestRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { activityLogger } from "../../core";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import type { Tool } from "../../../storage/models/Agent";
import type { PersonaAutonomyLevel } from "../../../storage/models/PersonaDefinition";

// =============================================================================
// Types
// =============================================================================

export interface CreatePersonaApprovalRequestInput {
    instanceId: string;
    workspaceId: string;
    actionType: PersonaApprovalActionType;
    toolName: string | null;
    actionDescription: string;
    actionArguments: Record<string, unknown>;
    riskLevel: PersonaApprovalRequestRiskLevel;
    estimatedCostCredits?: number;
    agentContext?: string;
    alternatives?: string;
}

export interface CreatePersonaApprovalRequestResult {
    approvalId: string;
}

export interface CheckToolRequiresApprovalInput {
    tool: Tool;
    autonomyLevel: PersonaAutonomyLevel;
    toolRiskOverrides: Record<string, string>;
}

export interface EmitApprovalNeededInput {
    instanceId: string;
    approvalId: string;
    actionDescription: string;
    toolName: string | null;
    riskLevel: PersonaApprovalRequestRiskLevel;
    estimatedCostCredits: number | null;
}

export interface EmitApprovalResolvedInput {
    instanceId: string;
    approvalId: string;
    decision: "approved" | "denied";
}

export interface ClearPendingApprovalInput {
    instanceId: string;
}

// =============================================================================
// Default Risk Classifications
// =============================================================================

/**
 * Default risk levels for tool categories
 */
const DEFAULT_TOOL_RISKS: Record<string, PersonaApprovalRequestRiskLevel> = {
    // Safe operations - read-only, internal
    web_search: "low",
    web_browse: "low",
    web_scrape: "low",
    knowledge_base_query: "low",
    read_file: "low",
    list_files: "low",
    search_memory: "low",
    thread_memory: "low",
    data_analysis: "low",

    // Medium risk - external but reversible
    screenshot_capture: "medium",

    // High risk - external write operations
    write_file: "high",
    delete_file: "high",
    send_email: "high",
    send_message: "high",
    create_task: "high",
    update_task: "high",
    create_issue: "high",
    create_pr: "high",
    post_comment: "high"
};

/**
 * Integration providers that are high-risk by default
 */
const HIGH_RISK_PROVIDERS = new Set([
    "slack",
    "discord",
    "telegram",
    "email",
    "github",
    "gitlab",
    "jira",
    "linear",
    "notion",
    "asana",
    "trello"
]);

// =============================================================================
// Activity Functions
// =============================================================================

/**
 * Determine if a tool requires approval based on autonomy level and risk
 */
export function checkToolRequiresApproval(input: CheckToolRequiresApprovalInput): boolean {
    const { tool, autonomyLevel, toolRiskOverrides } = input;

    // Full autonomy - never require approval
    if (autonomyLevel === "full_auto") {
        return false;
    }

    // Approve all - always require approval
    if (autonomyLevel === "approve_all") {
        return true;
    }

    // Check user override first
    const overrideKey = tool.name.toLowerCase();
    if (toolRiskOverrides[overrideKey]) {
        const override = toolRiskOverrides[overrideKey];
        if (override === "safe" || override === "low") {
            return false;
        }
        if (override === "approval_required" || override === "high") {
            return true;
        }
    }

    // Check default risk level
    const defaultRisk = getToolRiskLevel(tool);
    return defaultRisk === "high" || defaultRisk === "medium";
}

/**
 * Get the risk level for a tool
 */
export function getToolRiskLevel(tool: Tool): PersonaApprovalRequestRiskLevel {
    const toolName = tool.name.toLowerCase();

    // Check direct tool name mapping
    if (DEFAULT_TOOL_RISKS[toolName]) {
        return DEFAULT_TOOL_RISKS[toolName];
    }

    // Check if it's an integration tool with a high-risk provider
    if (tool.type === "mcp" && tool.config?.provider) {
        const provider = String(tool.config.provider).toLowerCase();
        if (HIGH_RISK_PROVIDERS.has(provider)) {
            return "high";
        }
    }

    // Check tool name patterns
    if (
        toolName.includes("write") ||
        toolName.includes("create") ||
        toolName.includes("delete") ||
        toolName.includes("send") ||
        toolName.includes("post") ||
        toolName.includes("update") ||
        toolName.includes("modify")
    ) {
        return "high";
    }

    if (
        toolName.includes("read") ||
        toolName.includes("get") ||
        toolName.includes("list") ||
        toolName.includes("search") ||
        toolName.includes("query")
    ) {
        return "low";
    }

    // Default to medium for unknown tools
    return "medium";
}

/**
 * Generate a human-readable description of what a tool will do
 */
export function generateToolDescription(
    toolName: string,
    args: Record<string, unknown>
): string {
    const argsStr = Object.entries(args)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => {
            const value = typeof v === "string" ? v : JSON.stringify(v);
            const truncated = value.length > 50 ? value.substring(0, 50) + "..." : value;
            return `${k}="${truncated}"`;
        })
        .join(", ");

    return `Execute ${toolName}(${argsStr})`;
}

/**
 * Create an approval request in the database
 */
export async function createPersonaApprovalRequest(
    input: CreatePersonaApprovalRequestInput
): Promise<CreatePersonaApprovalRequestResult> {
    const {
        instanceId,
        actionType,
        toolName,
        actionDescription,
        actionArguments,
        riskLevel,
        estimatedCostCredits,
        agentContext,
        alternatives
    } = input;

    activityLogger.info("Creating persona approval request", {
        instanceId,
        actionType,
        toolName,
        riskLevel
    });

    const approvalRepo = new PersonaApprovalRequestRepository();

    // Create the approval request
    const approval = await approvalRepo.create({
        instance_id: instanceId,
        action_type: actionType,
        tool_name: toolName || undefined,
        action_description: actionDescription,
        action_arguments: actionArguments,
        risk_level: riskLevel,
        estimated_cost_credits: estimatedCostCredits,
        agent_context: agentContext,
        alternatives: alternatives
    });

    // Update the persona instance with the pending approval ID
    const instanceRepo = new PersonaInstanceRepository();
    await instanceRepo.update(instanceId, {
        status: "waiting_approval",
        pending_approval_id: approval.id
    });

    activityLogger.info("Approval request created", {
        approvalId: approval.id,
        instanceId
    });

    return { approvalId: approval.id };
}

/**
 * Emit WebSocket event when approval is needed
 */
export async function emitApprovalNeeded(input: EmitApprovalNeededInput): Promise<void> {
    const { instanceId, approvalId, actionDescription, toolName, riskLevel, estimatedCostCredits } =
        input;

    activityLogger.info("Emitting approval needed event", {
        instanceId,
        approvalId
    });

    await redisEventBus.publishJson(`persona:${instanceId}:events`, {
        type: "persona:instance:approval_needed",
        timestamp: Date.now(),
        instanceId,
        approval: {
            approval_id: approvalId,
            action_description: actionDescription,
            tool_name: toolName,
            risk_level: riskLevel,
            estimated_cost: estimatedCostCredits,
            requested_at: new Date().toISOString()
        }
    });
}

/**
 * Emit WebSocket event when approval is resolved
 */
export async function emitApprovalResolved(input: EmitApprovalResolvedInput): Promise<void> {
    const { instanceId, approvalId, decision } = input;

    activityLogger.info("Emitting approval resolved event", {
        instanceId,
        approvalId,
        decision
    });

    await redisEventBus.publishJson(`persona:${instanceId}:events`, {
        type: "persona:instance:approval_resolved",
        timestamp: Date.now(),
        instanceId,
        approval_id: approvalId,
        decision
    });
}

/**
 * Clear the pending approval from persona instance
 * Called after approval is resolved
 */
export async function clearPendingApproval(input: ClearPendingApprovalInput): Promise<void> {
    const { instanceId } = input;

    activityLogger.info("Clearing pending approval", { instanceId });

    const instanceRepo = new PersonaInstanceRepository();
    await instanceRepo.update(instanceId, {
        status: "running",
        pending_approval_id: null
    });
}

/**
 * Convert signal payload to a format the workflow can use
 */
export function parseApprovalSignal(payload: PersonaApprovalSignalPayload): {
    approvalId: string;
    decision: "approved" | "denied";
    note?: string;
} {
    return {
        approvalId: payload.approval_id,
        decision: payload.decision,
        note: payload.note
    };
}
