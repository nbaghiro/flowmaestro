/**
 * Workflow Validation Engine
 *
 * Main orchestrator for workflow-level validation.
 * Coordinates all validation rules and produces a unified result.
 */

import {
    runStructuralValidation,
    runConfigurationValidation,
    runDataFlowValidation,
    runSemanticValidation
} from "./workflow-validation-rules";
import { createEmptyValidationResult } from "./workflow-validation-types";
import type {
    WorkflowValidationResult,
    WorkflowValidationIssue,
    WorkflowValidationContext,
    ValidatableNode,
    ValidatableEdge
} from "./workflow-validation-types";

// ============================================================================
// VALIDATION ENGINE
// ============================================================================

/**
 * Options for the validation engine.
 */
export interface WorkflowValidationOptions {
    /** Skip structural validation (orphan nodes, unreachable, etc.) */
    skipStructural?: boolean;

    /** Skip configuration validation (connection IDs, KB IDs) */
    skipConfiguration?: boolean;

    /** Skip data flow validation (undefined variables, conflicts) */
    skipDataFlow?: boolean;

    /** Skip semantic validation (empty prompts, unused outputs, etc.) */
    skipSemantic?: boolean;

    /** Only validate specific node IDs (partial validation) */
    nodeIds?: string[];
}

/**
 * Main workflow validation engine.
 */
export class WorkflowValidationEngine {
    /**
     * Validate a complete workflow.
     *
     * @param nodes - Array of workflow nodes
     * @param edges - Array of workflow edges
     * @param context - Validation context with external data (connections, KBs)
     * @param options - Validation options
     * @returns Complete validation result
     */
    validateWorkflow(
        nodes: ValidatableNode[],
        edges: ValidatableEdge[],
        context: WorkflowValidationContext = {
            connectionIds: [],
            knowledgeBaseIds: [],
            inputVariables: []
        },
        options: WorkflowValidationOptions = {}
    ): WorkflowValidationResult {
        const allIssues: WorkflowValidationIssue[] = [];

        // Filter nodes if specific nodeIds are provided
        const nodesToValidate = options.nodeIds
            ? nodes.filter((n) => options.nodeIds!.includes(n.id))
            : nodes;

        // Run structural validation
        if (!options.skipStructural) {
            const structuralIssues = runStructuralValidation(nodesToValidate, edges);
            allIssues.push(...structuralIssues);
        }

        // Run configuration validation
        if (!options.skipConfiguration) {
            const configIssues = runConfigurationValidation(nodesToValidate, context);
            allIssues.push(...configIssues);
        }

        // Run data flow validation
        if (!options.skipDataFlow) {
            const dataFlowIssues = runDataFlowValidation(nodesToValidate, edges, context);
            allIssues.push(...dataFlowIssues);
        }

        // Run semantic validation
        if (!options.skipSemantic) {
            const semanticIssues = runSemanticValidation(nodesToValidate, edges);
            allIssues.push(...semanticIssues);
        }

        return this.buildResult(allIssues);
    }

    /**
     * Validate a single node in the context of the workflow.
     * Useful for incremental validation after node changes.
     *
     * @param nodeId - ID of the node to validate
     * @param nodes - All workflow nodes
     * @param edges - All workflow edges
     * @param context - Validation context
     * @returns Issues specific to the given node
     */
    validateNode(
        nodeId: string,
        nodes: ValidatableNode[],
        edges: ValidatableEdge[],
        context: WorkflowValidationContext = {
            connectionIds: [],
            knowledgeBaseIds: [],
            inputVariables: []
        }
    ): WorkflowValidationIssue[] {
        // Get issues from full validation but filter to this node
        const result = this.validateWorkflow(nodes, edges, context);

        // Return issues for this specific node
        return result.nodeIssues.get(nodeId) || [];
    }

    /**
     * Get issues for a specific node from an existing validation result.
     *
     * @param nodeId - ID of the node
     * @param result - Existing validation result
     * @returns Issues for the node
     */
    getNodeIssues(nodeId: string, result: WorkflowValidationResult): WorkflowValidationIssue[] {
        return result.nodeIssues.get(nodeId) || [];
    }

    /**
     * Check if a workflow is valid (has no errors).
     *
     * @param result - Validation result to check
     * @returns True if no errors
     */
    isValid(result: WorkflowValidationResult): boolean {
        return result.isValid;
    }

    /**
     * Get all errors from a validation result.
     *
     * @param result - Validation result
     * @returns Array of error issues
     */
    getErrors(result: WorkflowValidationResult): WorkflowValidationIssue[] {
        return result.allIssues.filter((i) => i.severity === "error");
    }

    /**
     * Get all warnings from a validation result.
     *
     * @param result - Validation result
     * @returns Array of warning issues
     */
    getWarnings(result: WorkflowValidationResult): WorkflowValidationIssue[] {
        return result.allIssues.filter((i) => i.severity === "warning");
    }

    /**
     * Build the final validation result from collected issues.
     */
    private buildResult(issues: WorkflowValidationIssue[]): WorkflowValidationResult {
        const result = createEmptyValidationResult();

        // Group issues by node
        for (const issue of issues) {
            if (issue.nodeId) {
                const nodeIssues = result.nodeIssues.get(issue.nodeId) || [];
                nodeIssues.push(issue);
                result.nodeIssues.set(issue.nodeId, nodeIssues);
            } else {
                result.workflowIssues.push(issue);
            }
        }

        // Build flat list and summary
        result.allIssues = issues;
        result.summary.errorCount = issues.filter((i) => i.severity === "error").length;
        result.summary.warningCount = issues.filter((i) => i.severity === "warning").length;
        result.summary.infoCount = issues.filter((i) => i.severity === "info").length;

        // Update validity flags
        result.isValid = result.summary.errorCount === 0;
        result.hasWarnings = result.summary.warningCount > 0;
        result.validatedAt = Date.now();

        return result;
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Default validation engine instance.
 * Use this for convenience instead of creating a new instance.
 */
export const workflowValidationEngine = new WorkflowValidationEngine();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Validate a workflow using the default engine.
 * Convenience function for simple use cases.
 */
export function validateWorkflow(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[],
    context?: WorkflowValidationContext,
    options?: WorkflowValidationOptions
): WorkflowValidationResult {
    return workflowValidationEngine.validateWorkflow(nodes, edges, context, options);
}

/**
 * Convert React Flow nodes to validatable format.
 * React Flow nodes have a slightly different structure than our validation types.
 */
export function toValidatableNodes(
    reactFlowNodes: Array<{
        id: string;
        type?: string;
        data?: Record<string, unknown>;
        position: { x: number; y: number };
    }>
): ValidatableNode[] {
    return reactFlowNodes.map((node) => ({
        id: node.id,
        type: node.type || "default",
        data: (node.data || {}) as Record<string, unknown>,
        position: node.position
    }));
}

/**
 * Convert React Flow edges to validatable format.
 */
export function toValidatableEdges(
    reactFlowEdges: Array<{
        id: string;
        source: string;
        target: string;
        sourceHandle?: string | null;
        targetHandle?: string | null;
    }>
): ValidatableEdge[] {
    return reactFlowEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined
    }));
}
