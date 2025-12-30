/**
 * Test Workflow Fixtures
 *
 * Pre-built workflow definitions for testing different execution patterns.
 * These are simplified workflow structures for unit/integration testing.
 */

import type { WorkflowDefinition } from "@flowmaestro/shared";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge,
    LoopContext
} from "../../src/temporal/activities/execution/types";

/**
 * Helper to create an ExecutableNode
 */
function createNode(
    id: string,
    type: string,
    config: Record<string, unknown> = {},
    dependencies: string[] = [],
    dependents: string[] = []
): ExecutableNode {
    return {
        id,
        type: type as ExecutableNode["type"],
        name: id,
        config,
        depth: dependencies.length > 0 ? 1 : 0,
        dependencies,
        dependents
    };
}

/**
 * Helper to create a TypedEdge
 */
function createEdge(
    source: string,
    target: string,
    handleType: TypedEdge["handleType"] = "default"
): TypedEdge {
    return {
        id: `${source}-${target}`,
        source,
        target,
        sourceHandle: handleType,
        targetHandle: "input",
        handleType
    };
}

/**
 * Simple linear workflow: A -> B -> C
 */
export function createLinearWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>([
        ["A", createNode("A", "input", {}, [], ["B"])],
        ["B", createNode("B", "transform", { operation: "uppercase" }, ["A"], ["C"])],
        ["C", createNode("C", "output", {}, ["B"], [])]
    ]);

    const edges = new Map<string, TypedEdge>([
        ["A-B", createEdge("A", "B")],
        ["B-C", createEdge("B", "C")]
    ]);

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["A"], ["B"], ["C"]],
        triggerNodeId: "A",
        outputNodeIds: ["C"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Diamond workflow (parallel): A -> [B, C] -> D
 */
export function createDiamondWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>([
        ["A", createNode("A", "input", {}, [], ["B", "C"])],
        ["B", createNode("B", "transform", { operation: "branch1" }, ["A"], ["D"])],
        ["C", createNode("C", "transform", { operation: "branch2" }, ["A"], ["D"])],
        ["D", createNode("D", "output", {}, ["B", "C"], [])]
    ]);

    const edges = new Map<string, TypedEdge>([
        ["A-B", createEdge("A", "B")],
        ["A-C", createEdge("A", "C")],
        ["B-D", createEdge("B", "D")],
        ["C-D", createEdge("C", "D")]
    ]);

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["A"], ["B", "C"], ["D"]],
        triggerNodeId: "A",
        outputNodeIds: ["D"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Conditional workflow: A -> Cond -> (true: B, false: C) -> D
 */
export function createConditionalWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>([
        ["A", createNode("A", "input", {}, [], ["Cond"])],
        [
            "Cond",
            createNode("Cond", "conditional", { condition: "{{value}} > 10" }, ["A"], ["B", "C"])
        ],
        ["B", createNode("B", "transform", { operation: "true-branch" }, ["Cond"], ["D"])],
        ["C", createNode("C", "transform", { operation: "false-branch" }, ["Cond"], ["D"])],
        ["D", createNode("D", "output", {}, ["B", "C"], [])]
    ]);

    const edges = new Map<string, TypedEdge>([
        ["A-Cond", createEdge("A", "Cond")],
        ["Cond-B", createEdge("Cond", "B", "true")],
        ["Cond-C", createEdge("Cond", "C", "false")],
        ["B-D", createEdge("B", "D")],
        ["C-D", createEdge("C", "D")]
    ]);

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["A"], ["Cond"], ["B", "C"], ["D"]],
        triggerNodeId: "A",
        outputNodeIds: ["D"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Loop workflow: A -> LoopStart -> Body -> LoopEnd -> B
 */
export function createLoopWorkflow(): BuiltWorkflow {
    const loopContext: LoopContext = {
        loopNodeId: "Loop",
        startSentinelId: "LoopStart",
        endSentinelId: "LoopEnd",
        bodyNodes: ["Body"],
        iterationVariable: "loop",
        maxIterations: 5
    };

    const nodes = new Map<string, ExecutableNode>([
        ["A", createNode("A", "input", {}, [], ["LoopStart"])],
        [
            "LoopStart",
            createNode("LoopStart", "loop-start", { loopNodeId: "Loop" }, ["A"], ["Body"])
        ],
        [
            "Body",
            createNode("Body", "transform", { operation: "iterate" }, ["LoopStart"], ["LoopEnd"])
        ],
        ["LoopEnd", createNode("LoopEnd", "loop-end", { loopNodeId: "Loop" }, ["Body"], ["B"])],
        ["B", createNode("B", "output", {}, ["LoopEnd"], [])]
    ]);

    // Add loop context to nodes
    nodes.get("LoopStart")!.loopContext = loopContext;
    nodes.get("Body")!.loopContext = loopContext;
    nodes.get("LoopEnd")!.loopContext = loopContext;

    const edges = new Map<string, TypedEdge>([
        ["A-LoopStart", createEdge("A", "LoopStart")],
        ["LoopStart-Body", createEdge("LoopStart", "Body", "loop-body")],
        ["Body-LoopEnd", createEdge("Body", "LoopEnd")],
        ["LoopEnd-B", createEdge("LoopEnd", "B", "loop-exit")]
    ]);

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["A"], ["LoopStart"], ["Body"], ["LoopEnd"], ["B"]],
        triggerNodeId: "A",
        outputNodeIds: ["B"],
        loopContexts: new Map([["Loop", loopContext]]),
        maxConcurrentNodes: 10
    };
}

/**
 * Error cascade workflow: A -> B(fails) -> C(skipped) with parallel D -> E
 */
export function createErrorCascadeWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>([
        ["A", createNode("A", "input", {}, [], ["B", "D"])],
        ["B", createNode("B", "transform", { operation: "will-fail" }, ["A"], ["C"])],
        ["C", createNode("C", "transform", { operation: "depends-on-B" }, ["B"], ["E"])],
        ["D", createNode("D", "transform", { operation: "parallel-branch" }, ["A"], ["E"])],
        ["E", createNode("E", "output", {}, ["C", "D"], [])]
    ]);

    const edges = new Map<string, TypedEdge>([
        ["A-B", createEdge("A", "B")],
        ["A-D", createEdge("A", "D")],
        ["B-C", createEdge("B", "C")],
        ["C-E", createEdge("C", "E")],
        ["D-E", createEdge("D", "E")]
    ]);

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["A"], ["B", "D"], ["C"], ["E"]],
        triggerNodeId: "A",
        outputNodeIds: ["E"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Complex workflow with nested conditionals and parallel branches
 */
export function createComplexWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>([
        ["Start", createNode("Start", "input", {}, [], ["Cond1", "P1"])],
        ["Cond1", createNode("Cond1", "conditional", {}, ["Start"], ["T1", "F1"])],
        ["T1", createNode("T1", "transform", {}, ["Cond1"], ["Cond2"])],
        ["F1", createNode("F1", "transform", {}, ["Cond1"], ["Merge"])],
        ["Cond2", createNode("Cond2", "conditional", {}, ["T1"], ["T2", "F2"])],
        ["T2", createNode("T2", "transform", {}, ["Cond2"], ["Merge"])],
        ["F2", createNode("F2", "transform", {}, ["Cond2"], ["Merge"])],
        ["P1", createNode("P1", "transform", {}, ["Start"], ["P2", "P3"])],
        ["P2", createNode("P2", "transform", {}, ["P1"], ["Merge"])],
        ["P3", createNode("P3", "transform", {}, ["P1"], ["Merge"])],
        ["Merge", createNode("Merge", "output", {}, ["F1", "T2", "F2", "P2", "P3"], [])]
    ]);

    const edges = new Map<string, TypedEdge>([
        ["Start-Cond1", createEdge("Start", "Cond1")],
        ["Start-P1", createEdge("Start", "P1")],
        ["Cond1-T1", createEdge("Cond1", "T1", "true")],
        ["Cond1-F1", createEdge("Cond1", "F1", "false")],
        ["T1-Cond2", createEdge("T1", "Cond2")],
        ["Cond2-T2", createEdge("Cond2", "T2", "true")],
        ["Cond2-F2", createEdge("Cond2", "F2", "false")],
        ["F1-Merge", createEdge("F1", "Merge")],
        ["T2-Merge", createEdge("T2", "Merge")],
        ["F2-Merge", createEdge("F2", "Merge")],
        ["P1-P2", createEdge("P1", "P2")],
        ["P1-P3", createEdge("P1", "P3")],
        ["P2-Merge", createEdge("P2", "Merge")],
        ["P3-Merge", createEdge("P3", "Merge")]
    ]);

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [
            ["Start"],
            ["Cond1", "P1"],
            ["T1", "F1", "P2", "P3"],
            ["Cond2"],
            ["T2", "F2"],
            ["Merge"]
        ],
        triggerNodeId: "Start",
        outputNodeIds: ["Merge"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}
