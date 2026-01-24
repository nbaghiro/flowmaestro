/**
 * Workflow Validation Rules
 *
 * Implements validation rules organized by category:
 * - Structural: Graph structure issues
 * - Configuration: Invalid external references
 * - Data Flow: Variable and data issues
 */

import { nodeValidationRules } from "./node-validation-rules";
import { validateNodeConfig } from "./validation";
import { createValidationIssue } from "./workflow-validation-types";
import type {
    WorkflowValidationIssue,
    ValidatableNode,
    ValidatableEdge,
    WorkflowValidationContext,
    VariableSourceMap,
    NodeAvailableVariables
} from "./workflow-validation-types";

// ============================================================================
// GRAPH ANALYSIS UTILITIES
// ============================================================================

/**
 * Build an adjacency list from edges for graph traversal.
 */
export function buildAdjacencyList(edges: ValidatableEdge[]): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();

    for (const edge of edges) {
        const targets = adjacency.get(edge.source) || [];
        targets.push(edge.target);
        adjacency.set(edge.source, targets);
    }

    return adjacency;
}

/**
 * Build a reverse adjacency list (target -> sources).
 */
export function buildReverseAdjacencyList(edges: ValidatableEdge[]): Map<string, string[]> {
    const reverse = new Map<string, string[]>();

    for (const edge of edges) {
        const sources = reverse.get(edge.target) || [];
        sources.push(edge.source);
        reverse.set(edge.target, sources);
    }

    return reverse;
}

/**
 * Find all nodes reachable from the given start nodes using BFS.
 */
export function findReachableNodes(
    startNodeIds: string[],
    adjacency: Map<string, string[]>
): Set<string> {
    const visited = new Set<string>();
    const queue = [...startNodeIds];

    while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;

        visited.add(nodeId);

        const neighbors = adjacency.get(nodeId) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                queue.push(neighbor);
            }
        }
    }

    return visited;
}

/**
 * Find entry point nodes (nodes with no incoming edges).
 * Entry nodes are: trigger, input, files, url types OR nodes with no incoming edges.
 */
export function findEntryNodes(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[]
): ValidatableNode[] {
    const entryNodeTypes = new Set(["trigger", "input", "files", "url"]);
    const nodesWithIncoming = new Set(edges.map((e) => e.target));

    return nodes.filter((node) => entryNodeTypes.has(node.type) || !nodesWithIncoming.has(node.id));
}

/**
 * Check if a node type can produce output variables.
 */
export function canProduceOutput(nodeType: string): boolean {
    // Most nodes can produce outputs
    const noOutputTypes = new Set(["comment", "output"]);
    return !noOutputTypes.has(nodeType);
}

/**
 * Extract the output variable name from a node's data.
 */
export function getOutputVariable(node: ValidatableNode): string | undefined {
    const { data, type } = node;

    // Different node types store output variable in different fields
    if (data.outputVariable && typeof data.outputVariable === "string") {
        return data.outputVariable;
    }

    // For input nodes, the variable name is the output
    if (type === "input" && data.variableName && typeof data.variableName === "string") {
        return data.variableName;
    }

    // For files nodes
    if (type === "files" && data.outputVariable && typeof data.outputVariable === "string") {
        return data.outputVariable;
    }

    // LLM nodes may store output as outputVariable
    if (type === "llm" && data.outputVariable && typeof data.outputVariable === "string") {
        return data.outputVariable;
    }

    return undefined;
}

/**
 * Extract variable references from a string ({{variableName}} pattern).
 */
export function extractVariableReferences(text: string): string[] {
    const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Get the root variable name (before any dots)
        const fullMatch = match[1];
        const rootVar = fullMatch.split(".")[0];
        matches.push(rootVar);
    }

    return [...new Set(matches)]; // Deduplicate
}

/**
 * Extract all variable references from a node's configuration.
 */
export function extractNodeVariableReferences(node: ValidatableNode): string[] {
    const refs: string[] = [];

    const searchForRefs = (value: unknown): void => {
        if (typeof value === "string") {
            refs.push(...extractVariableReferences(value));
        } else if (Array.isArray(value)) {
            for (const item of value) {
                searchForRefs(item);
            }
        } else if (typeof value === "object" && value !== null) {
            for (const key of Object.keys(value)) {
                searchForRefs((value as Record<string, unknown>)[key]);
            }
        }
    };

    searchForRefs(node.data);
    return [...new Set(refs)];
}

/**
 * Compute available variables at each node via BFS from entry points.
 */
export function computeAvailableVariables(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[],
    inputVariables: string[]
): NodeAvailableVariables {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const adjacency = buildAdjacencyList(edges);
    const reverseAdjacency = buildReverseAdjacencyList(edges);
    const entryNodes = findEntryNodes(nodes, edges);

    const availableVars: NodeAvailableVariables = new Map();

    // Initialize all nodes with input variables
    for (const node of nodes) {
        availableVars.set(node.id, new Set(inputVariables));
    }

    // BFS to propagate variables
    const queue = entryNodes.map((n) => n.id);
    const processed = new Set<string>();

    while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (processed.has(nodeId)) continue;

        const node = nodeMap.get(nodeId);
        if (!node) continue;

        // Get variables from all incoming nodes
        const currentVars = availableVars.get(nodeId) || new Set(inputVariables);
        const incomingNodes = reverseAdjacency.get(nodeId) || [];

        for (const srcId of incomingNodes) {
            const srcVars = availableVars.get(srcId);
            if (srcVars) {
                for (const v of srcVars) {
                    currentVars.add(v);
                }
            }
            // Add the output variable from the source node
            const srcNode = nodeMap.get(srcId);
            if (srcNode) {
                const outputVar = getOutputVariable(srcNode);
                if (outputVar) {
                    currentVars.add(outputVar);
                }
            }
        }

        availableVars.set(nodeId, currentVars);
        processed.add(nodeId);

        // Add downstream nodes to queue
        const downstream = adjacency.get(nodeId) || [];
        for (const targetId of downstream) {
            if (!processed.has(targetId)) {
                queue.push(targetId);
            }
        }
    }

    return availableVars;
}

// ============================================================================
// STRUCTURAL VALIDATION RULES
// ============================================================================

/**
 * Check for orphan nodes (nodes with no connections).
 */
export function validateOrphanNodes(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[]
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];
    const connectedNodes = new Set<string>();

    // Collect all nodes that have at least one edge
    for (const edge of edges) {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
    }

    // Find orphan nodes (excluding comment nodes which don't need connections)
    for (const node of nodes) {
        if (node.type === "comment") continue;

        if (!connectedNodes.has(node.id)) {
            issues.push(
                createValidationIssue(
                    "ORPHAN_NODE",
                    `Node "${node.data.label || node.type}" has no connections`,
                    "warning",
                    "structural",
                    {
                        nodeId: node.id,
                        suggestion: "Connect this node to the workflow or remove it"
                    }
                )
            );
        }
    }

    return issues;
}

/**
 * Check for unreachable nodes (not reachable from any entry point).
 */
export function validateUnreachableNodes(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[]
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    const entryNodes = findEntryNodes(nodes, edges);
    if (entryNodes.length === 0) return issues; // No entry points, will be caught by another rule

    const adjacency = buildAdjacencyList(edges);
    const reachable = findReachableNodes(
        entryNodes.map((n) => n.id),
        adjacency
    );

    for (const node of nodes) {
        if (node.type === "comment") continue;

        // Skip entry nodes - they're reachable by definition
        if (entryNodes.some((e) => e.id === node.id)) continue;

        if (!reachable.has(node.id)) {
            issues.push(
                createValidationIssue(
                    "UNREACHABLE_NODE",
                    `Node "${node.data.label || node.type}" is not reachable from any entry point`,
                    "warning",
                    "structural",
                    {
                        nodeId: node.id,
                        suggestion:
                            "Connect this node to the workflow flow or remove it if not needed"
                    }
                )
            );
        }
    }

    return issues;
}

/**
 * Check for missing entry point (no trigger or input nodes).
 */
export function validateMissingEntryPoint(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[]
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    // Filter out comment nodes
    const executableNodes = nodes.filter((n) => n.type !== "comment");
    if (executableNodes.length === 0) return issues;

    const entryNodes = findEntryNodes(nodes, edges);
    const nonCommentEntries = entryNodes.filter((n) => n.type !== "comment");

    if (nonCommentEntries.length === 0) {
        issues.push(
            createValidationIssue(
                "MISSING_ENTRY_POINT",
                "Workflow has no entry point (trigger, input, or starting node)",
                "error",
                "structural",
                {
                    suggestion:
                        "Add a Trigger, Input, or Files node as the starting point of your workflow"
                }
            )
        );
    }

    return issues;
}

/**
 * Check for conditional nodes with missing branches.
 */
export function validateConditionalBranches(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[]
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    // Find conditional and switch nodes
    const branchingNodes = nodes.filter((n) => n.type === "conditional" || n.type === "switch");

    for (const node of branchingNodes) {
        const outgoingEdges = edges.filter((e) => e.source === node.id);

        if (node.type === "conditional") {
            const hasTrueBranch = outgoingEdges.some(
                (e) => e.sourceHandle === "true" || e.sourceHandle === "output-true"
            );
            const hasFalseBranch = outgoingEdges.some(
                (e) => e.sourceHandle === "false" || e.sourceHandle === "output-false"
            );

            if (!hasTrueBranch && !hasFalseBranch) {
                issues.push(
                    createValidationIssue(
                        "CONDITIONAL_MISSING_BRANCH",
                        `Conditional node "${node.data.label || "Conditional"}" has no connected branches`,
                        "warning",
                        "structural",
                        {
                            nodeId: node.id,
                            suggestion:
                                "Connect at least one branch (true or false) to continue the workflow"
                        }
                    )
                );
            } else if (!hasTrueBranch) {
                issues.push(
                    createValidationIssue(
                        "DEAD_END_BRANCH",
                        `Conditional node "${node.data.label || "Conditional"}" has no connection for the TRUE branch`,
                        "warning",
                        "structural",
                        {
                            nodeId: node.id,
                            suggestion:
                                "Connect the true branch or the workflow will end when condition is true"
                        }
                    )
                );
            } else if (!hasFalseBranch) {
                issues.push(
                    createValidationIssue(
                        "DEAD_END_BRANCH",
                        `Conditional node "${node.data.label || "Conditional"}" has no connection for the FALSE branch`,
                        "warning",
                        "structural",
                        {
                            nodeId: node.id,
                            suggestion:
                                "Connect the false branch or the workflow will end when condition is false"
                        }
                    )
                );
            }
        }

        if (node.type === "switch") {
            // Switch nodes should have at least one case connected
            if (outgoingEdges.length === 0) {
                issues.push(
                    createValidationIssue(
                        "CONDITIONAL_MISSING_BRANCH",
                        `Switch node "${node.data.label || "Switch"}" has no connected cases`,
                        "warning",
                        "structural",
                        {
                            nodeId: node.id,
                            suggestion: "Connect at least one case to continue the workflow"
                        }
                    )
                );
            }
        }
    }

    return issues;
}

/**
 * Check for loop nodes with no body.
 */
export function validateLoopBody(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[]
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    const loopNodes = nodes.filter((n) => n.type === "loop");

    for (const node of loopNodes) {
        const outgoingEdges = edges.filter((e) => e.source === node.id);
        const bodyEdge = outgoingEdges.find(
            (e) => e.sourceHandle === "body" || e.sourceHandle === "output-body"
        );

        if (!bodyEdge) {
            issues.push(
                createValidationIssue(
                    "LOOP_NO_BODY",
                    `Loop node "${node.data.label || "Loop"}" has no body connected`,
                    "error",
                    "structural",
                    {
                        nodeId: node.id,
                        suggestion:
                            "Connect nodes to the loop body output to define what happens in each iteration"
                    }
                )
            );
        }
    }

    return issues;
}

// ============================================================================
// CONFIGURATION VALIDATION RULES
// ============================================================================

/**
 * Check for invalid connection IDs (connection doesn't exist).
 */
export function validateConnectionIds(
    nodes: ValidatableNode[],
    context: WorkflowValidationContext
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];
    const validConnectionIds = new Set(context.connectionIds);

    // Node types that require connection IDs
    const nodeTypesWithConnections = new Set([
        "llm",
        "vision",
        "embeddings",
        "router",
        "audioInput",
        "audioOutput",
        "integration",
        "database",
        "imageGeneration",
        "videoGeneration"
    ]);

    for (const node of nodes) {
        // Check if this node type uses connections
        // Integration providers also use connections
        const usesConnection =
            nodeTypesWithConnections.has(node.type) ||
            (node.data.connectionId !== undefined && node.data.connectionId !== "");

        if (!usesConnection) continue;

        const connectionId = node.data.connectionId;
        if (typeof connectionId !== "string" || connectionId === "") continue;

        // If we have no context, skip validation (no API data available)
        if (context.connectionIds.length === 0) continue;

        if (!validConnectionIds.has(connectionId)) {
            issues.push(
                createValidationIssue(
                    "INVALID_CONNECTION_ID",
                    `Node "${node.data.label || node.type}" references a connection that doesn't exist`,
                    "error",
                    "configuration",
                    {
                        nodeId: node.id,
                        field: "connectionId",
                        suggestion:
                            "Select a valid connection from the dropdown or create a new one",
                        context: { invalidConnectionId: connectionId }
                    }
                )
            );
        }
    }

    return issues;
}

/**
 * Check for invalid knowledge base IDs.
 */
export function validateKnowledgeBaseIds(
    nodes: ValidatableNode[],
    context: WorkflowValidationContext
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];
    const validKBIds = new Set(context.knowledgeBaseIds);

    // Node types that use knowledge bases
    const nodeTypesWithKB = new Set(["llm", "vision", "router"]);

    for (const node of nodes) {
        if (!nodeTypesWithKB.has(node.type)) continue;

        // Check for knowledge base references
        const knowledgeBases = node.data.knowledgeBases;
        if (!Array.isArray(knowledgeBases) || knowledgeBases.length === 0) continue;

        // If we have no context, skip validation
        if (context.knowledgeBaseIds.length === 0) continue;

        for (const kb of knowledgeBases) {
            const kbId = typeof kb === "string" ? kb : kb?.id;
            if (typeof kbId !== "string") continue;

            if (!validKBIds.has(kbId)) {
                issues.push(
                    createValidationIssue(
                        "INVALID_KNOWLEDGE_BASE",
                        `Node "${node.data.label || node.type}" references a knowledge base that doesn't exist`,
                        "error",
                        "configuration",
                        {
                            nodeId: node.id,
                            field: "knowledgeBases",
                            suggestion: "Select a valid knowledge base or remove the reference",
                            context: { invalidKnowledgeBaseId: kbId }
                        }
                    )
                );
            }
        }
    }

    return issues;
}

// ============================================================================
// DATA FLOW VALIDATION RULES
// ============================================================================

/**
 * Check for undefined variable references.
 */
export function validateUndefinedVariables(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[],
    context: WorkflowValidationContext
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    const availableVarsMap = computeAvailableVariables(nodes, edges, context.inputVariables);

    for (const node of nodes) {
        if (node.type === "comment") continue;

        const referencedVars = extractNodeVariableReferences(node);
        const availableVars = availableVarsMap.get(node.id) || new Set<string>();

        for (const varName of referencedVars) {
            if (!availableVars.has(varName)) {
                issues.push(
                    createValidationIssue(
                        "UNDEFINED_VARIABLE",
                        `Node "${node.data.label || node.type}" references undefined variable "{{${varName}}}"`,
                        "error",
                        "dataFlow",
                        {
                            nodeId: node.id,
                            suggestion: `Make sure a node that produces "${varName}" is connected upstream, or define it as an input variable`,
                            context: { variableName: varName }
                        }
                    )
                );
            }
        }
    }

    return issues;
}

/**
 * Check for loop array source that doesn't exist.
 */
export function validateLoopArraySource(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[],
    context: WorkflowValidationContext
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    const availableVarsMap = computeAvailableVariables(nodes, edges, context.inputVariables);
    const loopNodes = nodes.filter((n) => n.type === "loop");

    for (const node of loopNodes) {
        // Check if loop type is forEach and has an array source
        if (node.data.loopType !== "forEach") continue;

        const arraySource = node.data.arraySource;
        if (typeof arraySource !== "string" || arraySource === "") continue;

        // Extract variable name from arraySource (might be a reference like {{items}})
        const varRefs = extractVariableReferences(arraySource);
        const availableVars = availableVarsMap.get(node.id) || new Set<string>();

        for (const varName of varRefs) {
            if (!availableVars.has(varName)) {
                issues.push(
                    createValidationIssue(
                        "LOOP_ARRAY_UNDEFINED",
                        `Loop node "${node.data.label || "Loop"}" references undefined array "{{${varName}}}"`,
                        "error",
                        "dataFlow",
                        {
                            nodeId: node.id,
                            field: "arraySource",
                            suggestion: `Make sure a node that produces "${varName}" is connected before this loop`,
                            context: { variableName: varName }
                        }
                    )
                );
            }
        }
    }

    return issues;
}

/**
 * Check for output variable conflicts (multiple nodes writing same variable).
 */
export function validateOutputVariableConflicts(
    nodes: ValidatableNode[]
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    const variableSources: VariableSourceMap = new Map();

    // Collect all output variables and their source nodes
    for (const node of nodes) {
        if (node.type === "comment") continue;

        const outputVar = getOutputVariable(node);
        if (outputVar) {
            const sources = variableSources.get(outputVar) || [];
            sources.push(node.id);
            variableSources.set(outputVar, sources);
        }
    }

    // Find conflicts (more than one node producing the same variable)
    for (const [varName, sourceNodeIds] of variableSources) {
        if (sourceNodeIds.length > 1) {
            // Get node labels for better error message
            const nodeLabels = sourceNodeIds.map((id) => {
                const node = nodes.find((n) => n.id === id);
                return node?.data.label || node?.type || id;
            });

            // Add warning to each conflicting node
            for (const nodeId of sourceNodeIds) {
                const otherNodes = nodeLabels.filter((_, i) => sourceNodeIds[i] !== nodeId);
                issues.push(
                    createValidationIssue(
                        "OUTPUT_VARIABLE_CONFLICT",
                        `Variable "${varName}" is also written by: ${otherNodes.join(", ")}`,
                        "warning",
                        "dataFlow",
                        {
                            nodeId,
                            field: "outputVariable",
                            suggestion: "Rename the output variable to avoid conflicts",
                            context: { variableName: varName, conflictingNodes: sourceNodeIds }
                        }
                    )
                );
            }
        }
    }

    return issues;
}

// ============================================================================
// SEMANTIC VALIDATION RULES
// ============================================================================

/**
 * Common placeholder patterns to detect incomplete content.
 */
const PLACEHOLDER_PATTERNS = [
    /^\s*$/, // Empty or whitespace only
    /^(todo|fixme|xxx)[\s:]/i, // TODO markers
    /^enter\s+(your|a|the)/i, // "Enter your prompt here"
    /^(your|my)\s+prompt/i, // "Your prompt here"
    /^example/i, // "Example..."
    /^test\s*(prompt|text|input)?$/i, // "Test" or "Test prompt"
    /^placeholder/i, // "Placeholder"
    /^insert\s+/i, // "Insert text here"
    /^type\s+(here|your)/i, // "Type here"
    /^\[.*\]$/, // "[placeholder]"
    /^<.*>$/, // "<placeholder>"
    /^\.{3,}$/ // "..."
];

/**
 * Check if a string appears to be placeholder content.
 */
function isPlaceholderContent(text: string): boolean {
    if (!text || typeof text !== "string") return true;
    const trimmed = text.trim();
    if (trimmed.length === 0) return true;
    if (trimmed.length < 5) return true; // Very short content is suspicious
    return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Node types that are considered "expensive" operations.
 */
const EXPENSIVE_NODE_TYPES = new Set([
    "llm",
    "vision",
    "http",
    "integration",
    "imageGeneration",
    "videoGeneration",
    "audioInput",
    "audioOutput"
]);

/**
 * Node types that produce observable output (terminal nodes).
 */
const TERMINAL_NODE_TYPES = new Set(["output", "email", "webhook", "database", "integration"]);

/**
 * Check for empty or placeholder prompts in LLM and similar nodes.
 */
export function validateEmptyPrompts(nodes: ValidatableNode[]): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    // Node types that require prompt content
    const promptNodeTypes = new Set(["llm", "vision", "router"]);

    for (const node of nodes) {
        if (!promptNodeTypes.has(node.type)) continue;

        const prompt = node.data.prompt as string | undefined;
        const systemPrompt = node.data.systemPrompt as string | undefined;

        // Check main prompt
        if (isPlaceholderContent(prompt || "")) {
            issues.push(
                createValidationIssue(
                    "EMPTY_PROMPT",
                    `Node "${node.data.label || node.type}" has an empty or placeholder prompt`,
                    "error",
                    "semantic",
                    {
                        nodeId: node.id,
                        field: "prompt",
                        suggestion: "Add a meaningful prompt that describes what the AI should do"
                    }
                )
            );
        }

        // Check for placeholder in system prompt (warning, not error - system prompt is optional)
        if (systemPrompt && PLACEHOLDER_PATTERNS.some((p) => p.test(systemPrompt.trim()))) {
            issues.push(
                createValidationIssue(
                    "PLACEHOLDER_CONTENT",
                    `Node "${node.data.label || node.type}" has placeholder text in system prompt`,
                    "warning",
                    "semantic",
                    {
                        nodeId: node.id,
                        field: "systemPrompt",
                        suggestion: "Replace placeholder text with actual instructions"
                    }
                )
            );
        }
    }

    // Check transform nodes for empty code
    const transformNodes = nodes.filter((n) => n.type === "transform");
    for (const node of transformNodes) {
        const code = node.data.code as string | undefined;
        if (!code || code.trim().length === 0 || code.trim() === "// Your code here") {
            issues.push(
                createValidationIssue(
                    "EMPTY_PROMPT",
                    `Transform node "${node.data.label || "Transform"}" has no code`,
                    "error",
                    "semantic",
                    {
                        nodeId: node.id,
                        field: "code",
                        suggestion: "Add JavaScript code to transform the data"
                    }
                )
            );
        }
    }

    // Check HTTP nodes for empty URL
    const httpNodes = nodes.filter((n) => n.type === "http");
    for (const node of httpNodes) {
        const url = node.data.url as string | undefined;
        if (!url || url.trim().length === 0) {
            issues.push(
                createValidationIssue(
                    "EMPTY_PROMPT",
                    `HTTP node "${node.data.label || "HTTP"}" has no URL configured`,
                    "error",
                    "semantic",
                    {
                        nodeId: node.id,
                        field: "url",
                        suggestion: "Add the URL for the HTTP request"
                    }
                )
            );
        }
    }

    return issues;
}

/**
 * Check for expensive node outputs (LLM, HTTP) that are never used downstream.
 */
export function validateUnusedExpensiveOutputs(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[]
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    // Build a map of all variable references in the workflow
    const allReferencedVars = new Set<string>();
    for (const node of nodes) {
        const refs = extractNodeVariableReferences(node);
        refs.forEach((v) => allReferencedVars.add(v));
    }

    // Find expensive nodes with output variables that are never referenced
    for (const node of nodes) {
        if (!EXPENSIVE_NODE_TYPES.has(node.type)) continue;

        const outputVar = getOutputVariable(node);
        if (!outputVar) continue;

        // Check if this node has any outgoing edges (is connected)
        const hasOutgoingEdges = edges.some((e) => e.source === node.id);
        if (!hasOutgoingEdges) continue; // Orphan node - handled by structural validation

        // Check if the output variable is referenced anywhere
        if (!allReferencedVars.has(outputVar)) {
            // Also check if the node connects to a terminal node (output might be implicit)
            const downstreamNodeIds = edges
                .filter((e) => e.source === node.id)
                .map((e) => e.target);
            const connectsToTerminal = downstreamNodeIds.some((id) => {
                const targetNode = nodes.find((n) => n.id === id);
                return targetNode && TERMINAL_NODE_TYPES.has(targetNode.type);
            });

            if (!connectsToTerminal) {
                issues.push(
                    createValidationIssue(
                        "UNUSED_EXPENSIVE_OUTPUT",
                        `${node.type.toUpperCase()} node "${node.data.label || node.type}" output "{{${outputVar}}}" is never used`,
                        "warning",
                        "semantic",
                        {
                            nodeId: node.id,
                            field: "outputVariable",
                            suggestion: `Reference {{${outputVar}}} in a downstream node or remove this node if not needed`,
                            context: { outputVariable: outputVar }
                        }
                    )
                );
            }
        }
    }

    return issues;
}

/**
 * Check if workflow has no observable output (no terminal nodes).
 */
export function validateWorkflowHasOutput(
    nodes: ValidatableNode[],
    _edges: ValidatableEdge[]
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    // Filter out comment nodes
    const executableNodes = nodes.filter((n) => n.type !== "comment");
    if (executableNodes.length === 0) return issues;

    // Check if any terminal node exists
    const hasTerminalNode = executableNodes.some((n) => TERMINAL_NODE_TYPES.has(n.type));

    // Also check for HTTP nodes that might be sending data (POST/PUT/PATCH/DELETE)
    const hasHttpWrite = executableNodes.some((n) => {
        if (n.type !== "http") return false;
        const method = (n.data.method as string)?.toUpperCase();
        return method && ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    });

    if (!hasTerminalNode && !hasHttpWrite) {
        // Only warn if there are actual processing nodes (not just inputs)
        const hasProcessingNodes = executableNodes.some((n) =>
            ["llm", "vision", "transform", "http", "conditional", "loop", "switch"].includes(n.type)
        );

        if (hasProcessingNodes) {
            issues.push(
                createValidationIssue(
                    "NO_WORKFLOW_OUTPUT",
                    "Workflow has no output - results are computed but never sent anywhere",
                    "warning",
                    "semantic",
                    {
                        suggestion:
                            "Add an Output node to display results, or use Email/Webhook/Database to send data externally"
                    }
                )
            );
        }
    }

    return issues;
}

/**
 * Check for expensive operations (LLM, HTTP) inside loop bodies.
 */
export function validateExpensiveLoopOperations(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[]
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    const adjacency = buildAdjacencyList(edges);
    const loopNodes = nodes.filter((n) => n.type === "loop");
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    for (const loopNode of loopNodes) {
        // Find the loop body edge
        const bodyEdge = edges.find(
            (e) =>
                e.source === loopNode.id &&
                (e.sourceHandle === "body" || e.sourceHandle === "output-body")
        );

        if (!bodyEdge) continue;

        // Find all nodes reachable from the loop body (within the loop)
        // We need to stop at nodes that connect back to the loop or exit the loop
        const loopBodyNodes = findNodesInLoopBody(bodyEdge.target, loopNode.id, adjacency, nodeMap);

        // Check for expensive nodes in the loop body
        for (const nodeId of loopBodyNodes) {
            const node = nodeMap.get(nodeId);
            if (!node) continue;

            if (EXPENSIVE_NODE_TYPES.has(node.type)) {
                const nodeLabel = (node.data.label as string) || node.type;
                issues.push(
                    createValidationIssue(
                        "EXPENSIVE_LOOP_OPERATION",
                        `${node.type.toUpperCase()} node "${nodeLabel}" is inside a loop - this may be slow and costly`,
                        "warning",
                        "semantic",
                        {
                            nodeId: node.id,
                            suggestion:
                                node.type === "llm"
                                    ? "Consider batching items and processing them in a single LLM call outside the loop"
                                    : "Consider batching requests or using pagination to reduce the number of calls",
                            context: { loopNodeId: loopNode.id }
                        }
                    )
                );
            }
        }
    }

    return issues;
}

/**
 * Find all nodes that are part of a loop body (reachable from body start, within the loop).
 */
function findNodesInLoopBody(
    startNodeId: string,
    loopNodeId: string,
    adjacency: Map<string, string[]>,
    _nodeMap: Map<string, ValidatableNode>
): Set<string> {
    const visited = new Set<string>();
    const queue = [startNodeId];

    while (queue.length > 0) {
        const nodeId = queue.shift()!;

        // Don't revisit nodes
        if (visited.has(nodeId)) continue;

        // Don't include the loop node itself
        if (nodeId === loopNodeId) continue;

        visited.add(nodeId);

        // Get downstream nodes
        const downstream = adjacency.get(nodeId) || [];
        for (const targetId of downstream) {
            // Stop if we reach the loop node (end of loop body)
            if (targetId === loopNodeId) continue;

            if (!visited.has(targetId)) {
                queue.push(targetId);
            }
        }
    }

    return visited;
}

// ============================================================================
// NODE CONFIGURATION VALIDATION
// ============================================================================

/**
 * Validate each node's required configuration using node-level validation rules.
 * This surfaces node validation errors in the workflow validation panel.
 */
export function validateNodeRequiredConfig(nodes: ValidatableNode[]): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    for (const node of nodes) {
        if (node.type === "comment") continue;

        // Run node-level validation
        const nodeConfig = node.data as Record<string, unknown>;
        const validationResult = validateNodeConfig(node.type, nodeConfig, nodeValidationRules);

        // Convert node validation errors to workflow issues
        for (const error of validationResult.errors) {
            if (error.severity !== "error") continue; // Only surface errors, not warnings

            issues.push(
                createValidationIssue(
                    "MISSING_REQUIRED_CONFIG",
                    `${node.data.label || node.type}: ${error.message}`,
                    "error",
                    "configuration",
                    {
                        nodeId: node.id,
                        field: error.field,
                        suggestion: `Configure the "${error.field}" field in the node settings`
                    }
                )
            );
        }
    }

    return issues;
}

// ============================================================================
// RULE AGGREGATION
// ============================================================================

/**
 * Run all structural validation rules.
 */
export function runStructuralValidation(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[]
): WorkflowValidationIssue[] {
    return [
        ...validateOrphanNodes(nodes, edges),
        ...validateUnreachableNodes(nodes, edges),
        ...validateMissingEntryPoint(nodes, edges),
        ...validateConditionalBranches(nodes, edges),
        ...validateLoopBody(nodes, edges)
    ];
}

/**
 * Run all configuration validation rules.
 */
export function runConfigurationValidation(
    nodes: ValidatableNode[],
    context: WorkflowValidationContext
): WorkflowValidationIssue[] {
    return [
        ...validateNodeRequiredConfig(nodes),
        ...validateConnectionIds(nodes, context),
        ...validateKnowledgeBaseIds(nodes, context)
    ];
}

/**
 * Run all data flow validation rules.
 */
export function runDataFlowValidation(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[],
    context: WorkflowValidationContext
): WorkflowValidationIssue[] {
    return [
        ...validateUndefinedVariables(nodes, edges, context),
        ...validateLoopArraySource(nodes, edges, context),
        ...validateOutputVariableConflicts(nodes)
    ];
}

/**
 * Run all semantic validation rules.
 */
export function runSemanticValidation(
    nodes: ValidatableNode[],
    edges: ValidatableEdge[]
): WorkflowValidationIssue[] {
    return [
        ...validateEmptyPrompts(nodes),
        ...validateUnusedExpensiveOutputs(nodes, edges),
        ...validateWorkflowHasOutput(nodes, edges),
        ...validateExpensiveLoopOperations(nodes, edges)
    ];
}
