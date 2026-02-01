/**
 * AudioOutputNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import AudioOutputNode from "../../nodes/AudioOutputNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-audio-output-node-1",
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

interface AudioOutputNodeData {
    label: string;
    status?: NodeExecutionStatus;
    provider?: string;
    model?: string;
    voice?: string;
    textInput?: string;
}

describe("AudioOutputNode", () => {
    const createProps = (
        data: Partial<AudioOutputNodeData> = {}
    ): NodeProps<AudioOutputNodeData> => ({
        id: "test-audio-output-1",
        type: "audioOutput",
        data: {
            label: "Audio Output",
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
            render(<AudioOutputNode {...createProps()} />);
            expect(screen.getByText("Audio Output")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<AudioOutputNode {...createProps({ label: "Text to Speech" })} />);
            expect(screen.getByText("Text to Speech")).toBeInTheDocument();
        });

        it("displays default provider as OpenAI", () => {
            render(<AudioOutputNode {...createProps()} />);
            expect(screen.getByText("Provider:")).toBeInTheDocument();
            expect(screen.getByText("OpenAI")).toBeInTheDocument();
        });

        it("displays custom provider", () => {
            render(<AudioOutputNode {...createProps({ provider: "elevenlabs" })} />);
            expect(screen.getByText("ElevenLabs")).toBeInTheDocument();
        });

        it("displays default voice for OpenAI", () => {
            render(<AudioOutputNode {...createProps()} />);
            expect(screen.getByText("Voice:")).toBeInTheDocument();
            expect(screen.getByText("alloy")).toBeInTheDocument();
        });

        it("displays custom voice", () => {
            render(<AudioOutputNode {...createProps({ voice: "nova" })} />);
            expect(screen.getByText("nova")).toBeInTheDocument();
        });
    });

    describe("Provider Display", () => {
        it("shows OpenAI for openai provider", () => {
            render(<AudioOutputNode {...createProps({ provider: "openai" })} />);
            expect(screen.getByText("OpenAI")).toBeInTheDocument();
        });

        it("shows ElevenLabs for elevenlabs provider", () => {
            render(<AudioOutputNode {...createProps({ provider: "elevenlabs" })} />);
            expect(screen.getByText("ElevenLabs")).toBeInTheDocument();
        });

        it("shows Deepgram for deepgram provider", () => {
            render(<AudioOutputNode {...createProps({ provider: "deepgram" })} />);
            expect(screen.getByText("Deepgram")).toBeInTheDocument();
        });

        it("shows raw provider for unknown providers", () => {
            render(<AudioOutputNode {...createProps({ provider: "custom-tts" })} />);
            expect(screen.getByText("custom-tts")).toBeInTheDocument();
        });
    });

    describe("Voice Display", () => {
        it("shows voice for OpenAI provider", () => {
            render(<AudioOutputNode {...createProps({ provider: "openai", voice: "shimmer" })} />);
            expect(screen.getByText("shimmer")).toBeInTheDocument();
        });

        it("shows model as voice for ElevenLabs", () => {
            render(
                <AudioOutputNode
                    {...createProps({ provider: "elevenlabs", model: "eleven-voice-1" })}
                />
            );
            expect(screen.getByText("eleven-voice-1")).toBeInTheDocument();
        });

        it("shows model as voice for Deepgram", () => {
            render(
                <AudioOutputNode {...createProps({ provider: "deepgram", model: "aura-voice" })} />
            );
            expect(screen.getByText("aura-voice")).toBeInTheDocument();
        });
    });

    describe("Text Preview", () => {
        it("shows default text when no text configured", () => {
            render(<AudioOutputNode {...createProps()} />);
            expect(screen.getByText("No text configured")).toBeInTheDocument();
        });

        it("shows full text when short", () => {
            render(<AudioOutputNode {...createProps({ textInput: "Hello world" })} />);
            expect(screen.getByText("Hello world")).toBeInTheDocument();
        });

        it("truncates long text with ellipsis", () => {
            const longText =
                "This is a very long text that exceeds forty characters and should be truncated";
            render(<AudioOutputNode {...createProps({ textInput: longText })} />);
            expect(
                screen.getByText(/This is a very long text that exceeds fo.../)
            ).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<AudioOutputNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("does not render output handle (terminal node)", () => {
            render(<AudioOutputNode {...createProps()} />);
            expect(screen.queryByTestId("handle-source-output")).not.toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies outputs category styling", () => {
            const { container } = render(<AudioOutputNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-outputs-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<AudioOutputNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<AudioOutputNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Audio Output")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<AudioOutputNode {...createProps({ status: "completed" })} />);
            expect(screen.getByText("Audio Output")).toBeInTheDocument();
        });
    });
});
