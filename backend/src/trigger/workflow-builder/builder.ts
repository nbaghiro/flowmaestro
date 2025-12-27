import type { WorkflowDefinition } from "@flowmaestro/shared";
import type {
    ExecutionPlan,
    ConstructionContext,
    BuildOptions
} from "./types";
import { PathConstructor } from "./path-constructor";
import { LoopConstructor } from "./loop-constructor";
import { NodeConstructor } from "./node-constructor";
import { EdgeConstructor } from "./edge-constructor";

/**
 * WorkflowBuilder - Orchestrates the 4-stage workflow construction pipeline.
 *
 * Pipeline stages:
 * 1. PathConstructor - BFS reachability from entry point
 * 2. LoopConstructor - Insert loop sentinel nodes
 * 3. NodeConstructor - Build executable nodes, expand parallel blocks
 * 4. EdgeConstructor - Wire edges with handle types
 *
 * The result is an ExecutionPlan that can be used by the workflow executor
 * to run nodes in the correct order with proper dependency management.
 */
export class WorkflowBuilder {
    private options: Required<BuildOptions>;

    constructor(options: BuildOptions = {}) {
        this.options = {
            includeUnreachable: options.includeUnreachable ?? false,
            validateConfigs: options.validateConfigs ?? true,
            maxLoopDepth: options.maxLoopDepth ?? 10,
            maxParallelBranches: options.maxParallelBranches ?? 50
        };
    }

    /**
     * Build an execution plan from a workflow definition.
     *
     * @param definition - The workflow definition to build
     * @returns ExecutionPlan ready for execution
     * @throws Error if the workflow is invalid
     */
    build(definition: WorkflowDefinition): ExecutionPlan {
        // Validate definition structure
        this.validateDefinition(definition);

        // Initialize construction context
        const context: ConstructionContext = {
            definition,
            nodes: new Map(),
            edges: [],
            loopBoundaries: new Map(),
            parallelBoundaries: new Map(),
            warnings: []
        };

        // Stage 1: Path construction - find reachable nodes
        const reachability = PathConstructor.build(definition);

        // Add warnings for unreachable nodes
        if (reachability.unreachableNodeIds.size > 0 && !this.options.includeUnreachable) {
            context.warnings.push(
                `${reachability.unreachableNodeIds.size} node(s) are not reachable from entry point: ` +
                    Array.from(reachability.unreachableNodeIds).join(", ")
            );
        }

        // Stage 2 & 3 are interleaved - we need nodes before we can expand loops
        // First, build the basic executable nodes
        NodeConstructor.build(definition, reachability, context);

        // Stage 2: Loop construction - insert sentinel nodes
        LoopConstructor.expand(context);

        // Stage 4: Edge construction - wire edges with handle types
        EdgeConstructor.build(definition, reachability, context);

        // Validate loop depth
        this.validateLoopDepth(context);

        // Validate parallel branches
        this.validateParallelBranches(context);

        // Calculate execution levels for parallel batch execution
        const executionLevels = this.calculateExecutionLevels(context);

        // Identify start nodes
        const startNodes = this.findStartNodes(context);

        // Build the final execution plan
        const plan: ExecutionPlan = {
            nodes: context.nodes,
            edges: context.edges,
            startNodes,
            executionLevels,
            loopBoundaries: context.loopBoundaries,
            parallelBoundaries: context.parallelBoundaries,
            definition,
            nodeCount: context.nodes.size,
            warnings: context.warnings
        };

        return plan;
    }

    /**
     * Validate the workflow definition structure.
     */
    private validateDefinition(definition: WorkflowDefinition): void {
        if (!definition) {
            throw new Error("Workflow definition is required");
        }

        if (!definition.nodes || typeof definition.nodes !== "object") {
            throw new Error("Workflow definition must have a nodes object");
        }

        if (!Array.isArray(definition.edges)) {
            throw new Error("Workflow definition must have an edges array");
        }

        if (!definition.entryPoint) {
            throw new Error("Workflow definition must have an entryPoint");
        }

        if (!definition.nodes[definition.entryPoint]) {
            throw new Error(
                `Entry point "${definition.entryPoint}" not found in nodes`
            );
        }

        if (Object.keys(definition.nodes).length === 0) {
            throw new Error("Workflow must have at least one node");
        }
    }

    /**
     * Validate that loop nesting doesn't exceed the maximum depth.
     */
    private validateLoopDepth(context: ConstructionContext): void {
        for (const node of context.nodes.values()) {
            const depth = LoopConstructor.getLoopDepth(
                node.id,
                context.loopBoundaries
            );

            if (depth > this.options.maxLoopDepth) {
                throw new Error(
                    `Loop depth ${depth} exceeds maximum of ${this.options.maxLoopDepth} ` +
                        `for node "${node.id}"`
                );
            }
        }
    }

    /**
     * Validate that parallel blocks don't exceed the maximum number of branches.
     */
    private validateParallelBranches(context: ConstructionContext): void {
        for (const [parallelId, boundary] of context.parallelBoundaries) {
            if (boundary.branches.length > this.options.maxParallelBranches) {
                throw new Error(
                    `Parallel node "${parallelId}" has ${boundary.branches.length} branches, ` +
                        `exceeding maximum of ${this.options.maxParallelBranches}`
                );
            }
        }
    }

    /**
     * Calculate execution levels for parallel batch execution.
     * Nodes at the same level can be executed in parallel.
     */
    private calculateExecutionLevels(context: ConstructionContext): string[][] {
        const { nodes, edges } = context;
        const levels: string[][] = [];
        const assigned = new Set<string>();

        // Build dependency count map
        const dependencyCount = new Map<string, number>();
        for (const node of nodes.values()) {
            // Count incoming edges from reachable nodes
            const incomingCount = edges.filter(
                (e) => e.target === node.id && nodes.has(e.source)
            ).length;
            dependencyCount.set(node.id, incomingCount);
        }

        while (assigned.size < nodes.size) {
            const currentLevel: string[] = [];

            // Find all nodes with no unassigned dependencies
            for (const [nodeId, _count] of dependencyCount) {
                if (assigned.has(nodeId)) continue;

                // Check if all dependencies are assigned
                const node = nodes.get(nodeId)!;
                const allDepsAssigned = node.dependencies.every(
                    (dep) => assigned.has(dep) || !nodes.has(dep)
                );

                if (allDepsAssigned) {
                    currentLevel.push(nodeId);
                }
            }

            if (currentLevel.length === 0) {
                // No progress - might be a cycle
                const remaining = Array.from(nodes.keys()).filter(
                    (id) => !assigned.has(id)
                );
                context.warnings.push(
                    `Possible cycle detected. Remaining nodes: ${remaining.join(", ")}`
                );
                // Add remaining nodes to final level to avoid infinite loop
                levels.push(remaining);
                break;
            }

            levels.push(currentLevel);

            for (const nodeId of currentLevel) {
                assigned.add(nodeId);
            }
        }

        return levels;
    }

    /**
     * Find nodes with no dependencies (execution entry points).
     */
    private findStartNodes(context: ConstructionContext): string[] {
        const startNodes: string[] = [];

        for (const node of context.nodes.values()) {
            // A start node has no dependencies from other reachable nodes
            const hasReachableDependencies = node.dependencies.some(
                (dep) => context.nodes.has(dep)
            );

            if (!hasReachableDependencies) {
                startNodes.push(node.id);
            }
        }

        // The entry point should always be a start node
        if (
            !startNodes.includes(context.definition.entryPoint) &&
            context.nodes.has(context.definition.entryPoint)
        ) {
            startNodes.unshift(context.definition.entryPoint);
        }

        return startNodes;
    }
}

/**
 * Convenience function to build an execution plan.
 */
export function buildExecutionPlan(
    definition: WorkflowDefinition,
    options?: BuildOptions
): ExecutionPlan {
    const builder = new WorkflowBuilder(options);
    return builder.build(definition);
}

/**
 * Validate a workflow definition without building the full plan.
 * Returns validation errors/warnings.
 */
export function validateWorkflow(
    definition: WorkflowDefinition
): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        const plan = buildExecutionPlan(definition, {
            validateConfigs: true
        });

        warnings.push(...plan.warnings);

        // Check for unreachable nodes
        const allNodeIds = Object.keys(definition.nodes);
        const reachableIds = Array.from(plan.nodes.keys());
        const unreachable = allNodeIds.filter((id) => !reachableIds.includes(id));

        if (unreachable.length > 0) {
            warnings.push(`Unreachable nodes: ${unreachable.join(", ")}`);
        }

        // Check for nodes with no connections
        for (const node of plan.nodes.values()) {
            if (node.dependencies.length === 0 && node.dependents.length === 0) {
                if (node.id !== definition.entryPoint) {
                    warnings.push(`Node "${node.id}" has no connections`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));

        return {
            valid: false,
            errors,
            warnings
        };
    }
}

/**
 * Get a summary of the execution plan for debugging.
 */
export function getExecutionPlanSummary(plan: ExecutionPlan): {
    nodeCount: number;
    edgeCount: number;
    startNodes: string[];
    terminalNodes: string[];
    loopCount: number;
    parallelCount: number;
    levelCount: number;
    warnings: string[];
} {
    const terminalNodes = Array.from(plan.nodes.values())
        .filter((node) => node.isTerminal)
        .map((node) => node.id);

    return {
        nodeCount: plan.nodeCount,
        edgeCount: plan.edges.length,
        startNodes: plan.startNodes,
        terminalNodes,
        loopCount: plan.loopBoundaries.size,
        parallelCount: plan.parallelBoundaries.size,
        levelCount: plan.executionLevels.length,
        warnings: plan.warnings
    };
}
