/**
 * FilesNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FilesNode from "../../nodes/FilesNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-files-node-1",
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

interface UploadedFile {
    name: string;
    type: string;
}

interface FilesNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    uploadedFiles?: UploadedFile[];
}

describe("FilesNode", () => {
    const createProps = (data: Partial<FilesNodeData> = {}): NodeProps<FilesNodeData> => ({
        id: "test-files-1",
        type: "files",
        data: {
            label: "Files",
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
            render(<FilesNode {...createProps()} />);
            expect(screen.getByText("Files")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<FilesNode {...createProps({ label: "Upload Documents" })} />);
            expect(screen.getByText("Upload Documents")).toBeInTheDocument();
        });

        it("displays file type", () => {
            render(<FilesNode {...createProps()} />);
            expect(screen.getByText("Type:")).toBeInTheDocument();
            expect(screen.getByText("File")).toBeInTheDocument();
        });

        it("displays dash when no files uploaded", () => {
            render(<FilesNode {...createProps()} />);
            expect(screen.getByText("Uploaded files:")).toBeInTheDocument();
            expect(screen.getByText("-")).toBeInTheDocument();
        });

        it("displays single uploaded file", () => {
            render(
                <FilesNode
                    {...createProps({
                        uploadedFiles: [{ name: "report.pdf", type: "pdf" }]
                    })}
                />
            );
            expect(screen.getByText("1 PDF")).toBeInTheDocument();
        });

        it("displays multiple files of same type", () => {
            render(
                <FilesNode
                    {...createProps({
                        uploadedFiles: [
                            { name: "report1.pdf", type: "pdf" },
                            { name: "report2.pdf", type: "pdf" }
                        ]
                    })}
                />
            );
            expect(screen.getByText("2 PDF")).toBeInTheDocument();
        });

        it("displays multiple files of different types", () => {
            render(
                <FilesNode
                    {...createProps({
                        uploadedFiles: [
                            { name: "report1.pdf", type: "pdf" },
                            { name: "report2.pdf", type: "pdf" },
                            { name: "data.xlsx", type: "xlsx" }
                        ]
                    })}
                />
            );
            expect(screen.getByText("2 PDF, 1 XLSX")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("does not render input handle (start node)", () => {
            render(<FilesNode {...createProps()} />);
            expect(screen.queryByTestId("handle-target-input")).not.toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<FilesNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies inputs category styling", () => {
            const { container } = render(<FilesNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-inputs-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<FilesNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<FilesNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<FilesNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Files")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<FilesNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("Files")).toBeInTheDocument();
        });
    });
});
