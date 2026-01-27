/**
 * AudioTranscriptionNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AudioTranscriptionNode from "../../nodes/AudioTranscriptionNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-audio-transcription-node-1",
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

interface AudioTranscriptionNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    model?: string;
    language?: string;
    task?: "transcribe" | "translate";
    outputFormat?: string;
}

describe("AudioTranscriptionNode", () => {
    const createProps = (
        data: Partial<AudioTranscriptionNodeData> = {}
    ): NodeProps<AudioTranscriptionNodeData> => ({
        id: "test-audio-transcription-1",
        type: "audioTranscription",
        data: {
            label: "Transcribe",
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
            render(<AudioTranscriptionNode {...createProps()} />);
            expect(screen.getByText("Transcribe")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<AudioTranscriptionNode {...createProps({ label: "Speech to Text" })} />);
            expect(screen.getByText("Speech to Text")).toBeInTheDocument();
        });

        it("displays default model", () => {
            render(<AudioTranscriptionNode {...createProps()} />);
            expect(screen.getByText("Model:")).toBeInTheDocument();
            expect(screen.getByText("whisper-1")).toBeInTheDocument();
        });

        it("displays custom model", () => {
            render(<AudioTranscriptionNode {...createProps({ model: "whisper-large" })} />);
            expect(screen.getByText("whisper-large")).toBeInTheDocument();
        });

        it("displays default task", () => {
            render(<AudioTranscriptionNode {...createProps()} />);
            expect(screen.getByText("Task:")).toBeInTheDocument();
            expect(screen.getByText("Transcribe")).toBeInTheDocument();
        });

        it("displays translate task", () => {
            render(<AudioTranscriptionNode {...createProps({ task: "translate" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("translate")).toBeInTheDocument();
        });

        it("displays default language as Auto", () => {
            render(<AudioTranscriptionNode {...createProps()} />);
            expect(screen.getByText("Language:")).toBeInTheDocument();
            expect(screen.getByText("Auto")).toBeInTheDocument();
        });

        it("displays custom language", () => {
            render(<AudioTranscriptionNode {...createProps({ language: "en" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("en")).toBeInTheDocument();
        });
    });

    describe("Task Display", () => {
        it("shows transcribe task with capitalize styling", () => {
            render(<AudioTranscriptionNode {...createProps({ task: "transcribe" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("transcribe")).toBeInTheDocument();
        });

        it("shows translate task with capitalize styling", () => {
            render(<AudioTranscriptionNode {...createProps({ task: "translate" })} />);
            // CSS capitalize transforms display
            expect(screen.getByText("translate")).toBeInTheDocument();
        });
    });

    describe("Language Display", () => {
        it("shows Auto for auto language", () => {
            render(<AudioTranscriptionNode {...createProps({ language: "auto" })} />);
            expect(screen.getByText("Auto")).toBeInTheDocument();
        });

        it("shows specific language with uppercase styling", () => {
            render(<AudioTranscriptionNode {...createProps({ language: "fr" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("fr")).toBeInTheDocument();
        });

        it("shows longer language codes with uppercase styling", () => {
            render(<AudioTranscriptionNode {...createProps({ language: "zh-cn" })} />);
            // CSS uppercase transforms display
            expect(screen.getByText("zh-cn")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<AudioTranscriptionNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<AudioTranscriptionNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies AI category styling", () => {
            const { container } = render(<AudioTranscriptionNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-ai-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<AudioTranscriptionNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });
    });

    describe("Status States", () => {
        it("renders with idle status", () => {
            render(<AudioTranscriptionNode {...createProps({ status: "idle" })} />);
            expect(screen.getByText("Transcribe")).toBeInTheDocument();
        });

        it("renders with success status", () => {
            render(<AudioTranscriptionNode {...createProps({ status: "success" })} />);
            expect(screen.getByText("Transcribe")).toBeInTheDocument();
        });
    });
});
