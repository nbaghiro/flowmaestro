/**
 * ScreenshotCaptureNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import ScreenshotCaptureNode from "../../nodes/ScreenshotCaptureNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-screenshot-capture-node-1",
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

interface ScreenshotCaptureNodeData {
    label: string;
    status?: NodeExecutionStatus;
    url?: string;
    width?: number;
    height?: number;
    fullPage?: boolean;
    format?: string;
}

describe("ScreenshotCaptureNode", () => {
    const createProps = (
        data: Partial<ScreenshotCaptureNodeData> = {}
    ): NodeProps<ScreenshotCaptureNodeData> => ({
        id: "test-screenshot-capture-1",
        type: "screenshotCapture",
        data: {
            label: "Screenshot",
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
            render(<ScreenshotCaptureNode {...createProps()} />);
            expect(screen.getByText("Screenshot")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<ScreenshotCaptureNode {...createProps({ label: "Capture Page" })} />);
            expect(screen.getByText("Capture Page")).toBeInTheDocument();
        });

        it("displays default size", () => {
            render(<ScreenshotCaptureNode {...createProps()} />);
            expect(screen.getByText("Size:")).toBeInTheDocument();
            expect(screen.getByText("1280x720")).toBeInTheDocument();
        });

        it("displays custom size", () => {
            render(<ScreenshotCaptureNode {...createProps({ width: 1920, height: 1080 })} />);
            expect(screen.getByText("1920x1080")).toBeInTheDocument();
        });

        it("displays default format", () => {
            render(<ScreenshotCaptureNode {...createProps()} />);
            expect(screen.getByText("Format:")).toBeInTheDocument();
            // CSS uppercase transforms display
            expect(screen.getByText("png")).toBeInTheDocument();
        });

        it("displays custom format", () => {
            render(<ScreenshotCaptureNode {...createProps({ format: "jpeg" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("jpeg")).toBeInTheDocument();
        });
    });

    describe("Size Display", () => {
        it("shows default dimensions", () => {
            render(<ScreenshotCaptureNode {...createProps()} />);
            expect(screen.getByText("1280x720")).toBeInTheDocument();
        });

        it("shows custom dimensions", () => {
            render(<ScreenshotCaptureNode {...createProps({ width: 800, height: 600 })} />);
            expect(screen.getByText("800x600")).toBeInTheDocument();
        });

        it("shows high resolution dimensions", () => {
            render(<ScreenshotCaptureNode {...createProps({ width: 3840, height: 2160 })} />);
            expect(screen.getByText("3840x2160")).toBeInTheDocument();
        });
    });

    describe("Format Display", () => {
        it("shows png with uppercase styling", () => {
            render(<ScreenshotCaptureNode {...createProps({ format: "png" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("png")).toBeInTheDocument();
        });

        it("shows jpeg with uppercase styling", () => {
            render(<ScreenshotCaptureNode {...createProps({ format: "jpeg" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("jpeg")).toBeInTheDocument();
        });

        it("shows webp with uppercase styling", () => {
            render(<ScreenshotCaptureNode {...createProps({ format: "webp" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("webp")).toBeInTheDocument();
        });
    });

    describe("Full Page Mode", () => {
        it("does not show mode when fullPage is false", () => {
            render(<ScreenshotCaptureNode {...createProps({ fullPage: false })} />);
            expect(screen.queryByText("Mode:")).not.toBeInTheDocument();
        });

        it("shows Full Page mode when enabled", () => {
            render(<ScreenshotCaptureNode {...createProps({ fullPage: true })} />);
            expect(screen.getByText("Mode:")).toBeInTheDocument();
            expect(screen.getByText("Full Page")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<ScreenshotCaptureNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<ScreenshotCaptureNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies utils category styling", () => {
            const { container } = render(<ScreenshotCaptureNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-utils-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<ScreenshotCaptureNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<ScreenshotCaptureNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Screenshot")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<ScreenshotCaptureNode {...createProps({ status: "completed" })} />);
            expect(screen.getByText("Screenshot")).toBeInTheDocument();
        });
    });
});
