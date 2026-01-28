/**
 * PdfGenerationNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import PdfGenerationNode from "../../nodes/PdfGenerationNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-pdf-generation-node-1",
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

interface PdfGenerationNodeData {
    label: string;
    status?: NodeExecutionStatus;
    format?: string;
    pageSize?: string;
    orientation?: string;
    filename?: string;
}

describe("PdfGenerationNode", () => {
    const createProps = (
        data: Partial<PdfGenerationNodeData> = {}
    ): NodeProps<PdfGenerationNodeData> => ({
        id: "test-pdf-generation-1",
        type: "pdfGeneration",
        data: {
            label: "PDF",
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
            render(<PdfGenerationNode {...createProps()} />);
            expect(screen.getByText("PDF")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<PdfGenerationNode {...createProps({ label: "Generate Report" })} />);
            expect(screen.getByText("Generate Report")).toBeInTheDocument();
        });

        it("displays default format", () => {
            render(<PdfGenerationNode {...createProps()} />);
            expect(screen.getByText("Format:")).toBeInTheDocument();
            // CSS capitalize transforms display
            expect(screen.getByText("markdown")).toBeInTheDocument();
        });

        it("displays custom format", () => {
            render(<PdfGenerationNode {...createProps({ format: "html" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("html")).toBeInTheDocument();
        });

        it("displays default page size", () => {
            render(<PdfGenerationNode {...createProps()} />);
            expect(screen.getByText("Size:")).toBeInTheDocument();
            // CSS uppercase transforms display
            expect(screen.getByText("a4")).toBeInTheDocument();
        });

        it("displays custom page size", () => {
            render(<PdfGenerationNode {...createProps({ pageSize: "letter" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("letter")).toBeInTheDocument();
        });

        it("displays default orientation", () => {
            render(<PdfGenerationNode {...createProps()} />);
            expect(screen.getByText("Orientation:")).toBeInTheDocument();
            // CSS capitalize transforms display
            expect(screen.getByText("portrait")).toBeInTheDocument();
        });

        it("displays landscape orientation", () => {
            render(<PdfGenerationNode {...createProps({ orientation: "landscape" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("landscape")).toBeInTheDocument();
        });
    });

    describe("Format Display", () => {
        it("shows markdown format with capitalize styling", () => {
            render(<PdfGenerationNode {...createProps({ format: "markdown" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("markdown")).toBeInTheDocument();
        });

        it("shows html format with capitalize styling", () => {
            render(<PdfGenerationNode {...createProps({ format: "html" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("html")).toBeInTheDocument();
        });
    });

    describe("Page Size Display", () => {
        it("shows a4 with uppercase styling", () => {
            render(<PdfGenerationNode {...createProps({ pageSize: "a4" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("a4")).toBeInTheDocument();
        });

        it("shows letter with uppercase styling", () => {
            render(<PdfGenerationNode {...createProps({ pageSize: "letter" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("letter")).toBeInTheDocument();
        });

        it("shows legal with uppercase styling", () => {
            render(<PdfGenerationNode {...createProps({ pageSize: "legal" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("legal")).toBeInTheDocument();
        });
    });

    describe("Orientation Display", () => {
        it("shows portrait with capitalize styling", () => {
            render(<PdfGenerationNode {...createProps({ orientation: "portrait" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("portrait")).toBeInTheDocument();
        });

        it("shows landscape with capitalize styling", () => {
            render(<PdfGenerationNode {...createProps({ orientation: "landscape" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("landscape")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<PdfGenerationNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<PdfGenerationNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies utils category styling", () => {
            const { container } = render(<PdfGenerationNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-utils-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<PdfGenerationNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<PdfGenerationNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("PDF")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<PdfGenerationNode {...createProps({ status: "completed" })} />);
            expect(screen.getByText("PDF")).toBeInTheDocument();
        });
    });
});
