import { describe, it, expect } from "vitest";
import {
    autoLayoutNodes,
    convertToReactFlowFormat,
    type LayoutNode,
    type LayoutEdge,
    type GeneratedWorkflowNode,
    type GeneratedWorkflowEdge
} from "../workflowLayout";

// Constants from the source file
const HORIZONTAL_SPACING = 380;
const VERTICAL_SPACING = 200;
const START_X = 100;
const START_Y = 100;

describe("autoLayoutNodes", () => {
    it("should position single node at start position", () => {
        const nodes: LayoutNode[] = [{ id: "A", type: "input" }];
        const edges: LayoutEdge[] = [];

        const result = autoLayoutNodes(nodes, edges, "A");

        expect(result.get("A")).toEqual({ x: START_X, y: START_Y });
    });

    it("should position linear chain with horizontal spacing", () => {
        // A → B → C
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

        // Level 0: A at START_X
        expect(result.get("A")?.x).toBe(START_X);
        // Level 1: B at START_X + HORIZONTAL_SPACING
        expect(result.get("B")?.x).toBe(START_X + HORIZONTAL_SPACING);
        // Level 2: C at START_X + 2 * HORIZONTAL_SPACING
        expect(result.get("C")?.x).toBe(START_X + 2 * HORIZONTAL_SPACING);
    });

    it("should offset branch targets vertically for true/false handles", () => {
        // A → B (true branch), A → C (false branch)
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

        // True branch should be above center (negative offset)
        expect(result.get("B")?.y).toBe(START_Y - VERTICAL_SPACING);
        // False branch should be below center (positive offset)
        expect(result.get("C")?.y).toBe(START_Y + VERTICAL_SPACING);
    });

    it("should stack multiple nodes at same level vertically", () => {
        // A → B, A → C, A → D (all at level 1, no branch handles)
        const nodes: LayoutNode[] = [
            { id: "A", type: "input" },
            { id: "B", type: "llm" },
            { id: "C", type: "http" },
            { id: "D", type: "code" }
        ];
        const edges: LayoutEdge[] = [
            { source: "A", target: "B" },
            { source: "A", target: "C" },
            { source: "A", target: "D" }
        ];

        const result = autoLayoutNodes(nodes, edges, "A");

        // All B, C, D should be at the same x (level 1)
        expect(result.get("B")?.x).toBe(START_X + HORIZONTAL_SPACING);
        expect(result.get("C")?.x).toBe(START_X + HORIZONTAL_SPACING);
        expect(result.get("D")?.x).toBe(START_X + HORIZONTAL_SPACING);

        // They should have different y positions
        const yPositions = [result.get("B")?.y, result.get("C")?.y, result.get("D")?.y];
        const uniqueYs = new Set(yPositions);
        expect(uniqueYs.size).toBe(3);
    });

    it("should assign level 0 position to disconnected nodes", () => {
        // A → B, C (disconnected)
        const nodes: LayoutNode[] = [
            { id: "A", type: "input" },
            { id: "B", type: "llm" },
            { id: "C", type: "http" } // Disconnected
        ];
        const edges: LayoutEdge[] = [{ source: "A", target: "B" }];

        const result = autoLayoutNodes(nodes, edges, "A");

        // A and B should have positions
        expect(result.has("A")).toBe(true);
        expect(result.has("B")).toBe(true);

        // C gets positioned at level 0 (default for unvisited nodes in groupNodesByLevel)
        expect(result.has("C")).toBe(true);
        expect(result.get("C")?.x).toBe(START_X); // Level 0
    });

    it("should handle diamond pattern", () => {
        // A → B, A → C, B → D, C → D
        const nodes: LayoutNode[] = [
            { id: "A", type: "input" },
            { id: "B", type: "llm" },
            { id: "C", type: "http" },
            { id: "D", type: "output" }
        ];
        const edges: LayoutEdge[] = [
            { source: "A", target: "B" },
            { source: "A", target: "C" },
            { source: "B", target: "D" },
            { source: "C", target: "D" }
        ];

        const result = autoLayoutNodes(nodes, edges, "A");

        // A at level 0
        expect(result.get("A")?.x).toBe(START_X);
        // B and C at level 1
        expect(result.get("B")?.x).toBe(START_X + HORIZONTAL_SPACING);
        expect(result.get("C")?.x).toBe(START_X + HORIZONTAL_SPACING);
        // D at level 2
        expect(result.get("D")?.x).toBe(START_X + 2 * HORIZONTAL_SPACING);
    });

    it("should handle switch node with multiple output handles", () => {
        // A → B (case1), A → C (case2), A → D (default)
        const nodes: LayoutNode[] = [
            { id: "A", type: "switch" },
            { id: "B", type: "llm" },
            { id: "C", type: "http" },
            { id: "D", type: "code" }
        ];
        const edges: LayoutEdge[] = [
            { source: "A", target: "B", sourceHandle: "case1" },
            { source: "A", target: "C", sourceHandle: "case2" },
            { source: "A", target: "D", sourceHandle: "default" }
        ];

        const result = autoLayoutNodes(nodes, edges, "A");

        // All targets should have positions
        expect(result.has("B")).toBe(true);
        expect(result.has("C")).toBe(true);
        expect(result.has("D")).toBe(true);

        // They should be spread vertically
        const yPositions = [result.get("B")?.y, result.get("C")?.y, result.get("D")?.y];
        const uniqueYs = new Set(yPositions);
        expect(uniqueYs.size).toBe(3);
    });

    it("should handle empty nodes array", () => {
        const result = autoLayoutNodes([], [], "nonexistent");
        expect(result.size).toBe(0);
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

        // Config should be spread directly into data
        expect(result.nodes[0].data.url).toBe("https://api.example.com");
        expect(result.nodes[0].data.method).toBe("POST");
        // Should not have nested config object
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

        // Positions should be applied from auto-layout
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

    it("should preserve sourceHandle and targetHandle in edges", () => {
        const nodes: GeneratedWorkflowNode[] = [
            { id: "A", type: "conditional", label: "A", config: {} },
            { id: "B", type: "llm", label: "B", config: {} }
        ];
        const edges: GeneratedWorkflowEdge[] = [
            { source: "A", target: "B", sourceHandle: "true", targetHandle: "input" }
        ];

        const result = convertToReactFlowFormat(nodes, edges, "A");

        expect(result.edges[0].source).toBe("A");
        expect(result.edges[0].target).toBe("B");
        expect(result.edges[0].sourceHandle).toBe("true");
        expect(result.edges[0].targetHandle).toBe("input");
    });

    it("should handle empty input", () => {
        const result = convertToReactFlowFormat([], [], "");

        expect(result.nodes).toHaveLength(0);
        expect(result.edges).toHaveLength(0);
    });

    it("should position node at start when entry node doesnt exist", () => {
        // When entry node doesn't exist, nodes still get positioned at level 0
        const nodes: GeneratedWorkflowNode[] = [{ id: "A", type: "llm", label: "A", config: {} }];

        // Entry node "nonexistent" doesn't exist
        // But A still gets positioned at level 0 (groupNodesByLevel defaults to 0)
        const result = convertToReactFlowFormat(nodes, [], "nonexistent");

        // Node gets positioned at START position (level 0)
        expect(result.nodes[0].position).toEqual({ x: START_X, y: START_Y });
    });
});
