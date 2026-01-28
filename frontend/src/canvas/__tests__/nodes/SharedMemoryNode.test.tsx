/**
 * SharedMemoryNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import SharedMemoryNode from "../../nodes/SharedMemoryNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-shared-memory-node-1",
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

interface SharedMemoryNodeData {
    label: string;
    status?: NodeExecutionStatus;
    operation?: "store" | "search";
    key?: string;
    value?: string;
    searchQuery?: string;
    enableSemanticSearch?: boolean;
}

describe("SharedMemoryNode", () => {
    const createProps = (
        data: Partial<SharedMemoryNodeData> = {}
    ): NodeProps<SharedMemoryNodeData> => ({
        id: "test-shared-memory-1",
        type: "sharedMemory",
        data: {
            label: "Shared Memory",
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
            render(<SharedMemoryNode {...createProps()} />);
            expect(screen.getByText("Shared Memory")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<SharedMemoryNode {...createProps({ label: "Cache Storage" })} />);
            expect(screen.getByText("Cache Storage")).toBeInTheDocument();
        });

        it("displays default operation as Store", () => {
            render(<SharedMemoryNode {...createProps()} />);
            expect(screen.getByText("Operation:")).toBeInTheDocument();
            // CSS capitalize transforms display
            expect(screen.getByText("store")).toBeInTheDocument();
        });

        it("displays Search operation", () => {
            render(<SharedMemoryNode {...createProps({ operation: "search" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("search")).toBeInTheDocument();
        });
    });

    describe("Store Operation", () => {
        it("shows Key field", () => {
            render(<SharedMemoryNode {...createProps({ operation: "store" })} />);
            expect(screen.getByText("Key:")).toBeInTheDocument();
        });

        it("shows dash when no key", () => {
            render(<SharedMemoryNode {...createProps({ operation: "store" })} />);
            // Multiple dashes may be present for empty key and value
            const dashes = screen.getAllByText("-");
            expect(dashes.length).toBeGreaterThan(0);
        });

        it("shows key value when provided", () => {
            render(<SharedMemoryNode {...createProps({ operation: "store", key: "userData" })} />);
            expect(screen.getByText("userData")).toBeInTheDocument();
        });

        it("shows Value field", () => {
            render(<SharedMemoryNode {...createProps({ operation: "store" })} />);
            expect(screen.getByText("Value:")).toBeInTheDocument();
        });

        it("shows value when provided", () => {
            render(
                <SharedMemoryNode {...createProps({ operation: "store", value: "test value" })} />
            );
            expect(screen.getByText("test value")).toBeInTheDocument();
        });

        it("shows Searchable field", () => {
            render(<SharedMemoryNode {...createProps({ operation: "store" })} />);
            expect(screen.getByText("Searchable:")).toBeInTheDocument();
        });

        it("shows No when semantic search is disabled", () => {
            render(
                <SharedMemoryNode
                    {...createProps({ operation: "store", enableSemanticSearch: false })}
                />
            );
            expect(screen.getByText("No")).toBeInTheDocument();
        });

        it("shows Yes when semantic search is enabled", () => {
            render(
                <SharedMemoryNode
                    {...createProps({ operation: "store", enableSemanticSearch: true })}
                />
            );
            expect(screen.getByText("Yes")).toBeInTheDocument();
        });
    });

    describe("Search Operation", () => {
        it("shows Query field", () => {
            render(<SharedMemoryNode {...createProps({ operation: "search" })} />);
            expect(screen.getByText("Query:")).toBeInTheDocument();
        });

        it("shows dash when no query", () => {
            render(<SharedMemoryNode {...createProps({ operation: "search" })} />);
            expect(screen.getByText("-")).toBeInTheDocument();
        });

        it("shows query when provided", () => {
            render(
                <SharedMemoryNode
                    {...createProps({ operation: "search", searchQuery: "find users" })}
                />
            );
            expect(screen.getByText("find users")).toBeInTheDocument();
        });

        it("does not show Key field in search mode", () => {
            render(<SharedMemoryNode {...createProps({ operation: "search" })} />);
            expect(screen.queryByText("Key:")).not.toBeInTheDocument();
        });

        it("does not show Value field in search mode", () => {
            render(<SharedMemoryNode {...createProps({ operation: "search" })} />);
            expect(screen.queryByText("Value:")).not.toBeInTheDocument();
        });

        it("does not show Searchable field in search mode", () => {
            render(<SharedMemoryNode {...createProps({ operation: "search" })} />);
            expect(screen.queryByText("Searchable:")).not.toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<SharedMemoryNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<SharedMemoryNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies AI category styling", () => {
            const { container } = render(<SharedMemoryNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-ai-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<SharedMemoryNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<SharedMemoryNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Shared Memory")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<SharedMemoryNode {...createProps({ status: "completed" })} />);
            expect(screen.getByText("Shared Memory")).toBeInTheDocument();
        });
    });
});
