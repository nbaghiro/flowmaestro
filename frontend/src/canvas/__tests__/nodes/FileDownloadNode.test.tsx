/**
 * FileDownloadNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import FileDownloadNode from "../../nodes/FileDownloadNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-file-download-node-1",
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

interface FileDownloadNodeData {
    label: string;
    status?: NodeExecutionStatus;
    url?: string;
    filename?: string;
    maxSize?: number;
    timeout?: number;
}

describe("FileDownloadNode", () => {
    const createProps = (
        data: Partial<FileDownloadNodeData> = {}
    ): NodeProps<FileDownloadNodeData> => ({
        id: "test-file-download-1",
        type: "fileDownload",
        data: {
            label: "File Download",
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
            render(<FileDownloadNode {...createProps()} />);
            expect(screen.getByText("File Download")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<FileDownloadNode {...createProps({ label: "Download Asset" })} />);
            expect(screen.getByText("Download Asset")).toBeInTheDocument();
        });

        it("displays default max size", () => {
            render(<FileDownloadNode {...createProps()} />);
            expect(screen.getByText("Max Size:")).toBeInTheDocument();
            // Default is 50MB
            expect(screen.getByText(/50/)).toBeInTheDocument();
        });

        it("displays custom max size", () => {
            render(<FileDownloadNode {...createProps({ maxSize: 10485760 })} />);
            expect(screen.getByText("10 MB")).toBeInTheDocument();
        });

        it("displays default timeout", () => {
            render(<FileDownloadNode {...createProps()} />);
            expect(screen.getByText("Timeout:")).toBeInTheDocument();
            expect(screen.getByText("60s")).toBeInTheDocument();
        });

        it("displays custom timeout", () => {
            render(<FileDownloadNode {...createProps({ timeout: 120000 })} />);
            expect(screen.getByText("120s")).toBeInTheDocument();
        });
    });

    describe("Size Formatting", () => {
        it("formats bytes correctly", () => {
            render(<FileDownloadNode {...createProps({ maxSize: 500 })} />);
            expect(screen.getByText("500 B")).toBeInTheDocument();
        });

        it("formats kilobytes correctly", () => {
            render(<FileDownloadNode {...createProps({ maxSize: 1024 })} />);
            expect(screen.getByText("1 KB")).toBeInTheDocument();
        });

        it("formats megabytes correctly", () => {
            render(<FileDownloadNode {...createProps({ maxSize: 1048576 })} />);
            expect(screen.getByText("1 MB")).toBeInTheDocument();
        });

        it("formats gigabytes correctly", () => {
            render(<FileDownloadNode {...createProps({ maxSize: 1073741824 })} />);
            expect(screen.getByText("1 GB")).toBeInTheDocument();
        });

        it("uses default when maxSize is 0 (falsy)", () => {
            // When maxSize is 0, the component uses the default (50MB) because of || operator
            render(<FileDownloadNode {...createProps({ maxSize: 0 })} />);
            expect(screen.getByText(/50/)).toBeInTheDocument();
        });
    });

    describe("Timeout Formatting", () => {
        it("converts milliseconds to seconds", () => {
            render(<FileDownloadNode {...createProps({ timeout: 30000 })} />);
            expect(screen.getByText("30s")).toBeInTheDocument();
        });

        it("rounds seconds correctly", () => {
            render(<FileDownloadNode {...createProps({ timeout: 45500 })} />);
            expect(screen.getByText("46s")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<FileDownloadNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<FileDownloadNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies utils category styling", () => {
            const { container } = render(<FileDownloadNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-utils-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<FileDownloadNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<FileDownloadNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("File Download")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<FileDownloadNode {...createProps({ status: "completed" })} />);
            expect(screen.getByText("File Download")).toBeInTheDocument();
        });
    });
});
