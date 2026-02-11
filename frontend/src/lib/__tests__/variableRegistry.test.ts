import { describe, it, expect } from "vitest";
import {
    computeUpstreamNodes,
    getAvailableVariables,
    filterVariables,
    groupVariablesBySource,
    type AvailableVariable
} from "../variableRegistry";
import type { Node, Edge } from "reactflow";

// Helper to create a minimal React Flow node
function createNode(id: string, type: string, data: Record<string, unknown> = {}): Node {
    return {
        id,
        type,
        position: { x: 0, y: 0 },
        data: { label: id, ...data }
    };
}

// Helper to create a minimal React Flow edge
function createEdge(source: string, target: string): Edge {
    return {
        id: `${source}-${target}`,
        source,
        target
    };
}

describe("computeUpstreamNodes", () => {
    it("should return empty array for entry node with no incoming edges", () => {
        const nodes = [createNode("A", "input")];
        const edges: Edge[] = [];

        const result = computeUpstreamNodes("A", nodes, edges);
        expect(result).toEqual([]);
    });

    it("should find upstream nodes in a linear chain", () => {
        // A → B → C
        const nodes = [createNode("A", "input"), createNode("B", "llm"), createNode("C", "output")];
        const edges = [createEdge("A", "B"), createEdge("B", "C")];

        const result = computeUpstreamNodes("C", nodes, edges);
        // Should find B then A (BFS order)
        expect(result).toContain("B");
        expect(result).toContain("A");
        expect(result).toHaveLength(2);
    });

    it("should handle diamond pattern", () => {
        // A → B, A → C, B → D, C → D
        const nodes = [
            createNode("A", "input"),
            createNode("B", "llm"),
            createNode("C", "http"),
            createNode("D", "output")
        ];
        const edges = [
            createEdge("A", "B"),
            createEdge("A", "C"),
            createEdge("B", "D"),
            createEdge("C", "D")
        ];

        const result = computeUpstreamNodes("D", nodes, edges);
        expect(result).toContain("B");
        expect(result).toContain("C");
        expect(result).toContain("A");
        expect(result).toHaveLength(3);
    });

    it("should not include downstream or disconnected nodes", () => {
        // A → B → C, D (disconnected)
        const nodes = [
            createNode("A", "input"),
            createNode("B", "llm"),
            createNode("C", "output"),
            createNode("D", "http") // Disconnected
        ];
        const edges = [createEdge("A", "B"), createEdge("B", "C")];

        const result = computeUpstreamNodes("B", nodes, edges);
        expect(result).toContain("A");
        expect(result).not.toContain("C"); // Downstream
        expect(result).not.toContain("D"); // Disconnected
        expect(result).toHaveLength(1);
    });

    it("should handle multiple incoming edges to same node", () => {
        // A → C, B → C
        const nodes = [
            createNode("A", "llm"),
            createNode("B", "http"),
            createNode("C", "transform")
        ];
        const edges = [createEdge("A", "C"), createEdge("B", "C")];

        const result = computeUpstreamNodes("C", nodes, edges);
        expect(result).toContain("A");
        expect(result).toContain("B");
        expect(result).toHaveLength(2);
    });

    it("should not revisit already visited nodes", () => {
        // A → B → C → D, A → D (creates a path where A could be visited twice)
        const nodes = [
            createNode("A", "input"),
            createNode("B", "llm"),
            createNode("C", "http"),
            createNode("D", "output")
        ];
        const edges = [
            createEdge("A", "B"),
            createEdge("B", "C"),
            createEdge("C", "D"),
            createEdge("A", "D")
        ];

        const result = computeUpstreamNodes("D", nodes, edges);
        // A should only appear once
        const aCount = result.filter((id) => id === "A").length;
        expect(aCount).toBe(1);
    });
});

describe("getAvailableVariables", () => {
    it("should return input variables", () => {
        const nodes = [
            createNode("input-1", "input", { variableName: "userQuery" }),
            createNode("llm-1", "llm")
        ];
        const edges = [createEdge("input-1", "llm-1")];

        const result = getAvailableVariables("llm-1", nodes, edges);
        const inputVar = result.find((v) => v.source === "input");

        expect(inputVar).toBeDefined();
        expect(inputVar?.path).toBe("userQuery");
        expect(inputVar?.displayPath).toContain("Input:");
    });

    it("should return upstream node outputs with field hints", () => {
        const nodes = [
            createNode("input-1", "input"),
            createNode("llm-1", "llm", { label: "Chat Model" })
        ];
        const edges = [createEdge("input-1", "llm-1")];

        const result = getAvailableVariables("llm-1", nodes, edges);

        // Input node should not produce outputs (it's handled separately)
        // Only input variables should be present
        const nodeOutputs = result.filter((v) => v.source === "nodeOutput");
        expect(nodeOutputs).toHaveLength(0);
    });

    it("should include field hints for llm node outputs", () => {
        const nodes = [
            createNode("input-1", "input"),
            createNode("llm-1", "llm", { label: "Chat Model" }),
            createNode("output-1", "output")
        ];
        const edges = [createEdge("input-1", "llm-1"), createEdge("llm-1", "output-1")];

        const result = getAvailableVariables("output-1", nodes, edges);
        const llmVars = result.filter(
            (v) => v.sourceNodeId === "llm-1" && v.source === "nodeOutput"
        );

        // Should have main output + field hints (text, usage, model, provider)
        expect(llmVars.length).toBeGreaterThanOrEqual(1);

        // Check for text field hint
        const textHint = llmVars.find((v) => v.path.includes(".text"));
        expect(textHint).toBeDefined();
    });

    it("should exclude downstream nodes", () => {
        const nodes = [createNode("A", "input"), createNode("B", "llm"), createNode("C", "output")];
        const edges = [createEdge("A", "B"), createEdge("B", "C")];

        const result = getAvailableVariables("B", nodes, edges);
        const outputNodeVars = result.filter((v) => v.sourceNodeId === "C");

        expect(outputNodeVars).toHaveLength(0);
    });

    it("should include loop variables when loop is upstream", () => {
        const nodes = [
            createNode("input-1", "input"),
            createNode("loop-1", "loop"),
            createNode("llm-1", "llm")
        ];
        const edges = [createEdge("input-1", "loop-1"), createEdge("loop-1", "llm-1")];

        const result = getAvailableVariables("llm-1", nodes, edges);
        const loopVars = result.filter((v) => v.source === "loop");

        expect(loopVars.length).toBeGreaterThan(0);
        expect(loopVars.some((v) => v.path === "loop.index")).toBe(true);
        expect(loopVars.some((v) => v.path === "loop.item")).toBe(true);
        expect(loopVars.some((v) => v.path === "loop.iteration")).toBe(true);
        expect(loopVars.some((v) => v.path === "loop.total")).toBe(true);
    });

    it("should NOT include loop variables when no loop is upstream", () => {
        const nodes = [createNode("input-1", "input"), createNode("llm-1", "llm")];
        const edges = [createEdge("input-1", "llm-1")];

        const result = getAvailableVariables("llm-1", nodes, edges);
        const loopVars = result.filter((v) => v.source === "loop");

        expect(loopVars).toHaveLength(0);
    });

    it("should use custom outputVariable name when set", () => {
        const nodes = [
            createNode("input-1", "input"),
            createNode("llm-1", "llm", {
                label: "Chat Model",
                outputVariable: "chatResponse"
            }),
            createNode("output-1", "output")
        ];
        const edges = [createEdge("input-1", "llm-1"), createEdge("llm-1", "output-1")];

        const result = getAvailableVariables("output-1", nodes, edges);
        const llmMainVar = result.find((v) => v.sourceNodeId === "llm-1" && !v.path.includes("."));

        expect(llmMainVar?.path).toBe("chatResponse");
    });

    it("should handle http node field hints", () => {
        const nodes = [
            createNode("input-1", "input"),
            createNode("http-1", "http", { label: "API Call" }),
            createNode("output-1", "output")
        ];
        const edges = [createEdge("input-1", "http-1"), createEdge("http-1", "output-1")];

        const result = getAvailableVariables("output-1", nodes, edges);
        const httpVars = result.filter((v) => v.sourceNodeId === "http-1");

        const dataHint = httpVars.find((v) => v.path.includes(".data"));
        const statusHint = httpVars.find((v) => v.path.includes(".status"));

        expect(dataHint).toBeDefined();
        expect(statusHint).toBeDefined();
    });
});

describe("filterVariables", () => {
    const variables: AvailableVariable[] = [
        {
            path: "llm-1.text",
            displayPath: "Chat Model → text",
            type: "string",
            source: "nodeOutput"
        },
        {
            path: "http-1.data",
            displayPath: "API Call → data",
            type: "object",
            source: "nodeOutput"
        },
        {
            path: "userQuery",
            displayPath: "Input: userQuery",
            type: "unknown",
            source: "input"
        }
    ];

    it("should return all variables for empty query", () => {
        const result = filterVariables(variables, "");
        expect(result).toHaveLength(3);
    });

    it("should return all variables for whitespace-only query", () => {
        const result = filterVariables(variables, "   ");
        expect(result).toHaveLength(3);
    });

    it("should filter by path", () => {
        const result = filterVariables(variables, "llm");
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("llm-1.text");
    });

    it("should filter by displayPath", () => {
        const result = filterVariables(variables, "Chat Model");
        expect(result).toHaveLength(1);
        expect(result[0].displayPath).toContain("Chat Model");
    });

    it("should be case-insensitive", () => {
        const result = filterVariables(variables, "CHAT");
        expect(result).toHaveLength(1);
    });

    it("should match partial strings", () => {
        const result = filterVariables(variables, "data");
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("http-1.data");
    });

    it("should return empty array when no matches", () => {
        const result = filterVariables(variables, "nonexistent");
        expect(result).toHaveLength(0);
    });
});

describe("groupVariablesBySource", () => {
    it("should group variables by source node", () => {
        const variables: AvailableVariable[] = [
            {
                path: "llm-1.text",
                displayPath: "LLM → text",
                type: "string",
                source: "nodeOutput",
                sourceNodeId: "llm-1",
                sourceNodeName: "LLM"
            },
            {
                path: "llm-1.usage",
                displayPath: "LLM → usage",
                type: "object",
                source: "nodeOutput",
                sourceNodeId: "llm-1",
                sourceNodeName: "LLM"
            },
            {
                path: "http-1.data",
                displayPath: "HTTP → data",
                type: "object",
                source: "nodeOutput",
                sourceNodeId: "http-1",
                sourceNodeName: "HTTP"
            }
        ];

        const result = groupVariablesBySource(variables);

        // Should have 2 groups (llm-1 and http-1)
        expect(result).toHaveLength(2);

        const llmGroup = result.find((g) => g.sourceNodeId === "llm-1");
        expect(llmGroup?.variables).toHaveLength(2);

        const httpGroup = result.find((g) => g.sourceNodeId === "http-1");
        expect(httpGroup?.variables).toHaveLength(1);
    });

    it("should put input group first", () => {
        const variables: AvailableVariable[] = [
            {
                path: "llm-1.text",
                displayPath: "LLM → text",
                type: "string",
                source: "nodeOutput",
                sourceNodeId: "llm-1",
                sourceNodeName: "LLM"
            },
            {
                path: "userQuery",
                displayPath: "Input: userQuery",
                type: "unknown",
                source: "input",
                sourceNodeId: "input-1",
                sourceNodeName: "Input"
            }
        ];

        const result = groupVariablesBySource(variables);

        expect(result[0].sourceNodeType).toBe("input");
        expect(result[0].sourceNodeName).toBe("Workflow Inputs");
    });

    it("should put loop context group last", () => {
        const variables: AvailableVariable[] = [
            {
                path: "llm-1.text",
                displayPath: "LLM → text",
                type: "string",
                source: "nodeOutput",
                sourceNodeId: "llm-1",
                sourceNodeName: "LLM"
            },
            {
                path: "loop.index",
                displayPath: "Loop → index",
                type: "number",
                source: "loop"
            },
            {
                path: "loop.item",
                displayPath: "Loop → item",
                type: "unknown",
                source: "loop"
            }
        ];

        const result = groupVariablesBySource(variables);

        const lastGroup = result[result.length - 1];
        expect(lastGroup.sourceNodeType).toBe("loop");
        expect(lastGroup.sourceNodeName).toBe("Loop Context");
        expect(lastGroup.variables).toHaveLength(2);
    });

    it("should handle empty input", () => {
        const result = groupVariablesBySource([]);
        expect(result).toHaveLength(0);
    });

    it("should not create empty groups", () => {
        const variables: AvailableVariable[] = [
            {
                path: "llm-1.text",
                displayPath: "LLM → text",
                type: "string",
                source: "nodeOutput",
                sourceNodeId: "llm-1",
                sourceNodeName: "LLM"
            }
        ];

        const result = groupVariablesBySource(variables);

        // Should only have the nodeOutput group, not empty input/loop groups
        expect(result).toHaveLength(1);
        expect(result[0].sourceNodeId).toBe("llm-1");
    });
});
