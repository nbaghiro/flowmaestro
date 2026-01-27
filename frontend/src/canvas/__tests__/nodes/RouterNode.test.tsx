/**
 * RouterNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RouterNode from "../../nodes/RouterNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-router-node-1",
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

interface RouterNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    provider?: string;
    model?: string;
    prompt?: string;
    routes?: Array<{ value: string; label?: string; description?: string }>;
}

describe("RouterNode", () => {
    const createProps = (data: Partial<RouterNodeData> = {}): NodeProps<RouterNodeData> => ({
        id: "test-router-1",
        type: "router",
        data: {
            label: "Router",
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
            render(<RouterNode {...createProps()} />);
            expect(screen.getByText("Router")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<RouterNode {...createProps({ label: "Intent Classifier" })} />);
            expect(screen.getByText("Intent Classifier")).toBeInTheDocument();
        });

        it("displays default provider", () => {
            render(<RouterNode {...createProps()} />);
            expect(screen.getByText("Provider:")).toBeInTheDocument();
            expect(screen.getByText("OpenAI")).toBeInTheDocument();
        });

        it("displays custom provider", () => {
            render(<RouterNode {...createProps({ provider: "anthropic" })} />);
            expect(screen.getByText("anthropic")).toBeInTheDocument();
        });

        it("displays default model", () => {
            render(<RouterNode {...createProps()} />);
            expect(screen.getByText("Model:")).toBeInTheDocument();
            expect(screen.getByText("gpt-4")).toBeInTheDocument();
        });

        it("displays custom model", () => {
            render(<RouterNode {...createProps({ model: "gpt-4o-mini" })} />);
            expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument();
        });
    });

    describe("Route Display", () => {
        it("displays route count", () => {
            render(<RouterNode {...createProps()} />);
            expect(screen.getByText("Routes:")).toBeInTheDocument();
            // Default route count is 2
            expect(screen.getByText("2")).toBeInTheDocument();
        });

        it("displays correct route count with custom routes", () => {
            render(
                <RouterNode
                    {...createProps({
                        routes: [
                            { value: "technical", label: "Technical" },
                            { value: "general", label: "General" },
                            { value: "creative", label: "Creative" }
                        ]
                    })}
                />
            );
            expect(screen.getByText("3")).toBeInTheDocument();
        });

        it("displays route count for 5 routes", () => {
            render(
                <RouterNode
                    {...createProps({
                        routes: [
                            { value: "route1", label: "Route 1" },
                            { value: "route2", label: "Route 2" },
                            { value: "route3", label: "Route 3" },
                            { value: "route4", label: "Route 4" },
                            { value: "route5", label: "Route 5" }
                        ]
                    })}
                />
            );
            expect(screen.getByText("5")).toBeInTheDocument();
        });
    });

    describe("Prompt Preview", () => {
        it("shows 'No prompt configured' when no prompt", () => {
            render(<RouterNode {...createProps()} />);
            expect(screen.getByText("No prompt configured")).toBeInTheDocument();
        });

        it("shows full prompt when short", () => {
            render(<RouterNode {...createProps({ prompt: "Classify the request" })} />);
            expect(screen.getByText("Classify the request")).toBeInTheDocument();
        });

        it("truncates long prompts with ellipsis", () => {
            const longPrompt =
                "This is a very long prompt that exceeds forty characters and should be truncated";
            render(<RouterNode {...createProps({ prompt: longPrompt })} />);

            // Should show first 40 chars + ...
            expect(
                screen.getByText(/This is a very long prompt that exceeds.../)
            ).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<RouterNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-default")).toBeInTheDocument();
        });

        it("renders output handles for routes", () => {
            render(
                <RouterNode
                    {...createProps({
                        routes: [
                            { value: "technical", label: "Technical" },
                            { value: "general", label: "General" }
                        ]
                    })}
                />
            );
            expect(screen.getByTestId("handle-source-technical")).toBeInTheDocument();
            expect(screen.getByTestId("handle-source-general")).toBeInTheDocument();
        });

        it("renders handles for up to 5 routes", () => {
            render(
                <RouterNode
                    {...createProps({
                        routes: [
                            { value: "r1" },
                            { value: "r2" },
                            { value: "r3" },
                            { value: "r4" },
                            { value: "r5" },
                            { value: "r6" } // 6th route should be excluded from handles
                        ]
                    })}
                />
            );
            expect(screen.getByTestId("handle-source-r1")).toBeInTheDocument();
            expect(screen.getByTestId("handle-source-r5")).toBeInTheDocument();
            expect(screen.queryByTestId("handle-source-r6")).not.toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies AI category styling", () => {
            const { container } = render(<RouterNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-ai-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<RouterNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });
});
