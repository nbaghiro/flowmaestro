/**
 * AudioInputNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AudioInputNode from "../../nodes/AudioInputNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-audio-input-node-1",
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

interface AudioInputNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    provider?: string;
    model?: string;
}

describe("AudioInputNode", () => {
    const createProps = (
        data: Partial<AudioInputNodeData> = {}
    ): NodeProps<AudioInputNodeData> => ({
        id: "test-audio-input-1",
        type: "audioInput",
        data: {
            label: "Audio Input",
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
            render(<AudioInputNode {...createProps()} />);
            expect(screen.getByText("Audio Input")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<AudioInputNode {...createProps({ label: "Voice Recorder" })} />);
            expect(screen.getByText("Voice Recorder")).toBeInTheDocument();
        });

        it("displays default provider as OpenAI", () => {
            render(<AudioInputNode {...createProps()} />);
            expect(screen.getByText("Provider:")).toBeInTheDocument();
            expect(screen.getByText("OpenAI")).toBeInTheDocument();
        });

        it("displays custom provider", () => {
            render(<AudioInputNode {...createProps({ provider: "deepgram" })} />);
            expect(screen.getByText("Deepgram")).toBeInTheDocument();
        });

        it("displays default model", () => {
            render(<AudioInputNode {...createProps()} />);
            expect(screen.getByText("Model:")).toBeInTheDocument();
            expect(screen.getByText("whisper-1")).toBeInTheDocument();
        });

        it("displays custom model", () => {
            render(<AudioInputNode {...createProps({ model: "nova-2" })} />);
            expect(screen.getByText("nova-2")).toBeInTheDocument();
        });
    });

    describe("Provider Display", () => {
        it("shows OpenAI for openai provider", () => {
            render(<AudioInputNode {...createProps({ provider: "openai" })} />);
            expect(screen.getByText("OpenAI")).toBeInTheDocument();
        });

        it("shows Deepgram for deepgram provider", () => {
            render(<AudioInputNode {...createProps({ provider: "deepgram" })} />);
            expect(screen.getByText("Deepgram")).toBeInTheDocument();
        });

        it("shows raw provider for unknown providers", () => {
            render(<AudioInputNode {...createProps({ provider: "custom-provider" })} />);
            expect(screen.getByText("custom-provider")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("does not render input handle (start node)", () => {
            render(<AudioInputNode {...createProps()} />);
            expect(screen.queryByTestId("handle-target-input")).not.toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<AudioInputNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies inputs category styling", () => {
            const { container } = render(<AudioInputNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-inputs-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<AudioInputNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<AudioInputNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Audio Input")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<AudioInputNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("Audio Input")).toBeInTheDocument();
        });
    });
});
