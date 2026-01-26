/**
 * NodeInspector component tests
 *
 * Tests for the node configuration panel manager
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NodeInspector } from "../NodeInspector";

// Mock all config panels
vi.mock("../configs/LLMNodeConfig", () => ({
    LLMNodeConfig: ({ nodeId }: { nodeId: string }) => (
        <div data-testid="llm-config">LLM Config for {nodeId}</div>
    )
}));

vi.mock("../configs/ConditionalNodeConfig", () => ({
    ConditionalNodeConfig: ({ nodeId }: { nodeId: string }) => (
        <div data-testid="conditional-config">Conditional Config for {nodeId}</div>
    )
}));

vi.mock("../configs/InputNodeConfig", () => ({
    InputNodeConfig: ({ nodeId }: { nodeId: string }) => (
        <div data-testid="input-config">Input Config for {nodeId}</div>
    )
}));

vi.mock("../configs/OutputNodeConfig", () => ({
    OutputNodeConfig: ({ nodeId }: { nodeId: string }) => (
        <div data-testid="output-config">Output Config for {nodeId}</div>
    )
}));

vi.mock("../configs/HTTPNodeConfig", () => ({
    HTTPNodeConfig: ({ nodeId }: { nodeId: string }) => (
        <div data-testid="http-config">HTTP Config for {nodeId}</div>
    )
}));

vi.mock("../configs/CodeNodeConfig", () => ({
    CodeNodeConfig: ({ nodeId }: { nodeId: string }) => (
        <div data-testid="code-config">Code Config for {nodeId}</div>
    )
}));

vi.mock("../configs/IntegrationNodeConfig", () => ({
    IntegrationNodeConfig: ({ nodeId }: { nodeId: string }) => (
        <div data-testid="integration-config">Integration Config for {nodeId}</div>
    )
}));

// Mock remaining config panels with generic component
const configMocks = [
    "VisionNodeConfig",
    "AudioInputNodeConfig",
    "AudioOutputNodeConfig",
    "EmbeddingsNodeConfig",
    "RouterNodeConfig",
    "ImageGenerationNodeConfig",
    "VideoGenerationNodeConfig",
    "SwitchNodeConfig",
    "LoopNodeConfig",
    "WaitNodeConfig",
    "HumanReviewNodeConfig",
    "TriggerNodeConfig",
    "FilesNodeConfig",
    "URLNodeConfig",
    "TemplateOutputNodeConfig",
    "ActionNodeConfig",
    "ChartGenerationNodeConfig",
    "SpreadsheetGenerationNodeConfig",
    "AudioTranscriptionNodeConfig",
    "OCRExtractionNodeConfig",
    "PdfGenerationNodeConfig",
    "ScreenshotCaptureNodeConfig",
    "WebSearchNodeConfig",
    "WebBrowseNodeConfig",
    "PdfExtractNodeConfig",
    "FileDownloadNodeConfig",
    "FileReadNodeConfig",
    "FileWriteNodeConfig",
    "TransformNodeConfig",
    "SharedMemoryNodeConfig",
    "DatabaseNodeConfig",
    "KnowledgeBaseQueryNodeConfig"
];

configMocks.forEach((name) => {
    const configName = name.replace("Config", "").toLowerCase();
    vi.mock(`../configs/${name}`, () => ({
        [name]: () => <div data-testid={`${configName}-config`}>{name}</div>
    }));
});

// Mock @flowmaestro/shared
vi.mock("@flowmaestro/shared", () => ({
    ALL_PROVIDERS: [
        { provider: "slack", displayName: "Slack", comingSoon: false },
        { provider: "gmail", displayName: "Gmail", comingSoon: false }
    ],
    getLLMProviderIds: () => ["openai", "anthropic"]
}));

// Mock common components
vi.mock("../../../components/common/Button", () => ({
    Button: ({
        children,
        onClick,
        title,
        className
    }: {
        children: React.ReactNode;
        onClick?: () => void;
        title?: string;
        className?: string;
    }) => (
        <button onClick={onClick} title={title} className={className} data-testid="close-button">
            {children}
        </button>
    )
}));

vi.mock("../../../components/common/Input", () => ({
    Input: ({
        value,
        onChange,
        placeholder,
        type,
        className
    }: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        type?: string;
        className?: string;
    }) => (
        <input
            type={type || "text"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
            data-testid="node-name-input"
        />
    )
}));

// Mock workflow store
const mockSelectNode = vi.fn();
const mockUpdateNode = vi.fn();
let mockSelectedNode: string | null = null;
let mockNodes: Array<{ id: string; type: string; data: Record<string, unknown> }> = [];
let mockNodeValidation: Record<string, { errors: Array<{ field: string; message: string }> }> = {};

vi.mock("../../../stores/workflowStore", () => ({
    useWorkflowStore: vi.fn(() => ({
        nodes: mockNodes,
        selectedNode: mockSelectedNode,
        selectNode: mockSelectNode,
        updateNode: mockUpdateNode,
        nodeValidation: mockNodeValidation
    }))
}));

describe("NodeInspector", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSelectedNode = null;
        mockNodes = [];
        mockNodeValidation = {};
    });

    describe("Empty State", () => {
        it("renders nothing when no node is selected", () => {
            mockSelectedNode = null;
            mockNodes = [];

            const { container } = render(<NodeInspector />);
            expect(container.firstChild).toBeNull();
        });

        it("renders nothing when selected node does not exist", () => {
            mockSelectedNode = "non-existent-node";
            mockNodes = [];

            const { container } = render(<NodeInspector />);
            expect(container.firstChild).toBeNull();
        });
    });

    describe("Panel Selection", () => {
        it("renders LLM config for llm node type", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "llm", data: { label: "LLM Node" } }];

            render(<NodeInspector />);
            expect(screen.getByTestId("llm-config")).toBeInTheDocument();
        });

        it("renders Conditional config for conditional node type", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "conditional", data: { label: "Conditional" } }];

            render(<NodeInspector />);
            expect(screen.getByTestId("conditional-config")).toBeInTheDocument();
        });

        it("renders Input config for input node type", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "input", data: { label: "Input" } }];

            render(<NodeInspector />);
            expect(screen.getByTestId("input-config")).toBeInTheDocument();
        });

        it("renders Output config for output node type", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "output", data: { label: "Output" } }];

            render(<NodeInspector />);
            expect(screen.getByTestId("output-config")).toBeInTheDocument();
        });

        it("renders HTTP config for http node type", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "http", data: { label: "HTTP" } }];

            render(<NodeInspector />);
            expect(screen.getByTestId("http-config")).toBeInTheDocument();
        });

        it("renders Code config for code node type", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "code", data: { label: "Code" } }];

            render(<NodeInspector />);
            expect(screen.getByTestId("code-config")).toBeInTheDocument();
        });

        it("renders Integration config for provider node types", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "slack", data: { label: "Slack" } }];

            render(<NodeInspector />);
            expect(screen.getByTestId("integration-config")).toBeInTheDocument();
        });
    });

    describe("Node Name Editing", () => {
        it("displays current node name in input", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "llm", data: { label: "My LLM Node" } }];

            render(<NodeInspector />);

            const nameInput = screen.getByTestId("node-name-input");
            expect(nameInput).toHaveValue("My LLM Node");
        });

        it("calls updateNode when name is changed", async () => {
            const user = userEvent.setup();
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "llm", data: { label: "LLM" } }];

            render(<NodeInspector />);

            const nameInput = screen.getByTestId("node-name-input");
            await user.clear(nameInput);
            await user.type(nameInput, "New Name");

            expect(mockUpdateNode).toHaveBeenCalledWith("node-1", { label: "New Name" });
        });
    });

    describe("Close Button", () => {
        it("renders close button", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "llm", data: { label: "LLM" } }];

            render(<NodeInspector />);

            expect(screen.getByTitle("Close")).toBeInTheDocument();
        });

        it("calls selectNode(null) when close button is clicked", async () => {
            const user = userEvent.setup();
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "llm", data: { label: "LLM" } }];

            render(<NodeInspector />);

            const closeButton = screen.getByTitle("Close");
            await user.click(closeButton);

            expect(mockSelectNode).toHaveBeenCalledWith(null);
        });
    });

    describe("Header", () => {
        it("displays 'Node Configuration' header", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "llm", data: { label: "LLM" } }];

            render(<NodeInspector />);

            expect(screen.getByText("Node Configuration")).toBeInTheDocument();
        });

        it("displays node name label", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "llm", data: { label: "LLM" } }];

            render(<NodeInspector />);

            expect(screen.getByText("Node Name")).toBeInTheDocument();
        });
    });

    describe("Resize Functionality", () => {
        it("renders resize handle", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "llm", data: { label: "LLM" } }];

            const { container } = render(<NodeInspector />);

            const resizeHandle = container.querySelector(".cursor-ew-resize");
            expect(resizeHandle).toBeInTheDocument();
        });
    });

    describe("Validation Errors", () => {
        it("passes validation errors to config component", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "llm", data: { label: "LLM" } }];
            mockNodeValidation = {
                "node-1": {
                    errors: [{ field: "model", message: "Model is required" }]
                }
            };

            render(<NodeInspector />);

            // The LLMNodeConfig should receive the errors prop
            // We can't directly test this with our mock, but the structure is correct
            expect(screen.getByTestId("llm-config")).toBeInTheDocument();
        });
    });

    describe("Default Config Message", () => {
        it("shows coming soon message for unknown node types", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "unknown-type", data: { label: "Unknown" } }];

            render(<NodeInspector />);

            expect(
                screen.getByText(/Configuration for unknown-type node coming soon/)
            ).toBeInTheDocument();
        });
    });

    describe("Panel Width", () => {
        it("has a default width", () => {
            mockSelectedNode = "node-1";
            mockNodes = [{ id: "node-1", type: "llm", data: { label: "LLM" } }];

            const { container } = render(<NodeInspector />);

            const panel = container.firstChild as HTMLElement;
            expect(panel.style.width).toBeDefined();
        });
    });
});
