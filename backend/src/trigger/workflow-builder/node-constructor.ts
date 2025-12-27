import type { WorkflowDefinition, WorkflowNode, JsonObject } from "@flowmaestro/shared";
import type {
    ExecutableNode,
    ExecutableEdge,
    ParallelBoundary,
    ConstructionContext,
    ReachabilityResult
} from "./types";
import { isParallelNode, getNodeCategory } from "./types";

/**
 * NodeConstructor - Stage 3 of the workflow construction pipeline.
 *
 * Converts WorkflowNodes to ExecutableNodes and expands parallel nodes.
 * This stage:
 * - Creates ExecutableNode instances from WorkflowNode definitions
 * - Expands parallel nodes into branch structures
 * - Marks nodes with error ports
 * - Identifies terminal nodes
 */
export class NodeConstructor {
    /**
     * Build executable nodes from reachable workflow nodes.
     *
     * @param definition - The workflow definition
     * @param reachability - Result from PathConstructor
     * @param context - The construction context to populate
     */
    static build(
        definition: WorkflowDefinition,
        reachability: ReachabilityResult,
        context: ConstructionContext
    ): void {
        const { nodes: workflowNodes, edges } = definition;
        const { reachableNodeIds } = reachability;
        const { nodes } = context;

        // Build adjacency lists for dependency calculation
        const { incomingMap, outgoingMap } = this.buildAdjacencyMaps(edges);

        // Convert each reachable node to an executable node
        for (const nodeId of reachableNodeIds) {
            const workflowNode = workflowNodes[nodeId];
            if (!workflowNode) continue;

            const executableNode = this.createExecutableNode(
                nodeId,
                workflowNode,
                incomingMap,
                outgoingMap,
                reachableNodeIds
            );

            nodes.set(nodeId, executableNode);
        }

        // Expand parallel nodes
        this.expandParallelNodes(context);
    }

    /**
     * Create an ExecutableNode from a WorkflowNode.
     */
    private static createExecutableNode(
        nodeId: string,
        workflowNode: WorkflowNode,
        incomingMap: Map<string, string[]>,
        outgoingMap: Map<string, string[]>,
        reachableNodeIds: Set<string>
    ): ExecutableNode {
        // Get dependencies (nodes that must complete before this node)
        const dependencies = (incomingMap.get(nodeId) || []).filter((id) =>
            reachableNodeIds.has(id)
        );

        // Get dependents (nodes that depend on this node's output)
        const dependents = (outgoingMap.get(nodeId) || []).filter((id) =>
            reachableNodeIds.has(id)
        );

        // Determine if this node has an error port
        const hasErrorPort = this.nodeHasErrorPort(workflowNode);

        // Determine if this is a terminal node (no outgoing edges to reachable nodes)
        const isTerminal = dependents.length === 0;

        return {
            id: nodeId,
            type: workflowNode.type,
            name: workflowNode.name,
            config: workflowNode.config,
            position: workflowNode.position,
            dependencies,
            dependents,
            hasErrorPort,
            isTerminal
        };
    }

    /**
     * Build adjacency maps for efficient dependency lookup.
     */
    private static buildAdjacencyMaps(
        edges: WorkflowDefinition["edges"]
    ): {
        incomingMap: Map<string, string[]>;
        outgoingMap: Map<string, string[]>;
    } {
        const incomingMap = new Map<string, string[]>();
        const outgoingMap = new Map<string, string[]>();

        for (const edge of edges) {
            // Incoming edges (target <- source)
            const incoming = incomingMap.get(edge.target) || [];
            incoming.push(edge.source);
            incomingMap.set(edge.target, incoming);

            // Outgoing edges (source -> target)
            const outgoing = outgoingMap.get(edge.source) || [];
            outgoing.push(edge.target);
            outgoingMap.set(edge.source, outgoing);
        }

        return { incomingMap, outgoingMap };
    }

    /**
     * Determine if a node type should have an error output port.
     */
    private static nodeHasErrorPort(workflowNode: WorkflowNode): boolean {
        // Check explicit errorPort config
        if (workflowNode.config.errorPort === true) {
            return true;
        }

        // Check onError strategy
        if (workflowNode.onError?.strategy === "goto") {
            return true;
        }

        // Certain node categories always have error ports
        const category = getNodeCategory(workflowNode.type);
        const categoriesWithErrorPorts = ["llm", "http", "integration", "agent"];

        return categoriesWithErrorPorts.includes(category);
    }

    /**
     * Expand parallel nodes into branch structures.
     */
    private static expandParallelNodes(context: ConstructionContext): void {
        const { nodes } = context;

        // Find all parallel nodes
        const parallelNodes = Array.from(nodes.values()).filter((node) =>
            isParallelNode(node.type)
        );

        for (const parallelNode of parallelNodes) {
            this.expandParallelNode(parallelNode, context);
        }
    }

    /**
     * Expand a single parallel node into branches.
     */
    private static expandParallelNode(
        parallelNode: ExecutableNode,
        context: ConstructionContext
    ): void {
        const { nodes, edges, parallelBoundaries, warnings } = context;

        // Get branches configuration from the node
        const branchConfig = parallelNode.config.branches;

        if (!Array.isArray(branchConfig) || branchConfig.length === 0) {
            // If no explicit branches, look for outgoing edges to determine branches
            const outgoingEdges = edges.filter(
                (e) => e.source === parallelNode.id
            );

            if (outgoingEdges.length < 2) {
                warnings.push(
                    `Parallel node "${parallelNode.id}" has fewer than 2 branches`
                );
            }
        }

        // Find all edges from parallel node (each represents a branch start)
        const branchEdges = edges.filter((e) => e.source === parallelNode.id);

        if (branchEdges.length === 0) {
            warnings.push(
                `Parallel node "${parallelNode.id}" has no outgoing edges`
            );
            return;
        }

        // Build branch information
        const branches: ParallelBoundary["branches"] = [];

        for (let branchIndex = 0; branchIndex < branchEdges.length; branchIndex++) {
            const branchEdge = branchEdges[branchIndex];
            const branchNodeIds: string[] = [];
            const startNodeId = branchEdge.target;

            // Traverse to find all nodes in this branch
            const visited = new Set<string>();
            const queue = [startNodeId];

            while (queue.length > 0) {
                const nodeId = queue.shift()!;
                if (visited.has(nodeId)) continue;

                // Stop if we reach another parallel node or the same parallel node
                const node = nodes.get(nodeId);
                if (!node) continue;
                if (isParallelNode(node.type) && nodeId !== startNodeId) continue;

                visited.add(nodeId);
                branchNodeIds.push(nodeId);

                // Update node's parallel context
                node.parallelContext = {
                    parentParallelId: parallelNode.id,
                    branchIndex
                };

                // Find outgoing edges
                const outgoing = edges.filter((e) => e.source === nodeId);
                for (const edge of outgoing) {
                    // Don't traverse back to the parallel node
                    if (edge.target !== parallelNode.id && !visited.has(edge.target)) {
                        queue.push(edge.target);
                    }
                }
            }

            // Find end node (last node in the branch)
            const endNodeId = this.findBranchEndNode(
                branchNodeIds,
                edges,
                parallelNode.id
            );

            branches.push({
                index: branchIndex,
                nodeIds: branchNodeIds,
                startNodeId,
                endNodeId: endNodeId || startNodeId
            });
        }

        // Get aggregation strategy
        const aggregation = this.getAggregationStrategy(parallelNode.config);

        // Create parallel boundary
        const boundary: ParallelBoundary = {
            parallelNodeId: parallelNode.id,
            branches,
            aggregation
        };

        parallelBoundaries.set(parallelNode.id, boundary);
    }

    /**
     * Find the end node of a parallel branch.
     */
    private static findBranchEndNode(
        branchNodeIds: string[],
        edges: ExecutableEdge[],
        _parallelNodeId: string
    ): string | undefined {
        // Find nodes that either:
        // 1. Have no outgoing edges to other branch nodes
        // 2. Point back to a join/aggregation point

        for (const nodeId of branchNodeIds) {
            const outgoing = edges.filter((e) => e.source === nodeId);

            // If no outgoing edges, this is a terminal node
            if (outgoing.length === 0) {
                return nodeId;
            }

            // If all outgoing edges go outside the branch, this is the end
            const goesOutside = outgoing.every(
                (e) => !branchNodeIds.includes(e.target)
            );

            if (goesOutside) {
                return nodeId;
            }
        }

        // If no clear end node, return the last node in the list
        return branchNodeIds[branchNodeIds.length - 1];
    }

    /**
     * Get the aggregation strategy for a parallel node.
     */
    private static getAggregationStrategy(
        config: JsonObject
    ): "all" | "first" | "race" {
        const strategy = config.aggregation;

        if (strategy === "first" || strategy === "race" || strategy === "all") {
            return strategy;
        }

        return "all"; // Default to waiting for all branches
    }

    /**
     * Check if a node is inside a parallel block.
     */
    static isInsideParallel(
        nodeId: string,
        parallelBoundaries: Map<string, ParallelBoundary>
    ): boolean {
        for (const boundary of parallelBoundaries.values()) {
            for (const branch of boundary.branches) {
                if (branch.nodeIds.includes(nodeId)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get the parallel boundary containing a node, if any.
     */
    static getContainingParallel(
        nodeId: string,
        parallelBoundaries: Map<string, ParallelBoundary>
    ): ParallelBoundary | undefined {
        for (const boundary of parallelBoundaries.values()) {
            for (const branch of boundary.branches) {
                if (branch.nodeIds.includes(nodeId)) {
                    return boundary;
                }
            }
        }
        return undefined;
    }

    /**
     * Get the branch index for a node within a parallel block.
     */
    static getBranchIndex(
        nodeId: string,
        parallelBoundaries: Map<string, ParallelBoundary>
    ): number | undefined {
        for (const boundary of parallelBoundaries.values()) {
            for (const branch of boundary.branches) {
                if (branch.nodeIds.includes(nodeId)) {
                    return branch.index;
                }
            }
        }
        return undefined;
    }
}
