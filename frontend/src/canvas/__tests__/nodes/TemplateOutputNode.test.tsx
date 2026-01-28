/**
 * TemplateOutputNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import TemplateOutputNode from "../../nodes/TemplateOutputNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-template-output-node-1",
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

interface TemplateOutputNodeData {
    label: string;
    status?: NodeExecutionStatus;
    template?: string | Record<string, unknown>;
    outputFormat?: "markdown" | "html" | "json";
}

describe("TemplateOutputNode", () => {
    const createProps = (
        data: Partial<TemplateOutputNodeData> = {}
    ): NodeProps<TemplateOutputNodeData> => ({
        id: "test-template-output-1",
        type: "templateOutput",
        data: {
            label: "Template Output",
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
            render(<TemplateOutputNode {...createProps()} />);
            expect(screen.getByText("Template Output")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<TemplateOutputNode {...createProps({ label: "Report Generator" })} />);
            expect(screen.getByText("Report Generator")).toBeInTheDocument();
        });

        it("displays default format (markdown)", () => {
            render(<TemplateOutputNode {...createProps()} />);
            expect(screen.getByText("Format:")).toBeInTheDocument();
            // Text is lowercase in DOM, CSS applies uppercase styling
            expect(screen.getByText("markdown")).toBeInTheDocument();
        });

        it("displays html format", () => {
            render(<TemplateOutputNode {...createProps({ outputFormat: "html" })} />);
            expect(screen.getByText("html")).toBeInTheDocument();
        });

        it("displays json format", () => {
            render(<TemplateOutputNode {...createProps({ outputFormat: "json" })} />);
            expect(screen.getByText("json")).toBeInTheDocument();
        });

        it("displays default template placeholder", () => {
            render(<TemplateOutputNode {...createProps()} />);
            expect(screen.getByText("No template defined")).toBeInTheDocument();
        });

        it("displays short template", () => {
            render(<TemplateOutputNode {...createProps({ template: "Hello {{name}}" })} />);
            expect(screen.getByText("Hello {{name}}")).toBeInTheDocument();
        });

        it("truncates long template", () => {
            const longTemplate =
                "This is a very long template that exceeds sixty characters and should be truncated with ellipsis";
            render(<TemplateOutputNode {...createProps({ template: longTemplate })} />);
            // Template truncates at 60 chars + "..."
            expect(
                screen.getByText("This is a very long template that exceeds sixty characters a...")
            ).toBeInTheDocument();
        });

        it("handles object template", () => {
            render(
                <TemplateOutputNode
                    {...createProps({
                        template: { greeting: "Hello", name: "World" }
                    })}
                />
            );
            // Object gets JSON.stringified
            expect(screen.getByText(/greeting/)).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<TemplateOutputNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("does not render output handle (end node)", () => {
            render(<TemplateOutputNode {...createProps()} />);
            expect(screen.queryByTestId("handle-source-output")).not.toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies outputs category styling", () => {
            const { container } = render(<TemplateOutputNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-outputs-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<TemplateOutputNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<TemplateOutputNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<TemplateOutputNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Template Output")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<TemplateOutputNode {...createProps({ status: "completed" })} />);
            expect(screen.getByText("Template Output")).toBeInTheDocument();
        });
    });
});
