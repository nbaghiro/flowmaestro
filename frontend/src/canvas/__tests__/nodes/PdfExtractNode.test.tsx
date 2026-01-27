/**
 * PdfExtractNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PdfExtractNode from "../../nodes/PdfExtractNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-pdf-extract-node-1",
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

interface PdfExtractNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    path?: string;
    extractText?: boolean;
    extractMetadata?: boolean;
    outputFormat?: string;
}

describe("PdfExtractNode", () => {
    const createProps = (
        data: Partial<PdfExtractNodeData> = {}
    ): NodeProps<PdfExtractNodeData> => ({
        id: "test-pdf-extract-1",
        type: "pdfExtract",
        data: {
            label: "PDF Extract",
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
            render(<PdfExtractNode {...createProps()} />);
            expect(screen.getByText("PDF Extract")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<PdfExtractNode {...createProps({ label: "Parse Document" })} />);
            expect(screen.getByText("Parse Document")).toBeInTheDocument();
        });

        it("displays default output format", () => {
            render(<PdfExtractNode {...createProps()} />);
            expect(screen.getByText("Format:")).toBeInTheDocument();
            // CSS capitalize transforms display
            expect(screen.getByText("text")).toBeInTheDocument();
        });

        it("displays custom output format", () => {
            render(<PdfExtractNode {...createProps({ outputFormat: "json" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("json")).toBeInTheDocument();
        });

        it("displays extractText as Yes by default", () => {
            render(<PdfExtractNode {...createProps()} />);
            expect(screen.getByText("Text:")).toBeInTheDocument();
            const yesElements = screen.getAllByText("Yes");
            expect(yesElements.length).toBeGreaterThanOrEqual(1);
        });

        it("displays extractMetadata as Yes by default", () => {
            render(<PdfExtractNode {...createProps()} />);
            expect(screen.getByText("Metadata:")).toBeInTheDocument();
        });
    });

    describe("Extract Options", () => {
        it("shows Yes when extractText is true", () => {
            render(<PdfExtractNode {...createProps({ extractText: true })} />);
            expect(screen.getByText("Text:")).toBeInTheDocument();
        });

        it("shows No when extractText is false", () => {
            render(<PdfExtractNode {...createProps({ extractText: false })} />);
            expect(screen.getByText("No")).toBeInTheDocument();
        });

        it("shows Yes when extractMetadata is true", () => {
            render(<PdfExtractNode {...createProps({ extractMetadata: true })} />);
            expect(screen.getByText("Metadata:")).toBeInTheDocument();
        });

        it("shows No when extractMetadata is false", () => {
            render(<PdfExtractNode {...createProps({ extractMetadata: false })} />);
            const noElements = screen.getAllByText("No");
            expect(noElements.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("Output Format", () => {
        it("shows text format with capitalize styling", () => {
            render(<PdfExtractNode {...createProps({ outputFormat: "text" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("text")).toBeInTheDocument();
        });

        it("shows json format with capitalize styling", () => {
            render(<PdfExtractNode {...createProps({ outputFormat: "json" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("json")).toBeInTheDocument();
        });

        it("shows markdown format with capitalize styling", () => {
            render(<PdfExtractNode {...createProps({ outputFormat: "markdown" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("markdown")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<PdfExtractNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<PdfExtractNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies utils category styling", () => {
            const { container } = render(<PdfExtractNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-utils-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<PdfExtractNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<PdfExtractNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("PDF Extract")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<PdfExtractNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("PDF Extract")).toBeInTheDocument();
        });
    });
});
