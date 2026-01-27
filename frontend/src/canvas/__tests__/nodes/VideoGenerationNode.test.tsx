/**
 * VideoGenerationNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import VideoGenerationNode from "../../nodes/VideoGenerationNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-video-generation-node-1",
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

interface VideoGenerationNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    provider?: string;
    model?: string;
}

describe("VideoGenerationNode", () => {
    const createProps = (
        data: Partial<VideoGenerationNodeData> = {}
    ): NodeProps<VideoGenerationNodeData> => ({
        id: "test-video-generation-1",
        type: "videoGeneration",
        data: {
            label: "Video",
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
            render(<VideoGenerationNode {...createProps()} />);
            expect(screen.getByText("Video")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<VideoGenerationNode {...createProps({ label: "Generate Clip" })} />);
            expect(screen.getByText("Generate Clip")).toBeInTheDocument();
        });

        it("displays default provider", () => {
            render(<VideoGenerationNode {...createProps()} />);
            expect(screen.getByText("Provider:")).toBeInTheDocument();
            // CSS capitalize transforms display
            expect(screen.getByText("runway")).toBeInTheDocument();
        });

        it("displays custom provider", () => {
            render(<VideoGenerationNode {...createProps({ provider: "pika" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("pika")).toBeInTheDocument();
        });

        it("displays default model", () => {
            render(<VideoGenerationNode {...createProps()} />);
            expect(screen.getByText("Model:")).toBeInTheDocument();
            expect(screen.getByText("gen3a_turbo")).toBeInTheDocument();
        });

        it("displays custom model", () => {
            render(<VideoGenerationNode {...createProps({ model: "gen2" })} />);
            expect(screen.getByText("gen2")).toBeInTheDocument();
        });
    });

    describe("Provider Display", () => {
        it("shows runway provider with capitalize styling", () => {
            render(<VideoGenerationNode {...createProps({ provider: "runway" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("runway")).toBeInTheDocument();
        });

        it("shows pika provider with capitalize styling", () => {
            render(<VideoGenerationNode {...createProps({ provider: "pika" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("pika")).toBeInTheDocument();
        });

        it("shows sora provider with capitalize styling", () => {
            render(<VideoGenerationNode {...createProps({ provider: "sora" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("sora")).toBeInTheDocument();
        });
    });

    describe("Model Display", () => {
        it("shows model as-is", () => {
            render(<VideoGenerationNode {...createProps({ model: "gen3a_turbo" })} />);
            expect(screen.getByText("gen3a_turbo")).toBeInTheDocument();
        });

        it("shows custom model name", () => {
            render(<VideoGenerationNode {...createProps({ model: "custom-model" })} />);
            expect(screen.getByText("custom-model")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<VideoGenerationNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<VideoGenerationNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies AI category styling", () => {
            const { container } = render(<VideoGenerationNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-ai-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<VideoGenerationNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<VideoGenerationNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Video")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<VideoGenerationNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("Video")).toBeInTheDocument();
        });
    });
});
