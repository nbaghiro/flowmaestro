/**
 * ImageGenerationNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import ImageGenerationNode from "../../nodes/ImageGenerationNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-image-generation-node-1",
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

interface ImageGenerationNodeData {
    label: string;
    status?: NodeExecutionStatus;
    provider?: string;
    model?: string;
}

describe("ImageGenerationNode", () => {
    const createProps = (
        data: Partial<ImageGenerationNodeData> = {}
    ): NodeProps<ImageGenerationNodeData> => ({
        id: "test-image-generation-1",
        type: "imageGeneration",
        data: {
            label: "Image",
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
            render(<ImageGenerationNode {...createProps()} />);
            expect(screen.getByText("Image")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<ImageGenerationNode {...createProps({ label: "Generate Art" })} />);
            expect(screen.getByText("Generate Art")).toBeInTheDocument();
        });

        it("displays default provider", () => {
            render(<ImageGenerationNode {...createProps()} />);
            expect(screen.getByText("Provider:")).toBeInTheDocument();
            // CSS capitalize transforms display
            expect(screen.getByText("openai")).toBeInTheDocument();
        });

        it("displays custom provider", () => {
            render(<ImageGenerationNode {...createProps({ provider: "stability" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("stability")).toBeInTheDocument();
        });

        it("displays default model", () => {
            render(<ImageGenerationNode {...createProps()} />);
            expect(screen.getByText("Model:")).toBeInTheDocument();
            expect(screen.getByText("dall-e-3")).toBeInTheDocument();
        });

        it("displays custom model", () => {
            render(<ImageGenerationNode {...createProps({ model: "sdxl-turbo" })} />);
            expect(screen.getByText("sdxl-turbo")).toBeInTheDocument();
        });
    });

    describe("Provider Display", () => {
        it("shows openai provider with capitalize styling", () => {
            render(<ImageGenerationNode {...createProps({ provider: "openai" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("openai")).toBeInTheDocument();
        });

        it("shows stability provider with capitalize styling", () => {
            render(<ImageGenerationNode {...createProps({ provider: "stability" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("stability")).toBeInTheDocument();
        });

        it("shows midjourney provider with capitalize styling", () => {
            render(<ImageGenerationNode {...createProps({ provider: "midjourney" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("midjourney")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<ImageGenerationNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<ImageGenerationNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies AI category styling", () => {
            const { container } = render(<ImageGenerationNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-ai-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<ImageGenerationNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<ImageGenerationNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Image")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<ImageGenerationNode {...createProps({ status: "completed" })} />);
            expect(screen.getByText("Image")).toBeInTheDocument();
        });
    });
});
