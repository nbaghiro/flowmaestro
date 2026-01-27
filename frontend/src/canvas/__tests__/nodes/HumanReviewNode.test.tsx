/**
 * HumanReviewNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import HumanReviewNode from "../../nodes/HumanReviewNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-human-review-node-1",
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

interface HumanReviewNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    prompt?: string;
    variableName?: string;
    inputType?: string;
    required?: boolean;
}

describe("HumanReviewNode", () => {
    const createProps = (
        data: Partial<HumanReviewNodeData> = {}
    ): NodeProps<HumanReviewNodeData> => ({
        id: "test-human-review-1",
        type: "humanReview",
        data: {
            label: "Human Review",
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
            render(<HumanReviewNode {...createProps()} />);
            expect(screen.getByText("Human Review")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<HumanReviewNode {...createProps({ label: "Manager Approval" })} />);
            expect(screen.getByText("Manager Approval")).toBeInTheDocument();
        });

        it("displays default prompt", () => {
            render(<HumanReviewNode {...createProps()} />);
            expect(screen.getByText(/"Enter your input"/)).toBeInTheDocument();
        });

        it("displays custom prompt", () => {
            render(<HumanReviewNode {...createProps({ prompt: "Please review this content" })} />);
            expect(screen.getByText(/"Please review this content"/)).toBeInTheDocument();
        });

        it("displays default variable name", () => {
            render(<HumanReviewNode {...createProps()} />);
            expect(screen.getByText("Variable:")).toBeInTheDocument();
            expect(screen.getByText("$userInput")).toBeInTheDocument();
        });

        it("displays custom variable name", () => {
            render(<HumanReviewNode {...createProps({ variableName: "approvalResponse" })} />);
            expect(screen.getByText("$approvalResponse")).toBeInTheDocument();
        });

        it("displays default input type", () => {
            render(<HumanReviewNode {...createProps()} />);
            expect(screen.getByText("Type:")).toBeInTheDocument();
            expect(screen.getByText("text")).toBeInTheDocument();
        });

        it("displays custom input type", () => {
            render(<HumanReviewNode {...createProps({ inputType: "textarea" })} />);
            expect(screen.getByText("textarea")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<HumanReviewNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<HumanReviewNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies AI category styling", () => {
            const { container } = render(<HumanReviewNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-ai-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<HumanReviewNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<HumanReviewNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<HumanReviewNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Human Review")).toBeInTheDocument();
        });

        it("renders with running status", () => {
            render(<HumanReviewNode {...createProps({ status: "running" })} />);
            expect(screen.getByText("Human Review")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<HumanReviewNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("Human Review")).toBeInTheDocument();
        });

        it("renders with error status", () => {
            render(<HumanReviewNode {...createProps({ status: "error" })} />);
            expect(screen.getByText("Human Review")).toBeInTheDocument();
        });
    });
});
