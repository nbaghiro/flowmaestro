/**
 * UserInputNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import UserInputNode from "../../nodes/UserInputNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-user-input-node-1",
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

interface UserInputNodeData {
    label: string;
    status?: NodeExecutionStatus;
    prompt?: string;
    variableName?: string;
    validationType?: string;
    required?: boolean;
}

describe("UserInputNode", () => {
    const createProps = (data: Partial<UserInputNodeData> = {}): NodeProps<UserInputNodeData> => ({
        id: "test-user-input-1",
        type: "userInput",
        data: {
            label: "User Input",
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
            render(<UserInputNode {...createProps()} />);
            expect(screen.getByText("User Input")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<UserInputNode {...createProps({ label: "Get Feedback" })} />);
            expect(screen.getByText("Get Feedback")).toBeInTheDocument();
        });

        it("displays default prompt", () => {
            render(<UserInputNode {...createProps()} />);
            expect(screen.getByText('"Enter your input"')).toBeInTheDocument();
        });

        it("displays custom prompt", () => {
            render(<UserInputNode {...createProps({ prompt: "What is your name?" })} />);
            expect(screen.getByText('"What is your name?"')).toBeInTheDocument();
        });

        it("displays default variable name", () => {
            render(<UserInputNode {...createProps()} />);
            expect(screen.getByText("Variable:")).toBeInTheDocument();
            expect(screen.getByText("{{userInput}}")).toBeInTheDocument();
        });

        it("displays custom variable name", () => {
            render(<UserInputNode {...createProps({ variableName: "userName" })} />);
            expect(screen.getByText("{{userName}}")).toBeInTheDocument();
        });

        it("displays default validation type", () => {
            render(<UserInputNode {...createProps()} />);
            expect(screen.getByText("Type:")).toBeInTheDocument();
            // CSS capitalize transforms display, raw text is lowercase
            expect(screen.getByText("text")).toBeInTheDocument();
        });

        it("displays custom validation type", () => {
            render(<UserInputNode {...createProps({ validationType: "number" })} />);
            // CSS capitalize transforms display, raw text is lowercase
            expect(screen.getByText("number")).toBeInTheDocument();
        });
    });

    describe("Prompt Display", () => {
        it("shows prompt in quotes", () => {
            render(<UserInputNode {...createProps({ prompt: "Enter email" })} />);
            expect(screen.getByText('"Enter email"')).toBeInTheDocument();
        });

        it("shows default prompt when not provided", () => {
            render(<UserInputNode {...createProps()} />);
            expect(screen.getByText('"Enter your input"')).toBeInTheDocument();
        });
    });

    describe("Variable Name Display", () => {
        it("shows variable with mustache syntax", () => {
            render(<UserInputNode {...createProps({ variableName: "email" })} />);
            expect(screen.getByText("{{email}}")).toBeInTheDocument();
        });

        it("shows default variable name", () => {
            render(<UserInputNode {...createProps()} />);
            expect(screen.getByText("{{userInput}}")).toBeInTheDocument();
        });
    });

    describe("Validation Type Display", () => {
        it("shows text type with capitalize styling", () => {
            render(<UserInputNode {...createProps({ validationType: "text" })} />);
            // CSS capitalize transforms display, raw text is lowercase
            expect(screen.getByText("text")).toBeInTheDocument();
        });

        it("shows number type with capitalize styling", () => {
            render(<UserInputNode {...createProps({ validationType: "number" })} />);
            // CSS capitalize transforms display, raw text is lowercase
            expect(screen.getByText("number")).toBeInTheDocument();
        });

        it("shows email type with capitalize styling", () => {
            render(<UserInputNode {...createProps({ validationType: "email" })} />);
            // CSS capitalize transforms display, raw text is lowercase
            expect(screen.getByText("email")).toBeInTheDocument();
        });

        it("shows boolean type with capitalize styling", () => {
            render(<UserInputNode {...createProps({ validationType: "boolean" })} />);
            // CSS capitalize transforms display, raw text is lowercase
            expect(screen.getByText("boolean")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<UserInputNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<UserInputNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies interaction category styling", () => {
            const { container } = render(<UserInputNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-interaction-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<UserInputNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<UserInputNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("User Input")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<UserInputNode {...createProps({ status: "completed" })} />);
            expect(screen.getByText("User Input")).toBeInTheDocument();
        });
    });
});
