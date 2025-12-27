import type { WorkflowDefinition, WorkflowEdge } from "@flowmaestro/shared";
import type {
    ExecutableNode,
    ExecutableEdge,
    ConstructionContext,
    EdgeHandleType,
    ReachabilityResult
} from "./types";
import { isLogicNode, isLoopNode } from "./types";

/**
 * EdgeConstructor - Stage 4 of the workflow construction pipeline.
 *
 * Converts WorkflowEdges to ExecutableEdges with proper handle types.
 * This stage:
 * - Determines edge handle types from source handles
 * - Validates edge connections
 * - Extracts condition values for conditional edges
 * - Extracts router paths for router edges
 * - Updates node dependencies based on edges
 */
export class EdgeConstructor {
    /**
     * Build executable edges from workflow edges.
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
        const { edges: workflowEdges } = definition;
        const { reachableNodeIds } = reachability;
        const { nodes, edges, warnings } = context;

        // Convert each edge between reachable nodes
        for (const workflowEdge of workflowEdges) {
            // Skip edges that connect unreachable nodes
            if (
                !reachableNodeIds.has(workflowEdge.source) ||
                !reachableNodeIds.has(workflowEdge.target)
            ) {
                continue;
            }

            const sourceNode = nodes.get(workflowEdge.source);
            const targetNode = nodes.get(workflowEdge.target);

            if (!sourceNode || !targetNode) {
                warnings.push(
                    `Edge "${workflowEdge.id}" references missing node(s)`
                );
                continue;
            }

            const executableEdge = this.createExecutableEdge(
                workflowEdge,
                sourceNode,
                warnings
            );

            edges.push(executableEdge);
        }

        // Update node handle types based on edges
        this.updateNodeHandleTypes(nodes, edges);

        // Validate edge consistency
        this.validateEdges(nodes, edges, warnings);
    }

    /**
     * Create an ExecutableEdge from a WorkflowEdge.
     */
    private static createExecutableEdge(
        workflowEdge: WorkflowEdge,
        sourceNode: ExecutableNode,
        _warnings: string[]
    ): ExecutableEdge {
        const handleType = this.determineHandleType(
            workflowEdge.sourceHandle,
            sourceNode.type
        );

        const edge: ExecutableEdge = {
            id: workflowEdge.id,
            source: workflowEdge.source,
            target: workflowEdge.target,
            handleType,
            sourceHandle: workflowEdge.sourceHandle
        };

        // Extract additional properties based on handle type
        if (handleType === "condition") {
            edge.conditionValue = this.extractConditionValue(
                workflowEdge.sourceHandle
            );
        } else if (handleType === "router") {
            edge.routerPath = this.extractRouterPath(workflowEdge.sourceHandle);
        }

        return edge;
    }

    /**
     * Determine the handle type from the source handle string.
     */
    private static determineHandleType(
        sourceHandle: string | undefined,
        sourceNodeType: string
    ): EdgeHandleType {
        if (!sourceHandle) {
            return "source";
        }

        const handle = sourceHandle.toLowerCase();

        // Error handles
        if (handle === "error" || handle.startsWith("error-")) {
            return "error";
        }

        // Loop handles
        if (
            handle === "loop" ||
            handle === "loopBody" ||
            handle.startsWith("loop-")
        ) {
            return "loop";
        }

        // Conditional handles
        if (
            handle === "true" ||
            handle === "false" ||
            handle === "condition-true" ||
            handle === "condition-false" ||
            handle.startsWith("branch-") ||
            handle.startsWith("case-")
        ) {
            return "condition";
        }

        // Router handles
        if (handle.startsWith("route-") || handle.startsWith("path-")) {
            return "router";
        }

        // Check if source node is a logic node
        if (isLogicNode(sourceNodeType)) {
            // For conditional/switch nodes, treat numbered handles as conditions
            if (/^\d+$/.test(handle) || handle === "default") {
                return "condition";
            }
            return "condition";
        }

        // Check if source node is a loop node
        if (isLoopNode(sourceNodeType)) {
            if (handle !== "exit" && handle !== "complete") {
                return "loop";
            }
        }

        return "source";
    }

    /**
     * Extract the condition value from a source handle.
     */
    private static extractConditionValue(
        sourceHandle: string | undefined
    ): string | undefined {
        if (!sourceHandle) {
            return undefined;
        }

        const handle = sourceHandle.toLowerCase();

        // Standard boolean conditions
        if (handle === "true" || handle === "condition-true") {
            return "true";
        }
        if (handle === "false" || handle === "condition-false") {
            return "false";
        }

        // Default case
        if (handle === "default") {
            return "default";
        }

        // Branch handles (branch-0, branch-1, etc.)
        if (handle.startsWith("branch-")) {
            return handle.replace("branch-", "");
        }

        // Case handles (case-0, case-approved, etc.)
        if (handle.startsWith("case-")) {
            return handle.replace("case-", "");
        }

        // Numeric handles
        if (/^\d+$/.test(handle)) {
            return handle;
        }

        return sourceHandle;
    }

    /**
     * Extract the router path from a source handle.
     */
    private static extractRouterPath(
        sourceHandle: string | undefined
    ): string | undefined {
        if (!sourceHandle) {
            return undefined;
        }

        const handle = sourceHandle.toLowerCase();

        if (handle.startsWith("route-")) {
            return handle.replace("route-", "");
        }

        if (handle.startsWith("path-")) {
            return handle.replace("path-", "");
        }

        return sourceHandle;
    }

    /**
     * Update node handle types based on their outgoing edges.
     */
    private static updateNodeHandleTypes(
        nodes: Map<string, ExecutableNode>,
        edges: ExecutableEdge[]
    ): void {
        for (const node of nodes.values()) {
            const outgoingEdges = edges.filter((e) => e.source === node.id);

            if (outgoingEdges.length === 0) {
                continue;
            }

            // Determine the primary handle type
            // Priority: router > condition > loop > error > source
            const handleTypes = new Set(outgoingEdges.map((e) => e.handleType));

            if (handleTypes.has("router")) {
                node.handleType = "router";
            } else if (handleTypes.has("condition")) {
                node.handleType = "condition";
            } else if (handleTypes.has("loop")) {
                node.handleType = "loop";
            } else if (handleTypes.has("error")) {
                node.handleType = "error";
            } else {
                node.handleType = "source";
            }
        }
    }

    /**
     * Validate edge consistency.
     */
    private static validateEdges(
        nodes: Map<string, ExecutableNode>,
        edges: ExecutableEdge[],
        warnings: string[]
    ): void {
        // Check for duplicate edges
        const edgeIds = new Set<string>();
        for (const edge of edges) {
            if (edgeIds.has(edge.id)) {
                warnings.push(`Duplicate edge ID: "${edge.id}"`);
            }
            edgeIds.add(edge.id);
        }

        // Check for self-loops (except for loop nodes)
        for (const edge of edges) {
            if (edge.source === edge.target) {
                const node = nodes.get(edge.source);
                if (node && !isLoopNode(node.type)) {
                    warnings.push(
                        `Self-loop detected on non-loop node: "${edge.source}"`
                    );
                }
            }
        }

        // Validate conditional nodes have at least true/false branches
        for (const node of nodes.values()) {
            if (node.type === "conditional") {
                const outgoingEdges = edges.filter((e) => e.source === node.id);
                const conditionValues = outgoingEdges
                    .filter((e) => e.handleType === "condition")
                    .map((e) => e.conditionValue);

                if (
                    !conditionValues.includes("true") &&
                    !conditionValues.includes("false")
                ) {
                    warnings.push(
                        `Conditional node "${node.id}" missing true/false branches`
                    );
                }
            }
        }

        // Validate router nodes have at least one route
        for (const node of nodes.values()) {
            if (node.type === "router") {
                const outgoingEdges = edges.filter((e) => e.source === node.id);
                const routerEdges = outgoingEdges.filter(
                    (e) => e.handleType === "router"
                );

                if (routerEdges.length === 0) {
                    warnings.push(
                        `Router node "${node.id}" has no route edges`
                    );
                }
            }
        }
    }

    /**
     * Get all edges from a specific source node.
     */
    static getOutgoingEdges(
        nodeId: string,
        edges: ExecutableEdge[]
    ): ExecutableEdge[] {
        return edges.filter((e) => e.source === nodeId);
    }

    /**
     * Get all edges to a specific target node.
     */
    static getIncomingEdges(
        nodeId: string,
        edges: ExecutableEdge[]
    ): ExecutableEdge[] {
        return edges.filter((e) => e.target === nodeId);
    }

    /**
     * Get edges by handle type from a source node.
     */
    static getEdgesByHandleType(
        nodeId: string,
        edges: ExecutableEdge[],
        handleType: EdgeHandleType
    ): ExecutableEdge[] {
        return edges.filter(
            (e) => e.source === nodeId && e.handleType === handleType
        );
    }

    /**
     * Get the error edge from a node, if any.
     */
    static getErrorEdge(
        nodeId: string,
        edges: ExecutableEdge[]
    ): ExecutableEdge | undefined {
        return edges.find(
            (e) => e.source === nodeId && e.handleType === "error"
        );
    }

    /**
     * Get the condition edge for a specific value.
     */
    static getConditionEdge(
        nodeId: string,
        edges: ExecutableEdge[],
        conditionValue: string
    ): ExecutableEdge | undefined {
        return edges.find(
            (e) =>
                e.source === nodeId &&
                e.handleType === "condition" &&
                e.conditionValue === conditionValue
        );
    }

    /**
     * Get the default/fallback edge for a conditional node.
     */
    static getDefaultEdge(
        nodeId: string,
        edges: ExecutableEdge[]
    ): ExecutableEdge | undefined {
        return (
            this.getConditionEdge(nodeId, edges, "default") ||
            this.getConditionEdge(nodeId, edges, "else") ||
            this.getEdgesByHandleType(nodeId, edges, "source")[0]
        );
    }
}
