import type { JsonObject } from "@flowmaestro/shared";
import type {
    ExecutableNode,
    ExecutableEdge,
    LoopBoundary,
    ConstructionContext
} from "./types";
import { isLoopNode } from "./types";

/**
 * LoopConstructor - Stage 2 of the workflow construction pipeline.
 *
 * Expands loop nodes by inserting synthetic START and END sentinel nodes.
 * This allows the executor to properly manage loop iterations by:
 * - Detecting when a loop body starts (START sentinel)
 * - Detecting when a loop body completes (END sentinel)
 * - Re-running the body or exiting based on loop condition
 *
 * Loop types supported:
 * - for: Fixed iteration count
 * - forEach: Iterate over array items
 * - while: Condition checked before each iteration
 * - doWhile: Condition checked after each iteration
 */
export class LoopConstructor {
    /**
     * Expand loop nodes in the construction context.
     * Inserts START/END sentinels and builds loop boundary information.
     *
     * @param context - The construction context to modify
     */
    static expand(context: ConstructionContext): void {
        const { nodes } = context;

        // Find all loop nodes in the reachable set
        const loopNodes = Array.from(nodes.values()).filter(
            (node) => isLoopNode(node.type)
        );

        for (const loopNode of loopNodes) {
            this.expandLoopNode(loopNode, context);
        }
    }

    /**
     * Expand a single loop node by inserting sentinels.
     */
    private static expandLoopNode(
        loopNode: ExecutableNode,
        context: ConstructionContext
    ): void {
        const { nodes, edges, loopBoundaries, warnings } = context;

        // Get loop configuration
        const loopType = this.getLoopType(loopNode.type);
        const loopConfig = this.extractLoopConfig(loopNode.config, loopType);

        // Find edges from loop node (these lead to the loop body)
        const loopBodyEdges = edges.filter(
            (e) => e.source === loopNode.id && e.handleType === "loop"
        );

        if (loopBodyEdges.length === 0) {
            warnings.push(
                `Loop node "${loopNode.id}" has no loop body edges (sourceHandle: loop)`
            );
            return;
        }

        // Create START sentinel
        const startSentinelId = `${loopNode.id}__loop_start`;
        const startSentinel: ExecutableNode = {
            id: startSentinelId,
            type: "loop-sentinel",
            name: `${loopNode.name} (Start)`,
            config: { sentinel: "START", loopNodeId: loopNode.id },
            position: {
                x: loopNode.position.x + 50,
                y: loopNode.position.y + 100
            },
            dependencies: [loopNode.id],
            dependents: [],
            loopContext: {
                parentLoopId: loopNode.id,
                sentinel: "START"
            },
            hasErrorPort: false,
            isTerminal: false
        };

        // Create END sentinel
        const endSentinelId = `${loopNode.id}__loop_end`;
        const endSentinel: ExecutableNode = {
            id: endSentinelId,
            type: "loop-sentinel",
            name: `${loopNode.name} (End)`,
            config: { sentinel: "END", loopNodeId: loopNode.id },
            position: {
                x: loopNode.position.x + 50,
                y: loopNode.position.y + 300
            },
            dependencies: [],
            dependents: [loopNode.id], // Loops back to loop node for next iteration check
            loopContext: {
                parentLoopId: loopNode.id,
                sentinel: "END"
            },
            hasErrorPort: false,
            isTerminal: false
        };

        // Add sentinels to nodes
        nodes.set(startSentinelId, startSentinel);
        nodes.set(endSentinelId, endSentinel);

        // Find body nodes (nodes that are targets of loop edges)
        const bodyNodeIds: string[] = [];
        const bodyStartNodeIds: string[] = [];

        for (const loopEdge of loopBodyEdges) {
            bodyStartNodeIds.push(loopEdge.target);

            // Traverse to find all body nodes
            const visited = new Set<string>();
            const queue = [loopEdge.target];

            while (queue.length > 0) {
                const nodeId = queue.shift()!;
                if (visited.has(nodeId)) continue;
                if (nodeId === loopNode.id) continue; // Don't include the loop node itself
                if (nodeId === endSentinelId) continue; // Don't include the end sentinel

                visited.add(nodeId);
                bodyNodeIds.push(nodeId);

                // Update the node's loop context
                const node = nodes.get(nodeId);
                if (node && !node.loopContext) {
                    node.loopContext = { parentLoopId: loopNode.id };
                }

                // Find outgoing edges
                const outgoing = edges.filter((e) => e.source === nodeId);
                for (const edge of outgoing) {
                    // Stop at loop boundaries or if we'd go back to loop node
                    if (edge.target !== loopNode.id && !visited.has(edge.target)) {
                        queue.push(edge.target);
                    }
                }
            }
        }

        // Rewire edges:
        // 1. Loop node -> loop body becomes Loop node -> START sentinel -> loop body
        // 2. Find terminal body nodes and wire them to END sentinel
        // 3. END sentinel -> back to loop node (for iteration control)

        // Remove old loop-to-body edges and add loop-to-start edges
        const newEdges: ExecutableEdge[] = [];

        for (const loopEdge of loopBodyEdges) {
            // Remove the direct loop -> body edge (will be replaced)
            const edgeIndex = edges.findIndex((e) => e.id === loopEdge.id);
            if (edgeIndex !== -1) {
                edges.splice(edgeIndex, 1);
            }

            // Add edge from loop node to START sentinel
            newEdges.push({
                id: `${loopNode.id}__to__${startSentinelId}`,
                source: loopNode.id,
                target: startSentinelId,
                handleType: "loop"
            });

            // Add edge from START sentinel to body start
            newEdges.push({
                id: `${startSentinelId}__to__${loopEdge.target}`,
                source: startSentinelId,
                target: loopEdge.target,
                handleType: "source"
            });
        }

        // Find terminal nodes in the loop body (nodes with no outgoing edges to other body nodes)
        const terminalBodyNodes = bodyNodeIds.filter((nodeId) => {
            const outgoing = edges.filter((e) => e.source === nodeId);
            return outgoing.every(
                (e) => !bodyNodeIds.includes(e.target) || e.target === loopNode.id
            );
        });

        // Wire terminal body nodes to END sentinel
        for (const terminalId of terminalBodyNodes) {
            // Find edges from terminal that go back to loop or outside
            const terminalOutgoing = edges.filter(
                (e) => e.source === terminalId && e.target === loopNode.id
            );

            // Remove edges that go directly to loop node
            for (const edge of terminalOutgoing) {
                const edgeIndex = edges.findIndex((e) => e.id === edge.id);
                if (edgeIndex !== -1) {
                    edges.splice(edgeIndex, 1);
                }
            }

            // Add edge to END sentinel
            newEdges.push({
                id: `${terminalId}__to__${endSentinelId}`,
                source: terminalId,
                target: endSentinelId,
                handleType: "source"
            });
        }

        // Wire END sentinel back to loop node (for iteration control)
        newEdges.push({
            id: `${endSentinelId}__to__${loopNode.id}`,
            source: endSentinelId,
            target: loopNode.id,
            handleType: "loop"
        });

        // Add new edges
        edges.push(...newEdges);

        // Update dependencies
        startSentinel.dependents = bodyStartNodeIds;
        endSentinel.dependencies = terminalBodyNodes;

        // Create loop boundary
        const boundary: LoopBoundary = {
            loopNodeId: loopNode.id,
            startSentinelId,
            endSentinelId,
            bodyNodeIds: [...new Set(bodyNodeIds)], // Deduplicate
            loopType,
            loopConfig
        };

        loopBoundaries.set(loopNode.id, boundary);
    }

    /**
     * Determine the loop type from the node type.
     */
    private static getLoopType(
        nodeType: string
    ): "for" | "forEach" | "while" | "doWhile" {
        switch (nodeType) {
            case "loop":
            case "for":
                return "for";
            case "forEach":
                return "forEach";
            case "while":
                return "while";
            case "doWhile":
                return "doWhile";
            default:
                return "for";
        }
    }

    /**
     * Extract loop-specific configuration from node config.
     */
    private static extractLoopConfig(
        config: JsonObject,
        loopType: "for" | "forEach" | "while" | "doWhile"
    ): LoopBoundary["loopConfig"] {
        switch (loopType) {
            case "for":
                return {
                    count: typeof config.count === "number" ? config.count : 1
                };
            case "forEach":
                return {
                    sourceArray:
                        typeof config.sourceArray === "string"
                            ? config.sourceArray
                            : undefined
                };
            case "while":
            case "doWhile":
                return {
                    condition:
                        typeof config.condition === "string"
                            ? config.condition
                            : undefined
                };
            default:
                return {};
        }
    }

    /**
     * Check if a node is inside a loop (has a loop context).
     */
    static isInsideLoop(
        nodeId: string,
        loopBoundaries: Map<string, LoopBoundary>
    ): boolean {
        for (const boundary of loopBoundaries.values()) {
            if (boundary.bodyNodeIds.includes(nodeId)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get the loop boundary containing a node, if any.
     */
    static getContainingLoop(
        nodeId: string,
        loopBoundaries: Map<string, LoopBoundary>
    ): LoopBoundary | undefined {
        for (const boundary of loopBoundaries.values()) {
            if (boundary.bodyNodeIds.includes(nodeId)) {
                return boundary;
            }
        }
        return undefined;
    }

    /**
     * Get nested loop depth for a node.
     */
    static getLoopDepth(
        nodeId: string,
        loopBoundaries: Map<string, LoopBoundary>
    ): number {
        let depth = 0;

        for (const boundary of loopBoundaries.values()) {
            if (boundary.bodyNodeIds.includes(nodeId)) {
                depth++;
            }
        }

        return depth;
    }
}
