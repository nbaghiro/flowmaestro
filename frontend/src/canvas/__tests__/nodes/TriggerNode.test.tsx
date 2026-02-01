/**
 * TriggerNode component tests
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import TriggerNode from "../../nodes/TriggerNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-trigger-node-1",
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

// Mock @flowmaestro/shared
vi.mock("@flowmaestro/shared", () => ({
    getProviderLogo: (providerId: string) => `/logos/${providerId}.svg`
}));

interface TriggerNodeData {
    label: string;
    status?: NodeExecutionStatus;
    providerId?: string;
    providerName?: string;
    eventId?: string;
    eventName?: string;
}

describe("TriggerNode", () => {
    const createProps = (data: Partial<TriggerNodeData> = {}): NodeProps<TriggerNodeData> => ({
        id: "test-trigger-1",
        type: "trigger",
        data: {
            label: "Trigger",
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
        it("renders with default label when unconfigured", () => {
            render(<TriggerNode {...createProps()} />);
            expect(screen.getByText("Trigger")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<TriggerNode {...createProps({ label: "Webhook Trigger" })} />);
            expect(screen.getByText("Webhook Trigger")).toBeInTheDocument();
        });

        it("renders combined provider + event label when both configured", () => {
            render(
                <TriggerNode
                    {...createProps({
                        providerId: "github",
                        providerName: "GitHub",
                        eventId: "push",
                        eventName: "Push"
                    })}
                />
            );
            expect(screen.getByText("GitHub Push")).toBeInTheDocument();
        });
    });

    describe("Unconfigured State", () => {
        it("shows 'Select an integration...' when no provider", () => {
            render(<TriggerNode {...createProps()} />);
            expect(screen.getByText("Select an integration...")).toBeInTheDocument();
        });

        it("shows 'Select an integration...' when only label is set", () => {
            render(<TriggerNode {...createProps({ label: "My Trigger" })} />);
            expect(screen.getByText("Select an integration...")).toBeInTheDocument();
        });
    });

    describe("Provider Display", () => {
        it("shows provider name when configured", () => {
            render(
                <TriggerNode
                    {...createProps({
                        providerId: "slack",
                        providerName: "Slack"
                    })}
                />
            );
            expect(screen.getByText("Provider:")).toBeInTheDocument();
            expect(screen.getByText("Slack")).toBeInTheDocument();
        });

        it("shows provider logo", () => {
            render(
                <TriggerNode
                    {...createProps({
                        providerId: "github",
                        providerName: "GitHub"
                    })}
                />
            );
            const logo = screen.getByAltText("GitHub");
            expect(logo).toBeInTheDocument();
            expect(logo).toHaveAttribute("src", "/logos/github.svg");
        });

        it("shows fallback icon when logo fails to load", () => {
            render(
                <TriggerNode
                    {...createProps({
                        providerId: "custom",
                        providerName: "Custom Provider"
                    })}
                />
            );
            const logo = screen.getByAltText("Custom Provider");
            // Simulate image error
            fireEvent.error(logo);
            // Should now show fallback icon (Zap)
            expect(screen.queryByAltText("Custom Provider")).not.toBeInTheDocument();
        });
    });

    describe("Event Display", () => {
        it("shows event name when provider and event configured", () => {
            render(
                <TriggerNode
                    {...createProps({
                        providerId: "stripe",
                        providerName: "Stripe",
                        eventId: "payment_intent.succeeded",
                        eventName: "Payment Succeeded"
                    })}
                />
            );
            expect(screen.getByText("Event:")).toBeInTheDocument();
            expect(screen.getByText("Payment Succeeded")).toBeInTheDocument();
        });

        it("does not show event when only provider is set", () => {
            render(
                <TriggerNode
                    {...createProps({
                        providerId: "webhook",
                        providerName: "Webhook"
                    })}
                />
            );
            expect(screen.queryByText("Event:")).not.toBeInTheDocument();
        });

        it("does not show event when eventId is missing", () => {
            render(
                <TriggerNode
                    {...createProps({
                        providerId: "github",
                        providerName: "GitHub",
                        eventName: "Push" // eventName without eventId
                    })}
                />
            );
            expect(screen.queryByText("Event:")).not.toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("does not render input handle (trigger has no input)", () => {
            render(<TriggerNode {...createProps()} />);
            expect(screen.queryByTestId("handle-target-input")).not.toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<TriggerNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies inputs category styling", () => {
            const { container } = render(<TriggerNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-inputs-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<TriggerNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<TriggerNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Common Provider Configurations", () => {
        it("handles GitHub push event", () => {
            render(
                <TriggerNode
                    {...createProps({
                        providerId: "github",
                        providerName: "GitHub",
                        eventId: "push",
                        eventName: "Push"
                    })}
                />
            );
            expect(screen.getByText("GitHub Push")).toBeInTheDocument();
            expect(screen.getByText("Push")).toBeInTheDocument();
        });

        it("handles Slack message event", () => {
            render(
                <TriggerNode
                    {...createProps({
                        providerId: "slack",
                        providerName: "Slack",
                        eventId: "message",
                        eventName: "New Message"
                    })}
                />
            );
            expect(screen.getByText("Slack New Message")).toBeInTheDocument();
        });

        it("handles Stripe payment event", () => {
            render(
                <TriggerNode
                    {...createProps({
                        providerId: "stripe",
                        providerName: "Stripe",
                        eventId: "charge.succeeded",
                        eventName: "Charge Succeeded"
                    })}
                />
            );
            expect(screen.getByText("Stripe Charge Succeeded")).toBeInTheDocument();
        });

        it("handles webhook trigger", () => {
            render(
                <TriggerNode
                    {...createProps({
                        providerId: "webhook",
                        providerName: "Webhook",
                        eventId: "incoming",
                        eventName: "Incoming Request"
                    })}
                />
            );
            expect(screen.getByText("Webhook Incoming Request")).toBeInTheDocument();
        });

        it("handles scheduled trigger", () => {
            render(
                <TriggerNode
                    {...createProps({
                        providerId: "schedule",
                        providerName: "Schedule",
                        eventId: "cron",
                        eventName: "Every Hour"
                    })}
                />
            );
            expect(screen.getByText("Schedule Every Hour")).toBeInTheDocument();
        });
    });
});
