import { describe, it, expect } from "vitest";
import {
    transformNodeForBackend,
    transformEdgeForBackend,
    transformNodesToBackendMap,
    transformEdgesToBackend,
    findEntryPoint,
    createWorkflowSnapshot,
    compareWorkflowSnapshots,
    type BackendNode,
    type WorkflowSnapshot
} from "../workflowTransformers";
import type { Node, Edge } from "reactflow";

// Helper to create a minimal React Flow node
function createNode(overrides: Partial<Node> = {}): Node {
    return {
        id: "node-1",
        type: "llm",
        position: { x: 100, y: 200 },
        data: { label: "Test Node", prompt: "Hello" },
        ...overrides
    };
}

// Helper to create a minimal React Flow edge
function createEdge(overrides: Partial<Edge> = {}): Edge {
    return {
        id: "edge-1",
        source: "node-1",
        target: "node-2",
        ...overrides
    };
}

describe("transformNodeForBackend", () => {
    it("should transform a basic node", () => {
        const node = createNode();
        const result = transformNodeForBackend(node);

        expect(result.id).toBe("node-1");
        expect(result.type).toBe("llm");
        expect(result.name).toBe("Test Node");
        expect(result.position).toEqual({ x: 100, y: 200 });
        expect(result.config).toEqual({ prompt: "Hello" });
    });

    it("should handle missing data gracefully", () => {
        const node = createNode({ data: undefined });
        const result = transformNodeForBackend(node);

        expect(result.config).toEqual({});
        expect(result.name).toBe("node-1"); // Falls back to node ID
    });

    it("should extract label from data and exclude from config", () => {
        const node = createNode({
            data: { label: "My Node", prompt: "test", model: "gpt-4" }
        });
        const result = transformNodeForBackend(node);

        expect(result.name).toBe("My Node");
        expect(result.config).toEqual({ prompt: "test", model: "gpt-4" });
        expect(result.config).not.toHaveProperty("label");
    });

    it("should preserve style when present", () => {
        const node = createNode({
            style: { backgroundColor: "red" }
        });
        const result = transformNodeForBackend(node);

        expect(result.style).toEqual({ backgroundColor: "red" });
    });

    it("should not include style when absent", () => {
        const node = createNode();
        const result = transformNodeForBackend(node);

        expect(result.style).toBeUndefined();
    });

    it("should preserve error handling config", () => {
        const node = createNode({
            data: {
                label: "Node",
                onError: { strategy: "retry", maxAttempts: 3 }
            }
        });
        const result = transformNodeForBackend(node);

        expect(result.onError).toEqual({ strategy: "retry", maxAttempts: 3 });
    });

    it("should not include onError for invalid format", () => {
        const node = createNode({
            data: {
                label: "Node",
                onError: "invalid"
            }
        });
        const result = transformNodeForBackend(node);

        expect(result.onError).toBeUndefined();
    });

    it("should default type to 'default' when missing", () => {
        const node = createNode({ type: undefined });
        const result = transformNodeForBackend(node);

        expect(result.type).toBe("default");
    });
});

describe("transformEdgeForBackend", () => {
    it("should transform a basic edge", () => {
        const edge = createEdge();
        const result = transformEdgeForBackend(edge);

        expect(result.id).toBe("edge-1");
        expect(result.source).toBe("node-1");
        expect(result.target).toBe("node-2");
    });

    it("should include sourceHandle for conditional branches", () => {
        const edge = createEdge({ sourceHandle: "true" });
        const result = transformEdgeForBackend(edge);

        expect(result.sourceHandle).toBe("true");
    });

    it("should not include sourceHandle when absent", () => {
        const edge = createEdge();
        const result = transformEdgeForBackend(edge);

        expect(result.sourceHandle).toBeUndefined();
    });

    it("should handle false branch handle", () => {
        const edge = createEdge({ sourceHandle: "false" });
        const result = transformEdgeForBackend(edge);

        expect(result.sourceHandle).toBe("false");
    });
});

describe("transformNodesToBackendMap", () => {
    it("should transform multiple nodes to a map keyed by ID", () => {
        const nodes = [
            createNode({ id: "node-1", data: { label: "Node 1" } }),
            createNode({ id: "node-2", data: { label: "Node 2" } }),
            createNode({ id: "node-3", data: { label: "Node 3" } })
        ];

        const result = transformNodesToBackendMap(nodes);

        expect(Object.keys(result)).toEqual(["node-1", "node-2", "node-3"]);
        expect(result["node-1"].name).toBe("Node 1");
        expect(result["node-2"].name).toBe("Node 2");
        expect(result["node-3"].name).toBe("Node 3");
    });

    it("should handle empty array", () => {
        const result = transformNodesToBackendMap([]);
        expect(result).toEqual({});
    });
});

describe("transformEdgesToBackend", () => {
    it("should transform multiple edges", () => {
        const edges = [
            createEdge({ id: "e1", source: "a", target: "b" }),
            createEdge({ id: "e2", source: "b", target: "c", sourceHandle: "true" })
        ];

        const result = transformEdgesToBackend(edges);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ id: "e1", source: "a", target: "b" });
        expect(result[1]).toEqual({
            id: "e2",
            source: "b",
            target: "c",
            sourceHandle: "true"
        });
    });

    it("should handle empty array", () => {
        const result = transformEdgesToBackend([]);
        expect(result).toEqual([]);
    });
});

describe("findEntryPoint", () => {
    it("should return input node ID when present", () => {
        const nodes = [
            createNode({ id: "llm-1", type: "llm" }),
            createNode({ id: "input-1", type: "input" }),
            createNode({ id: "output-1", type: "output" })
        ];

        const result = findEntryPoint(nodes);
        expect(result).toBe("input-1");
    });

    it("should return first node ID when no input node", () => {
        const nodes = [
            createNode({ id: "llm-1", type: "llm" }),
            createNode({ id: "http-1", type: "http" })
        ];

        const result = findEntryPoint(nodes);
        expect(result).toBe("llm-1");
    });

    it("should return empty string for empty array", () => {
        const result = findEntryPoint([]);
        expect(result).toBe("");
    });
});

describe("createWorkflowSnapshot", () => {
    it("should create a JSON string snapshot", () => {
        const nodes = [createNode({ id: "a" }), createNode({ id: "b" })];
        const edges = [createEdge({ id: "e1", source: "a", target: "b" })];

        const result = createWorkflowSnapshot("My Workflow", nodes, edges);

        expect(typeof result).toBe("string");
        const parsed = JSON.parse(result);
        expect(parsed.name).toBe("My Workflow");
        expect(parsed.nodes).toHaveLength(2);
        expect(parsed.edges).toHaveLength(1);
    });

    it("should sort nodes by ID for consistent snapshots", () => {
        const nodes1 = [createNode({ id: "b" }), createNode({ id: "a" })];
        const nodes2 = [createNode({ id: "a" }), createNode({ id: "b" })];

        const snapshot1 = createWorkflowSnapshot("Test", nodes1, []);
        const snapshot2 = createWorkflowSnapshot("Test", nodes2, []);

        expect(snapshot1).toBe(snapshot2);
    });
});

describe("compareWorkflowSnapshots", () => {
    // Helper to create backend node map
    function createNodeMap(
        nodes: Array<{ id: string; type?: string; name?: string; config?: Record<string, unknown> }>
    ): Record<string, BackendNode> {
        const map: Record<string, BackendNode> = {};
        for (const n of nodes) {
            map[n.id] = {
                id: n.id,
                type: n.type || "llm",
                name: n.name || n.id,
                position: { x: 0, y: 0 },
                config: n.config || {}
            };
        }
        return map;
    }

    it("should detect significant changes when no previous snapshot", () => {
        const currentNodes = createNodeMap([{ id: "a" }, { id: "b" }]);
        const currentEdges = [{ id: "e1", source: "a", target: "b" }];

        const result = compareWorkflowSnapshots(currentNodes, currentEdges, null);

        expect(result.hasSignificantChanges).toBe(true);
        expect(result.changes.nodesAdded).toEqual(["a", "b"]);
        expect(result.changes.edgesAdded).toBe(1);
    });

    it("should detect no changes for identical snapshots", () => {
        const nodes = createNodeMap([{ id: "a" }, { id: "b" }]);
        const edges = [{ id: "e1", source: "a", target: "b" }];
        const previous: WorkflowSnapshot = { nodes, edges };

        const result = compareWorkflowSnapshots(nodes, edges, previous);

        expect(result.hasSignificantChanges).toBe(false);
        expect(result.changes.nodesAdded).toHaveLength(0);
        expect(result.changes.nodesRemoved).toHaveLength(0);
        expect(result.changes.nodesConfigChanged).toHaveLength(0);
        expect(result.changes.edgesAdded).toBe(0);
        expect(result.changes.edgesRemoved).toBe(0);
    });

    it("should detect node added", () => {
        const previousNodes = createNodeMap([{ id: "a" }]);
        const currentNodes = createNodeMap([{ id: "a" }, { id: "b" }]);
        const edges: Array<{ id: string; source: string; target: string }> = [];
        const previous: WorkflowSnapshot = { nodes: previousNodes, edges };

        const result = compareWorkflowSnapshots(currentNodes, edges, previous);

        expect(result.hasSignificantChanges).toBe(true);
        expect(result.changes.nodesAdded).toEqual(["b"]);
    });

    it("should detect node removed", () => {
        const previousNodes = createNodeMap([{ id: "a" }, { id: "b" }]);
        const currentNodes = createNodeMap([{ id: "a" }]);
        const edges: Array<{ id: string; source: string; target: string }> = [];
        const previous: WorkflowSnapshot = { nodes: previousNodes, edges };

        const result = compareWorkflowSnapshots(currentNodes, edges, previous);

        expect(result.hasSignificantChanges).toBe(true);
        expect(result.changes.nodesRemoved).toEqual(["b"]);
    });

    it("should detect node config changed", () => {
        const previousNodes = createNodeMap([{ id: "a", config: { prompt: "old" } }]);
        const currentNodes = createNodeMap([{ id: "a", config: { prompt: "new" } }]);
        const edges: Array<{ id: string; source: string; target: string }> = [];
        const previous: WorkflowSnapshot = { nodes: previousNodes, edges };

        const result = compareWorkflowSnapshots(currentNodes, edges, previous);

        expect(result.hasSignificantChanges).toBe(true);
        expect(result.changes.nodesConfigChanged).toEqual(["a"]);
    });

    it("should detect node type changed", () => {
        const previousNodes = createNodeMap([{ id: "a", type: "llm" }]);
        const currentNodes = createNodeMap([{ id: "a", type: "http" }]);
        const edges: Array<{ id: string; source: string; target: string }> = [];
        const previous: WorkflowSnapshot = { nodes: previousNodes, edges };

        const result = compareWorkflowSnapshots(currentNodes, edges, previous);

        expect(result.hasSignificantChanges).toBe(true);
        expect(result.changes.nodesConfigChanged).toEqual(["a"]);
    });

    it("should detect node name changed", () => {
        const previousNodes = createNodeMap([{ id: "a", name: "Old Name" }]);
        const currentNodes = createNodeMap([{ id: "a", name: "New Name" }]);
        const edges: Array<{ id: string; source: string; target: string }> = [];
        const previous: WorkflowSnapshot = { nodes: previousNodes, edges };

        const result = compareWorkflowSnapshots(currentNodes, edges, previous);

        expect(result.hasSignificantChanges).toBe(true);
        expect(result.changes.nodesConfigChanged).toEqual(["a"]);
    });

    it("should detect edge added", () => {
        const nodes = createNodeMap([{ id: "a" }, { id: "b" }]);
        const previousEdges: Array<{ id: string; source: string; target: string }> = [];
        const currentEdges = [{ id: "e1", source: "a", target: "b" }];
        const previous: WorkflowSnapshot = { nodes, edges: previousEdges };

        const result = compareWorkflowSnapshots(nodes, currentEdges, previous);

        expect(result.hasSignificantChanges).toBe(true);
        expect(result.changes.edgesAdded).toBe(1);
    });

    it("should detect edge removed", () => {
        const nodes = createNodeMap([{ id: "a" }, { id: "b" }]);
        const previousEdges = [{ id: "e1", source: "a", target: "b" }];
        const currentEdges: Array<{ id: string; source: string; target: string }> = [];
        const previous: WorkflowSnapshot = { nodes, edges: previousEdges };

        const result = compareWorkflowSnapshots(nodes, currentEdges, previous);

        expect(result.hasSignificantChanges).toBe(true);
        expect(result.changes.edgesRemoved).toBe(1);
    });

    it("should NOT detect position change as significant", () => {
        const previousNodes: Record<string, BackendNode> = {
            a: { id: "a", type: "llm", name: "A", position: { x: 0, y: 0 }, config: {} }
        };
        const currentNodes: Record<string, BackendNode> = {
            a: { id: "a", type: "llm", name: "A", position: { x: 100, y: 200 }, config: {} }
        };
        const edges: Array<{ id: string; source: string; target: string }> = [];
        const previous: WorkflowSnapshot = { nodes: previousNodes, edges };

        const result = compareWorkflowSnapshots(currentNodes, edges, previous);

        // Position changes are cosmetic and should not be significant
        expect(result.hasSignificantChanges).toBe(false);
    });

    it("should handle edges with sourceHandle correctly", () => {
        const nodes = createNodeMap([{ id: "a" }, { id: "b" }, { id: "c" }]);
        const previousEdges = [{ id: "e1", source: "a", target: "b", sourceHandle: "true" }];
        const currentEdges = [{ id: "e1", source: "a", target: "b", sourceHandle: "false" }];
        const previous: WorkflowSnapshot = { nodes, edges: previousEdges };

        const result = compareWorkflowSnapshots(nodes, currentEdges, previous);

        // Different sourceHandle means different edge
        expect(result.hasSignificantChanges).toBe(true);
        expect(result.changes.edgesAdded).toBe(1);
        expect(result.changes.edgesRemoved).toBe(1);
    });
});
