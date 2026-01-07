/**
 * Workflow Builder Unit Tests
 *
 * Tests the 4-stage workflow construction pipeline:
 * 1. PathConstructor: BFS reachability, depth computation
 * 2. LoopConstructor: Sentinel node creation, loop body detection
 * 3. NodeConstructor: Node expansion, dependency mapping
 * 4. EdgeConstructor: Handle type assignment, edge validation
 */

import type { JsonObject, WorkflowDefinition } from "@flowmaestro/shared";
import {
    buildWorkflow,
    validateBuiltWorkflow,
    getWorkflowSummary,
    // Path constructor exports
    constructPaths,
    computeExecutionLevels,
    detectCycles,
    getMaxDepth,
    getNodesAtDepth,
    findTerminalNodes,
    topologicalSort,
    // Loop constructor exports
    constructLoops,
    isLoopSentinel,
    getLoopNodeIdFromSentinel,
    // Node constructor exports
    constructNodes,
    isExpandedBranch,
    getParallelNodeIdFromBranch,
    getBranchesForParallelNode,
    // Edge constructor exports
    constructEdges,
    getEdgesFromSource,
    getEdgesToTarget,
    getEdgesByHandle,
    findBranchTarget,
    getHandleTypesFromSource
} from "../../../src/temporal/activities/execution/builder";

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a minimal workflow definition for testing
 */
function createWorkflowDefinition(
    nodes: Record<string, { type: string; name: string; config?: JsonObject }>,
    edges: Array<{ id: string; source: string; target: string; sourceHandle?: string }>
): WorkflowDefinition {
    const workflowNodes: WorkflowDefinition["nodes"] = {};
    const firstNodeId = Object.keys(nodes)[0] || "Input";

    for (const [id, node] of Object.entries(nodes)) {
        workflowNodes[id] = {
            type: node.type,
            name: node.name,
            config: node.config || {},
            position: { x: 0, y: 0 }
        };
    }

    return {
        name: "Test Workflow",
        entryPoint: firstNodeId,
        nodes: workflowNodes,
        edges,
        version: 1
    };
}

// ============================================================================
// MAIN BUILDER TESTS
// ============================================================================

describe("Workflow Builder", () => {
    describe("buildWorkflow", () => {
        it("builds a simple linear workflow", () => {
            const definition = createWorkflowDefinition(
                {
                    Input: { type: "input", name: "Input" },
                    Transform: { type: "transform", name: "Transform" },
                    Output: { type: "output", name: "Output" }
                },
                [
                    { id: "e1", source: "Input", target: "Transform" },
                    { id: "e2", source: "Transform", target: "Output" }
                ]
            );

            const result = buildWorkflow(definition);

            expect(result.success).toBe(true);
            expect(result.workflow).toBeDefined();
            expect(result.workflow?.nodes.size).toBe(3);
            expect(result.workflow?.edges.size).toBe(2);
        });

        it("returns error when definition is null", () => {
            const result = buildWorkflow(null as unknown as WorkflowDefinition);

            expect(result.success).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ code: "INVALID_INPUT" })
            );
        });

        it("returns error when workflow has no nodes", () => {
            const definition = createWorkflowDefinition({}, []);

            const result = buildWorkflow(definition);

            expect(result.success).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({ code: "NO_NODES" }));
        });

        it("finds input node as trigger", () => {
            const definition = createWorkflowDefinition(
                {
                    Input: { type: "input", name: "Input" },
                    Process: { type: "transform", name: "Process" }
                },
                [{ id: "e1", source: "Input", target: "Process" }]
            );

            const result = buildWorkflow(definition);

            expect(result.success).toBe(true);
            expect(result.workflow?.triggerNodeId).toBe("Input");
        });

        it("includes warnings for unreachable nodes", () => {
            // Create a disconnected cycle - nodes that have incoming edges
            // but aren't reachable from any start node
            const definition = createWorkflowDefinition(
                {
                    Input: { type: "input", name: "Input" },
                    Output: { type: "output", name: "Output" },
                    DeadA: { type: "transform", name: "Dead A" },
                    DeadB: { type: "transform", name: "Dead B" }
                },
                [
                    { id: "e1", source: "Input", target: "Output" },
                    { id: "e2", source: "DeadA", target: "DeadB" },
                    { id: "e3", source: "DeadB", target: "DeadA" }
                ]
            );

            const result = buildWorkflow(definition);

            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings).toContainEqual(
                expect.objectContaining({
                    code: "UNREACHABLE_NODE",
                    nodeId: "DeadA"
                })
            );
            expect(result.warnings).toContainEqual(
                expect.objectContaining({
                    code: "UNREACHABLE_NODE",
                    nodeId: "DeadB"
                })
            );
        });

        it("treats nodes without edges as start nodes (reachable)", () => {
            // Nodes with no incoming edges are considered start nodes
            const definition = createWorkflowDefinition(
                {
                    Input: { type: "input", name: "Input" },
                    Output: { type: "output", name: "Output" },
                    Isolated: { type: "transform", name: "Isolated" }
                },
                [{ id: "e1", source: "Input", target: "Output" }]
            );

            const result = buildWorkflow(definition);

            expect(result.success).toBe(true);
            // No warning for Isolated because it has no incoming edges,
            // making it a start node and thus reachable
            const hasIsolatedWarning = result.warnings?.some(
                (w) => w.nodeId === "Isolated" && w.code === "UNREACHABLE_NODE"
            );
            expect(hasIsolatedWarning).toBeFalsy();
        });

        it("identifies output nodes", () => {
            const definition = createWorkflowDefinition(
                {
                    Input: { type: "input", name: "Input" },
                    Output: { type: "output", name: "Output" }
                },
                [{ id: "e1", source: "Input", target: "Output" }]
            );

            const result = buildWorkflow(definition);

            expect(result.success).toBe(true);
            expect(result.workflow?.outputNodeIds).toContain("Output");
        });

        it("handles diamond workflow pattern", () => {
            const definition = createWorkflowDefinition(
                {
                    Start: { type: "input", name: "Start" },
                    BranchA: { type: "transform", name: "Branch A" },
                    BranchB: { type: "transform", name: "Branch B" },
                    End: { type: "output", name: "End" }
                },
                [
                    { id: "e1", source: "Start", target: "BranchA" },
                    { id: "e2", source: "Start", target: "BranchB" },
                    { id: "e3", source: "BranchA", target: "End" },
                    { id: "e4", source: "BranchB", target: "End" }
                ]
            );

            const result = buildWorkflow(definition);

            expect(result.success).toBe(true);
            expect(result.workflow?.nodes.size).toBe(4);
            expect(result.workflow?.outputNodeIds).toContain("End");
        });
    });

    describe("validateBuiltWorkflow", () => {
        it("returns empty array for valid workflow", () => {
            const definition = createWorkflowDefinition(
                {
                    Input: { type: "input", name: "Input" },
                    Output: { type: "output", name: "Output" }
                },
                [{ id: "e1", source: "Input", target: "Output" }]
            );

            const result = buildWorkflow(definition);
            const errors = validateBuiltWorkflow(result.workflow!);

            expect(errors).toHaveLength(0);
        });
    });

    describe("getWorkflowSummary", () => {
        it("returns accurate summary", () => {
            const definition = createWorkflowDefinition(
                {
                    Input: { type: "input", name: "Input" },
                    Transform: { type: "transform", name: "Transform" },
                    Output: { type: "output", name: "Output" }
                },
                [
                    { id: "e1", source: "Input", target: "Transform" },
                    { id: "e2", source: "Transform", target: "Output" }
                ]
            );

            const result = buildWorkflow(definition);
            const summary = getWorkflowSummary(result.workflow!);

            expect(summary.nodeCount).toBe(3);
            expect(summary.edgeCount).toBe(2);
            expect(summary.triggerNode).toBe("Input");
            expect(summary.outputNodes).toContain("Output");
        });
    });
});

// ============================================================================
// STAGE 1: PATH CONSTRUCTOR TESTS
// ============================================================================

describe("PathConstructor", () => {
    describe("constructPaths", () => {
        it("computes reachable nodes from trigger", () => {
            const definition = createWorkflowDefinition(
                {
                    A: { type: "input", name: "A" },
                    B: { type: "transform", name: "B" },
                    C: { type: "output", name: "C" }
                },
                [
                    { id: "e1", source: "A", target: "B" },
                    { id: "e2", source: "B", target: "C" }
                ]
            );

            const result = constructPaths(definition, "A");

            expect(result.reachableNodes.size).toBe(3);
            expect(result.reachableNodes.has("A")).toBe(true);
            expect(result.reachableNodes.has("B")).toBe(true);
            expect(result.reachableNodes.has("C")).toBe(true);
        });

        it("computes correct node depths", () => {
            const definition = createWorkflowDefinition(
                {
                    A: { type: "input", name: "A" },
                    B: { type: "transform", name: "B" },
                    C: { type: "output", name: "C" }
                },
                [
                    { id: "e1", source: "A", target: "B" },
                    { id: "e2", source: "B", target: "C" }
                ]
            );

            const result = constructPaths(definition, "A");

            expect(result.nodeDepths.get("A")).toBe(0);
            expect(result.nodeDepths.get("B")).toBe(1);
            expect(result.nodeDepths.get("C")).toBe(2);
        });

        it("builds adjacency lists", () => {
            const definition = createWorkflowDefinition(
                {
                    A: { type: "input", name: "A" },
                    B: { type: "transform", name: "B" },
                    C: { type: "output", name: "C" }
                },
                [
                    { id: "e1", source: "A", target: "B" },
                    { id: "e2", source: "B", target: "C" }
                ]
            );

            const result = constructPaths(definition, "A");

            expect(result.adjacencyList.get("A")).toContain("B");
            expect(result.adjacencyList.get("B")).toContain("C");
            expect(result.reverseAdjacencyList.get("B")).toContain("A");
            expect(result.reverseAdjacencyList.get("C")).toContain("B");
        });
    });

    describe("computeExecutionLevels", () => {
        it("groups nodes by depth", () => {
            const depths = new Map([
                ["A", 0],
                ["B", 1],
                ["C", 1],
                ["D", 2]
            ]);

            const levels = computeExecutionLevels(depths);

            expect(levels.length).toBe(3);
            expect(levels[0]).toContain("A");
            expect(levels[1]).toContain("B");
            expect(levels[1]).toContain("C");
            expect(levels[2]).toContain("D");
        });

        it("returns empty array for empty input", () => {
            const depths = new Map<string, number>();

            const levels = computeExecutionLevels(depths);

            expect(levels).toEqual([]);
        });
    });

    describe("detectCycles", () => {
        it("detects simple cycle", () => {
            const adjacencyList = new Map([
                ["A", ["B"]],
                ["B", ["C"]],
                ["C", ["A"]]
            ]);

            const cycles = detectCycles(adjacencyList, ["A"]);

            expect(cycles.length).toBeGreaterThan(0);
        });

        it("returns empty for DAG", () => {
            const adjacencyList = new Map([
                ["A", ["B"]],
                ["B", ["C"]],
                ["C", []]
            ]);

            const cycles = detectCycles(adjacencyList, ["A"]);

            expect(cycles).toHaveLength(0);
        });
    });

    describe("getMaxDepth", () => {
        it("returns max depth", () => {
            const depths = new Map([
                ["A", 0],
                ["B", 1],
                ["C", 2],
                ["D", 3]
            ]);

            expect(getMaxDepth(depths)).toBe(3);
        });

        it("returns 0 for empty map", () => {
            const depths = new Map<string, number>();

            expect(getMaxDepth(depths)).toBe(0);
        });
    });

    describe("getNodesAtDepth", () => {
        it("returns nodes at specified depth", () => {
            const depths = new Map([
                ["A", 0],
                ["B", 1],
                ["C", 1],
                ["D", 2]
            ]);

            expect(getNodesAtDepth(depths, 1)).toContain("B");
            expect(getNodesAtDepth(depths, 1)).toContain("C");
            expect(getNodesAtDepth(depths, 1)).toHaveLength(2);
        });

        it("returns empty array for non-existent depth", () => {
            const depths = new Map([["A", 0]]);

            expect(getNodesAtDepth(depths, 5)).toEqual([]);
        });
    });

    describe("findTerminalNodes", () => {
        it("finds nodes with no outgoing edges", () => {
            const adjacencyList = new Map([
                ["A", ["B", "C"]],
                ["B", []],
                ["C", []]
            ]);
            const reachableNodes = new Set(["A", "B", "C"]);

            const terminals = findTerminalNodes(adjacencyList, reachableNodes);

            expect(terminals).toContain("B");
            expect(terminals).toContain("C");
            expect(terminals).not.toContain("A");
        });
    });

    describe("topologicalSort", () => {
        it("returns sorted order for DAG", () => {
            const reachableNodes = new Set(["A", "B", "C"]);
            const adjacencyList = new Map([
                ["A", ["B"]],
                ["B", ["C"]],
                ["C", []]
            ]);
            const reverseAdjacencyList = new Map([
                ["A", []],
                ["B", ["A"]],
                ["C", ["B"]]
            ]);

            const sorted = topologicalSort(reachableNodes, adjacencyList, reverseAdjacencyList);

            expect(sorted).toEqual(["A", "B", "C"]);
        });

        it("returns null for cyclic graph", () => {
            const reachableNodes = new Set(["A", "B", "C"]);
            const adjacencyList = new Map([
                ["A", ["B"]],
                ["B", ["C"]],
                ["C", ["A"]]
            ]);
            const reverseAdjacencyList = new Map([
                ["A", ["C"]],
                ["B", ["A"]],
                ["C", ["B"]]
            ]);

            const sorted = topologicalSort(reachableNodes, adjacencyList, reverseAdjacencyList);

            expect(sorted).toBeNull();
        });
    });
});

// ============================================================================
// STAGE 2: LOOP CONSTRUCTOR TESTS
// ============================================================================

describe("LoopConstructor", () => {
    describe("constructLoops", () => {
        it("creates sentinel nodes for loop", () => {
            const nodes = {
                Input: {
                    type: "input",
                    name: "Input",
                    config: {},
                    position: { x: 0, y: 0 },
                    id: "Input"
                },
                Loop: {
                    type: "loop",
                    name: "Loop",
                    config: { loopType: "forEach", arrayPath: "items" },
                    position: { x: 0, y: 0 },
                    id: "Loop"
                },
                Body: {
                    type: "transform",
                    name: "Body",
                    config: {},
                    position: { x: 0, y: 0 },
                    id: "Body"
                },
                Output: {
                    type: "output",
                    name: "Output",
                    config: {},
                    position: { x: 0, y: 0 },
                    id: "Output"
                }
            };
            const edges = [
                { id: "e1", source: "Input", target: "Loop" },
                { id: "e2", source: "Loop", target: "Body" },
                { id: "e3", source: "Body", target: "Loop" },
                { id: "e4", source: "Loop", target: "Output" }
            ];

            const definition = createWorkflowDefinition(
                {
                    Input: { type: "input", name: "Input" },
                    Loop: {
                        type: "loop",
                        name: "Loop",
                        config: { loopType: "forEach", arrayPath: "items" }
                    },
                    Body: { type: "transform", name: "Body" },
                    Output: { type: "output", name: "Output" }
                },
                edges
            );
            const pathResult = constructPaths(definition, "Input");

            const result = constructLoops(nodes, edges, pathResult);

            expect(result.nodes.has("Loop__LOOP_START")).toBe(true);
            expect(result.nodes.has("Loop__LOOP_END")).toBe(true);
            expect(result.loopContexts.has("Loop")).toBe(true);
        });
    });

    describe("isLoopSentinel", () => {
        it("returns true for loop start sentinel", () => {
            expect(isLoopSentinel("MyLoop__LOOP_START")).toBe(true);
        });

        it("returns true for loop end sentinel", () => {
            expect(isLoopSentinel("MyLoop__LOOP_END")).toBe(true);
        });

        it("returns false for regular node", () => {
            expect(isLoopSentinel("MyNode")).toBe(false);
        });
    });

    describe("getLoopNodeIdFromSentinel", () => {
        it("extracts loop ID from start sentinel", () => {
            expect(getLoopNodeIdFromSentinel("MyLoop__LOOP_START")).toBe("MyLoop");
        });

        it("extracts loop ID from end sentinel", () => {
            expect(getLoopNodeIdFromSentinel("MyLoop__LOOP_END")).toBe("MyLoop");
        });

        it("returns undefined for non-sentinel", () => {
            expect(getLoopNodeIdFromSentinel("RegularNode")).toBeUndefined();
        });
    });
});

// ============================================================================
// STAGE 3: NODE CONSTRUCTOR TESTS
// ============================================================================

describe("NodeConstructor", () => {
    describe("constructNodes", () => {
        it("copies nodes from loop result", () => {
            const loopResult = {
                nodes: new Map([
                    [
                        "A",
                        {
                            id: "A",
                            type: "input" as const,
                            name: "A",
                            config: {},
                            depth: 0,
                            dependencies: [],
                            dependents: ["B"]
                        }
                    ],
                    [
                        "B",
                        {
                            id: "B",
                            type: "output" as const,
                            name: "B",
                            config: {},
                            depth: 1,
                            dependencies: ["A"],
                            dependents: []
                        }
                    ]
                ]),
                edges: new Map(),
                loopContexts: new Map()
            };

            const result = constructNodes(loopResult);

            expect(result.nodes.size).toBe(2);
            expect(result.nodes.has("A")).toBe(true);
            expect(result.nodes.has("B")).toBe(true);
        });
    });

    describe("isExpandedBranch", () => {
        it("returns true for expanded branch", () => {
            const parallelBranches = new Map([["Parallel", ["Branch1", "Branch2"]]]);

            expect(isExpandedBranch("Branch1", parallelBranches)).toBe(true);
        });

        it("returns false for non-branch", () => {
            const parallelBranches = new Map([["Parallel", ["Branch1", "Branch2"]]]);

            expect(isExpandedBranch("Regular", parallelBranches)).toBe(false);
        });
    });

    describe("getParallelNodeIdFromBranch", () => {
        it("returns parallel node ID for branch", () => {
            const parallelBranches = new Map([["Parallel", ["Branch1", "Branch2"]]]);

            expect(getParallelNodeIdFromBranch("Branch1", parallelBranches)).toBe("Parallel");
        });

        it("returns undefined for non-branch", () => {
            const parallelBranches = new Map([["Parallel", ["Branch1", "Branch2"]]]);

            expect(getParallelNodeIdFromBranch("Regular", parallelBranches)).toBeUndefined();
        });
    });

    describe("getBranchesForParallelNode", () => {
        it("returns branch IDs for parallel node", () => {
            const parallelBranches = new Map([["Parallel", ["Branch1", "Branch2", "Branch3"]]]);

            expect(getBranchesForParallelNode("Parallel", parallelBranches)).toEqual([
                "Branch1",
                "Branch2",
                "Branch3"
            ]);
        });

        it("returns undefined for non-parallel node", () => {
            const parallelBranches = new Map([["Parallel", ["Branch1"]]]);

            expect(getBranchesForParallelNode("NonParallel", parallelBranches)).toBeUndefined();
        });
    });
});

// ============================================================================
// STAGE 4: EDGE CONSTRUCTOR TESTS
// ============================================================================

describe("EdgeConstructor", () => {
    describe("constructEdges", () => {
        it("copies edges without parallel expansion", () => {
            const loopResult = {
                nodes: new Map([
                    [
                        "A",
                        {
                            id: "A",
                            type: "input" as const,
                            name: "A",
                            config: {},
                            depth: 0,
                            dependencies: [],
                            dependents: ["B"]
                        }
                    ],
                    [
                        "B",
                        {
                            id: "B",
                            type: "output" as const,
                            name: "B",
                            config: {},
                            depth: 1,
                            dependencies: ["A"],
                            dependents: []
                        }
                    ]
                ]),
                edges: new Map([
                    [
                        "A->B",
                        { id: "A->B", source: "A", target: "B", handleType: "default" as const }
                    ]
                ]),
                loopContexts: new Map()
            };
            const nodeResult = constructNodes(loopResult);

            const result = constructEdges(loopResult, nodeResult);

            expect(result.edges.size).toBe(1);
            expect(result.edges.has("A->B")).toBe(true);
        });

        it("expands edges for parallel branches - source expanded", () => {
            const loopResult = {
                nodes: new Map([
                    [
                        "Input",
                        {
                            id: "Input",
                            type: "input" as const,
                            name: "Input",
                            config: {},
                            depth: 0,
                            dependencies: [],
                            dependents: ["Parallel"]
                        }
                    ],
                    [
                        "Parallel",
                        {
                            id: "Parallel",
                            type: "transform" as const,
                            name: "Parallel",
                            config: {},
                            depth: 1,
                            dependencies: ["Input"],
                            dependents: ["Output"]
                        }
                    ],
                    [
                        "Output",
                        {
                            id: "Output",
                            type: "output" as const,
                            name: "Output",
                            config: {},
                            depth: 2,
                            dependencies: ["Parallel"],
                            dependents: []
                        }
                    ]
                ]),
                edges: new Map([
                    [
                        "Input->Parallel",
                        {
                            id: "Input->Parallel",
                            source: "Input",
                            target: "Parallel",
                            handleType: "default" as const
                        }
                    ],
                    [
                        "Parallel->Output",
                        {
                            id: "Parallel->Output",
                            source: "Parallel",
                            target: "Output",
                            handleType: "default" as const
                        }
                    ]
                ]),
                loopContexts: new Map()
            };

            // Simulate parallel branches expansion
            const nodeResult = {
                nodes: new Map([
                    [
                        "Input",
                        {
                            id: "Input",
                            type: "input" as const,
                            name: "Input",
                            config: {},
                            depth: 0,
                            dependencies: [] as string[],
                            dependents: ["Branch1", "Branch2"]
                        }
                    ],
                    [
                        "Branch1",
                        {
                            id: "Branch1",
                            type: "transform" as const,
                            name: "Branch1",
                            config: {},
                            depth: 1,
                            dependencies: ["Input"],
                            dependents: ["Output"]
                        }
                    ],
                    [
                        "Branch2",
                        {
                            id: "Branch2",
                            type: "transform" as const,
                            name: "Branch2",
                            config: {},
                            depth: 1,
                            dependencies: ["Input"],
                            dependents: ["Output"]
                        }
                    ],
                    [
                        "Output",
                        {
                            id: "Output",
                            type: "output" as const,
                            name: "Output",
                            config: {},
                            depth: 2,
                            dependencies: ["Branch1", "Branch2"],
                            dependents: [] as string[]
                        }
                    ]
                ]),
                parallelBranches: new Map([["Parallel", ["Branch1", "Branch2"]]])
            };

            const result = constructEdges(loopResult, nodeResult);

            // Should have expanded edges
            // Input->Branch1, Input->Branch2 (target expanded)
            // Branch1->Output, Branch2->Output (source expanded)
            expect(result.edges.size).toBe(4);
        });

        it("handles edges with no expansion needed", () => {
            const loopResult = {
                nodes: new Map([
                    [
                        "A",
                        {
                            id: "A",
                            type: "conditional" as const,
                            name: "Condition",
                            config: {},
                            depth: 0,
                            dependencies: [],
                            dependents: ["B", "C"]
                        }
                    ],
                    [
                        "B",
                        {
                            id: "B",
                            type: "transform" as const,
                            name: "True",
                            config: {},
                            depth: 1,
                            dependencies: ["A"],
                            dependents: []
                        }
                    ],
                    [
                        "C",
                        {
                            id: "C",
                            type: "transform" as const,
                            name: "False",
                            config: {},
                            depth: 1,
                            dependencies: ["A"],
                            dependents: []
                        }
                    ]
                ]),
                edges: new Map([
                    ["A->B", { id: "A->B", source: "A", target: "B", handleType: "true" as const }],
                    ["A->C", { id: "A->C", source: "A", target: "C", handleType: "false" as const }]
                ]),
                loopContexts: new Map()
            };
            const nodeResult = {
                nodes: loopResult.nodes,
                parallelBranches: new Map<string, string[]>()
            };

            const result = constructEdges(loopResult, nodeResult);

            expect(result.edges.size).toBe(2);
            expect(result.edges.get("A->B")?.handleType).toBe("true");
            expect(result.edges.get("A->C")?.handleType).toBe("false");
        });
    });

    describe("getEdgesFromSource", () => {
        it("returns edges from specified source", () => {
            const edges = new Map([
                ["A->B", { id: "A->B", source: "A", target: "B", handleType: "default" as const }],
                ["A->C", { id: "A->C", source: "A", target: "C", handleType: "default" as const }],
                ["B->D", { id: "B->D", source: "B", target: "D", handleType: "default" as const }]
            ]);

            const fromA = getEdgesFromSource(edges, "A");

            expect(fromA).toHaveLength(2);
            expect(fromA.map((e) => e.target)).toContain("B");
            expect(fromA.map((e) => e.target)).toContain("C");
        });
    });

    describe("getEdgesToTarget", () => {
        it("returns edges to specified target", () => {
            const edges = new Map([
                ["A->D", { id: "A->D", source: "A", target: "D", handleType: "default" as const }],
                ["B->D", { id: "B->D", source: "B", target: "D", handleType: "default" as const }],
                ["C->D", { id: "C->D", source: "C", target: "D", handleType: "default" as const }]
            ]);

            const toD = getEdgesToTarget(edges, "D");

            expect(toD).toHaveLength(3);
            expect(toD.map((e) => e.source)).toContain("A");
            expect(toD.map((e) => e.source)).toContain("B");
            expect(toD.map((e) => e.source)).toContain("C");
        });
    });

    describe("getEdgesByHandle", () => {
        it("returns edges matching handle type", () => {
            const edges = new Map([
                ["A->B", { id: "A->B", source: "A", target: "B", handleType: "true" as const }],
                ["A->C", { id: "A->C", source: "A", target: "C", handleType: "false" as const }]
            ]);

            const trueEdges = getEdgesByHandle(edges, "A", "true");

            expect(trueEdges).toHaveLength(1);
            expect(trueEdges[0].target).toBe("B");
        });
    });

    describe("findBranchTarget", () => {
        it("finds target for branch handle", () => {
            const edges = new Map([
                ["A->B", { id: "A->B", source: "A", target: "B", handleType: "true" as const }],
                ["A->C", { id: "A->C", source: "A", target: "C", handleType: "false" as const }]
            ]);

            expect(findBranchTarget(edges, "A", "true")).toBe("B");
            expect(findBranchTarget(edges, "A", "false")).toBe("C");
        });

        it("returns undefined for non-existent branch", () => {
            const edges = new Map([
                ["A->B", { id: "A->B", source: "A", target: "B", handleType: "default" as const }]
            ]);

            expect(findBranchTarget(edges, "A", "true")).toBeUndefined();
        });
    });

    describe("getHandleTypesFromSource", () => {
        it("returns unique handle types", () => {
            const edges = new Map([
                ["A->B", { id: "A->B", source: "A", target: "B", handleType: "true" as const }],
                ["A->C", { id: "A->C", source: "A", target: "C", handleType: "false" as const }],
                ["A->D", { id: "A->D", source: "A", target: "D", handleType: "true" as const }]
            ]);

            const handles = getHandleTypesFromSource(edges, "A");

            expect(handles).toContain("true");
            expect(handles).toContain("false");
            expect(handles).toHaveLength(2);
        });
    });
});

// ============================================================================
// WORKFLOW PATTERN TESTS
// ============================================================================

describe("Workflow Patterns", () => {
    it("builds conditional workflow with branches", () => {
        const definition = createWorkflowDefinition(
            {
                Input: { type: "input", name: "Input" },
                Condition: { type: "conditional", name: "Condition" },
                TrueBranch: { type: "transform", name: "True Branch" },
                FalseBranch: { type: "transform", name: "False Branch" },
                Output: { type: "output", name: "Output" }
            },
            [
                { id: "e1", source: "Input", target: "Condition" },
                { id: "e2", source: "Condition", target: "TrueBranch", sourceHandle: "true" },
                { id: "e3", source: "Condition", target: "FalseBranch", sourceHandle: "false" },
                { id: "e4", source: "TrueBranch", target: "Output" },
                { id: "e5", source: "FalseBranch", target: "Output" }
            ]
        );

        const result = buildWorkflow(definition);

        expect(result.success).toBe(true);
        expect(result.workflow?.nodes.size).toBe(5);
    });

    it("builds switch workflow with multiple cases", () => {
        const definition = createWorkflowDefinition(
            {
                Input: { type: "input", name: "Input" },
                Switch: { type: "switch", name: "Switch" },
                CaseA: { type: "transform", name: "Case A" },
                CaseB: { type: "transform", name: "Case B" },
                Default: { type: "transform", name: "Default" },
                Output: { type: "output", name: "Output" }
            },
            [
                { id: "e1", source: "Input", target: "Switch" },
                { id: "e2", source: "Switch", target: "CaseA", sourceHandle: "case-a" },
                { id: "e3", source: "Switch", target: "CaseB", sourceHandle: "case-b" },
                { id: "e4", source: "Switch", target: "Default", sourceHandle: "default" },
                { id: "e5", source: "CaseA", target: "Output" },
                { id: "e6", source: "CaseB", target: "Output" },
                { id: "e7", source: "Default", target: "Output" }
            ]
        );

        const result = buildWorkflow(definition);

        expect(result.success).toBe(true);
        expect(result.workflow?.nodes.size).toBe(6);
    });

    it("builds workflow with parallel branches", () => {
        const definition = createWorkflowDefinition(
            {
                Input: { type: "input", name: "Input" },
                ParallelA: { type: "transform", name: "Parallel A" },
                ParallelB: { type: "transform", name: "Parallel B" },
                ParallelC: { type: "transform", name: "Parallel C" },
                Join: { type: "transform", name: "Join" },
                Output: { type: "output", name: "Output" }
            },
            [
                { id: "e1", source: "Input", target: "ParallelA" },
                { id: "e2", source: "Input", target: "ParallelB" },
                { id: "e3", source: "Input", target: "ParallelC" },
                { id: "e4", source: "ParallelA", target: "Join" },
                { id: "e5", source: "ParallelB", target: "Join" },
                { id: "e6", source: "ParallelC", target: "Join" },
                { id: "e7", source: "Join", target: "Output" }
            ]
        );

        const result = buildWorkflow(definition);

        expect(result.success).toBe(true);
        expect(result.workflow?.nodes.size).toBe(6);
        // Join should have 3 dependencies
        const joinNode = result.workflow?.nodes.get("Join");
        expect(joinNode?.dependencies).toHaveLength(3);
    });
});
