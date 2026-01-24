/**
 * Workflow Builder
 *
 * Orchestrates the 4-stage workflow construction pipeline:
 * 1. PathConstructor: BFS reachability from trigger
 * 2. LoopConstructor: Insert loop sentinel nodes
 * 3. NodeConstructor: Expand parallel nodes
 * 4. EdgeConstructor: Wire edges with handle types
 *
 * All functions are pure and deterministic for Temporal workflow compatibility.
 */

import type { WorkflowDefinition, WorkflowNode } from "@flowmaestro/shared";
import type {
    BuiltWorkflow,
    ExecutableNode,
    BuildResult,
    BuildValidationError,
    PathConstructorResult,
    LoopConstructorResult,
    NodeConstructorResult,
    EdgeConstructorResult,
    TypedEdge,
    LoopContext,
    EdgeHandleType
} from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default maximum concurrent nodes if not specified in workflow settings.
 */
const DEFAULT_MAX_CONCURRENT_NODES = 10;

// ============================================================================
// MAIN BUILDER
// ============================================================================

/**
 * Build a workflow definition into an executable workflow.
 * Runs the 4-stage construction pipeline and validates the result.
 *
 * @param definition - The workflow definition to build
 * @returns Build result with success status and built workflow or errors
 */
export function buildWorkflow(definition: WorkflowDefinition): BuildResult {
    const buildStart = Date.now();
    const errors: BuildValidationError[] = [];
    const warnings: BuildValidationError[] = [];

    // Validate input
    if (!definition) {
        return {
            success: false,
            errors: [{ code: "INVALID_INPUT", message: "Workflow definition is required" }]
        };
    }

    if (!definition.nodes || Object.keys(definition.nodes).length === 0) {
        return {
            success: false,
            errors: [{ code: "NO_NODES", message: "Workflow must have at least one node" }]
        };
    }

    try {
        // Determine trigger/entry point
        const triggerId = findTriggerNode(definition);
        if (!triggerId) {
            return {
                success: false,
                errors: [
                    { code: "NO_TRIGGER", message: "Could not find entry point node for workflow" }
                ]
            };
        }

        // =========================================================================
        // Stage 1: Path Construction
        // =========================================================================
        // Note: Structural validation (cycles, unreachable nodes) is now handled
        // by the shared validation engine in pre-execution. These checks are
        // defensive and log warnings rather than blocking errors.
        const pathResult = constructPaths(definition, triggerId);

        // Defensive cycle check - should already be caught by shared validation
        const startNodes = [...pathResult.reachableNodes].filter(
            (nodeId) => (pathResult.reverseAdjacencyList.get(nodeId) || []).length === 0
        );
        const cycles = detectCycles(pathResult.adjacencyList, startNodes);
        if (cycles.length > 0) {
            // Only warn for non-loop cycles (loop back-edges are valid)
            for (const cycle of cycles) {
                const isLoopCycle = cycle.includes("loop");
                if (!isLoopCycle) {
                    // Log as warning since pre-execution validation should have caught this
                    warnings.push({
                        code: "CYCLE_DETECTED",
                        message: `Cycle detected (should have been caught by pre-validation): ${cycle}`
                    });
                }
            }
        }

        // Log unreachable nodes as warnings (non-blocking)
        const allNodes = Object.keys(definition.nodes);
        const unreachableNodes = allNodes.filter(
            (nodeId) => !pathResult.reachableNodes.has(nodeId)
        );
        for (const nodeId of unreachableNodes) {
            warnings.push({
                code: "UNREACHABLE_NODE",
                message: `Node "${nodeId}" is not reachable from the trigger`,
                nodeId
            });
        }

        // =========================================================================
        // Stage 2: Loop Construction
        // =========================================================================
        const loopResult = constructLoops(definition.nodes, definition.edges, pathResult);

        // =========================================================================
        // Stage 3: Node Construction
        // =========================================================================
        const nodeResult = constructNodes(loopResult);

        // =========================================================================
        // Stage 4: Edge Construction
        // =========================================================================
        const edgeResult = constructEdges(loopResult, nodeResult);

        // Compute final execution levels from node depths
        const finalNodeDepths = new Map<string, number>();
        for (const [nodeId, node] of nodeResult.nodes) {
            finalNodeDepths.set(nodeId, node.depth);
        }
        const executionLevels = computeExecutionLevels(finalNodeDepths);

        // Find output nodes
        const outputNodeIds = findOutputNodes(nodeResult.nodes, edgeResult.edges);

        // Get max concurrent setting
        const maxConcurrentNodes =
            definition.settings?.maxConcurrentNodes ?? DEFAULT_MAX_CONCURRENT_NODES;

        // Build the final workflow
        const workflow: BuiltWorkflow = {
            originalDefinition: definition,
            buildTimestamp: buildStart,
            nodes: nodeResult.nodes,
            edges: edgeResult.edges,
            executionLevels,
            triggerNodeId: triggerId,
            outputNodeIds,
            loopContexts: loopResult.loopContexts,
            maxConcurrentNodes
        };

        // Final validation
        const validationErrors = validateBuiltWorkflow(workflow);
        errors.push(...validationErrors);

        if (errors.length > 0) {
            return {
                success: false,
                errors,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        }

        return {
            success: true,
            workflow,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    } catch (error) {
        return {
            success: false,
            errors: [
                {
                    code: "BUILD_ERROR",
                    message: error instanceof Error ? error.message : "Unknown build error"
                }
            ]
        };
    }
}

/**
 * Find the trigger/entry node for the workflow.
 *
 * @param definition - Workflow definition
 * @returns Trigger node ID, or undefined if not found
 */
function findTriggerNode(definition: WorkflowDefinition): string | undefined {
    // Check for explicit entry point
    if (definition.entryPoint && definition.nodes[definition.entryPoint]) {
        return definition.entryPoint;
    }

    // Find input nodes
    const inputNodes = Object.entries(definition.nodes)
        .filter(([, node]) => node.type === "input")
        .map(([id]) => id);

    if (inputNodes.length > 0) {
        return inputNodes[0];
    }

    // Build reverse adjacency to find nodes with no incoming edges
    const nodesWithIncoming = new Set(definition.edges.map((e) => e.target));
    const rootNodes = Object.keys(definition.nodes).filter((id) => !nodesWithIncoming.has(id));

    if (rootNodes.length > 0) {
        return rootNodes[0];
    }

    // Fallback: first node
    const nodeIds = Object.keys(definition.nodes);
    return nodeIds.length > 0 ? nodeIds[0] : undefined;
}

/**
 * Find output nodes in the workflow.
 * Output nodes are either explicit output type or terminal nodes with no dependents.
 *
 * @param nodes - All executable nodes
 * @param edges - All edges
 * @returns Array of output node IDs
 */
function findOutputNodes(
    nodes: Map<string, ExecutableNode>,
    edges: Map<string, { target: string }>
): string[] {
    const outputIds: string[] = [];
    const hasOutgoingEdge = new Set<string>();

    for (const edge of edges.values()) {
        hasOutgoingEdge.add(edge.target);
    }

    for (const [nodeId, node] of nodes) {
        // Explicit output nodes
        if (node.type === "output") {
            outputIds.push(nodeId);
            continue;
        }

        // Terminal nodes (no dependents, excluding loop-end which has the back-edge)
        if (node.dependents.length === 0 && node.type !== "loop-end") {
            outputIds.push(nodeId);
        }
    }

    return outputIds;
}

/**
 * Validate a built workflow for execution.
 *
 * @param workflow - The built workflow
 * @returns Array of validation errors
 */
export function validateBuiltWorkflow(workflow: BuiltWorkflow): BuildValidationError[] {
    const errors: BuildValidationError[] = [];

    // Check trigger node exists
    if (!workflow.nodes.has(workflow.triggerNodeId)) {
        errors.push({
            code: "MISSING_TRIGGER",
            message: `Trigger node "${workflow.triggerNodeId}" not found in built workflow`
        });
    }

    // Check for missing dependencies
    for (const [nodeId, node] of workflow.nodes) {
        for (const depId of node.dependencies) {
            if (!workflow.nodes.has(depId)) {
                errors.push({
                    code: "MISSING_DEPENDENCY",
                    message: `Node "${nodeId}" depends on missing node "${depId}"`,
                    nodeId
                });
            }
        }
    }

    // Check edges reference valid nodes
    for (const [edgeId, edge] of workflow.edges) {
        if (!workflow.nodes.has(edge.source)) {
            errors.push({
                code: "INVALID_EDGE_SOURCE",
                message: `Edge "${edgeId}" has missing source node "${edge.source}"`,
                edgeId
            });
        }
        if (!workflow.nodes.has(edge.target)) {
            errors.push({
                code: "INVALID_EDGE_TARGET",
                message: `Edge "${edgeId}" has missing target node "${edge.target}"`,
                edgeId
            });
        }
    }

    // Check loop contexts are valid
    for (const [loopId, context] of workflow.loopContexts) {
        if (!workflow.nodes.has(context.startSentinelId)) {
            errors.push({
                code: "MISSING_LOOP_START",
                message: `Loop "${loopId}" missing start sentinel "${context.startSentinelId}"`,
                nodeId: loopId
            });
        }
        if (!workflow.nodes.has(context.endSentinelId)) {
            errors.push({
                code: "MISSING_LOOP_END",
                message: `Loop "${loopId}" missing end sentinel "${context.endSentinelId}"`,
                nodeId: loopId
            });
        }
    }

    // Check execution levels are not empty (except possibly first/last)
    for (let i = 1; i < workflow.executionLevels.length - 1; i++) {
        if (workflow.executionLevels[i].length === 0) {
            errors.push({
                code: "EMPTY_EXECUTION_LEVEL",
                message: `Execution level ${i} is empty - possible graph discontinuity`
            });
        }
    }

    return errors;
}

/**
 * Get a summary of the built workflow for logging/debugging.
 *
 * @param workflow - The built workflow
 * @returns Summary object
 */
export function getWorkflowSummary(workflow: BuiltWorkflow): {
    nodeCount: number;
    edgeCount: number;
    levelCount: number;
    loopCount: number;
    maxConcurrent: number;
    triggerNode: string;
    outputNodes: string[];
} {
    return {
        nodeCount: workflow.nodes.size,
        edgeCount: workflow.edges.size,
        levelCount: workflow.executionLevels.length,
        loopCount: workflow.loopContexts.size,
        maxConcurrent: workflow.maxConcurrentNodes,
        triggerNode: workflow.triggerNodeId,
        outputNodes: workflow.outputNodeIds
    };
}

// ============================================================================
// STAGE 1: PATH CONSTRUCTOR
// ============================================================================

/**
 * Construct paths from trigger node through the workflow graph.
 * Uses BFS to compute reachability and depth levels.
 *
 * @param definition - The workflow definition
 * @param triggerId - The trigger/entry point node ID
 * @returns Path construction result with reachability and depth info
 */
export function constructPaths(
    definition: WorkflowDefinition,
    triggerId: string
): PathConstructorResult {
    const { nodes, edges } = definition;

    // Build adjacency lists from edges
    const adjacencyList = new Map<string, string[]>();
    const reverseAdjacencyList = new Map<string, string[]>();

    // Initialize for all nodes
    for (const nodeId of Object.keys(nodes)) {
        adjacencyList.set(nodeId, []);
        reverseAdjacencyList.set(nodeId, []);
    }

    // Populate from edges
    for (const edge of edges) {
        const outgoing = adjacencyList.get(edge.source);
        if (outgoing && !outgoing.includes(edge.target)) {
            outgoing.push(edge.target);
        }

        const incoming = reverseAdjacencyList.get(edge.target);
        if (incoming && !incoming.includes(edge.source)) {
            incoming.push(edge.source);
        }
    }

    // Find all start nodes
    const startNodes = findStartNodes(nodes, reverseAdjacencyList, triggerId);

    // BFS from all start nodes
    const reachableNodes = new Set<string>();
    const nodeDepths = new Map<string, number>();
    const queue: Array<{ nodeId: string; depth: number }> = [];

    // Initialize queue with all start nodes at depth 0
    for (const startNodeId of startNodes) {
        queue.push({ nodeId: startNodeId, depth: 0 });
    }

    while (queue.length > 0) {
        const { nodeId, depth } = queue.shift()!;

        // Skip if already visited with same or better depth
        if (reachableNodes.has(nodeId)) {
            const existingDepth = nodeDepths.get(nodeId);
            // Update depth if this path is shorter (shouldn't normally happen in DAG)
            if (existingDepth !== undefined && depth < existingDepth) {
                nodeDepths.set(nodeId, depth);
            }
            continue;
        }

        reachableNodes.add(nodeId);
        nodeDepths.set(nodeId, depth);

        // Add all outgoing nodes to queue
        const outgoing = adjacencyList.get(nodeId) || [];
        for (const targetId of outgoing) {
            if (!reachableNodes.has(targetId)) {
                queue.push({ nodeId: targetId, depth: depth + 1 });
            }
        }
    }

    return {
        reachableNodes,
        nodeDepths,
        adjacencyList,
        reverseAdjacencyList
    };
}

/**
 * Find all start nodes for the workflow.
 * Start nodes are:
 * 1. Input nodes (type === "input")
 * 2. Nodes with no incoming edges
 * 3. The explicit trigger node
 *
 * @param nodes - All workflow nodes
 * @param reverseAdjacency - Incoming edge map
 * @param triggerId - Explicit trigger node ID
 * @returns Array of start node IDs
 */
function findStartNodes(
    nodes: Record<string, WorkflowNode>,
    reverseAdjacency: Map<string, string[]>,
    triggerId: string
): string[] {
    const startNodes = new Set<string>();

    for (const nodeId of Object.keys(nodes)) {
        const node = nodes[nodeId];
        const incoming = reverseAdjacency.get(nodeId) || [];

        // Start node if: input type OR no incoming edges OR is the trigger
        if (node.type === "input" || incoming.length === 0 || nodeId === triggerId) {
            startNodes.add(nodeId);
        }
    }

    return [...startNodes];
}

/**
 * Compute execution levels from node depths.
 * Groups nodes by their BFS depth for parallel execution.
 *
 * @param nodeDepths - Map of node ID to depth
 * @returns Array of arrays, where each inner array contains node IDs at that level
 */
export function computeExecutionLevels(nodeDepths: Map<string, number>): string[][] {
    if (nodeDepths.size === 0) {
        return [];
    }

    const levels = new Map<number, string[]>();

    for (const [nodeId, depth] of nodeDepths) {
        if (!levels.has(depth)) {
            levels.set(depth, []);
        }
        levels.get(depth)!.push(nodeId);
    }

    // Convert to array sorted by depth
    const maxDepth = Math.max(...levels.keys());
    const result: string[][] = [];

    for (let i = 0; i <= maxDepth; i++) {
        result.push(levels.get(i) || []);
    }

    return result;
}

/**
 * Check if the workflow graph has cycles (excluding valid loop back-edges).
 * Uses DFS with recursion stack tracking.
 *
 * @param adjacencyList - Outgoing edge map
 * @param startNodes - Nodes to start search from
 * @returns Array of cycle descriptions (empty if no cycles)
 */
export function detectCycles(adjacencyList: Map<string, string[]>, startNodes: string[]): string[] {
    const cycles: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function dfs(nodeId: string, path: string[]): void {
        if (recursionStack.has(nodeId)) {
            // Found cycle - extract cycle path
            const cycleStart = path.indexOf(nodeId);
            const cyclePath = path.slice(cycleStart).join(" -> ") + " -> " + nodeId;
            cycles.push(cyclePath);
            return;
        }

        if (visited.has(nodeId)) {
            return;
        }

        visited.add(nodeId);
        recursionStack.add(nodeId);

        const dependents = adjacencyList.get(nodeId) || [];
        for (const depId of dependents) {
            dfs(depId, [...path, nodeId]);
        }

        recursionStack.delete(nodeId);
    }

    for (const startNode of startNodes) {
        if (!visited.has(startNode)) {
            dfs(startNode, []);
        }
    }

    return cycles;
}

/**
 * Compute the maximum depth of the workflow graph.
 * Useful for estimating execution time/parallelism.
 *
 * @param nodeDepths - Map of node ID to depth
 * @returns Maximum depth (0 if empty)
 */
export function getMaxDepth(nodeDepths: Map<string, number>): number {
    if (nodeDepths.size === 0) {
        return 0;
    }
    return Math.max(...nodeDepths.values());
}

/**
 * Get nodes at a specific depth level.
 *
 * @param nodeDepths - Map of node ID to depth
 * @param depth - Target depth level
 * @returns Array of node IDs at that depth
 */
export function getNodesAtDepth(nodeDepths: Map<string, number>, depth: number): string[] {
    const nodesAtDepth: string[] = [];

    for (const [nodeId, nodeDepth] of nodeDepths) {
        if (nodeDepth === depth) {
            nodesAtDepth.push(nodeId);
        }
    }

    return nodesAtDepth;
}

/**
 * Find nodes that have no dependents (terminal nodes).
 *
 * @param adjacencyList - Outgoing edge map
 * @param reachableNodes - Set of reachable nodes
 * @returns Array of terminal node IDs
 */
export function findTerminalNodes(
    adjacencyList: Map<string, string[]>,
    reachableNodes: Set<string>
): string[] {
    const terminalNodes: string[] = [];

    for (const nodeId of reachableNodes) {
        const dependents = adjacencyList.get(nodeId) || [];
        // Terminal if no outgoing edges to reachable nodes
        const hasReachableDependents = dependents.some((depId) => reachableNodes.has(depId));
        if (!hasReachableDependents) {
            terminalNodes.push(nodeId);
        }
    }

    return terminalNodes;
}

/**
 * Topological sort of reachable nodes.
 * Uses Kahn's algorithm (BFS-based).
 *
 * @param reachableNodes - Set of reachable nodes
 * @param adjacencyList - Outgoing edge map
 * @param reverseAdjacencyList - Incoming edge map
 * @returns Topologically sorted node IDs, or null if cycle detected
 */
export function topologicalSort(
    reachableNodes: Set<string>,
    adjacencyList: Map<string, string[]>,
    reverseAdjacencyList: Map<string, string[]>
): string[] | null {
    const result: string[] = [];
    const inDegree = new Map<string, number>();

    // Calculate in-degree for reachable nodes only
    for (const nodeId of reachableNodes) {
        const incoming = reverseAdjacencyList.get(nodeId) || [];
        const reachableIncoming = incoming.filter((id) => reachableNodes.has(id));
        inDegree.set(nodeId, reachableIncoming.length);
    }

    // Find all nodes with in-degree 0
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
        if (degree === 0) {
            queue.push(nodeId);
        }
    }

    while (queue.length > 0) {
        const nodeId = queue.shift()!;
        result.push(nodeId);

        // Decrease in-degree for all dependents
        const dependents = adjacencyList.get(nodeId) || [];
        for (const depId of dependents) {
            if (!reachableNodes.has(depId)) continue;

            const newDegree = (inDegree.get(depId) || 0) - 1;
            inDegree.set(depId, newDegree);

            if (newDegree === 0) {
                queue.push(depId);
            }
        }
    }

    // If we didn't process all nodes, there's a cycle
    if (result.length !== reachableNodes.size) {
        return null;
    }

    return result;
}

// ============================================================================
// STAGE 2: LOOP CONSTRUCTOR
// ============================================================================

/**
 * Construct loop sentinels and rewire edges for loop handling.
 *
 * @param nodes - Original workflow nodes
 * @param edges - Original workflow edges
 * @param pathResult - Result from PathConstructor
 * @returns Loop construction result with sentinels and rewired edges
 */
export function constructLoops(
    nodes: Record<string, WorkflowNode>,
    edges: Array<{ id: string; source: string; target: string; sourceHandle?: string }>,
    pathResult: PathConstructorResult
): LoopConstructorResult {
    const executableNodes = new Map<string, ExecutableNode>();
    const typedEdges = new Map<string, TypedEdge>();
    const loopContexts = new Map<string, LoopContext>();

    // First pass: identify loop nodes
    const loopNodeIds = new Set<string>();
    for (const [nodeId, node] of Object.entries(nodes)) {
        if (node.type === "loop" && pathResult.reachableNodes.has(nodeId)) {
            loopNodeIds.add(nodeId);
        }
    }

    // Second pass: for each loop, identify body nodes and create sentinels
    for (const loopNodeId of loopNodeIds) {
        const loopNode = nodes[loopNodeId];
        const loopConfig = loopNode.config;

        // Find loop body nodes (nodes between loop and its return edge)
        const bodyNodes = findLoopBodyNodes(loopNodeId, edges, pathResult.adjacencyList);

        // Create sentinel node IDs
        const startSentinelId = `${loopNodeId}__LOOP_START`;
        const endSentinelId = `${loopNodeId}__LOOP_END`;

        // Create loop context
        const loopContext: LoopContext = {
            loopNodeId,
            startSentinelId,
            endSentinelId,
            bodyNodes: [...bodyNodes],
            iterationVariable: `${loopNodeId}_index`,
            itemVariable:
                typeof loopConfig.itemVariable === "string"
                    ? loopConfig.itemVariable
                    : `${loopNodeId}_item`,
            arrayPath: typeof loopConfig.arrayPath === "string" ? loopConfig.arrayPath : undefined,
            maxIterations:
                typeof loopConfig.maxIterations === "number" ? loopConfig.maxIterations : 1000
        };

        loopContexts.set(loopNodeId, loopContext);

        // Create LOOP_START sentinel node
        const startSentinel: ExecutableNode = {
            id: startSentinelId,
            type: "loop-start",
            name: `${loopNode.name} - Start`,
            config: {
                loopType: loopConfig.loopType ?? "forEach",
                arrayPath: loopConfig.arrayPath ?? null,
                condition: loopConfig.condition ?? null,
                count: loopConfig.count ?? null,
                iterationVariable: loopContext.iterationVariable,
                itemVariable: loopContext.itemVariable ?? "item",
                maxIterations: loopContext.maxIterations
            },
            originalNodeId: loopNodeId,
            depth: pathResult.nodeDepths.get(loopNodeId) || 0,
            dependencies: [...(pathResult.reverseAdjacencyList.get(loopNodeId) || [])],
            dependents: [], // Will be populated from body nodes
            loopContext
        };

        // Create LOOP_END sentinel node
        const endSentinel: ExecutableNode = {
            id: endSentinelId,
            type: "loop-end",
            name: `${loopNode.name} - End`,
            config: {
                loopNodeId,
                iterationVariable: loopContext.iterationVariable
            },
            originalNodeId: loopNodeId,
            depth: (pathResult.nodeDepths.get(loopNodeId) || 0) + bodyNodes.size + 1,
            dependencies: [], // Will be populated from body terminal nodes
            dependents: [
                ...(pathResult.adjacencyList.get(loopNodeId) || []).filter(
                    (id) => !bodyNodes.has(id)
                )
            ],
            loopContext
        };

        executableNodes.set(startSentinelId, startSentinel);
        executableNodes.set(endSentinelId, endSentinel);
    }

    // Third pass: convert all non-loop nodes to ExecutableNodes
    for (const [nodeId, node] of Object.entries(nodes)) {
        if (loopNodeIds.has(nodeId)) {
            continue; // Skip - replaced by sentinels
        }

        if (!pathResult.reachableNodes.has(nodeId)) {
            continue; // Skip unreachable nodes
        }

        const execNode: ExecutableNode = {
            id: nodeId,
            type: node.type as ExecutableNode["type"],
            name: node.name,
            config: node.config,
            depth: pathResult.nodeDepths.get(nodeId) || 0,
            dependencies: [...(pathResult.reverseAdjacencyList.get(nodeId) || [])],
            dependents: [...(pathResult.adjacencyList.get(nodeId) || [])]
        };

        // Check if this node is inside a loop
        for (const [, context] of loopContexts) {
            if (context.bodyNodes.includes(nodeId)) {
                execNode.loopContext = context;
                break;
            }
        }

        executableNodes.set(nodeId, execNode);
    }

    // Fourth pass: rewire edges for loop sentinels
    for (const edge of edges) {
        // Skip edges involving unreachable nodes (unless they're loop nodes being replaced)
        const sourceReachable =
            pathResult.reachableNodes.has(edge.source) || loopNodeIds.has(edge.source);
        const targetReachable =
            pathResult.reachableNodes.has(edge.target) || loopNodeIds.has(edge.target);

        if (!sourceReachable || !targetReachable) {
            continue;
        }

        let source = edge.source;
        let target = edge.target;
        let handleType: EdgeHandleType = "default";

        // Rewire loop source edges (loop -> body first node becomes start_sentinel -> body)
        if (loopNodeIds.has(edge.source)) {
            const context = loopContexts.get(edge.source)!;
            // If target is in body, source becomes start sentinel
            if (context.bodyNodes.includes(edge.target)) {
                source = context.startSentinelId;
                handleType = "loop-body";
            } else {
                // Exit edge - source becomes end sentinel
                source = context.endSentinelId;
                handleType = "loop-exit";
            }
        }

        // Rewire loop target edges (body terminal -> loop becomes body -> end_sentinel)
        if (loopNodeIds.has(edge.target)) {
            const context = loopContexts.get(edge.target)!;
            target = context.endSentinelId;
        }

        // Handle sourceHandle for conditional/switch edges
        if (edge.sourceHandle) {
            if (edge.sourceHandle === "true" || edge.sourceHandle === "false") {
                handleType = edge.sourceHandle;
            } else if (edge.sourceHandle.startsWith("case-")) {
                handleType = edge.sourceHandle as `case-${string}`;
            }
        }

        const edgeId = `${source}->${target}`;
        const typedEdge: TypedEdge = {
            id: edgeId,
            source,
            target,
            sourceHandle: edge.sourceHandle,
            handleType
        };

        typedEdges.set(edgeId, typedEdge);
    }

    // Add loop iteration edges (LOOP_END -> LOOP_START for continuation)
    for (const [_loopId, context] of loopContexts) {
        // Add the back-edge for iteration
        const iterationEdgeId = `${context.endSentinelId}->${context.startSentinelId}`;
        const iterationEdge: TypedEdge = {
            id: iterationEdgeId,
            source: context.endSentinelId,
            target: context.startSentinelId,
            handleType: "loop-body"
        };
        typedEdges.set(iterationEdgeId, iterationEdge);
    }

    // Update dependencies and dependents based on rewired edges
    updateDependenciesFromEdges(executableNodes, typedEdges);

    return {
        nodes: executableNodes,
        edges: typedEdges,
        loopContexts
    };
}

/**
 * Find all nodes that are part of a loop's body.
 * Uses DFS to find nodes that eventually route back to the loop.
 *
 * @param loopNodeId - The loop node ID
 * @param edges - All workflow edges
 * @param adjacencyList - Outgoing edge map
 * @returns Set of node IDs in the loop body
 */
function findLoopBodyNodes(
    loopNodeId: string,
    edges: Array<{ source: string; target: string }>,
    adjacencyList: Map<string, string[]>
): Set<string> {
    const bodyNodes = new Set<string>();

    // Build reverse lookup for edges that target the loop
    const nodesToLoop = new Set<string>();
    for (const edge of edges) {
        if (edge.target === loopNodeId) {
            nodesToLoop.add(edge.source);
        }
    }

    // If no edges back to loop, return empty set
    if (nodesToLoop.size === 0) {
        return bodyNodes;
    }

    // DFS from direct dependents of loop to find paths back
    const visited = new Set<string>();
    const directDependents = adjacencyList.get(loopNodeId) || [];

    function dfs(nodeId: string): boolean {
        if (nodeId === loopNodeId) {
            return true;
        }
        if (visited.has(nodeId)) {
            return bodyNodes.has(nodeId);
        }

        visited.add(nodeId);

        // Check if this node directly connects back to loop
        if (nodesToLoop.has(nodeId)) {
            bodyNodes.add(nodeId);
            return true;
        }

        // Check if any successor leads back to loop
        const successors = adjacencyList.get(nodeId) || [];
        for (const successor of successors) {
            if (dfs(successor)) {
                bodyNodes.add(nodeId);
                return true;
            }
        }

        return false;
    }

    for (const dependent of directDependents) {
        dfs(dependent);
    }

    return bodyNodes;
}

/**
 * Update node dependencies and dependents based on rewired edges.
 *
 * @param nodes - Executable nodes to update
 * @param edges - Typed edges after rewiring
 */
function updateDependenciesFromEdges(
    nodes: Map<string, ExecutableNode>,
    edges: Map<string, TypedEdge>
): void {
    // Clear existing dependencies/dependents
    for (const node of nodes.values()) {
        node.dependencies = [];
        node.dependents = [];
    }

    // Rebuild from edges
    for (const edge of edges.values()) {
        const sourceNode = nodes.get(edge.source);
        const targetNode = nodes.get(edge.target);

        if (sourceNode && !sourceNode.dependents.includes(edge.target)) {
            sourceNode.dependents.push(edge.target);
        }

        if (targetNode && !targetNode.dependencies.includes(edge.source)) {
            targetNode.dependencies.push(edge.source);
        }
    }
}

/**
 * Check if a node is a loop sentinel.
 *
 * @param nodeId - Node ID to check
 * @returns True if this is a loop-start or loop-end sentinel
 */
export function isLoopSentinel(nodeId: string): boolean {
    return nodeId.includes("__LOOP_START") || nodeId.includes("__LOOP_END");
}

/**
 * Extract the original loop node ID from a sentinel ID.
 *
 * @param sentinelId - Sentinel node ID
 * @returns Original loop node ID, or undefined if not a sentinel
 */
export function getLoopNodeIdFromSentinel(sentinelId: string): string | undefined {
    if (sentinelId.includes("__LOOP_START")) {
        return sentinelId.replace("__LOOP_START", "");
    }
    if (sentinelId.includes("__LOOP_END")) {
        return sentinelId.replace("__LOOP_END", "");
    }
    return undefined;
}

// ============================================================================
// STAGE 3: NODE CONSTRUCTOR
// ============================================================================

/**
 * Construct nodes with parallel expansion.
 * Currently a pass-through that copies nodes unchanged.
 *
 * @param loopResult - Result from LoopConstructor
 * @returns Node construction result
 */
export function constructNodes(loopResult: LoopConstructorResult): NodeConstructorResult {
    const nodes = new Map<string, ExecutableNode>();
    const parallelBranches = new Map<string, string[]>();

    // Copy all nodes, expanding parallel nodes if found
    for (const [nodeId, node] of loopResult.nodes) {
        if (node.type === "parallel") {
            // Future: expand parallel node into branches
            const branches = expandParallelNode(node);
            if (branches.length > 0) {
                parallelBranches.set(
                    nodeId,
                    branches.map((b) => b.id)
                );
                for (const branch of branches) {
                    nodes.set(branch.id, branch);
                }
            } else {
                // No expansion - keep original
                nodes.set(nodeId, { ...node });
            }
        } else {
            // Copy node as-is
            nodes.set(nodeId, { ...node });
        }
    }

    // Update dependencies/dependents for expanded nodes
    if (parallelBranches.size > 0) {
        updateDependenciesForExpansion(nodes, parallelBranches);
    }

    return { nodes, parallelBranches };
}

/**
 * Expand a parallel node into multiple branch nodes.
 * Placeholder for future parallel node type implementation.
 *
 * @param _node - The parallel node to expand
 * @returns Array of expanded branch nodes (empty for now)
 */
function expandParallelNode(_node: ExecutableNode): ExecutableNode[] {
    // Future implementation:
    // 1. Read parallel config (count or array path)
    // 2. Create N branch nodes with parallelBranchIndex
    // 3. Return array of branch nodes

    // For now, return empty array (parallel type not yet implemented)
    return [];
}

/**
 * Update dependencies after parallel node expansion.
 * Nodes that depended on the original parallel node now depend on all branches.
 *
 * @param nodes - All nodes including expanded branches
 * @param parallelBranches - Map of original node ID to expanded branch IDs
 */
function updateDependenciesForExpansion(
    nodes: Map<string, ExecutableNode>,
    parallelBranches: Map<string, string[]>
): void {
    for (const [originalId, branchIds] of parallelBranches) {
        for (const [nodeId, node] of nodes) {
            // Skip the branches themselves
            if (branchIds.includes(nodeId)) {
                continue;
            }

            // If this node depended on the original parallel node,
            // it now depends on ALL branches (fan-in pattern)
            const depIndex = node.dependencies.indexOf(originalId);
            if (depIndex !== -1) {
                node.dependencies.splice(depIndex, 1, ...branchIds);
            }

            // If this node was a dependent of the original,
            // update the branches to point to it (fan-out pattern)
            const dependentIndex = node.dependents.indexOf(originalId);
            if (dependentIndex !== -1) {
                node.dependents.splice(dependentIndex, 1);
                for (const branchId of branchIds) {
                    const branch = nodes.get(branchId);
                    if (branch && !branch.dependents.includes(nodeId)) {
                        branch.dependents.push(nodeId);
                    }
                }
            }
        }
    }
}

/**
 * Check if a node was expanded from a parallel node.
 *
 * @param nodeId - Node ID to check
 * @param parallelBranches - Map of original node ID to expanded branch IDs
 * @returns True if this node is an expanded branch
 */
export function isExpandedBranch(nodeId: string, parallelBranches: Map<string, string[]>): boolean {
    for (const branchIds of parallelBranches.values()) {
        if (branchIds.includes(nodeId)) {
            return true;
        }
    }
    return false;
}

/**
 * Get the original parallel node ID for an expanded branch.
 *
 * @param nodeId - Branch node ID
 * @param parallelBranches - Map of original node ID to expanded branch IDs
 * @returns Original parallel node ID, or undefined if not a branch
 */
export function getParallelNodeIdFromBranch(
    nodeId: string,
    parallelBranches: Map<string, string[]>
): string | undefined {
    for (const [originalId, branchIds] of parallelBranches) {
        if (branchIds.includes(nodeId)) {
            return originalId;
        }
    }
    return undefined;
}

/**
 * Get all branch node IDs for a parallel node.
 *
 * @param parallelNodeId - Original parallel node ID
 * @param parallelBranches - Map of original node ID to expanded branch IDs
 * @returns Array of branch node IDs, or undefined if not found
 */
export function getBranchesForParallelNode(
    parallelNodeId: string,
    parallelBranches: Map<string, string[]>
): string[] | undefined {
    return parallelBranches.get(parallelNodeId);
}

// ============================================================================
// STAGE 4: EDGE CONSTRUCTOR
// ============================================================================

/**
 * Construct final edges with proper handle types and parallel expansion.
 *
 * @param loopResult - Result from LoopConstructor (contains initial typed edges)
 * @param nodeResult - Result from NodeConstructor (contains parallel expansions)
 * @returns Final edge construction result
 */
export function constructEdges(
    loopResult: LoopConstructorResult,
    nodeResult: NodeConstructorResult
): EdgeConstructorResult {
    const edges = new Map<string, TypedEdge>();

    // If there are parallel branches, we need to expand edges
    if (nodeResult.parallelBranches.size > 0) {
        // Copy edges with parallel expansion
        for (const [, edge] of loopResult.edges) {
            const expandedEdges = expandEdgeForParallel(edge, nodeResult.parallelBranches);
            for (const expandedEdge of expandedEdges) {
                edges.set(expandedEdge.id, expandedEdge);
            }
        }
    } else {
        // No parallel expansion - copy edges as-is
        for (const [edgeId, edge] of loopResult.edges) {
            edges.set(edgeId, { ...edge });
        }
    }

    // Validate edge handle types match source node types
    validateEdgeHandles(edges, nodeResult.nodes);

    return { edges };
}

/**
 * Expand an edge for parallel branches.
 * If source or target was expanded, creates edges to/from all branches.
 *
 * @param edge - Original typed edge
 * @param parallelBranches - Map of original node ID to expanded branch IDs
 * @returns Array of expanded edges
 */
function expandEdgeForParallel(
    edge: TypedEdge,
    parallelBranches: Map<string, string[]>
): TypedEdge[] {
    const sourceBranches = parallelBranches.get(edge.source);
    const targetBranches = parallelBranches.get(edge.target);

    // Both source and target expanded - create all combinations
    if (sourceBranches && targetBranches) {
        const expandedEdges: TypedEdge[] = [];
        for (const sourceBranch of sourceBranches) {
            for (const targetBranch of targetBranches) {
                expandedEdges.push({
                    ...edge,
                    id: `${sourceBranch}->${targetBranch}`,
                    source: sourceBranch,
                    target: targetBranch
                });
            }
        }
        return expandedEdges;
    }

    // Only source expanded - all branches connect to same target
    if (sourceBranches) {
        return sourceBranches.map((sourceBranch) => ({
            ...edge,
            id: `${sourceBranch}->${edge.target}`,
            source: sourceBranch
        }));
    }

    // Only target expanded - source connects to all branches
    if (targetBranches) {
        return targetBranches.map((targetBranch) => ({
            ...edge,
            id: `${edge.source}->${targetBranch}`,
            target: targetBranch
        }));
    }

    // Neither expanded - return original
    return [edge];
}

/**
 * Validate that edge handle types are compatible with source node types.
 * Logs warnings for mismatches but doesn't throw.
 *
 * @param edges - All typed edges
 * @param nodes - All executable nodes
 */
function validateEdgeHandles(
    edges: Map<string, TypedEdge>,
    nodes: Map<string, ExecutableNode>
): void {
    for (const [edgeId, edge] of edges) {
        const sourceNode = nodes.get(edge.source);
        if (!sourceNode) {
            continue;
        }

        // Validate conditional handles
        if (edge.handleType === "true" || edge.handleType === "false") {
            if (sourceNode.type !== "conditional" && sourceNode.type !== "loop-start") {
                // eslint-disable-next-line no-console
                console.warn(
                    `Edge ${edgeId} has conditional handle "${edge.handleType}" but source is "${sourceNode.type}"`
                );
            }
        }

        // Validate switch handles
        if (edge.handleType.startsWith("case-")) {
            if (sourceNode.type !== "switch") {
                // eslint-disable-next-line no-console
                console.warn(
                    `Edge ${edgeId} has switch handle "${edge.handleType}" but source is "${sourceNode.type}"`
                );
            }
        }

        // Validate loop handles
        if (edge.handleType === "loop-body" || edge.handleType === "loop-exit") {
            if (sourceNode.type !== "loop-start" && sourceNode.type !== "loop-end") {
                // eslint-disable-next-line no-console
                console.warn(
                    `Edge ${edgeId} has loop handle "${edge.handleType}" but source is "${sourceNode.type}"`
                );
            }
        }
    }
}

/**
 * Get all edges from a specific source node.
 *
 * @param edges - All edges
 * @param sourceId - Source node ID
 * @returns Array of edges from that source
 */
export function getEdgesFromSource(edges: Map<string, TypedEdge>, sourceId: string): TypedEdge[] {
    const result: TypedEdge[] = [];
    for (const edge of edges.values()) {
        if (edge.source === sourceId) {
            result.push(edge);
        }
    }
    return result;
}

/**
 * Get all edges to a specific target node.
 *
 * @param edges - All edges
 * @param targetId - Target node ID
 * @returns Array of edges to that target
 */
export function getEdgesToTarget(edges: Map<string, TypedEdge>, targetId: string): TypedEdge[] {
    const result: TypedEdge[] = [];
    for (const edge of edges.values()) {
        if (edge.target === targetId) {
            result.push(edge);
        }
    }
    return result;
}

/**
 * Get edges matching a specific handle type from a source.
 *
 * @param edges - All edges
 * @param sourceId - Source node ID
 * @param handleType - Handle type to match
 * @returns Array of matching edges
 */
export function getEdgesByHandle(
    edges: Map<string, TypedEdge>,
    sourceId: string,
    handleType: TypedEdge["handleType"]
): TypedEdge[] {
    const result: TypedEdge[] = [];
    for (const edge of edges.values()) {
        if (edge.source === sourceId && edge.handleType === handleType) {
            result.push(edge);
        }
    }
    return result;
}

/**
 * Find the target node for a specific branch from a conditional/switch node.
 *
 * @param edges - All edges
 * @param sourceId - Conditional or switch node ID
 * @param branch - Branch name ("true", "false", "case-xxx", etc.)
 * @returns Target node ID, or undefined if not found
 */
export function findBranchTarget(
    edges: Map<string, TypedEdge>,
    sourceId: string,
    branch: string
): string | undefined {
    for (const edge of edges.values()) {
        if (edge.source === sourceId && edge.handleType === branch) {
            return edge.target;
        }
    }
    return undefined;
}

/**
 * Get all unique handle types used by edges from a source.
 *
 * @param edges - All edges
 * @param sourceId - Source node ID
 * @returns Array of unique handle types
 */
export function getHandleTypesFromSource(
    edges: Map<string, TypedEdge>,
    sourceId: string
): TypedEdge["handleType"][] {
    const handleTypes = new Set<TypedEdge["handleType"]>();
    for (const edge of edges.values()) {
        if (edge.source === sourceId) {
            handleTypes.add(edge.handleType);
        }
    }
    return [...handleTypes];
}
