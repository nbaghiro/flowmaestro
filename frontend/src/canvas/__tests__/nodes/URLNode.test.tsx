/**
 * URLNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import URLNode from "../../nodes/URLNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-url-node-1",
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

interface URLNodeData {
    label: string;
    status?: NodeExecutionStatus;
    urls?: string[];
}

describe("URLNode", () => {
    const createProps = (data: Partial<URLNodeData> = {}): NodeProps<URLNodeData> => ({
        id: "test-url-1",
        type: "url",
        data: {
            label: "URL",
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
            render(<URLNode {...createProps()} />);
            // "URL" appears in both label and type, so use getAllByText
            const urlTexts = screen.getAllByText("URL");
            expect(urlTexts.length).toBeGreaterThanOrEqual(1);
        });

        it("renders with custom label", () => {
            render(<URLNode {...createProps({ label: "Website Links" })} />);
            expect(screen.getByText("Website Links")).toBeInTheDocument();
        });

        it("displays URL type", () => {
            render(<URLNode {...createProps()} />);
            expect(screen.getByText("Type:")).toBeInTheDocument();
            // "URL" appears in both label and type
            const urlTexts = screen.getAllByText("URL");
            expect(urlTexts.length).toBe(2);
        });

        it("displays dash when no URLs provided", () => {
            render(<URLNode {...createProps()} />);
            expect(screen.getByText("URLs:")).toBeInTheDocument();
            expect(screen.getByText("-")).toBeInTheDocument();
        });

        it("displays single URL count", () => {
            render(
                <URLNode
                    {...createProps({
                        urls: ["https://example.com"]
                    })}
                />
            );
            expect(screen.getByText("1 URL")).toBeInTheDocument();
        });

        it("displays multiple URLs count with plural", () => {
            render(
                <URLNode
                    {...createProps({
                        urls: ["https://example.com", "https://example.org", "https://example.net"]
                    })}
                />
            );
            expect(screen.getByText("3 URLs")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("does not render input handle (start node)", () => {
            render(<URLNode {...createProps()} />);
            expect(screen.queryByTestId("handle-target-input")).not.toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<URLNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies inputs category styling", () => {
            const { container } = render(<URLNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-inputs-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<URLNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<URLNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<URLNode {...createProps({ status: "idle" })} />);
            const urlTexts = screen.getAllByText("URL");
            expect(urlTexts.length).toBeGreaterThanOrEqual(1);
        });

        it("renders with success status", () => {
            render(<URLNode {...createProps({ status: "completed" })} />);
            const urlTexts = screen.getAllByText("URL");
            expect(urlTexts.length).toBeGreaterThanOrEqual(1);
        });
    });
});
