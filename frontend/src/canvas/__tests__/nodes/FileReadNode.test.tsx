/**
 * FileReadNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FileReadNode from "../../nodes/FileReadNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-file-read-node-1",
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

interface FileReadNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    path?: string;
    encoding?: string;
    maxSize?: number;
}

describe("FileReadNode", () => {
    const createProps = (data: Partial<FileReadNodeData> = {}): NodeProps<FileReadNodeData> => ({
        id: "test-file-read-1",
        type: "fileRead",
        data: {
            label: "File Read",
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
            render(<FileReadNode {...createProps()} />);
            expect(screen.getByText("File Read")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<FileReadNode {...createProps({ label: "Read Config" })} />);
            expect(screen.getByText("Read Config")).toBeInTheDocument();
        });

        it("displays default encoding", () => {
            render(<FileReadNode {...createProps()} />);
            expect(screen.getByText("Encoding:")).toBeInTheDocument();
            // CSS uppercase transforms display
            expect(screen.getByText("utf-8")).toBeInTheDocument();
        });

        it("displays custom encoding", () => {
            render(<FileReadNode {...createProps({ encoding: "ascii" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("ascii")).toBeInTheDocument();
        });

        it("displays default max size", () => {
            render(<FileReadNode {...createProps()} />);
            expect(screen.getByText("Max Size:")).toBeInTheDocument();
            expect(screen.getByText("976.6 KB")).toBeInTheDocument();
        });

        it("displays custom max size", () => {
            render(<FileReadNode {...createProps({ maxSize: 5242880 })} />);
            expect(screen.getByText("5 MB")).toBeInTheDocument();
        });
    });

    describe("Encoding Display", () => {
        it("shows utf-8 with uppercase styling", () => {
            render(<FileReadNode {...createProps({ encoding: "utf-8" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("utf-8")).toBeInTheDocument();
        });

        it("shows latin1 with uppercase styling", () => {
            render(<FileReadNode {...createProps({ encoding: "latin1" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("latin1")).toBeInTheDocument();
        });

        it("shows base64 with uppercase styling", () => {
            render(<FileReadNode {...createProps({ encoding: "base64" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("base64")).toBeInTheDocument();
        });
    });

    describe("Size Formatting", () => {
        it("formats bytes correctly", () => {
            render(<FileReadNode {...createProps({ maxSize: 500 })} />);
            expect(screen.getByText("500 B")).toBeInTheDocument();
        });

        it("formats kilobytes correctly", () => {
            render(<FileReadNode {...createProps({ maxSize: 1024 })} />);
            expect(screen.getByText("1 KB")).toBeInTheDocument();
        });

        it("formats megabytes correctly", () => {
            render(<FileReadNode {...createProps({ maxSize: 1048576 })} />);
            expect(screen.getByText("1 MB")).toBeInTheDocument();
        });

        it("uses default when maxSize is 0 (falsy)", () => {
            // When maxSize is 0, the component uses the default because of || operator
            render(<FileReadNode {...createProps({ maxSize: 0 })} />);
            // Default is 1000000 (976.6 KB)
            expect(screen.getByText(/976/)).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<FileReadNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<FileReadNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies utils category styling", () => {
            const { container } = render(<FileReadNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-utils-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<FileReadNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<FileReadNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("File Read")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<FileReadNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("File Read")).toBeInTheDocument();
        });
    });
});
