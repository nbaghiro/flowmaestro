/**
 * CommentNode component tests
 *
 * CommentNode is a special node that doesn't use BaseNode.
 * It provides rich text editing, resizing, and color customization.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CommentNode from "../../nodes/CommentNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-comment-node-1",
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

// Mock theme store
vi.mock("../../../stores/themeStore", () => ({
    useThemeStore: vi.fn((selector?: (state: { effectiveTheme: string }) => unknown) => {
        const state = { effectiveTheme: "light" };
        return selector ? selector(state) : state;
    })
}));

// Mock CommentNodeToolbar
vi.mock("../../../components/comment/CommentNodeToolbar", () => ({
    default: () => <div data-testid="comment-toolbar" />
}));

// Mock ContentArea
vi.mock("../../../components/comment/ContentArea", () => ({
    default: ({
        content,
        isEditing,
        onStartEditing
    }: {
        nodeId: string;
        content: string;
        textColor: string;
        isEditing: boolean;
        onStopEditing: () => void;
        onSelectionChange: (range: Range | null) => void;
        onStartEditing: () => void;
    }) => (
        <div data-testid="content-area" data-editing={isEditing} onClick={onStartEditing}>
            {content || "Add notes..."}
        </div>
    )
}));

interface CommentNodeData {
    content?: string;
    backgroundColor?: string;
    textColor?: string;
    darkBackgroundColor?: string;
    darkTextColor?: string;
}

describe("CommentNode", () => {
    const createProps = (data: Partial<CommentNodeData> = {}): NodeProps<CommentNodeData> => ({
        id: "test-comment-1",
        type: "comment",
        data: {
            content: "",
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
        it("renders the comment node", () => {
            const { container } = render(<CommentNode {...createProps()} />);
            expect(container.firstChild).toBeInTheDocument();
        });

        it("renders content area", () => {
            render(<CommentNode {...createProps()} />);
            expect(screen.getByTestId("content-area")).toBeInTheDocument();
        });

        it("displays content when provided", () => {
            render(<CommentNode {...createProps({ content: "My note content" })} />);
            expect(screen.getByText("My note content")).toBeInTheDocument();
        });

        it("displays placeholder when no content", () => {
            render(<CommentNode {...createProps()} />);
            expect(screen.getByText("Add notes...")).toBeInTheDocument();
        });
    });

    describe("Selection State", () => {
        it("applies ring styling when selected", () => {
            const { container } = render(<CommentNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("ring-2");
            expect(container.firstChild).toHaveClass("ring-blue-500");
        });

        it("does not have ring when not selected", () => {
            const { container } = render(<CommentNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("ring-2");
        });
    });

    describe("Background Colors", () => {
        it("applies default light background color", () => {
            const { container } = render(<CommentNode {...createProps()} />);
            expect(container.firstChild).toHaveStyle({ backgroundColor: "#FEF3C7" });
        });

        it("applies custom background color", () => {
            const { container } = render(
                <CommentNode {...createProps({ backgroundColor: "#E0F2FE" })} />
            );
            expect(container.firstChild).toHaveStyle({ backgroundColor: "#E0F2FE" });
        });
    });

    describe("Text Colors", () => {
        it("applies default light text color", () => {
            const { container } = render(<CommentNode {...createProps()} />);
            expect(container.firstChild).toHaveStyle({ color: "#1F2937" });
        });

        it("applies custom text color", () => {
            const { container } = render(
                <CommentNode {...createProps({ textColor: "#DC2626" })} />
            );
            expect(container.firstChild).toHaveStyle({ color: "#DC2626" });
        });
    });

    describe("Editing Mode", () => {
        it("shows toolbar when selected and editing", async () => {
            render(<CommentNode {...createProps()} selected />);

            // Trigger editing mode by double-clicking
            const node = screen.getByTestId("content-area").closest("div[data-id]");
            if (node) {
                fireEvent.doubleClick(node);
            }

            // After double-click, toolbar should be visible
            expect(screen.getByTestId("comment-toolbar")).toBeInTheDocument();
        });

        it("does not show toolbar when not selected", () => {
            render(<CommentNode {...createProps()} />);
            expect(screen.queryByTestId("comment-toolbar")).not.toBeInTheDocument();
        });
    });

    describe("Resize Handle", () => {
        it("renders resize handle", () => {
            const { container } = render(<CommentNode {...createProps()} />);
            // Look for the resize handle element
            const resizeHandle = container.querySelector(".cursor-se-resize");
            expect(resizeHandle).toBeInTheDocument();
        });
    });

    describe("No Handles", () => {
        it("does not render input handle (comment nodes have no connections)", () => {
            render(<CommentNode {...createProps()} />);
            expect(screen.queryByTestId("handle-target-input")).not.toBeInTheDocument();
        });

        it("does not render output handle", () => {
            render(<CommentNode {...createProps()} />);
            expect(screen.queryByTestId("handle-source-output")).not.toBeInTheDocument();
        });
    });

    describe("Cursor Behavior", () => {
        it("has grab cursor when not editing", () => {
            const { container } = render(<CommentNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("cursor-grab");
        });
    });

    describe("Style Classes", () => {
        it("applies rounded corners", () => {
            const { container } = render(<CommentNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("rounded-md");
        });

        it("applies padding", () => {
            const { container } = render(<CommentNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("p-3");
        });

        it("applies shadow", () => {
            const { container } = render(<CommentNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("shadow-md");
        });
    });
});
