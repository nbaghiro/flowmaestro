import { describe, it, expect } from "vitest";
import {
    autoLayoutWorkflow,
    autoLayoutNodes,
    convertToReactFlowFormat,
    HORIZONTAL_SPACING,
    START_X,
    START_Y,
    type LayoutNode,
    type LayoutEdge,
    type GeneratedWorkflowNode,
    type GeneratedWorkflowEdge
} from "../workflow-layout";

describe("autoLayoutWorkflow", () => {
    it("should return empty map for empty nodes array", () => {
        const result = autoLayoutWorkflow([], []);
        expect(result.size).toBe(0);
    });

    it("should position single node at start position", () => {
        const nodes = [{ id: "A", type: "input", position: { x: 0, y: 0 } }];
        const edges: LayoutEdge[] = [];

        const result = autoLayoutWorkflow(nodes, edges);

        expect(result.get("A")).toBeDefined();
        expect(result.get("A")?.x).toBe(START_X);
    });

    it("should layout linear chain with horizontal spacing", () => {
        const nodes = [
            { id: "A", type: "input", position: { x: 0, y: 0 } },
            { id: "B", type: "llm", position: { x: 0, y: 0 } },
            { id: "C", type: "output", position: { x: 0, y: 0 } }
        ];
        const edges = [
            { source: "A", target: "B" },
            { source: "B", target: "C" }
        ];

        const result = autoLayoutWorkflow(nodes, edges);

        // A should be at level 0
        expect(result.get("A")?.x).toBe(START_X);
        // B should be at level 1
        expect(result.get("B")?.x).toBe(START_X + HORIZONTAL_SPACING);
        // C should be at level 2
        expect(result.get("C")?.x).toBe(START_X + 2 * HORIZONTAL_SPACING);
    });

    it("should handle diamond pattern correctly", () => {
        // A → B, A → C, B → D, C → D
        const nodes = [
            { id: "A", type: "input", position: { x: 0, y: 0 } },
            { id: "B", type: "llm", position: { x: 0, y: 0 } },
            { id: "C", type: "http", position: { x: 0, y: 0 } },
            { id: "D", type: "output", position: { x: 0, y: 0 } }
        ];
        const edges = [
            { source: "A", target: "B" },
            { source: "A", target: "C" },
            { source: "B", target: "D" },
            { source: "C", target: "D" }
        ];

        const result = autoLayoutWorkflow(nodes, edges);

        // A at level 0
        expect(result.get("A")?.x).toBe(START_X);
        // B and C at level 1
        expect(result.get("B")?.x).toBe(START_X + HORIZONTAL_SPACING);
        expect(result.get("C")?.x).toBe(START_X + HORIZONTAL_SPACING);
        // D at level 2
        expect(result.get("D")?.x).toBe(START_X + 2 * HORIZONTAL_SPACING);
    });

    it("should handle conditional branches with true/false handles", () => {
        const nodes = [
            { id: "A", type: "conditional", position: { x: 0, y: 0 } },
            { id: "B", type: "llm", position: { x: 0, y: 0 } },
            { id: "C", type: "http", position: { x: 0, y: 0 } }
        ];
        const edges = [
            { source: "A", target: "B", sourceHandle: "true" },
            { source: "A", target: "C", sourceHandle: "false" }
        ];

        const result = autoLayoutWorkflow(nodes, edges);

        // Both B and C should be at level 1
        expect(result.get("B")?.x).toBe(START_X + HORIZONTAL_SPACING);
        expect(result.get("C")?.x).toBe(START_X + HORIZONTAL_SPACING);

        // B (true) should be above C (false)
        expect(result.get("B")?.y).toBeLessThan(result.get("C")?.y || 0);
    });

    it("should preserve comment node positions", () => {
        const nodes = [
            { id: "A", type: "input", position: { x: 0, y: 0 } },
            { id: "comment-1", type: "comment", position: { x: 500, y: 300 } }
        ];
        const edges: LayoutEdge[] = [];

        const result = autoLayoutWorkflow(nodes, edges);

        // Comment node should keep its original position
        expect(result.get("comment-1")).toEqual({ x: 500, y: 300 });
    });

    it("should handle disconnected components", () => {
        const nodes = [
            { id: "A", type: "input", position: { x: 0, y: 0 } },
            { id: "B", type: "llm", position: { x: 0, y: 0 } },
            { id: "C", type: "input", position: { x: 0, y: 0 } },
            { id: "D", type: "output", position: { x: 0, y: 0 } }
        ];
        const edges = [
            { source: "A", target: "B" },
            { source: "C", target: "D" }
        ];

        const result = autoLayoutWorkflow(nodes, edges);

        // All nodes should have positions
        expect(result.has("A")).toBe(true);
        expect(result.has("B")).toBe(true);
        expect(result.has("C")).toBe(true);
        expect(result.has("D")).toBe(true);

        // Components should be separated vertically
        const component1MaxY = Math.max(result.get("A")?.y || 0, result.get("B")?.y || 0);
        const component2MinY = Math.min(result.get("C")?.y || 0, result.get("D")?.y || 0);
        expect(component2MinY).toBeGreaterThan(component1MaxY);
    });

    it("should prioritize entry node types for leftmost position", () => {
        const nodes = [
            { id: "llm", type: "llm", position: { x: 0, y: 0 } },
            { id: "input", type: "input", position: { x: 0, y: 0 } },
            { id: "output", type: "output", position: { x: 0, y: 0 } }
        ];
        const edges = [
            { source: "input", target: "llm" },
            { source: "llm", target: "output" }
        ];

        const result = autoLayoutWorkflow(nodes, edges);

        // Input should be at level 0 (leftmost)
        expect(result.get("input")?.x).toBe(START_X);
        // LLM at level 1
        expect(result.get("llm")?.x).toBe(START_X + HORIZONTAL_SPACING);
        // Output at level 2 (rightmost)
        expect(result.get("output")?.x).toBe(START_X + 2 * HORIZONTAL_SPACING);
    });

    it("should handle switch node with multiple cases", () => {
        const nodes = [
            { id: "switch", type: "switch", position: { x: 0, y: 0 } },
            { id: "case1", type: "llm", position: { x: 0, y: 0 } },
            { id: "case2", type: "http", position: { x: 0, y: 0 } },
            { id: "case3", type: "code", position: { x: 0, y: 0 } }
        ];
        const edges = [
            { source: "switch", target: "case1", sourceHandle: "case_0" },
            { source: "switch", target: "case2", sourceHandle: "case_1" },
            { source: "switch", target: "case3", sourceHandle: "case_2" }
        ];

        const result = autoLayoutWorkflow(nodes, edges);

        // All case nodes should be at same x (level 1)
        expect(result.get("case1")?.x).toBe(START_X + HORIZONTAL_SPACING);
        expect(result.get("case2")?.x).toBe(START_X + HORIZONTAL_SPACING);
        expect(result.get("case3")?.x).toBe(START_X + HORIZONTAL_SPACING);

        // They should have different Y positions
        const yPositions = [result.get("case1")?.y, result.get("case2")?.y, result.get("case3")?.y];
        expect(new Set(yPositions).size).toBe(3);
    });
});

describe("autoLayoutNodes", () => {
    it("should position single node at start position", () => {
        const nodes: LayoutNode[] = [{ id: "A", type: "input" }];
        const edges: LayoutEdge[] = [];

        const result = autoLayoutNodes(nodes, edges, "A");

        expect(result.get("A")).toEqual({ x: START_X, y: START_Y });
    });

    it("should position linear chain with horizontal spacing", () => {
        const nodes: LayoutNode[] = [
            { id: "A", type: "input" },
            { id: "B", type: "llm" },
            { id: "C", type: "output" }
        ];
        const edges: LayoutEdge[] = [
            { source: "A", target: "B" },
            { source: "B", target: "C" }
        ];

        const result = autoLayoutNodes(nodes, edges, "A");

        expect(result.get("A")?.x).toBe(START_X);
        expect(result.get("B")?.x).toBe(START_X + HORIZONTAL_SPACING);
        expect(result.get("C")?.x).toBe(START_X + 2 * HORIZONTAL_SPACING);
    });

    it("should offset branch targets for true/false handles", () => {
        const nodes: LayoutNode[] = [
            { id: "A", type: "conditional" },
            { id: "B", type: "llm" },
            { id: "C", type: "http" }
        ];
        const edges: LayoutEdge[] = [
            { source: "A", target: "B", sourceHandle: "true" },
            { source: "A", target: "C", sourceHandle: "false" }
        ];

        const result = autoLayoutNodes(nodes, edges, "A");

        // For 2 nodes at a level, getDynamicVerticalSpacing returns MAX_VERTICAL_SPACING (280)
        // levelHeight = (2-1) * 280 = 280
        // levelStartY = centerY - 140 = 350 - 140 = 210
        // B (true, priority 0) is first at 210
        // C (false, priority 1) is second at 210 + 280 = 490
        expect(result.get("B")?.y).toBe(210);
        expect(result.get("C")?.y).toBe(490);
    });

    it("should handle empty nodes array", () => {
        const result = autoLayoutNodes([], [], "nonexistent");
        expect(result.size).toBe(0);
    });

    it("should handle disconnected nodes", () => {
        const nodes: LayoutNode[] = [
            { id: "A", type: "input" },
            { id: "B", type: "llm" },
            { id: "C", type: "http" }
        ];
        const edges: LayoutEdge[] = [{ source: "A", target: "B" }];

        const result = autoLayoutNodes(nodes, edges, "A");

        expect(result.has("A")).toBe(true);
        expect(result.has("B")).toBe(true);
        expect(result.has("C")).toBe(true);
        expect(result.get("C")?.x).toBe(START_X);
    });
});

describe("convertToReactFlowFormat", () => {
    it("should convert nodes to React Flow format", () => {
        const nodes: GeneratedWorkflowNode[] = [
            {
                id: "llm-1",
                type: "llm",
                label: "Chat Model",
                config: { prompt: "Hello", model: "gpt-4" }
            }
        ];
        const edges: GeneratedWorkflowEdge[] = [];

        const result = convertToReactFlowFormat(nodes, edges, "llm-1");

        expect(result.nodes).toHaveLength(1);
        expect(result.nodes[0].id).toBe("llm-1");
        expect(result.nodes[0].type).toBe("llm");
        expect(result.nodes[0].data.label).toBe("Chat Model");
        expect(result.nodes[0].data.prompt).toBe("Hello");
        expect(result.nodes[0].data.model).toBe("gpt-4");
        expect(result.nodes[0].data.status).toBe("idle");
    });

    it("should spread config into data (not nested)", () => {
        const nodes: GeneratedWorkflowNode[] = [
            {
                id: "http-1",
                type: "http",
                label: "API Call",
                config: { url: "https://api.example.com", method: "POST" }
            }
        ];

        const result = convertToReactFlowFormat(nodes, [], "http-1");

        expect(result.nodes[0].data.url).toBe("https://api.example.com");
        expect(result.nodes[0].data.method).toBe("POST");
        expect(result.nodes[0].data).not.toHaveProperty("config");
    });

    it("should apply auto-layout positions", () => {
        const nodes: GeneratedWorkflowNode[] = [
            { id: "A", type: "input", label: "A", config: {} },
            { id: "B", type: "llm", label: "B", config: {} }
        ];
        const edges: GeneratedWorkflowEdge[] = [
            { source: "A", target: "B", sourceHandle: "output", targetHandle: "input" }
        ];

        const result = convertToReactFlowFormat(nodes, edges, "A");

        expect(result.nodes[0].position.x).toBe(START_X);
        expect(result.nodes[1].position.x).toBe(START_X + HORIZONTAL_SPACING);
    });

    it("should convert edges with sequential IDs", () => {
        const nodes: GeneratedWorkflowNode[] = [
            { id: "A", type: "input", label: "A", config: {} },
            { id: "B", type: "llm", label: "B", config: {} },
            { id: "C", type: "output", label: "C", config: {} }
        ];
        const edges: GeneratedWorkflowEdge[] = [
            { source: "A", target: "B", sourceHandle: "output", targetHandle: "input" },
            { source: "B", target: "C", sourceHandle: "output", targetHandle: "input" }
        ];

        const result = convertToReactFlowFormat(nodes, edges, "A");

        expect(result.edges).toHaveLength(2);
        expect(result.edges[0].id).toBe("edge-0");
        expect(result.edges[1].id).toBe("edge-1");
    });

    it("should preserve sourceHandle and targetHandle", () => {
        const nodes: GeneratedWorkflowNode[] = [
            { id: "A", type: "conditional", label: "A", config: {} },
            { id: "B", type: "llm", label: "B", config: {} }
        ];
        const edges: GeneratedWorkflowEdge[] = [
            { source: "A", target: "B", sourceHandle: "true", targetHandle: "input" }
        ];

        const result = convertToReactFlowFormat(nodes, edges, "A");

        expect(result.edges[0].sourceHandle).toBe("true");
        expect(result.edges[0].targetHandle).toBe("input");
    });

    it("should handle empty input", () => {
        const result = convertToReactFlowFormat([], [], "");

        expect(result.nodes).toHaveLength(0);
        expect(result.edges).toHaveLength(0);
    });
});

describe("layout algorithm edge cases", () => {
    it("should handle cyclic graphs without infinite loop", () => {
        // A → B → C → A (cycle)
        const nodes = [
            { id: "A", type: "llm", position: { x: 0, y: 0 } },
            { id: "B", type: "llm", position: { x: 0, y: 0 } },
            { id: "C", type: "llm", position: { x: 0, y: 0 } }
        ];
        const edges = [
            { source: "A", target: "B" },
            { source: "B", target: "C" },
            { source: "C", target: "A" }
        ];

        // Should complete without timeout
        const result = autoLayoutWorkflow(nodes, edges);

        expect(result.size).toBe(3);
        expect(result.has("A")).toBe(true);
        expect(result.has("B")).toBe(true);
        expect(result.has("C")).toBe(true);
    });

    it("should handle nodes with same position input", () => {
        const nodes = [
            { id: "A", type: "input", position: { x: 100, y: 100 } },
            { id: "B", type: "llm", position: { x: 100, y: 100 } }
        ];
        const edges = [{ source: "A", target: "B" }];

        const result = autoLayoutWorkflow(nodes, edges);

        // Nodes should be separated after layout
        expect(result.get("A")?.x).not.toBe(result.get("B")?.x);
    });

    it("should normalize positions to start at START_X, START_Y", () => {
        const nodes = [{ id: "A", type: "input", position: { x: 1000, y: 1000 } }];
        const edges: LayoutEdge[] = [];

        const result = autoLayoutWorkflow(nodes, edges);

        expect(result.get("A")?.x).toBe(START_X);
        expect(result.get("A")?.y).toBe(START_Y);
    });

    it("should handle complex workflow with multiple entry points", () => {
        const nodes = [
            { id: "input1", type: "input", position: { x: 0, y: 0 } },
            { id: "input2", type: "input", position: { x: 0, y: 0 } },
            { id: "merge", type: "llm", position: { x: 0, y: 0 } },
            { id: "output", type: "output", position: { x: 0, y: 0 } }
        ];
        const edges = [
            { source: "input1", target: "merge" },
            { source: "input2", target: "merge" },
            { source: "merge", target: "output" }
        ];

        const result = autoLayoutWorkflow(nodes, edges);

        // Both inputs at level 0
        expect(result.get("input1")?.x).toBe(START_X);
        expect(result.get("input2")?.x).toBe(START_X);
        // Merge at level 1
        expect(result.get("merge")?.x).toBe(START_X + HORIZONTAL_SPACING);
        // Output at level 2
        expect(result.get("output")?.x).toBe(START_X + 2 * HORIZONTAL_SPACING);
    });
});
