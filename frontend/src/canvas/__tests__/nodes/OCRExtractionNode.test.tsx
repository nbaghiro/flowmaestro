/**
 * OCRExtractionNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OCRExtractionNode from "../../nodes/OCRExtractionNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-ocr-extraction-node-1",
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

interface OCRExtractionNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    languages?: string[];
    outputFormat?: string;
    confidenceThreshold?: number;
}

describe("OCRExtractionNode", () => {
    const createProps = (
        data: Partial<OCRExtractionNodeData> = {}
    ): NodeProps<OCRExtractionNodeData> => ({
        id: "test-ocr-extraction-1",
        type: "ocrExtraction",
        data: {
            label: "OCR",
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
            render(<OCRExtractionNode {...createProps()} />);
            expect(screen.getByText("OCR")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<OCRExtractionNode {...createProps({ label: "Extract Text" })} />);
            expect(screen.getByText("Extract Text")).toBeInTheDocument();
        });

        it("displays default language", () => {
            render(<OCRExtractionNode {...createProps()} />);
            expect(screen.getByText("Language:")).toBeInTheDocument();
            expect(screen.getByText("English")).toBeInTheDocument();
        });

        it("displays custom language", () => {
            render(<OCRExtractionNode {...createProps({ languages: ["spa"] })} />);
            expect(screen.getByText("Spanish")).toBeInTheDocument();
        });

        it("displays default output format", () => {
            render(<OCRExtractionNode {...createProps()} />);
            expect(screen.getByText("Output:")).toBeInTheDocument();
            // CSS capitalize transforms display
            expect(screen.getByText("text")).toBeInTheDocument();
        });

        it("displays custom output format", () => {
            render(<OCRExtractionNode {...createProps({ outputFormat: "json" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("json")).toBeInTheDocument();
        });
    });

    describe("Language Labels", () => {
        it("shows English for eng", () => {
            render(<OCRExtractionNode {...createProps({ languages: ["eng"] })} />);
            expect(screen.getByText("English")).toBeInTheDocument();
        });

        it("shows Spanish for spa", () => {
            render(<OCRExtractionNode {...createProps({ languages: ["spa"] })} />);
            expect(screen.getByText("Spanish")).toBeInTheDocument();
        });

        it("shows French for fra", () => {
            render(<OCRExtractionNode {...createProps({ languages: ["fra"] })} />);
            expect(screen.getByText("French")).toBeInTheDocument();
        });

        it("shows German for deu", () => {
            render(<OCRExtractionNode {...createProps({ languages: ["deu"] })} />);
            expect(screen.getByText("German")).toBeInTheDocument();
        });

        it("shows Japanese for jpn", () => {
            render(<OCRExtractionNode {...createProps({ languages: ["jpn"] })} />);
            expect(screen.getByText("Japanese")).toBeInTheDocument();
        });

        it("shows Chinese (Simplified) for chi_sim", () => {
            render(<OCRExtractionNode {...createProps({ languages: ["chi_sim"] })} />);
            expect(screen.getByText("Chinese (Simplified)")).toBeInTheDocument();
        });

        it("shows raw code for unknown languages", () => {
            render(<OCRExtractionNode {...createProps({ languages: ["xyz"] })} />);
            expect(screen.getByText("xyz")).toBeInTheDocument();
        });
    });

    describe("Multiple Languages", () => {
        it("shows count for multiple languages", () => {
            render(<OCRExtractionNode {...createProps({ languages: ["eng", "spa", "fra"] })} />);
            expect(screen.getByText("English +2")).toBeInTheDocument();
        });

        it("shows count for two languages", () => {
            render(<OCRExtractionNode {...createProps({ languages: ["jpn", "kor"] })} />);
            expect(screen.getByText("Japanese +1")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<OCRExtractionNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<OCRExtractionNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies AI category styling", () => {
            const { container } = render(<OCRExtractionNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-ai-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<OCRExtractionNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<OCRExtractionNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("OCR")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<OCRExtractionNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("OCR")).toBeInTheDocument();
        });
    });
});
