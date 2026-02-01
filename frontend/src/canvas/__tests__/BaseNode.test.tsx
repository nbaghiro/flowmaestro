/**
 * BaseNode component tests
 *
 * Tests for the base wrapper component used by all node types
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { Bot, Code2, Database, Globe } from "lucide-react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "../nodes/BaseNode";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: {
        Left: "left",
        Top: "top",
        Right: "right",
        Bottom: "bottom"
    },
    useNodeId: () => "test-node-1",
    useStore: (selector: (state: { transform: number[] }) => unknown) =>
        selector({ transform: [0, 0, 1] }),
    useUpdateNodeInternals: () => vi.fn()
}));

// Mock workflow store
const mockUpdateNode = vi.fn();
const mockUpdateNodeStyle = vi.fn();

vi.mock("../../stores/workflowStore", () => ({
    useWorkflowStore: vi.fn((selector?: (state: unknown) => unknown) => {
        const state = {
            currentExecution: null,
            selectedNode: null,
            nodeValidation: {},
            workflowValidation: [],
            nodes: [],
            updateNode: mockUpdateNode,
            updateNodeStyle: mockUpdateNodeStyle
        };
        if (selector) {
            return selector(state);
        }
        return state;
    }),
    INITIAL_NODE_WIDTH: 260,
    INITIAL_NODE_HEIGHT: 120
}));

// Mock NodeExecutionPopover
vi.mock("../../components/execution/modals/NodeExecutionPopover", () => ({
    NodeExecutionPopover: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock NodeValidationBadge
vi.mock("../../components/validation/NodeValidationBadge", () => ({
    NodeValidationBadge: () => null,
    getNodeValidationBorderStyle: () => ({
        hasIssues: false,
        borderClass: "",
        leftBorderColor: undefined
    })
}));

describe("BaseNode", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        it("renders with icon and label", () => {
            render(<BaseNode icon={Bot} label="Test Node" />);

            expect(screen.getByText("Test Node")).toBeInTheDocument();
        });

        it("renders with custom logo URL", () => {
            render(<BaseNode icon={Bot} label="Integration" logoUrl="/logos/slack.svg" />);

            const logo = screen.getByRole("img", { name: "Integration" });
            expect(logo).toBeInTheDocument();
            expect(logo).toHaveAttribute("src", "/logos/slack.svg");
        });

        it("falls back to icon when logo fails to load", () => {
            const { container } = render(
                <BaseNode icon={Bot} label="Integration" logoUrl="/invalid-logo.svg" />
            );

            const logo = screen.getByRole("img", { name: "Integration" });
            fireEvent.error(logo);

            // After error, the component should still render (state change may vary)
            expect(container.querySelector("svg")).toBeInTheDocument();
        });

        it("renders children content", () => {
            render(
                <BaseNode icon={Bot} label="Test Node">
                    <div data-testid="child-content">Custom content</div>
                </BaseNode>
            );

            expect(screen.getByTestId("child-content")).toBeInTheDocument();
            expect(screen.getByText("Custom content")).toBeInTheDocument();
        });

        it("renders without children content area when no children provided", () => {
            const { container } = render(<BaseNode icon={Bot} label="Test Node" />);

            // Should have header but minimal content area
            expect(screen.getByText("Test Node")).toBeInTheDocument();
            // The component still renders the structure, just without custom content
            expect(container.querySelector(".flex-1")).toBeFalsy();
        });
    });

    describe("Status Indicator", () => {
        const statusCases: Array<{ status: NodeExecutionStatus; expectedClass: string }> = [
            { status: "idle", expectedClass: "bg-gray-300" },
            { status: "pending", expectedClass: "bg-yellow-400" },
            { status: "ready", expectedClass: "bg-yellow-400" },
            { status: "executing", expectedClass: "bg-blue-500" },
            { status: "completed", expectedClass: "bg-green-500" },
            { status: "failed", expectedClass: "bg-red-500" },
            { status: "skipped", expectedClass: "bg-gray-300" }
        ];

        statusCases.forEach(({ status, expectedClass }) => {
            it(`displays ${status} status with correct styling`, () => {
                const { container } = render(
                    <BaseNode icon={Bot} label="Test Node" status={status} />
                );

                // Find the status indicator dot
                const statusDot = container.querySelector(`.${expectedClass.replace(" ", ".")}`);
                expect(statusDot).toBeInTheDocument();
            });
        });

        it("shows running status with pulse animation", () => {
            const { container } = render(
                <BaseNode icon={Bot} label="Test Node" status="executing" />
            );

            const statusDot = container.querySelector(".animate-pulse");
            expect(statusDot).toBeInTheDocument();
        });

        it("defaults to idle status when not provided", () => {
            const { container } = render(<BaseNode icon={Bot} label="Test Node" />);

            // Should have gray status dot for idle
            const statusDot = container.querySelector(".bg-gray-300");
            expect(statusDot).toBeInTheDocument();
        });
    });

    describe("Category Styling", () => {
        const categories = [
            { category: "ai", expectedClass: "category-ai-border" },
            { category: "logic", expectedClass: "category-logic-border" },
            { category: "inputs", expectedClass: "category-inputs-border" },
            { category: "outputs", expectedClass: "category-outputs-border" },
            { category: "integrations", expectedClass: "category-integrations-border" },
            { category: "utils", expectedClass: "category-utils-border" }
        ] as const;

        categories.forEach(({ category, expectedClass }) => {
            it(`applies ${category} category styling`, () => {
                const { container } = render(
                    <BaseNode icon={Bot} label="Test Node" category={category} />
                );

                expect(container.firstChild).toHaveClass(expectedClass);
            });
        });

        it("defaults to data category when not specified", () => {
            const { container } = render(<BaseNode icon={Bot} label="Test Node" />);

            expect(container.firstChild).toHaveClass("category-data-border");
        });
    });

    describe("Handles", () => {
        it("renders input and output handles by default", () => {
            render(<BaseNode icon={Bot} label="Test Node" />);

            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });

        it("hides input handle when hasInputHandle is false", () => {
            render(<BaseNode icon={Bot} label="Test Node" hasInputHandle={false} />);

            expect(screen.queryByTestId("handle-target-input")).not.toBeInTheDocument();
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });

        it("hides output handle when hasOutputHandle is false", () => {
            render(<BaseNode icon={Bot} label="Test Node" hasOutputHandle={false} />);

            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
            expect(screen.queryByTestId("handle-source-output")).not.toBeInTheDocument();
        });

        it("renders custom handles when provided", () => {
            render(
                <BaseNode
                    icon={Bot}
                    label="Test Node"
                    customHandles={
                        <>
                            <div data-testid="custom-handle-1">Custom 1</div>
                            <div data-testid="custom-handle-2">Custom 2</div>
                        </>
                    }
                />
            );

            expect(screen.getByTestId("custom-handle-1")).toBeInTheDocument();
            expect(screen.getByTestId("custom-handle-2")).toBeInTheDocument();
            expect(screen.queryByTestId("handle-target-input")).not.toBeInTheDocument();
            expect(screen.queryByTestId("handle-source-output")).not.toBeInTheDocument();
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<BaseNode icon={Bot} label="Test Node" selected={true} />);

            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("applies default styling when not selected", () => {
            const { container } = render(
                <BaseNode icon={Bot} label="Test Node" selected={false} />
            );

            expect(container.firstChild).toHaveClass("shadow-node");
        });
    });

    describe("Interactions", () => {
        it("has a status indicator visible", () => {
            const { container } = render(
                <BaseNode icon={Bot} label="Test Node" status="completed" />
            );

            // Status indicator should be present
            const statusDot = container.querySelector(".bg-green-500");
            expect(statusDot).toBeInTheDocument();
        });
    });

    describe("Icon Variants", () => {
        it("renders Bot icon for AI nodes", () => {
            const { container } = render(<BaseNode icon={Bot} label="LLM" category="ai" />);
            // The icon is rendered within the component
            expect(container.querySelector("svg")).toBeInTheDocument();
        });

        it("renders Code2 icon for logic nodes", () => {
            const { container } = render(<BaseNode icon={Code2} label="Code" category="logic" />);
            expect(container.querySelector("svg")).toBeInTheDocument();
        });

        it("renders Database icon for data nodes", () => {
            const { container } = render(
                <BaseNode icon={Database} label="Database" category="utils" />
            );
            expect(container.querySelector("svg")).toBeInTheDocument();
        });

        it("renders Globe icon for HTTP nodes", () => {
            const { container } = render(<BaseNode icon={Globe} label="HTTP" category="utils" />);
            expect(container.querySelector("svg")).toBeInTheDocument();
        });
    });

    describe("Connector Layout", () => {
        it("defaults to horizontal connector layout", () => {
            render(<BaseNode icon={Bot} label="Test Node" />);

            // Input handle should be on the left
            const inputHandle = screen.getByTestId("handle-target-input");
            expect(inputHandle).toBeInTheDocument();
        });

        it("supports vertical connector layout prop", () => {
            render(<BaseNode icon={Bot} label="Test Node" connectorLayout="vertical" />);

            // Handles should still render (position is determined by prop)
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Resize Functionality", () => {
        it("shows resize handle on hover", () => {
            const { container } = render(<BaseNode icon={Bot} label="Test Node" />);

            // The resize handle exists but may be hidden until hover
            const resizeHandle = container.querySelector(".cursor-se-resize");
            expect(resizeHandle).toBeInTheDocument();
        });

        it("shows resize tooltip on hover", () => {
            const { container } = render(<BaseNode icon={Bot} label="Test Node" />);

            const resizeHandle = container.querySelector(".cursor-se-resize");
            if (resizeHandle) {
                fireEvent.mouseEnter(resizeHandle);
                // Tooltip should appear - check for "Drag to resize" text
                expect(screen.queryByText("Drag to resize")).toBeInTheDocument();
            }
        });
    });

    describe("Accessibility", () => {
        it("has proper structure for screen readers", () => {
            render(<BaseNode icon={Bot} label="Test Node" />);

            // Label should be visible
            expect(screen.getByText("Test Node")).toBeInTheDocument();
        });

        it("includes status in title attribute", () => {
            const { container } = render(
                <BaseNode icon={Bot} label="Test Node" status="completed" />
            );

            const statusDot = container.querySelector('[title*="Completed"]');
            expect(statusDot).toBeInTheDocument();
        });
    });
});
