import type { Node, Edge } from "reactflow";

/**
 * Represents an available variable that can be referenced in node configurations.
 */
export interface AvailableVariable {
    /** Full path to use in templates: "nodeId.field" or "outputVariable.field" */
    path: string;
    /** Human-readable display path: "Node Name → field" */
    displayPath: string;
    /** Inferred type of the variable */
    type: "string" | "number" | "boolean" | "object" | "array" | "unknown";
    /** Source of the variable */
    source: "nodeOutput" | "workflowVariable" | "input" | "loop";
    /** ID of the source node (if source is nodeOutput) */
    sourceNodeId?: string;
    /** Display name of the source node */
    sourceNodeName?: string;
    /** Type of the source node (e.g., "llm", "http") */
    sourceNodeType?: string;
}

/**
 * Field hints for common node types.
 * These provide autocomplete suggestions for known output fields.
 */
const NODE_OUTPUT_FIELDS: Record<string, string[]> = {
    llm: ["text", "usage", "model", "provider"],
    http: ["data", "status", "statusText", "headers", "responseTime"],
    code: ["output", "stdout", "stderr", "logs"],
    transform: ["result"],
    conditional: ["result", "branch"],
    integration: ["data", "success", "error", "metadata"],
    vision: ["text", "model"],
    embeddings: ["embeddings", "model"],
    router: ["selectedRoute", "confidence"],
    audioInput: ["transcript", "duration"],
    audioOutput: ["audioUrl", "duration"],
    action: ["data", "success"],
    knowledgeBaseQuery: ["results", "query"],
    input: [], // Uses inputName from config
    output: [], // Terminal node, doesn't produce outputs
    trigger: [] // Entry point, uses trigger data
};

/**
 * Computes all nodes that are upstream (execute before) the given node.
 * Uses BFS traversal following incoming edges.
 *
 * @param targetNodeId - The node to find upstream nodes for
 * @param nodes - All nodes in the workflow
 * @param edges - All edges in the workflow
 * @returns Array of upstream node IDs in topological order (closest first)
 */
export function computeUpstreamNodes(
    targetNodeId: string,
    _nodes: Node[],
    edges: Edge[]
): string[] {
    // Build reverse adjacency map: nodeId -> nodes that flow INTO it
    const incomingEdges = new Map<string, string[]>();
    for (const edge of edges) {
        const existing = incomingEdges.get(edge.target) || [];
        existing.push(edge.source);
        incomingEdges.set(edge.target, existing);
    }

    // BFS to collect all upstream nodes
    const upstream: string[] = [];
    const visited = new Set<string>();
    const queue = [targetNodeId];

    while (queue.length > 0) {
        const current = queue.shift()!;
        const sources = incomingEdges.get(current) || [];

        for (const source of sources) {
            if (!visited.has(source)) {
                visited.add(source);
                upstream.push(source);
                queue.push(source);
            }
        }
    }

    return upstream;
}

/**
 * Gets the output variable name for a node.
 * Uses outputVariable from config if set, otherwise falls back to node ID.
 */
function getNodeOutputVariable(node: Node): string {
    const data = node.data as Record<string, unknown>;
    return (data.outputVariable as string) || node.id;
}

/**
 * Gets the display name for a node.
 */
function getNodeDisplayName(node: Node): string {
    const data = node.data as Record<string, unknown>;
    return (data.label as string) || node.type || node.id;
}

/**
 * Gets available variables for a specific node.
 * Only includes variables from upstream nodes (nodes that execute before this one).
 *
 * @param nodeId - The node being configured
 * @param nodes - All nodes in the workflow
 * @param edges - All edges in the workflow
 * @returns Array of available variables that can be referenced
 */
export function getAvailableVariables(
    nodeId: string,
    nodes: Node[],
    edges: Edge[]
): AvailableVariable[] {
    const upstreamNodeIds = computeUpstreamNodes(nodeId, nodes, edges);
    const variables: AvailableVariable[] = [];

    // Add workflow input variables (from input nodes)
    const inputNodes = nodes.filter((n) => n.type === "input");
    for (const inputNode of inputNodes) {
        const data = inputNode.data as Record<string, unknown>;
        const inputName = (data.inputName as string) || "input";

        if (upstreamNodeIds.includes(inputNode.id) || inputNode.id !== nodeId) {
            variables.push({
                path: inputName,
                displayPath: `Input: ${inputName}`,
                type: "unknown",
                source: "input",
                sourceNodeId: inputNode.id,
                sourceNodeName: getNodeDisplayName(inputNode),
                sourceNodeType: "input"
            });
        }
    }

    // Add variables from upstream nodes
    for (const upstreamId of upstreamNodeIds) {
        const node = nodes.find((n) => n.id === upstreamId);
        if (!node) continue;

        // Skip input nodes (already handled above) and output nodes (don't produce outputs)
        if (node.type === "input" || node.type === "output") continue;

        const varName = getNodeOutputVariable(node);
        const displayName = getNodeDisplayName(node);
        const fields = NODE_OUTPUT_FIELDS[node.type || ""] || [];

        // Add the main variable (the full node output)
        variables.push({
            path: varName,
            displayPath: displayName,
            type: "object",
            source: "nodeOutput",
            sourceNodeId: node.id,
            sourceNodeName: displayName,
            sourceNodeType: node.type || undefined
        });

        // Add known fields as nested paths
        for (const field of fields) {
            variables.push({
                path: `${varName}.${field}`,
                displayPath: `${displayName} → ${field}`,
                type: "unknown",
                source: "nodeOutput",
                sourceNodeId: node.id,
                sourceNodeName: displayName,
                sourceNodeType: node.type || undefined
            });
        }
    }

    // Add loop context variables if the node might be inside a loop
    const loopVariables: AvailableVariable[] = [
        {
            path: "loop.index",
            displayPath: "Loop → index (0-based)",
            type: "number",
            source: "loop"
        },
        {
            path: "loop.iteration",
            displayPath: "Loop → iteration (1-based)",
            type: "number",
            source: "loop"
        },
        {
            path: "loop.item",
            displayPath: "Loop → current item",
            type: "unknown",
            source: "loop"
        },
        {
            path: "loop.total",
            displayPath: "Loop → total iterations",
            type: "number",
            source: "loop"
        }
    ];

    // Check if there's a loop node upstream
    const hasLoopUpstream = upstreamNodeIds.some((id) => {
        const node = nodes.find((n) => n.id === id);
        return node?.type === "loop";
    });

    if (hasLoopUpstream) {
        variables.push(...loopVariables);
    }

    return variables;
}

/**
 * Filters variables by a search query.
 * Matches against path and display path (case-insensitive).
 */
export function filterVariables(
    variables: AvailableVariable[],
    query: string
): AvailableVariable[] {
    if (!query.trim()) {
        return variables;
    }

    const lowerQuery = query.toLowerCase();
    return variables.filter(
        (v) =>
            v.path.toLowerCase().includes(lowerQuery) ||
            v.displayPath.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Groups variables by their source node for display in the picker.
 */
export interface VariableGroup {
    sourceNodeId: string | null;
    sourceNodeName: string;
    sourceNodeType: string | null;
    variables: AvailableVariable[];
}

export function groupVariablesBySource(variables: AvailableVariable[]): VariableGroup[] {
    const groups = new Map<string, VariableGroup>();

    // Special group for loop variables
    const loopGroup: VariableGroup = {
        sourceNodeId: null,
        sourceNodeName: "Loop Context",
        sourceNodeType: "loop",
        variables: []
    };

    // Special group for input variables
    const inputGroup: VariableGroup = {
        sourceNodeId: null,
        sourceNodeName: "Workflow Inputs",
        sourceNodeType: "input",
        variables: []
    };

    for (const variable of variables) {
        if (variable.source === "loop") {
            loopGroup.variables.push(variable);
        } else if (variable.source === "input") {
            inputGroup.variables.push(variable);
        } else if (variable.sourceNodeId) {
            const existing = groups.get(variable.sourceNodeId);
            if (existing) {
                existing.variables.push(variable);
            } else {
                groups.set(variable.sourceNodeId, {
                    sourceNodeId: variable.sourceNodeId,
                    sourceNodeName: variable.sourceNodeName || variable.sourceNodeId,
                    sourceNodeType: variable.sourceNodeType || null,
                    variables: [variable]
                });
            }
        }
    }

    const result: VariableGroup[] = [];

    // Add input group first if it has variables
    if (inputGroup.variables.length > 0) {
        result.push(inputGroup);
    }

    // Add node groups
    result.push(...Array.from(groups.values()));

    // Add loop group last if it has variables
    if (loopGroup.variables.length > 0) {
        result.push(loopGroup);
    }

    return result;
}
