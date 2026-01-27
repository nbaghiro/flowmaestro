/**
 * SpreadsheetGenerationNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SpreadsheetGenerationNode from "../../nodes/SpreadsheetGenerationNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-spreadsheet-generation-node-1",
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

interface SpreadsheetGenerationNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    format?: "xlsx" | "csv";
    filename?: string;
}

describe("SpreadsheetGenerationNode", () => {
    const createProps = (
        data: Partial<SpreadsheetGenerationNodeData> = {}
    ): NodeProps<SpreadsheetGenerationNodeData> => ({
        id: "test-spreadsheet-generation-1",
        type: "spreadsheetGeneration",
        data: {
            label: "Spreadsheet",
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
            render(<SpreadsheetGenerationNode {...createProps()} />);
            expect(screen.getByText("Spreadsheet")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<SpreadsheetGenerationNode {...createProps({ label: "Export Data" })} />);
            expect(screen.getByText("Export Data")).toBeInTheDocument();
        });

        it("displays default format as XLSX", () => {
            render(<SpreadsheetGenerationNode {...createProps()} />);
            expect(screen.getByText("Format:")).toBeInTheDocument();
            // CSS uppercase transforms display
            expect(screen.getByText("xlsx")).toBeInTheDocument();
        });

        it("displays CSV format", () => {
            render(<SpreadsheetGenerationNode {...createProps({ format: "csv" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("csv")).toBeInTheDocument();
        });

        it("displays default filename", () => {
            render(<SpreadsheetGenerationNode {...createProps()} />);
            expect(screen.getByText("File:")).toBeInTheDocument();
            expect(screen.getByText("spreadsheet.xlsx")).toBeInTheDocument();
        });

        it("displays custom filename with extension", () => {
            render(<SpreadsheetGenerationNode {...createProps({ filename: "report" })} />);
            expect(screen.getByText("report.xlsx")).toBeInTheDocument();
        });
    });

    describe("Format Display", () => {
        it("shows xlsx with uppercase styling", () => {
            render(<SpreadsheetGenerationNode {...createProps({ format: "xlsx" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("xlsx")).toBeInTheDocument();
        });

        it("shows csv with uppercase styling", () => {
            render(<SpreadsheetGenerationNode {...createProps({ format: "csv" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("csv")).toBeInTheDocument();
        });
    });

    describe("Filename Display", () => {
        it("shows filename with xlsx extension", () => {
            render(
                <SpreadsheetGenerationNode {...createProps({ filename: "data", format: "xlsx" })} />
            );
            expect(screen.getByText("data.xlsx")).toBeInTheDocument();
        });

        it("shows filename with csv extension", () => {
            render(
                <SpreadsheetGenerationNode
                    {...createProps({ filename: "export", format: "csv" })}
                />
            );
            expect(screen.getByText("export.csv")).toBeInTheDocument();
        });

        it("shows default filename when not provided", () => {
            render(<SpreadsheetGenerationNode {...createProps()} />);
            expect(screen.getByText("spreadsheet.xlsx")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<SpreadsheetGenerationNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<SpreadsheetGenerationNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies utils category styling", () => {
            const { container } = render(<SpreadsheetGenerationNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-utils-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<SpreadsheetGenerationNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<SpreadsheetGenerationNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Spreadsheet")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<SpreadsheetGenerationNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("Spreadsheet")).toBeInTheDocument();
        });
    });
});
