/**
 * WebBrowseNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WebBrowseNode from "../../nodes/WebBrowseNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-web-browse-node-1",
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

interface WebBrowseNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    url?: string;
    extractText?: boolean;
    maxLength?: number;
}

describe("WebBrowseNode", () => {
    const createProps = (data: Partial<WebBrowseNodeData> = {}): NodeProps<WebBrowseNodeData> => ({
        id: "test-web-browse-1",
        type: "webBrowse",
        data: {
            label: "Web Browse",
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
            render(<WebBrowseNode {...createProps()} />);
            expect(screen.getByText("Web Browse")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<WebBrowseNode {...createProps({ label: "Fetch Page" })} />);
            expect(screen.getByText("Fetch Page")).toBeInTheDocument();
        });

        it("displays extract text as Yes by default", () => {
            render(<WebBrowseNode {...createProps()} />);
            expect(screen.getByText("Extract Text:")).toBeInTheDocument();
            expect(screen.getByText("Yes")).toBeInTheDocument();
        });

        it("displays extract text as No when disabled", () => {
            render(<WebBrowseNode {...createProps({ extractText: false })} />);
            expect(screen.getByText("No")).toBeInTheDocument();
        });

        it("displays default max length", () => {
            render(<WebBrowseNode {...createProps()} />);
            expect(screen.getByText("Max Length:")).toBeInTheDocument();
            expect(screen.getByText("10,000")).toBeInTheDocument();
        });

        it("displays custom max length", () => {
            render(<WebBrowseNode {...createProps({ maxLength: 50000 })} />);
            expect(screen.getByText("50,000")).toBeInTheDocument();
        });
    });

    describe("Extract Text Display", () => {
        it("shows Yes when extractText is true", () => {
            render(<WebBrowseNode {...createProps({ extractText: true })} />);
            expect(screen.getByText("Yes")).toBeInTheDocument();
        });

        it("shows No when extractText is false", () => {
            render(<WebBrowseNode {...createProps({ extractText: false })} />);
            expect(screen.getByText("No")).toBeInTheDocument();
        });
    });

    describe("Max Length Display", () => {
        it("formats max length with locale string", () => {
            render(<WebBrowseNode {...createProps({ maxLength: 10000 })} />);
            expect(screen.getByText("10,000")).toBeInTheDocument();
        });

        it("formats large max length", () => {
            render(<WebBrowseNode {...createProps({ maxLength: 100000 })} />);
            expect(screen.getByText("100,000")).toBeInTheDocument();
        });

        it("formats small max length", () => {
            render(<WebBrowseNode {...createProps({ maxLength: 500 })} />);
            expect(screen.getByText("500")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<WebBrowseNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<WebBrowseNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies utils category styling", () => {
            const { container } = render(<WebBrowseNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-utils-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<WebBrowseNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<WebBrowseNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Web Browse")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<WebBrowseNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("Web Browse")).toBeInTheDocument();
        });
    });
});
