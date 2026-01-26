/**
 * WaitNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WaitNode from "../../nodes/WaitNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-wait-node-1",
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

interface WaitNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    duration?: number;
    unit?: string;
}

describe("WaitNode", () => {
    const createProps = (data: Partial<WaitNodeData> = {}): NodeProps<WaitNodeData> => ({
        id: "test-wait-1",
        type: "wait",
        data: {
            label: "Wait/Delay",
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
            render(<WaitNode {...createProps()} />);
            expect(screen.getByText("Wait/Delay")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<WaitNode {...createProps({ label: "Pause Execution" })} />);
            expect(screen.getByText("Pause Execution")).toBeInTheDocument();
        });
    });

    describe("Duration Display", () => {
        it("shows default duration of 5 seconds", () => {
            render(<WaitNode {...createProps()} />);
            expect(screen.getByText("Duration:")).toBeInTheDocument();
            expect(screen.getByText("5 seconds")).toBeInTheDocument();
        });

        it("shows custom duration", () => {
            render(<WaitNode {...createProps({ duration: 10 })} />);
            expect(screen.getByText("10 seconds")).toBeInTheDocument();
        });

        it("shows minutes unit", () => {
            render(<WaitNode {...createProps({ duration: 2, unit: "minutes" })} />);
            expect(screen.getByText("2 minutes")).toBeInTheDocument();
        });

        it("shows hours unit", () => {
            render(<WaitNode {...createProps({ duration: 1, unit: "hours" })} />);
            expect(screen.getByText("1 hours")).toBeInTheDocument();
        });

        it("shows milliseconds unit", () => {
            render(<WaitNode {...createProps({ duration: 500, unit: "milliseconds" })} />);
            expect(screen.getByText("500 milliseconds")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<WaitNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<WaitNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies logic category styling", () => {
            const { container } = render(<WaitNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-logic-border");
        });
    });

    describe("Various Durations", () => {
        const durations = [
            { duration: 1, unit: "seconds", expected: "1 seconds" },
            { duration: 30, unit: "seconds", expected: "30 seconds" },
            { duration: 60, unit: "seconds", expected: "60 seconds" },
            { duration: 5, unit: "minutes", expected: "5 minutes" },
            { duration: 24, unit: "hours", expected: "24 hours" }
        ];

        durations.forEach(({ duration, unit, expected }) => {
            it(`displays ${expected}`, () => {
                render(<WaitNode {...createProps({ duration, unit })} />);
                expect(screen.getByText(expected)).toBeInTheDocument();
            });
        });
    });
});
