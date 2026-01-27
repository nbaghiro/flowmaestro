/**
 * TransformNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TransformNode from "../../nodes/TransformNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-transform-node-1",
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

type TransformOperation =
    | "map"
    | "filter"
    | "reduce"
    | "sort"
    | "merge"
    | "extract"
    | "custom"
    | "passthrough";

interface TransformNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    operation?: TransformOperation;
    inputData?: string;
    expression?: string;
}

describe("TransformNode", () => {
    const createProps = (data: Partial<TransformNodeData> = {}): NodeProps<TransformNodeData> => ({
        id: "test-transform-1",
        type: "transform",
        data: {
            label: "Transform",
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
            render(<TransformNode {...createProps()} />);
            expect(screen.getByText("Transform")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<TransformNode {...createProps({ label: "Data Processor" })} />);
            expect(screen.getByText("Data Processor")).toBeInTheDocument();
        });
    });

    describe("Operation Display", () => {
        it("shows default operation (Map)", () => {
            render(<TransformNode {...createProps()} />);
            expect(screen.getByText("Operation:")).toBeInTheDocument();
            expect(screen.getByText("Map")).toBeInTheDocument();
        });

        it("shows Passthrough operation", () => {
            render(<TransformNode {...createProps({ operation: "passthrough" })} />);
            expect(screen.getByText("Passthrough")).toBeInTheDocument();
        });

        it("shows Filter operation", () => {
            render(<TransformNode {...createProps({ operation: "filter" })} />);
            expect(screen.getByText("Filter")).toBeInTheDocument();
        });

        it("shows Reduce operation", () => {
            render(<TransformNode {...createProps({ operation: "reduce" })} />);
            expect(screen.getByText("Reduce")).toBeInTheDocument();
        });

        it("shows Sort operation", () => {
            render(<TransformNode {...createProps({ operation: "sort" })} />);
            expect(screen.getByText("Sort")).toBeInTheDocument();
        });

        it("shows Merge operation", () => {
            render(<TransformNode {...createProps({ operation: "merge" })} />);
            expect(screen.getByText("Merge")).toBeInTheDocument();
        });

        it("shows Extract operation", () => {
            render(<TransformNode {...createProps({ operation: "extract" })} />);
            expect(screen.getByText("Extract")).toBeInTheDocument();
        });

        it("shows Custom JSONata operation", () => {
            render(<TransformNode {...createProps({ operation: "custom" })} />);
            expect(screen.getByText("Custom JSONata")).toBeInTheDocument();
        });
    });

    describe("Input Data Display", () => {
        it("shows input data when configured", () => {
            render(<TransformNode {...createProps({ inputData: "{{response.data}}" })} />);
            expect(screen.getByText("Input:")).toBeInTheDocument();
            expect(screen.getByText("{{response.data}}")).toBeInTheDocument();
        });

        it("does not show input when not configured", () => {
            render(<TransformNode {...createProps()} />);
            expect(screen.queryByText("Input:")).not.toBeInTheDocument();
        });
    });

    describe("Expression Display", () => {
        it("shows expression when configured", () => {
            render(<TransformNode {...createProps({ expression: "$.data.items[*].name" })} />);
            expect(screen.getByText("$.data.items[*].name")).toBeInTheDocument();
        });

        it("shows complex JSONata expression", () => {
            render(
                <TransformNode
                    {...createProps({
                        operation: "custom",
                        expression: "$sum(items.price)"
                    })}
                />
            );
            expect(screen.getByText("$sum(items.price)")).toBeInTheDocument();
        });

        it("does not show expression when not configured", () => {
            render(<TransformNode {...createProps()} />);
            // When neither inputData nor expression is set, shows "Not configured"
            expect(screen.getByText("Not configured")).toBeInTheDocument();
        });
    });

    describe("Unconfigured State", () => {
        it("shows 'Not configured' when no input or expression", () => {
            render(<TransformNode {...createProps()} />);
            expect(screen.getByText("Not configured")).toBeInTheDocument();
        });

        it("does not show 'Not configured' when inputData is set", () => {
            render(<TransformNode {...createProps({ inputData: "{{data}}" })} />);
            expect(screen.queryByText("Not configured")).not.toBeInTheDocument();
        });

        it("does not show 'Not configured' when expression is set", () => {
            render(<TransformNode {...createProps({ expression: "$.items" })} />);
            expect(screen.queryByText("Not configured")).not.toBeInTheDocument();
        });
    });

    describe("Combined Input and Expression", () => {
        it("shows both input and expression when both configured", () => {
            render(
                <TransformNode
                    {...createProps({
                        inputData: "{{users}}",
                        expression: "$filter($, function($v) { $v.active })"
                    })}
                />
            );
            expect(screen.getByText("Input:")).toBeInTheDocument();
            expect(screen.getByText("{{users}}")).toBeInTheDocument();
            expect(screen.getByText("$filter($, function($v) { $v.active })")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<TransformNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<TransformNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies data category styling", () => {
            const { container } = render(<TransformNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-data-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<TransformNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<TransformNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Complex Scenarios", () => {
        it("handles map operation with array transformation", () => {
            render(
                <TransformNode
                    {...createProps({
                        label: "Extract Names",
                        operation: "map",
                        inputData: "{{users}}",
                        expression: "$.name"
                    })}
                />
            );
            expect(screen.getByText("Extract Names")).toBeInTheDocument();
            expect(screen.getByText("Map")).toBeInTheDocument();
            expect(screen.getByText("{{users}}")).toBeInTheDocument();
        });

        it("handles filter operation", () => {
            render(
                <TransformNode
                    {...createProps({
                        label: "Active Users",
                        operation: "filter",
                        expression: "$.status = 'active'"
                    })}
                />
            );
            expect(screen.getByText("Active Users")).toBeInTheDocument();
            expect(screen.getByText("Filter")).toBeInTheDocument();
        });

        it("handles reduce operation for aggregation", () => {
            render(
                <TransformNode
                    {...createProps({
                        label: "Total Price",
                        operation: "reduce",
                        expression: "$sum(items.price)"
                    })}
                />
            );
            expect(screen.getByText("Total Price")).toBeInTheDocument();
            expect(screen.getByText("Reduce")).toBeInTheDocument();
        });
    });
});
