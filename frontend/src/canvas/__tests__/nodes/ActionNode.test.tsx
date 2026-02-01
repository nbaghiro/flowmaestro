/**
 * ActionNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import ActionNode from "../../nodes/ActionNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-action-node-1",
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

// Mock ALL_PROVIDERS from shared (NodeExecutionStatus is not mocked - use real type)
vi.mock("@flowmaestro/shared", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@flowmaestro/shared")>();
    return {
        ...actual,
        ALL_PROVIDERS: [
            {
                provider: "slack",
                displayName: "Slack",
                logoUrl: "https://example.com/slack-logo.png"
            },
            {
                provider: "github",
                displayName: "GitHub",
                logoUrl: "https://example.com/github-logo.png"
            },
            {
                provider: "hubspot",
                displayName: "HubSpot",
                logoUrl: "https://example.com/hubspot-logo.png"
            }
        ]
    };
});

interface ActionNodeData {
    label: string;
    status?: NodeExecutionStatus;
    provider?: string;
    providerName?: string;
    operation?: string;
    operationName?: string;
}

describe("ActionNode", () => {
    const createProps = (data: Partial<ActionNodeData> = {}): NodeProps<ActionNodeData> => ({
        id: "test-action-1",
        type: "action",
        data: {
            label: "Action",
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
        it("renders with default label when no provider set", () => {
            render(<ActionNode {...createProps()} />);
            expect(screen.getByText("Action")).toBeInTheDocument();
        });

        it("renders with custom label when no provider set", () => {
            render(<ActionNode {...createProps({ label: "Custom Action" })} />);
            expect(screen.getByText("Custom Action")).toBeInTheDocument();
        });

        it("displays select integration message when no provider", () => {
            render(<ActionNode {...createProps()} />);
            expect(screen.getByText("Select an integration...")).toBeInTheDocument();
        });

        it("displays provider name when provider is set", () => {
            render(
                <ActionNode
                    {...createProps({
                        provider: "slack",
                        operation: "send_message"
                    })}
                />
            );
            expect(screen.getByText("Provider:")).toBeInTheDocument();
            expect(screen.getByText("Slack")).toBeInTheDocument();
        });

        it("displays custom provider name", () => {
            render(
                <ActionNode
                    {...createProps({
                        provider: "slack",
                        providerName: "Slack Workspace",
                        operation: "send_message"
                    })}
                />
            );
            expect(screen.getByText("Slack Workspace")).toBeInTheDocument();
        });

        it("displays formatted operation name from snake_case", () => {
            render(
                <ActionNode
                    {...createProps({
                        provider: "slack",
                        operation: "send_message"
                    })}
                />
            );
            expect(screen.getByText("Action:")).toBeInTheDocument();
            expect(screen.getByText("Send message")).toBeInTheDocument();
        });

        it("displays formatted operation name from camelCase", () => {
            render(
                <ActionNode
                    {...createProps({
                        provider: "github",
                        operation: "createPullRequest"
                    })}
                />
            );
            expect(screen.getByText("Create Pull Request")).toBeInTheDocument();
        });

        it("displays custom operation name when provided", () => {
            render(
                <ActionNode
                    {...createProps({
                        provider: "slack",
                        operation: "send_message",
                        operationName: "Post Message"
                    })}
                />
            );
            expect(screen.getByText("Post Message")).toBeInTheDocument();
        });

        it("generates combined label from provider and operation", () => {
            render(
                <ActionNode
                    {...createProps({
                        provider: "slack",
                        operation: "send_message"
                    })}
                />
            );
            // The label becomes "Slack Send message"
            expect(screen.getByText("Slack Send message")).toBeInTheDocument();
        });
    });

    describe("Provider Logo", () => {
        it("renders provider logo when available", () => {
            render(
                <ActionNode
                    {...createProps({
                        provider: "slack",
                        operation: "send_message"
                    })}
                />
            );
            const img = screen.getByRole("img");
            expect(img).toHaveAttribute("alt", "Slack");
            expect(img).toHaveAttribute("src", "https://example.com/slack-logo.png");
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<ActionNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("does NOT render output handle (action nodes are terminal)", () => {
            render(<ActionNode {...createProps()} />);
            expect(screen.queryByTestId("handle-source-output")).not.toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies outputs category styling", () => {
            const { container } = render(<ActionNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-outputs-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<ActionNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<ActionNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<ActionNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Action")).toBeInTheDocument();
        });

        it("renders with running status", () => {
            render(<ActionNode {...createProps({ status: "executing" })} />);
            expect(screen.getByText("Action")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<ActionNode {...createProps({ status: "completed" })} />);
            expect(screen.getByText("Action")).toBeInTheDocument();
        });

        it("renders with error status", () => {
            render(<ActionNode {...createProps({ status: "failed" })} />);
            expect(screen.getByText("Action")).toBeInTheDocument();
        });
    });
});
