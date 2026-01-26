/**
 * InputNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InputNode from "../../nodes/InputNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-input-node-1",
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

interface InputNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    inputType?: string;
    variableName?: string;
}

describe("InputNode", () => {
    const createProps = (data: Partial<InputNodeData> = {}): NodeProps<InputNodeData> => ({
        id: "test-input-1",
        type: "input",
        data: {
            label: "Input",
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
            render(<InputNode {...createProps()} />);
            expect(screen.getByText("Input")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<InputNode {...createProps({ label: "User Query" })} />);
            expect(screen.getByText("User Query")).toBeInTheDocument();
        });
    });

    describe("Input Type Display", () => {
        it("shows default input type as text", () => {
            render(<InputNode {...createProps()} />);
            expect(screen.getByText("Type:")).toBeInTheDocument();
            expect(screen.getByText("text")).toBeInTheDocument();
        });

        it("shows custom input type", () => {
            render(<InputNode {...createProps({ inputType: "json" })} />);
            expect(screen.getByText("json")).toBeInTheDocument();
        });

        it("capitalizes input type display", () => {
            render(<InputNode {...createProps({ inputType: "number" })} />);
            const typeDisplay = screen.getByText("number");
            expect(typeDisplay).toHaveClass("capitalize");
        });
    });

    describe("Variable Name Display", () => {
        it("shows default variable name", () => {
            render(<InputNode {...createProps()} />);
            expect(screen.getByText("Variable:")).toBeInTheDocument();
            expect(screen.getByText("$userInput")).toBeInTheDocument();
        });

        it("shows custom variable name with $ prefix", () => {
            render(<InputNode {...createProps({ variableName: "query" })} />);
            expect(screen.getByText("$query")).toBeInTheDocument();
        });

        it("displays variable name in monospace font", () => {
            render(<InputNode {...createProps({ variableName: "myVar" })} />);
            const varDisplay = screen.getByText("$myVar");
            expect(varDisplay).toHaveClass("font-mono");
        });
    });

    describe("Handles", () => {
        it("does not render input handle (this is a start node)", () => {
            render(<InputNode {...createProps()} />);
            expect(screen.queryByTestId("handle-target-input")).not.toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<InputNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies inputs category styling", () => {
            const { container } = render(<InputNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-inputs-border");
        });
    });
});
