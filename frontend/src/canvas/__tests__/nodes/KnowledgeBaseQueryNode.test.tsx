/**
 * KnowledgeBaseQueryNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import KnowledgeBaseQueryNode from "../../nodes/KnowledgeBaseQueryNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-kb-query-node-1",
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

interface KnowledgeBaseQueryNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    knowledgeBaseId?: string;
    knowledgeBaseName?: string;
    queryText?: string;
}

describe("KnowledgeBaseQueryNode", () => {
    const createProps = (
        data: Partial<KnowledgeBaseQueryNodeData> = {}
    ): NodeProps<KnowledgeBaseQueryNodeData> => ({
        id: "test-kb-query-1",
        type: "knowledgeBaseQuery",
        data: {
            label: "KB Query",
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
            render(<KnowledgeBaseQueryNode {...createProps()} />);
            expect(screen.getByText("KB Query")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<KnowledgeBaseQueryNode {...createProps({ label: "Document Search" })} />);
            expect(screen.getByText("Document Search")).toBeInTheDocument();
        });

        it("displays default knowledge base placeholder", () => {
            render(<KnowledgeBaseQueryNode {...createProps()} />);
            expect(screen.getByText("Knowledge Base:")).toBeInTheDocument();
            expect(screen.getByText("No KB selected")).toBeInTheDocument();
        });

        it("displays custom knowledge base name", () => {
            render(
                <KnowledgeBaseQueryNode
                    {...createProps({ knowledgeBaseName: "Product Documentation" })}
                />
            );
            expect(screen.getByText("Product Documentation")).toBeInTheDocument();
        });

        it("displays default query placeholder", () => {
            render(<KnowledgeBaseQueryNode {...createProps()} />);
            expect(screen.getByText("Query:")).toBeInTheDocument();
            expect(screen.getByText("No query set")).toBeInTheDocument();
        });

        it("displays query text", () => {
            render(
                <KnowledgeBaseQueryNode {...createProps({ queryText: "How to reset password?" })} />
            );
            expect(screen.getByText("How to reset password?")).toBeInTheDocument();
        });

        it("truncates long query text", () => {
            const longQuery = "This is a very long query text that exceeds thirty characters";
            render(<KnowledgeBaseQueryNode {...createProps({ queryText: longQuery })} />);
            expect(screen.getByText("This is a very long query text...")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<KnowledgeBaseQueryNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<KnowledgeBaseQueryNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies data category styling", () => {
            const { container } = render(<KnowledgeBaseQueryNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-data-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<KnowledgeBaseQueryNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<KnowledgeBaseQueryNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<KnowledgeBaseQueryNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("KB Query")).toBeInTheDocument();
        });

        it("renders with running status", () => {
            render(<KnowledgeBaseQueryNode {...createProps({ status: "running" })} />);
            expect(screen.getByText("KB Query")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<KnowledgeBaseQueryNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("KB Query")).toBeInTheDocument();
        });

        it("renders with error status", () => {
            render(<KnowledgeBaseQueryNode {...createProps({ status: "error" })} />);
            expect(screen.getByText("KB Query")).toBeInTheDocument();
        });
    });
});
