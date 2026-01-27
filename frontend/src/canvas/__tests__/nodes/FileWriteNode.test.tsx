/**
 * FileWriteNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FileWriteNode from "../../nodes/FileWriteNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-file-write-node-1",
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

interface FileWriteNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    path?: string;
    encoding?: string;
    createDirectories?: boolean;
    overwrite?: boolean;
}

describe("FileWriteNode", () => {
    const createProps = (data: Partial<FileWriteNodeData> = {}): NodeProps<FileWriteNodeData> => ({
        id: "test-file-write-1",
        type: "fileWrite",
        data: {
            label: "File Write",
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
            render(<FileWriteNode {...createProps()} />);
            expect(screen.getByText("File Write")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<FileWriteNode {...createProps({ label: "Save Output" })} />);
            expect(screen.getByText("Save Output")).toBeInTheDocument();
        });

        it("displays default encoding", () => {
            render(<FileWriteNode {...createProps()} />);
            expect(screen.getByText("Encoding:")).toBeInTheDocument();
            // CSS uppercase transforms display
            expect(screen.getByText("utf-8")).toBeInTheDocument();
        });

        it("displays custom encoding", () => {
            render(<FileWriteNode {...createProps({ encoding: "ascii" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("ascii")).toBeInTheDocument();
        });

        it("displays overwrite as Yes by default", () => {
            render(<FileWriteNode {...createProps()} />);
            expect(screen.getByText("Overwrite:")).toBeInTheDocument();
            expect(screen.getByText("Yes")).toBeInTheDocument();
        });

        it("displays overwrite as No when disabled", () => {
            render(<FileWriteNode {...createProps({ overwrite: false })} />);
            expect(screen.getByText("No")).toBeInTheDocument();
        });
    });

    describe("Encoding Display", () => {
        it("shows utf-8 with uppercase styling", () => {
            render(<FileWriteNode {...createProps({ encoding: "utf-8" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("utf-8")).toBeInTheDocument();
        });

        it("shows base64 with uppercase styling", () => {
            render(<FileWriteNode {...createProps({ encoding: "base64" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("base64")).toBeInTheDocument();
        });

        it("shows hex with uppercase styling", () => {
            render(<FileWriteNode {...createProps({ encoding: "hex" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("hex")).toBeInTheDocument();
        });
    });

    describe("Overwrite Display", () => {
        it("shows Yes when overwrite is true", () => {
            render(<FileWriteNode {...createProps({ overwrite: true })} />);
            expect(screen.getByText("Yes")).toBeInTheDocument();
        });

        it("shows No when overwrite is false", () => {
            render(<FileWriteNode {...createProps({ overwrite: false })} />);
            expect(screen.getByText("No")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<FileWriteNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<FileWriteNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies utils category styling", () => {
            const { container } = render(<FileWriteNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-utils-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<FileWriteNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<FileWriteNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("File Write")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<FileWriteNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("File Write")).toBeInTheDocument();
        });
    });
});
