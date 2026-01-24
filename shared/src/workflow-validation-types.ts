/**
 * Workflow Validation Types
 *
 * Types and interfaces for workflow-level validation.
 * Complements node-level validation by checking structural, configuration,
 * and data flow issues across the entire workflow.
 */

// ============================================================================
// SEVERITY AND CATEGORIES
// ============================================================================

/**
 * Validation severity levels:
 * - error: Blocks execution, must be fixed
 * - warning: Potential issues, execution allowed
 * - info: Suggestions and optimizations
 */
export type WorkflowValidationSeverity = "error" | "warning" | "info";

/**
 * Validation issue categories:
 * - structural: Graph structure issues (orphan nodes, unreachable paths)
 * - configuration: Invalid references (connections, knowledge bases)
 * - dataFlow: Variable and data issues (undefined variables, conflicts)
 * - semantic: Content quality and logic issues (empty prompts, unused outputs)
 * - optimization: Performance and best practice suggestions
 */
export type WorkflowValidationCategory =
    | "structural"
    | "configuration"
    | "dataFlow"
    | "semantic"
    | "optimization";

// ============================================================================
// VALIDATION CODES
// ============================================================================

/**
 * Structural validation codes
 */
export type StructuralValidationCode =
    | "ORPHAN_NODE"
    | "UNREACHABLE_NODE"
    | "DEAD_END_BRANCH"
    | "MISSING_ENTRY_POINT"
    | "CONDITIONAL_MISSING_BRANCH"
    | "LOOP_NO_BODY"
    | "CIRCULAR_DEPENDENCY";

/**
 * Configuration validation codes
 */
export type ConfigurationValidationCode =
    | "INVALID_CONNECTION_ID"
    | "INVALID_KNOWLEDGE_BASE"
    | "MISSING_REQUIRED_CONFIG";

/**
 * Data flow validation codes
 */
export type DataFlowValidationCode =
    | "UNDEFINED_VARIABLE"
    | "LOOP_ARRAY_UNDEFINED"
    | "OUTPUT_VARIABLE_CONFLICT"
    | "UNUSED_OUTPUT";

/**
 * Semantic validation codes
 * These check content quality and logic issues that structural validation cannot catch.
 */
export type SemanticValidationCode =
    | "EMPTY_PROMPT"
    | "PLACEHOLDER_CONTENT"
    | "NO_WORKFLOW_OUTPUT"
    | "UNUSED_EXPENSIVE_OUTPUT"
    | "EXPENSIVE_LOOP_OPERATION";

/**
 * All validation codes
 */
export type WorkflowValidationCode =
    | StructuralValidationCode
    | ConfigurationValidationCode
    | DataFlowValidationCode
    | SemanticValidationCode;

// ============================================================================
// VALIDATION ISSUE
// ============================================================================

/**
 * A single workflow validation issue.
 */
export interface WorkflowValidationIssue {
    /** Unique identifier for this issue */
    id: string;

    /** Machine-readable error code */
    code: WorkflowValidationCode;

    /** Human-readable description */
    message: string;

    /** Severity level */
    severity: WorkflowValidationSeverity;

    /** Category of the issue */
    category: WorkflowValidationCategory;

    /** Node ID if the issue is associated with a specific node */
    nodeId?: string;

    /** Edge ID if the issue is associated with a specific edge */
    edgeId?: string;

    /** Configuration field name if applicable */
    field?: string;

    /** Suggested fix for the issue */
    suggestion?: string;

    /** Additional context about the issue */
    context?: Record<string, unknown>;
}

// ============================================================================
// VALIDATION RESULT
// ============================================================================

/**
 * Summary counts of validation issues by severity.
 */
export interface WorkflowValidationSummary {
    errorCount: number;
    warningCount: number;
    infoCount: number;
}

/**
 * Complete result of workflow validation.
 */
export interface WorkflowValidationResult {
    /** True if no errors exist (warnings allowed) */
    isValid: boolean;

    /** True if there are any warnings */
    hasWarnings: boolean;

    /** Issues grouped by node ID for easy lookup */
    nodeIssues: Map<string, WorkflowValidationIssue[]>;

    /** Workflow-wide issues not specific to any node */
    workflowIssues: WorkflowValidationIssue[];

    /** All issues in a flat array */
    allIssues: WorkflowValidationIssue[];

    /** Summary counts by severity */
    summary: WorkflowValidationSummary;

    /** Timestamp when validation was performed */
    validatedAt: number;
}

// ============================================================================
// VALIDATION CONTEXT
// ============================================================================

/**
 * Context information needed for validation.
 * Contains external data like valid connection IDs, knowledge base IDs, etc.
 */
export interface WorkflowValidationContext {
    /** List of valid connection IDs the user has access to */
    connectionIds: string[];

    /** List of valid knowledge base IDs */
    knowledgeBaseIds: string[];

    /** Input variables available at workflow entry */
    inputVariables: string[];
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

/**
 * Node data structure for validation (simplified React Flow node)
 */
export interface ValidatableNode {
    id: string;
    type: string;
    data: Record<string, unknown>;
    position: { x: number; y: number };
}

/**
 * Edge data structure for validation (simplified React Flow edge)
 */
export interface ValidatableEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

/**
 * Map of variable names to the node IDs that produce them.
 * Used for tracking data flow and detecting conflicts.
 */
export type VariableSourceMap = Map<string, string[]>;

/**
 * Map of node IDs to the variables available at that node.
 * Computed via BFS traversal from entry point.
 */
export type NodeAvailableVariables = Map<string, Set<string>>;

// ============================================================================
// VALIDATION RULE TYPES
// ============================================================================

/**
 * A workflow validation rule.
 */
export interface WorkflowValidationRule {
    /** Unique identifier for the rule */
    id: string;

    /** Human-readable name */
    name: string;

    /** Category this rule belongs to */
    category: WorkflowValidationCategory;

    /** Default severity when rule fails */
    defaultSeverity: WorkflowValidationSeverity;

    /** Whether the rule is enabled by default */
    enabledByDefault: boolean;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an empty validation result.
 */
export function createEmptyValidationResult(): WorkflowValidationResult {
    return {
        isValid: true,
        hasWarnings: false,
        nodeIssues: new Map(),
        workflowIssues: [],
        allIssues: [],
        summary: {
            errorCount: 0,
            warningCount: 0,
            infoCount: 0
        },
        validatedAt: Date.now()
    };
}

/**
 * Create a validation issue.
 */
export function createValidationIssue(
    code: WorkflowValidationCode,
    message: string,
    severity: WorkflowValidationSeverity,
    category: WorkflowValidationCategory,
    options?: {
        nodeId?: string;
        edgeId?: string;
        field?: string;
        suggestion?: string;
        context?: Record<string, unknown>;
    }
): WorkflowValidationIssue {
    return {
        id: `${code}-${options?.nodeId || "workflow"}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        code,
        message,
        severity,
        category,
        ...options
    };
}
