/**
 * ConditionalNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import ConditionalNode from "../../nodes/ConditionalNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-conditional-node-1",
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

interface ConditionalNodeData {
    label: string;
    status?: NodeExecutionStatus;
    conditionType?: "simple" | "expression";
    leftValue?: string;
    operator?: string;
    rightValue?: string;
    expression?: string;
}

describe("ConditionalNode", () => {
    const createProps = (
        data: Partial<ConditionalNodeData> = {}
    ): NodeProps<ConditionalNodeData> => ({
        id: "test-conditional-1",
        type: "conditional",
        data: {
            label: "Conditional",
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
            render(<ConditionalNode {...createProps()} />);
            expect(screen.getByText("Conditional")).toBeInTheDocument();
        });

        it("renders True and False branch labels", () => {
            render(<ConditionalNode {...createProps()} />);
            expect(screen.getByText("True")).toBeInTheDocument();
            expect(screen.getByText("False")).toBeInTheDocument();
        });
    });

    describe("Simple Condition", () => {
        it("shows default comparison values when no values set", () => {
            render(<ConditionalNode {...createProps({ conditionType: "simple" })} />);
            expect(screen.getByText("value1")).toBeInTheDocument();
            expect(screen.getByText("==")).toBeInTheDocument();
            expect(screen.getByText("value2")).toBeInTheDocument();
        });

        it("shows custom left value", () => {
            render(
                <ConditionalNode
                    {...createProps({ conditionType: "simple", leftValue: "{{ count }}" })}
                />
            );
            expect(screen.getByText("{{ count }}")).toBeInTheDocument();
        });

        it("shows custom right value", () => {
            render(
                <ConditionalNode {...createProps({ conditionType: "simple", rightValue: "100" })} />
            );
            expect(screen.getByText("100")).toBeInTheDocument();
        });

        it("shows custom operator", () => {
            render(
                <ConditionalNode {...createProps({ conditionType: "simple", operator: ">" })} />
            );
            expect(screen.getByText(">")).toBeInTheDocument();
        });

        it("shows full comparison with all values", () => {
            render(
                <ConditionalNode
                    {...createProps({
                        conditionType: "simple",
                        leftValue: "{{ age }}",
                        operator: ">=",
                        rightValue: "18"
                    })}
                />
            );
            expect(screen.getByText("{{ age }}")).toBeInTheDocument();
            expect(screen.getByText(">=")).toBeInTheDocument();
            expect(screen.getByText("18")).toBeInTheDocument();
        });
    });

    describe("Expression Condition", () => {
        it("shows expression when conditionType is expression", () => {
            render(
                <ConditionalNode
                    {...createProps({
                        conditionType: "expression",
                        expression: "{{ value }} > 10 && {{ enabled }}"
                    })}
                />
            );
            expect(screen.getByText("{{ value }} > 10 && {{ enabled }}")).toBeInTheDocument();
        });

        it("falls back to simple comparison when expression is empty", () => {
            render(
                <ConditionalNode
                    {...createProps({
                        conditionType: "expression",
                        expression: ""
                    })}
                />
            );
            // Should show default simple comparison
            expect(screen.getByText("value1")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<ConditionalNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-default")).toBeInTheDocument();
        });

        it("renders true output handle", () => {
            render(<ConditionalNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-true")).toBeInTheDocument();
        });

        it("renders false output handle", () => {
            render(<ConditionalNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-false")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies logic category styling", () => {
            const { container } = render(<ConditionalNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-logic-border");
        });
    });

    describe("Branch Indicators", () => {
        it("renders True branch with green color", () => {
            const { container } = render(<ConditionalNode {...createProps()} />);
            const trueText = container.querySelector(".text-green-600");
            expect(trueText).toBeInTheDocument();
        });

        it("renders False branch with red color", () => {
            const { container } = render(<ConditionalNode {...createProps()} />);
            const falseText = container.querySelector(".text-red-600");
            expect(falseText).toBeInTheDocument();
        });
    });
});
