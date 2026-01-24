/**
 * Workflow Validation Rules
 *
 * Implements validation rules organized by category:
 * - Structural: Graph structure issues
 * - Configuration: Invalid external references
 * - Data Flow: Variable and data issues
 */

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
    return [...validateConnectionIds(nodes, context), ...validateKnowledgeBaseIds(nodes, context)];
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
