/**
 * LoopNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import LoopNode from "../../nodes/LoopNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-loop-node-1",
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

interface LoopNodeData {
    label: string;
    status?: NodeExecutionStatus;
    loopType?: "forEach" | "while" | "times";
    arrayVariable?: string;
    itemVariable?: string;
    indexVariable?: string;
    condition?: string;
    count?: number;
}

describe("LoopNode", () => {
    const createProps = (data: Partial<LoopNodeData> = {}): NodeProps<LoopNodeData> => ({
        id: "test-loop-1",
        type: "loop",
        data: {
            label: "Loop",
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
            render(<LoopNode {...createProps()} />);
            expect(screen.getByText("Loop")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<LoopNode {...createProps({ label: "Process Items" })} />);
            expect(screen.getByText("Process Items")).toBeInTheDocument();
        });
    });

    describe("For Each Loop Type", () => {
        it("shows For Each as default loop type", () => {
            render(<LoopNode {...createProps()} />);
            expect(screen.getByText("Type:")).toBeInTheDocument();
            expect(screen.getByText("For Each")).toBeInTheDocument();
        });

        it("shows default array variable", () => {
            render(<LoopNode {...createProps({ loopType: "forEach" })} />);
            expect(screen.getByText("Array:")).toBeInTheDocument();
            expect(screen.getByText("${items}")).toBeInTheDocument();
        });

        it("shows custom array variable", () => {
            render(
                <LoopNode {...createProps({ loopType: "forEach", arrayVariable: "${users}" })} />
            );
            expect(screen.getByText("${users}")).toBeInTheDocument();
        });

        it("shows default item variable", () => {
            render(<LoopNode {...createProps({ loopType: "forEach" })} />);
            expect(screen.getByText("Item:")).toBeInTheDocument();
            expect(screen.getByText("$item")).toBeInTheDocument();
        });

        it("shows custom item variable", () => {
            render(<LoopNode {...createProps({ loopType: "forEach", itemVariable: "user" })} />);
            expect(screen.getByText("$user")).toBeInTheDocument();
        });
    });

    describe("While Loop Type", () => {
        it("shows While loop type", () => {
            render(<LoopNode {...createProps({ loopType: "while" })} />);
            expect(screen.getByText("While")).toBeInTheDocument();
        });

        it("shows condition label", () => {
            render(<LoopNode {...createProps({ loopType: "while" })} />);
            expect(screen.getByText("While:")).toBeInTheDocument();
        });

        it("shows 'No condition set' when no condition", () => {
            render(<LoopNode {...createProps({ loopType: "while" })} />);
            expect(screen.getByText("No condition set")).toBeInTheDocument();
        });

        it("shows custom condition", () => {
            render(<LoopNode {...createProps({ loopType: "while", condition: "count < 10" })} />);
            expect(screen.getByText("count < 10")).toBeInTheDocument();
        });
    });

    describe("Times Loop Type", () => {
        it("shows Times loop type", () => {
            render(<LoopNode {...createProps({ loopType: "times" })} />);
            expect(screen.getByText("Times")).toBeInTheDocument();
        });

        it("shows default iteration count", () => {
            render(<LoopNode {...createProps({ loopType: "times" })} />);
            expect(screen.getByText("Iterations:")).toBeInTheDocument();
            expect(screen.getByText("10x")).toBeInTheDocument();
        });

        it("shows custom iteration count", () => {
            render(<LoopNode {...createProps({ loopType: "times", count: 5 })} />);
            expect(screen.getByText("5x")).toBeInTheDocument();
        });

        it("shows default index variable", () => {
            render(<LoopNode {...createProps({ loopType: "times" })} />);
            expect(screen.getByText("Index:")).toBeInTheDocument();
            expect(screen.getByText("$index")).toBeInTheDocument();
        });

        it("shows custom index variable", () => {
            render(<LoopNode {...createProps({ loopType: "times", indexVariable: "i" })} />);
            expect(screen.getByText("$i")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<LoopNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<LoopNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies logic category styling", () => {
            const { container } = render(<LoopNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-logic-border");
        });
    });
});
