/**
 * OutputNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OutputNode from "../../nodes/OutputNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-output-node-1",
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

interface OutputNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    value?: string | object;
    format?: string;
}

describe("OutputNode", () => {
    const createProps = (data: Partial<OutputNodeData> = {}): NodeProps<OutputNodeData> => ({
        id: "test-output-1",
        type: "output",
        data: {
            label: "Output",
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
            render(<OutputNode {...createProps()} />);
            expect(screen.getByText("Output")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<OutputNode {...createProps({ label: "Final Result" })} />);
            expect(screen.getByText("Final Result")).toBeInTheDocument();
        });
    });

    describe("Format Display", () => {
        it("shows default format as text", () => {
            render(<OutputNode {...createProps()} />);
            expect(screen.getByText("Format:")).toBeInTheDocument();
            expect(screen.getByText("text")).toBeInTheDocument();
        });

        it("shows json format", () => {
            render(<OutputNode {...createProps({ format: "json" })} />);
            expect(screen.getByText("json")).toBeInTheDocument();
        });

        it("shows markdown format", () => {
            render(<OutputNode {...createProps({ format: "markdown" })} />);
            expect(screen.getByText("markdown")).toBeInTheDocument();
        });

        it("displays format in uppercase", () => {
            render(<OutputNode {...createProps({ format: "html" })} />);
            const formatDisplay = screen.getByText("html");
            expect(formatDisplay).toHaveClass("uppercase");
        });
    });

    describe("Value Preview", () => {
        it("shows 'No output template' when no value", () => {
            render(<OutputNode {...createProps()} />);
            expect(screen.getByText("No output template")).toBeInTheDocument();
        });

        it("shows short value in full", () => {
            render(<OutputNode {...createProps({ value: "Hello World" })} />);
            expect(screen.getByText("Hello World")).toBeInTheDocument();
        });

        it("truncates long values", () => {
            const longValue =
                "This is a very long output value that exceeds sixty characters and should be truncated with ellipsis";
            render(<OutputNode {...createProps({ value: longValue })} />);
            // Should show first 60 chars + ...
            expect(
                screen.getByText(/This is a very long output value that exceeds sixty charact.../)
            ).toBeInTheDocument();
        });

        it("handles object values (AI-generated workflows)", () => {
            render(
                <OutputNode {...createProps({ value: { key: "value" } as unknown as string })} />
            );
            // Object should be JSON stringified
            expect(screen.getByText('{"key":"value"}')).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<OutputNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("does not render output handle (this is an end node)", () => {
            render(<OutputNode {...createProps()} />);
            expect(screen.queryByTestId("handle-source-output")).not.toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies outputs category styling", () => {
            const { container } = render(<OutputNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-outputs-border");
        });
    });
});
