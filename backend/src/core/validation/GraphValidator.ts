import { WorkflowDefinition, WorkflowEdge, WorkflowNode } from "@flowmaestro/shared";

export class ValidationError extends Error {
    constructor(
        message: string,
        public details?: unknown
    ) {
        super(message);
        this.name = "ValidationError";
    }
}

export class GraphValidator {
    validate(workflow: WorkflowDefinition): void {
        this.validateStructure(workflow);
        this.validateNodes(workflow);
        this.validateEdges(workflow);
        this.validateEntryPoint(workflow);
        this.detectCycles(workflow);
        this.validateConnectivity(workflow);
        this.validateVariableReferences(workflow);
    }

    private validateStructure(workflow: WorkflowDefinition): void {
        if (!workflow.name || workflow.name.trim() === "") {
            throw new ValidationError("Workflow name is required");
        }

        if (!workflow.nodes || Object.keys(workflow.nodes).length === 0) {
            throw new ValidationError("Workflow must have at least one node");
        }

        if (!workflow.edges || !Array.isArray(workflow.edges)) {
            throw new ValidationError("Workflow edges must be an array");
        }

        if (!workflow.entryPoint) {
            throw new ValidationError("Workflow must have an entry point");
        }
    }

    private validateNodes(workflow: WorkflowDefinition): void {
        Object.entries(workflow.nodes).forEach(([nodeId, node]: [string, WorkflowNode]) => {
            if (!node.type || node.type.trim() === "") {
                throw new ValidationError(`Node ${nodeId} must have a type`);
            }

            if (!node.name || node.name.trim() === "") {
                throw new ValidationError(`Node ${nodeId} must have a name`);
            }

            if (!node.config || typeof node.config !== "object") {
                throw new ValidationError(`Node ${nodeId} must have a config object`);
            }

            if (
                !node.position ||
                typeof node.position.x !== "number" ||
                typeof node.position.y !== "number"
            ) {
                throw new ValidationError(`Node ${nodeId} must have valid position coordinates`);
            }
        });
    }

    private validateEdges(workflow: WorkflowDefinition): void {
        workflow.edges.forEach((edge: WorkflowEdge, index: number) => {
            if (!edge.id) {
                throw new ValidationError(`Edge at index ${index} must have an id`);
            }

            if (!edge.source || !workflow.nodes[edge.source]) {
                throw new ValidationError(
                    `Edge ${edge.id} references non-existent source node: ${edge.source}`
                );
            }

            if (!edge.target || !workflow.nodes[edge.target]) {
                throw new ValidationError(
                    `Edge ${edge.id} references non-existent target node: ${edge.target}`
                );
            }

            // Prevent self-loops
            if (edge.source === edge.target) {
                throw new ValidationError(
                    `Edge ${edge.id} creates a self-loop on node ${edge.source}`
                );
            }
        });
    }

    private validateEntryPoint(workflow: WorkflowDefinition): void {
        if (!workflow.nodes[workflow.entryPoint]) {
            throw new ValidationError(
                `Entry point references non-existent node: ${workflow.entryPoint}`
            );
        }
    }

    private detectCycles(workflow: WorkflowDefinition): void {
        const adjacencyList = this.buildAdjacencyList(workflow);
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (nodeId: string): boolean => {
            visited.add(nodeId);
            recursionStack.add(nodeId);

            const neighbors = adjacencyList.get(nodeId) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    if (hasCycle(neighbor)) {
                        return true;
                    }
                } else if (recursionStack.has(neighbor)) {
                    throw new ValidationError(`Cycle detected: ${nodeId} → ${neighbor}`, {
                        path: Array.from(recursionStack)
                    });
                }
            }

            recursionStack.delete(nodeId);
            return false;
        };

        // Check for cycles starting from each node
        Object.keys(workflow.nodes).forEach((nodeId) => {
            if (!visited.has(nodeId)) {
                hasCycle(nodeId);
            }
        });
    }

    private validateConnectivity(workflow: WorkflowDefinition): void {
        const adjacencyList = this.buildAdjacencyList(workflow);
        const reachable = new Set<string>();

        // DFS from entry point
        const visit = (nodeId: string) => {
            if (reachable.has(nodeId)) return;
            reachable.add(nodeId);

            const neighbors = adjacencyList.get(nodeId) || [];
            neighbors.forEach((neighbor) => visit(neighbor));
        };

        visit(workflow.entryPoint);

        // Check if all nodes are reachable
        const unreachableNodes = Object.keys(workflow.nodes).filter(
            (nodeId) => !reachable.has(nodeId)
        );

        if (unreachableNodes.length > 0) {
            throw new ValidationError("Some nodes are not reachable from entry point", {
                unreachableNodes
            });
        }
    }

    private validateVariableReferences(workflow: WorkflowDefinition): void {
        const nodeIds = new Set(Object.keys(workflow.nodes));

        Object.entries(workflow.nodes).forEach(([nodeId, node]: [string, WorkflowNode]) => {
            const configString = JSON.stringify(node.config);
            const variablePattern = /\$\{([a-zA-Z0-9_]+)\.output(?:\.([a-zA-Z0-9_.[\]]+))?\}/g;

            let match;
            while ((match = variablePattern.exec(configString)) !== null) {
                const referencedNodeId = match[1];

                if (!nodeIds.has(referencedNodeId)) {
                    throw new ValidationError(
                        `Node ${nodeId} references non-existent node: ${referencedNodeId}`,
                        { variable: match[0] }
                    );
                }

                // Check if referenced node comes before current node in execution order
                if (!this.comesBeforeInGraph(workflow, referencedNodeId, nodeId)) {
                    throw new ValidationError(
                        `Node ${nodeId} references node ${referencedNodeId} that doesn't come before it in execution order`,
                        { variable: match[0] }
                    );
                }
            }
        });
    }

    private comesBeforeInGraph(
        workflow: WorkflowDefinition,
        sourceNode: string,
        targetNode: string
    ): boolean {
        const adjacencyList = this.buildAdjacencyList(workflow);
        const visited = new Set<string>();

        const canReach = (current: string, target: string): boolean => {
            if (current === target) return true;
            if (visited.has(current)) return false;

            visited.add(current);

            const neighbors = adjacencyList.get(current) || [];
            for (const neighbor of neighbors) {
                if (canReach(neighbor, target)) {
                    return true;
                }
            }

            return false;
        };

        return canReach(sourceNode, targetNode);
    }

    private buildAdjacencyList(workflow: WorkflowDefinition): Map<string, string[]> {
        const adjacencyList = new Map<string, string[]>();

        // Initialize all nodes
        Object.keys(workflow.nodes).forEach((nodeId) => {
            adjacencyList.set(nodeId, []);
        });

        // Add edges
        workflow.edges.forEach((edge: WorkflowEdge) => {
            const neighbors = adjacencyList.get(edge.source) || [];
            neighbors.push(edge.target);
            adjacencyList.set(edge.source, neighbors);
        });

        return adjacencyList;
    }
}
