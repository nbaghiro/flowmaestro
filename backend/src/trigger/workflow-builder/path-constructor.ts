import type { WorkflowDefinition } from "@flowmaestro/shared";
import type { ReachabilityResult } from "./types";

/**
 * PathConstructor - Stage 1 of the workflow construction pipeline.
 *
 * Performs BFS reachability analysis from the workflow entry point to identify
 * which nodes should be included in the execution plan. This ensures we only
 * process nodes that are actually connected to the workflow execution path.
 *
 * Features:
 * - BFS traversal from entry point through all edge connections
 * - Follows all edge types (source, error, condition, router)
 * - Detects unreachable nodes for warnings
 * - Handles cycles safely (visited tracking)
 */
export class PathConstructor {
    /**
     * Build reachability result from workflow definition.
     *
     * @param definition - The workflow definition to analyze
     * @returns ReachabilityResult with reachable/unreachable node sets
     * @throws Error if entry point is missing or not found in nodes
     */
    static build(definition: WorkflowDefinition): ReachabilityResult {
        const { nodes, edges, entryPoint } = definition;

        // Validate entry point
        if (!entryPoint) {
            throw new Error("Workflow definition missing entryPoint");
        }

        if (!nodes[entryPoint]) {
            throw new Error(`Entry point node "${entryPoint}" not found in workflow nodes`);
        }

        // Build adjacency list for efficient traversal
        const adjacencyList = this.buildAdjacencyList(edges);

        // BFS from entry point
        const reachableNodeIds = new Set<string>();
        const queue: string[] = [entryPoint];

        while (queue.length > 0) {
            const currentNodeId = queue.shift()!;

            // Skip if already visited
            if (reachableNodeIds.has(currentNodeId)) {
                continue;
            }

            // Skip if node doesn't exist in definition (edge points to invalid node)
            if (!nodes[currentNodeId]) {
                continue;
            }

            // Mark as reachable
            reachableNodeIds.add(currentNodeId);

            // Add all target nodes from outgoing edges
            const outgoingTargets = adjacencyList.get(currentNodeId) || [];
            for (const targetId of outgoingTargets) {
                if (!reachableNodeIds.has(targetId)) {
                    queue.push(targetId);
                }
            }
        }

        // Identify unreachable nodes
        const allNodeIds = new Set(Object.keys(nodes));
        const unreachableNodeIds = new Set<string>();

        for (const nodeId of allNodeIds) {
            if (!reachableNodeIds.has(nodeId)) {
                unreachableNodeIds.add(nodeId);
            }
        }

        return {
            reachableNodeIds,
            unreachableNodeIds,
            entryPointId: entryPoint
        };
    }

    /**
     * Build an adjacency list from edges for efficient graph traversal.
     * Maps each source node to its list of target nodes.
     */
    private static buildAdjacencyList(
        edges: WorkflowDefinition["edges"]
    ): Map<string, string[]> {
        const adjacencyList = new Map<string, string[]>();

        for (const edge of edges) {
            const targets = adjacencyList.get(edge.source) || [];
            targets.push(edge.target);
            adjacencyList.set(edge.source, targets);
        }

        return adjacencyList;
    }

    /**
     * Get all edges that connect reachable nodes.
     * Useful for filtering edges after reachability analysis.
     */
    static filterReachableEdges(
        edges: WorkflowDefinition["edges"],
        reachableNodeIds: Set<string>
    ): WorkflowDefinition["edges"] {
        return edges.filter(
            (edge) => reachableNodeIds.has(edge.source) && reachableNodeIds.has(edge.target)
        );
    }

    /**
     * Validate that all edge references point to existing nodes.
     * Returns a list of invalid edge references for error reporting.
     */
    static validateEdgeReferences(
        edges: WorkflowDefinition["edges"],
        nodeIds: Set<string>
    ): Array<{ edgeId: string; invalidNodeId: string; type: "source" | "target" }> {
        const invalidReferences: Array<{
            edgeId: string;
            invalidNodeId: string;
            type: "source" | "target";
        }> = [];

        for (const edge of edges) {
            if (!nodeIds.has(edge.source)) {
                invalidReferences.push({
                    edgeId: edge.id,
                    invalidNodeId: edge.source,
                    type: "source"
                });
            }

            if (!nodeIds.has(edge.target)) {
                invalidReferences.push({
                    edgeId: edge.id,
                    invalidNodeId: edge.target,
                    type: "target"
                });
            }
        }

        return invalidReferences;
    }

    /**
     * Check if the graph has cycles starting from the entry point.
     * Uses DFS with recursion stack tracking.
     *
     * @returns Array of node IDs that form cycles (nodes in back edges)
     */
    static detectCycles(definition: WorkflowDefinition): string[] {
        const { nodes, edges, entryPoint } = definition;

        if (!entryPoint || !nodes[entryPoint]) {
            return [];
        }

        const adjacencyList = this.buildAdjacencyList(edges);
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const cycleNodes: string[] = [];

        const dfs = (nodeId: string): boolean => {
            if (!nodes[nodeId]) return false;

            visited.add(nodeId);
            recursionStack.add(nodeId);

            const targets = adjacencyList.get(nodeId) || [];
            for (const targetId of targets) {
                if (!visited.has(targetId)) {
                    if (dfs(targetId)) {
                        return true;
                    }
                } else if (recursionStack.has(targetId)) {
                    // Found a back edge (cycle)
                    if (!cycleNodes.includes(targetId)) {
                        cycleNodes.push(targetId);
                    }
                }
            }

            recursionStack.delete(nodeId);
            return false;
        };

        dfs(entryPoint);

        return cycleNodes;
    }

    /**
     * Calculate the topological depth of each reachable node.
     * Used for determining execution levels in the plan.
     *
     * @returns Map of nodeId to depth (0 = entry point)
     */
    static calculateNodeDepths(
        definition: WorkflowDefinition,
        reachableNodeIds: Set<string>
    ): Map<string, number> {
        const { edges, entryPoint } = definition;
        const depths = new Map<string, number>();

        if (!entryPoint) {
            return depths;
        }

        // Build adjacency list for reachable edges only
        const adjacencyList = new Map<string, string[]>();
        for (const edge of edges) {
            if (reachableNodeIds.has(edge.source) && reachableNodeIds.has(edge.target)) {
                const targets = adjacencyList.get(edge.source) || [];
                targets.push(edge.target);
                adjacencyList.set(edge.source, targets);
            }
        }

        // BFS to assign depths
        const queue: Array<{ nodeId: string; depth: number }> = [
            { nodeId: entryPoint, depth: 0 }
        ];

        while (queue.length > 0) {
            const { nodeId, depth } = queue.shift()!;

            // Only update if this is the first visit or a shorter path
            if (depths.has(nodeId) && depths.get(nodeId)! <= depth) {
                continue;
            }

            depths.set(nodeId, depth);

            const targets = adjacencyList.get(nodeId) || [];
            for (const targetId of targets) {
                if (!depths.has(targetId) || depths.get(targetId)! > depth + 1) {
                    queue.push({ nodeId: targetId, depth: depth + 1 });
                }
            }
        }

        return depths;
    }
}
