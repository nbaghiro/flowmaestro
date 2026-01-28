/**
 * LLMNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import LLMNode from "../../nodes/LLMNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-llm-node-1",
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

interface LLMNodeData {
    label: string;
    status?: NodeExecutionStatus;
    provider?: string;
    model?: string;
    prompt?: string;
}

describe("LLMNode", () => {
    const createProps = (data: Partial<LLMNodeData> = {}): NodeProps<LLMNodeData> => ({
        id: "test-llm-1",
        type: "llm",
        data: {
            label: "LLM",
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
            render(<LLMNode {...createProps()} />);
            expect(screen.getByText("LLM")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<LLMNode {...createProps({ label: "My AI Agent" })} />);
            expect(screen.getByText("My AI Agent")).toBeInTheDocument();
        });

        it("displays default provider", () => {
            render(<LLMNode {...createProps()} />);
            expect(screen.getByText("Provider:")).toBeInTheDocument();
            expect(screen.getByText("OpenAI")).toBeInTheDocument();
        });

        it("displays custom provider", () => {
            render(<LLMNode {...createProps({ provider: "anthropic" })} />);
            expect(screen.getByText("anthropic")).toBeInTheDocument();
        });

        it("displays default model", () => {
            render(<LLMNode {...createProps()} />);
            expect(screen.getByText("Model:")).toBeInTheDocument();
            expect(screen.getByText("gpt-4")).toBeInTheDocument();
        });

        it("displays custom model", () => {
            render(<LLMNode {...createProps({ model: "claude-3-opus" })} />);
            expect(screen.getByText("claude-3-opus")).toBeInTheDocument();
        });
    });

    describe("Prompt Preview", () => {
        it("shows 'No prompt configured' when no prompt", () => {
            render(<LLMNode {...createProps()} />);
            expect(screen.getByText("No prompt configured")).toBeInTheDocument();
        });

        it("shows full prompt when short", () => {
            render(<LLMNode {...createProps({ prompt: "Hello world" })} />);
            expect(screen.getByText("Hello world")).toBeInTheDocument();
        });

        it("truncates long prompts with ellipsis", () => {
            const longPrompt =
                "This is a very long prompt that exceeds fifty characters and should be truncated";
            render(<LLMNode {...createProps({ prompt: longPrompt })} />);

            // Should show first 50 chars + ...
            expect(
                screen.getByText(/This is a very long prompt that exceeds fifty cha.../)
            ).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<LLMNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<LLMNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies AI category styling", () => {
            const { container } = render(<LLMNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-ai-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<LLMNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });
});
