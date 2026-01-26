/**
 * IntegrationNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import IntegrationNode from "../../nodes/IntegrationNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-integration-node-1",
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

interface IntegrationNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    provider?: string;
    operation?: string;
    logoUrl?: string;
}

describe("IntegrationNode", () => {
    const createProps = (
        data: Partial<IntegrationNodeData> = {}
    ): NodeProps<IntegrationNodeData> => ({
        id: "test-integration-1",
        type: "integration",
        data: {
            label: "Integration",
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
            render(<IntegrationNode {...createProps()} />);
            expect(screen.getByText("Integration")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<IntegrationNode {...createProps({ label: "Slack Notification" })} />);
            expect(screen.getByText("Slack Notification")).toBeInTheDocument();
        });
    });

    describe("Provider Display", () => {
        it("shows provider label", () => {
            render(<IntegrationNode {...createProps()} />);
            expect(screen.getByText("Provider:")).toBeInTheDocument();
        });

        it("shows dash when no provider set", () => {
            render(<IntegrationNode {...createProps()} />);
            expect(screen.getAllByText("—")).toHaveLength(2); // Provider and Operation both show dash
        });

        it("shows provider name", () => {
            render(<IntegrationNode {...createProps({ provider: "slack" })} />);
            expect(screen.getByText("slack")).toBeInTheDocument();
        });

        it("capitalizes provider name", () => {
            render(<IntegrationNode {...createProps({ provider: "gmail" })} />);
            const providerDisplay = screen.getByText("gmail");
            expect(providerDisplay).toHaveClass("capitalize");
        });
    });

    describe("Operation Display", () => {
        it("shows operation label", () => {
            render(<IntegrationNode {...createProps()} />);
            expect(screen.getByText("Operation:")).toBeInTheDocument();
        });

        it("shows dash when no operation set", () => {
            render(<IntegrationNode {...createProps({ provider: "slack" })} />);
            expect(screen.getByText("—")).toBeInTheDocument();
        });

        it("formats snake_case operation", () => {
            render(
                <IntegrationNode
                    {...createProps({ provider: "slack", operation: "send_message" })}
                />
            );
            expect(screen.getByText("Send message")).toBeInTheDocument();
        });

        it("formats camelCase operation", () => {
            render(
                <IntegrationNode {...createProps({ provider: "gmail", operation: "sendEmail" })} />
            );
            expect(screen.getByText("Send Email")).toBeInTheDocument();
        });

        it("handles mixed format operation", () => {
            render(
                <IntegrationNode
                    {...createProps({ provider: "test", operation: "get_user_info" })}
                />
            );
            expect(screen.getByText("Get user info")).toBeInTheDocument();
        });
    });

    describe("Logo Display", () => {
        it("passes logoUrl to BaseNode", () => {
            const { container } = render(
                <IntegrationNode {...createProps({ logoUrl: "/logos/slack.svg" })} />
            );
            const logo = container.querySelector('img[src="/logos/slack.svg"]');
            expect(logo).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<IntegrationNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<IntegrationNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies integrations category styling", () => {
            const { container } = render(<IntegrationNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-integrations-border");
        });
    });

    describe("Common Integrations", () => {
        const integrations = [
            { provider: "slack", operation: "send_message", expected: "Send message" },
            { provider: "gmail", operation: "send_email", expected: "Send email" },
            { provider: "github", operation: "create_issue", expected: "Create issue" },
            { provider: "notion", operation: "add_page", expected: "Add page" },
            { provider: "hubspot", operation: "create_contact", expected: "Create contact" }
        ];

        integrations.forEach(({ provider, operation, expected }) => {
            it(`correctly formats ${provider} ${operation}`, () => {
                render(<IntegrationNode {...createProps({ provider, operation })} />);
                expect(screen.getByText(provider)).toBeInTheDocument();
                expect(screen.getByText(expected)).toBeInTheDocument();
            });
        });
    });
});
