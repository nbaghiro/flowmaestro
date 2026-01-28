/**
 * EmbeddingsNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import EmbeddingsNode from "../../nodes/EmbeddingsNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-embeddings-node-1",
    useStore: (selector: (state: { transform: number[] }) => unknown) =>
        selector({ transform: [0, 0, 1] }),
    useUpdateNodeInternals: () => vi.fn()
}));

// Mock workflow store
vi.mock("../../../stores/workflowStore", () => ({
    useWorkflowStore: vi.fn((selector?: (state: unknown) => unknown) => {
        const state = {
            currentExecution: null,
            selectedNode: null,
            nodeValidation: {},
            workflowValidation: [],
            nodes: [],
            updateNode: vi.fn(),
            updateNodeStyle: vi.fn()
        };
        return selector ? selector(state) : state;
    }),
    INITIAL_NODE_WIDTH: 260,
    INITIAL_NODE_HEIGHT: 120
}));

// Mock validation components
vi.mock("../../../components/execution/modals/NodeExecutionPopover", () => ({
    NodeExecutionPopover: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock("../../../components/validation/NodeValidationBadge", () => ({
    NodeValidationBadge: () => null,
    getNodeValidationBorderStyle: () => ({
        hasIssues: false,
        borderClass: "",
        leftBorderColor: undefined
    })
}));

interface EmbeddingsNodeData {
    label: string;
    status?: NodeExecutionStatus;
    model?: string;
    dimensions?: number;
}

describe("EmbeddingsNode", () => {
    const createProps = (
        data: Partial<EmbeddingsNodeData> = {}
    ): NodeProps<EmbeddingsNodeData> => ({
        id: "test-embeddings-1",
        type: "embeddings",
        data: {
            label: "Embeddings",
            ...data
        },
        selected: false,
        isConnectable: true,
        xPos: 100,
        yPos: 100,
        dragging: false,
        zIndex: 1
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        it("renders with default label", () => {
            render(<EmbeddingsNode {...createProps()} />);
            expect(screen.getByText("Embeddings")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<EmbeddingsNode {...createProps({ label: "Text Embedder" })} />);
            expect(screen.getByText("Text Embedder")).toBeInTheDocument();
        });

        it("displays default model", () => {
            render(<EmbeddingsNode {...createProps()} />);
            expect(screen.getByText("Model:")).toBeInTheDocument();
            expect(screen.getByText("text-embedding-3-small")).toBeInTheDocument();
        });

        it("displays custom model", () => {
            render(<EmbeddingsNode {...createProps({ model: "text-embedding-ada-002" })} />);
            expect(screen.getByText("text-embedding-ada-002")).toBeInTheDocument();
        });

        it("displays default dimensions", () => {
            render(<EmbeddingsNode {...createProps()} />);
            expect(screen.getByText("Dimensions:")).toBeInTheDocument();
            expect(screen.getByText("1536")).toBeInTheDocument();
        });

        it("displays custom dimensions", () => {
            render(<EmbeddingsNode {...createProps({ dimensions: 768 })} />);
            expect(screen.getByText("768")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<EmbeddingsNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<EmbeddingsNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies AI category styling", () => {
            const { container } = render(<EmbeddingsNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-ai-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<EmbeddingsNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<EmbeddingsNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<EmbeddingsNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Embeddings")).toBeInTheDocument();
        });

        it("renders with running status", () => {
            render(<EmbeddingsNode {...createProps({ status: "executing" })} />);
            expect(screen.getByText("Embeddings")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<EmbeddingsNode {...createProps({ status: "completed" })} />);
            expect(screen.getByText("Embeddings")).toBeInTheDocument();
        });

        it("renders with error status", () => {
            render(<EmbeddingsNode {...createProps({ status: "failed" })} />);
            expect(screen.getByText("Embeddings")).toBeInTheDocument();
        });
    });
});
