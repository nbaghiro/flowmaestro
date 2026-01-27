/**
 * WebSearchNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WebSearchNode from "../../nodes/WebSearchNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-web-search-node-1",
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

interface WebSearchNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    query?: string;
    maxResults?: number;
    searchType?: string;
}

describe("WebSearchNode", () => {
    const createProps = (data: Partial<WebSearchNodeData> = {}): NodeProps<WebSearchNodeData> => ({
        id: "test-web-search-1",
        type: "webSearch",
        data: {
            label: "Web Search",
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
            render(<WebSearchNode {...createProps()} />);
            expect(screen.getByText("Web Search")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<WebSearchNode {...createProps({ label: "Google Search" })} />);
            expect(screen.getByText("Google Search")).toBeInTheDocument();
        });

        it("displays default search type (general)", () => {
            render(<WebSearchNode {...createProps()} />);
            expect(screen.getByText("Type:")).toBeInTheDocument();
            expect(screen.getByText("General")).toBeInTheDocument();
        });

        it("displays news search type", () => {
            render(<WebSearchNode {...createProps({ searchType: "news" })} />);
            expect(screen.getByText("News")).toBeInTheDocument();
        });

        it("displays images search type", () => {
            render(<WebSearchNode {...createProps({ searchType: "images" })} />);
            expect(screen.getByText("Images")).toBeInTheDocument();
        });

        it("displays unknown search type as-is", () => {
            render(<WebSearchNode {...createProps({ searchType: "custom" })} />);
            expect(screen.getByText("custom")).toBeInTheDocument();
        });

        it("displays default max results", () => {
            render(<WebSearchNode {...createProps()} />);
            expect(screen.getByText("Max Results:")).toBeInTheDocument();
            expect(screen.getByText("5")).toBeInTheDocument();
        });

        it("displays custom max results", () => {
            render(<WebSearchNode {...createProps({ maxResults: 10 })} />);
            expect(screen.getByText("10")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<WebSearchNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<WebSearchNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies utils category styling", () => {
            const { container } = render(<WebSearchNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-utils-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<WebSearchNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<WebSearchNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<WebSearchNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Web Search")).toBeInTheDocument();
        });

        it("renders with running status", () => {
            render(<WebSearchNode {...createProps({ status: "running" })} />);
            expect(screen.getByText("Web Search")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<WebSearchNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("Web Search")).toBeInTheDocument();
        });

        it("renders with error status", () => {
            render(<WebSearchNode {...createProps({ status: "error" })} />);
            expect(screen.getByText("Web Search")).toBeInTheDocument();
        });
    });
});
