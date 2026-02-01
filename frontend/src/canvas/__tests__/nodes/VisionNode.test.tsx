/**
 * VisionNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import VisionNode from "../../nodes/VisionNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-vision-node-1",
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

interface VisionNodeData {
    label: string;
    status?: NodeExecutionStatus;
    operation?: string;
    model?: string;
}

describe("VisionNode", () => {
    const createProps = (data: Partial<VisionNodeData> = {}): NodeProps<VisionNodeData> => ({
        id: "test-vision-1",
        type: "vision",
        data: {
            label: "Vision",
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
            render(<VisionNode {...createProps()} />);
            expect(screen.getByText("Vision")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<VisionNode {...createProps({ label: "Image Analyzer" })} />);
            expect(screen.getByText("Image Analyzer")).toBeInTheDocument();
        });

        it("displays default operation", () => {
            render(<VisionNode {...createProps()} />);
            expect(screen.getByText("Operation:")).toBeInTheDocument();
            expect(screen.getByText("analyze")).toBeInTheDocument();
        });

        it("displays custom operation", () => {
            render(<VisionNode {...createProps({ operation: "describe" })} />);
            expect(screen.getByText("describe")).toBeInTheDocument();
        });

        it("displays default model", () => {
            render(<VisionNode {...createProps()} />);
            expect(screen.getByText("Model:")).toBeInTheDocument();
            expect(screen.getByText("gpt-4-vision")).toBeInTheDocument();
        });

        it("displays custom model", () => {
            render(<VisionNode {...createProps({ model: "claude-3-opus-vision" })} />);
            expect(screen.getByText("claude-3-opus-vision")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<VisionNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<VisionNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies AI category styling", () => {
            const { container } = render(<VisionNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-ai-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<VisionNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<VisionNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<VisionNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Vision")).toBeInTheDocument();
        });

        it("renders with running status", () => {
            render(<VisionNode {...createProps({ status: "executing" })} />);
            expect(screen.getByText("Vision")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<VisionNode {...createProps({ status: "completed" })} />);
            expect(screen.getByText("Vision")).toBeInTheDocument();
        });

        it("renders with error status", () => {
            render(<VisionNode {...createProps({ status: "failed" })} />);
            expect(screen.getByText("Vision")).toBeInTheDocument();
        });
    });
});
