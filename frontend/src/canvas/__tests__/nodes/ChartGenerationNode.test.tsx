/**
 * ChartGenerationNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import ChartGenerationNode from "../../nodes/ChartGenerationNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-chart-generation-node-1",
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

interface ChartGenerationNodeData {
    label: string;
    status?: NodeExecutionStatus;
    chartType?: string;
    theme?: string;
    filename?: string;
}

describe("ChartGenerationNode", () => {
    const createProps = (
        data: Partial<ChartGenerationNodeData> = {}
    ): NodeProps<ChartGenerationNodeData> => ({
        id: "test-chart-generation-1",
        type: "chartGeneration",
        data: {
            label: "Chart",
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
            render(<ChartGenerationNode {...createProps()} />);
            expect(screen.getByText("Chart")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<ChartGenerationNode {...createProps({ label: "Sales Chart" })} />);
            expect(screen.getByText("Sales Chart")).toBeInTheDocument();
        });

        it("displays default chart type as Bar", () => {
            render(<ChartGenerationNode {...createProps()} />);
            expect(screen.getByText("Type:")).toBeInTheDocument();
            expect(screen.getByText("Bar")).toBeInTheDocument();
        });

        it("displays custom chart type", () => {
            render(<ChartGenerationNode {...createProps({ chartType: "line" })} />);
            expect(screen.getByText("Line")).toBeInTheDocument();
        });

        it("displays default theme as light", () => {
            render(<ChartGenerationNode {...createProps()} />);
            expect(screen.getByText("Theme:")).toBeInTheDocument();
            // CSS capitalize transforms display
            expect(screen.getByText("light")).toBeInTheDocument();
        });

        it("displays dark theme", () => {
            render(<ChartGenerationNode {...createProps({ theme: "dark" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("dark")).toBeInTheDocument();
        });
    });

    describe("Chart Type Labels", () => {
        it("shows Bar for bar type", () => {
            render(<ChartGenerationNode {...createProps({ chartType: "bar" })} />);
            expect(screen.getByText("Bar")).toBeInTheDocument();
        });

        it("shows Line for line type", () => {
            render(<ChartGenerationNode {...createProps({ chartType: "line" })} />);
            expect(screen.getByText("Line")).toBeInTheDocument();
        });

        it("shows Pie for pie type", () => {
            render(<ChartGenerationNode {...createProps({ chartType: "pie" })} />);
            expect(screen.getByText("Pie")).toBeInTheDocument();
        });

        it("shows Scatter for scatter type", () => {
            render(<ChartGenerationNode {...createProps({ chartType: "scatter" })} />);
            expect(screen.getByText("Scatter")).toBeInTheDocument();
        });

        it("shows Area for area type", () => {
            render(<ChartGenerationNode {...createProps({ chartType: "area" })} />);
            expect(screen.getByText("Area")).toBeInTheDocument();
        });

        it("shows Donut for donut type", () => {
            render(<ChartGenerationNode {...createProps({ chartType: "donut" })} />);
            expect(screen.getByText("Donut")).toBeInTheDocument();
        });

        it("shows Histogram for histogram type", () => {
            render(<ChartGenerationNode {...createProps({ chartType: "histogram" })} />);
            expect(screen.getByText("Histogram")).toBeInTheDocument();
        });

        it("shows Heatmap for heatmap type", () => {
            render(<ChartGenerationNode {...createProps({ chartType: "heatmap" })} />);
            expect(screen.getByText("Heatmap")).toBeInTheDocument();
        });

        it("shows Horizontal Bar for horizontal_bar type", () => {
            render(<ChartGenerationNode {...createProps({ chartType: "horizontal_bar" })} />);
            expect(screen.getByText("Horizontal Bar")).toBeInTheDocument();
        });

        it("shows raw type for unknown chart types", () => {
            render(<ChartGenerationNode {...createProps({ chartType: "custom-chart" })} />);
            expect(screen.getByText("custom-chart")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<ChartGenerationNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<ChartGenerationNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies utils category styling", () => {
            const { container } = render(<ChartGenerationNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-utils-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<ChartGenerationNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<ChartGenerationNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Chart")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<ChartGenerationNode {...createProps({ status: "completed" })} />);
            expect(screen.getByText("Chart")).toBeInTheDocument();
        });
    });
});
