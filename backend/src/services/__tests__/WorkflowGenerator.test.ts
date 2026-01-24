/**
 * WorkflowGenerator Tests
 *
 * Tests for workflow generation from natural language (WorkflowGenerator.ts)
 */

// Mock the logging module
jest.mock("../../core/logging", () => ({
    createServiceLogger: jest.fn().mockReturnValue({
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn()
    })
}));

// Mock getDefaultModelForProvider
jest.mock("@flowmaestro/shared", () => ({
    getDefaultModelForProvider: jest.fn((provider: string) => {
        const defaults: Record<string, string> = {
            openai: "gpt-4",
            anthropic: "claude-3-5-sonnet-20241022",
            google: "gemini-1.5-pro",
            cohere: "command-r-plus"
        };
        return defaults[provider] || null;
    })
}));

// Mock ConnectionRepository
const mockFindByIdWithData = jest.fn();
jest.mock("../../storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => ({
        findByIdWithData: mockFindByIdWithData
    }))
}));

// Mock executeLLMNode
const mockExecuteLLMNode = jest.fn();
jest.mock("../../temporal/activities/execution/handlers/ai/llm", () => ({
    executeLLMNode: (...args: unknown[]) => mockExecuteLLMNode(...args)
}));

import { generateWorkflow, type WorkflowGenerationRequest } from "../WorkflowGenerator";

describe("WorkflowGenerator", () => {
    const validWorkflow = {
        nodes: [
            { id: "node-0", type: "input", label: "User Input", config: { inputType: "text" } },
            { id: "node-1", type: "llm", label: "Process Text", config: { provider: "openai" } },
            { id: "node-2", type: "output", label: "Display Result", config: { format: "text" } }
        ],
        edges: [
            { source: "node-0", target: "node-1", sourceHandle: "output", targetHandle: "input" },
            { source: "node-1", target: "node-2", sourceHandle: "output", targetHandle: "input" }
        ],
        metadata: {
            name: "Text Processor",
            entryNodeId: "node-0",
            description: "Processes user text with AI"
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockFindByIdWithData.mockResolvedValue({
            id: "conn-123",
            provider: "openai",
            status: "active"
        });
        mockExecuteLLMNode.mockResolvedValue({
            text: JSON.stringify(validWorkflow)
        });
    });

    describe("generateWorkflow", () => {
        it("should generate workflow from user prompt", async () => {
            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow that processes text with AI",
                connectionId: "conn-123",
                userId: "user-123"
            };

            const result = await generateWorkflow(request);

            expect(result.nodes).toHaveLength(3);
            expect(result.edges).toHaveLength(2);
            expect(result.metadata.name).toBe("Text Processor");
            expect(result.metadata.entryNodeId).toBe("node-0");
        });

        it("should throw when connectionId is missing", async () => {
            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Connection ID is required for workflow generation"
            );
        });

        it("should throw when connection not found", async () => {
            mockFindByIdWithData.mockResolvedValue(null);

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "invalid-conn",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Connection with ID invalid-conn not found"
            );
        });

        it("should throw when connection is not active", async () => {
            mockFindByIdWithData.mockResolvedValue({
                id: "conn-123",
                provider: "openai",
                status: "inactive"
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Connection is not active (status: inactive)"
            );
        });

        it("should throw for unsupported provider", async () => {
            mockFindByIdWithData.mockResolvedValue({
                id: "conn-123",
                provider: "unsupported",
                status: "active"
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Unsupported LLM provider: unsupported"
            );
        });

        it("should use correct provider and model", async () => {
            mockFindByIdWithData.mockResolvedValue({
                id: "conn-123",
                provider: "Anthropic", // Test case-insensitivity
                status: "active"
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await generateWorkflow(request);

            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.provider).toBe("anthropic");
            expect(callArgs.model).toBe("claude-3-5-sonnet-20241022");
        });

        it("should extract JSON from markdown code blocks", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: "```json\n" + JSON.stringify(validWorkflow) + "\n```"
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            const result = await generateWorkflow(request);

            expect(result.nodes).toHaveLength(3);
        });

        it("should throw when LLM returns non-string result", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: undefined
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "LLM result did not contain a text string"
            );
        });

        it("should throw when LLM returns invalid JSON", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: "This is not valid JSON"
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Failed to parse workflow JSON"
            );
        });
    });

    describe("Workflow validation", () => {
        it("should validate workflow is an object", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: "null"
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow("Workflow must be an object");
        });

        it("should validate nodes array exists", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: JSON.stringify({
                    edges: [],
                    metadata: { name: "Test", entryNodeId: "node-0" }
                })
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Workflow must have a nodes array"
            );
        });

        it("should validate edges array exists", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: JSON.stringify({
                    nodes: [{ id: "node-0", type: "input", label: "Test", config: {} }],
                    metadata: { name: "Test", entryNodeId: "node-0" }
                })
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Workflow must have an edges array"
            );
        });

        it("should validate metadata object exists", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: JSON.stringify({
                    nodes: [{ id: "node-0", type: "input", label: "Test", config: {} }],
                    edges: []
                })
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Workflow must have a metadata object"
            );
        });

        it("should validate metadata name exists", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: JSON.stringify({
                    nodes: [{ id: "node-0", type: "input", label: "Test", config: {} }],
                    edges: [],
                    metadata: { entryNodeId: "node-0" }
                })
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Workflow metadata must have a name"
            );
        });

        it("should validate metadata entryNodeId exists", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: JSON.stringify({
                    nodes: [{ id: "node-0", type: "input", label: "Test", config: {} }],
                    edges: [],
                    metadata: { name: "Test" }
                })
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Workflow metadata must have an entryNodeId"
            );
        });

        it("should validate at least one node exists", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: JSON.stringify({
                    nodes: [],
                    edges: [],
                    metadata: { name: "Test", entryNodeId: "node-0" }
                })
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Workflow must have at least one node"
            );
        });

        it("should validate node structure", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: JSON.stringify({
                    nodes: [{ id: "node-0" }], // Missing type, label, config
                    edges: [],
                    metadata: { name: "Test", entryNodeId: "node-0" }
                })
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow("Invalid node structure");
        });

        it("should validate edge source references existing node", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: JSON.stringify({
                    nodes: [{ id: "node-0", type: "input", label: "Test", config: {} }],
                    edges: [{ source: "invalid", target: "node-0" }],
                    metadata: { name: "Test", entryNodeId: "node-0" }
                })
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Edge references non-existent source node: invalid"
            );
        });

        it("should validate edge target references existing node", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: JSON.stringify({
                    nodes: [{ id: "node-0", type: "input", label: "Test", config: {} }],
                    edges: [{ source: "node-0", target: "invalid" }],
                    metadata: { name: "Test", entryNodeId: "node-0" }
                })
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Edge references non-existent target node: invalid"
            );
        });

        it("should validate entry node exists", async () => {
            mockExecuteLLMNode.mockResolvedValue({
                text: JSON.stringify({
                    nodes: [{ id: "node-0", type: "input", label: "Test", config: {} }],
                    edges: [],
                    metadata: { name: "Test", entryNodeId: "invalid" }
                })
            });

            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await expect(generateWorkflow(request)).rejects.toThrow(
                "Entry node invalid does not exist"
            );
        });
    });

    describe("LLM configuration", () => {
        it("should use correct system prompt", async () => {
            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await generateWorkflow(request);

            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.systemPrompt).toContain("workflow automation designer");
            expect(callArgs.systemPrompt).toContain("Available Node Types");
        });

        it("should pass user prompt to LLM", async () => {
            const request: WorkflowGenerationRequest = {
                userPrompt: "Build a workflow that fetches news and summarizes it",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await generateWorkflow(request);

            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.prompt).toBe("Build a workflow that fetches news and summarizes it");
        });

        it("should use appropriate temperature and maxTokens", async () => {
            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await generateWorkflow(request);

            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.temperature).toBe(0.7);
            expect(callArgs.maxTokens).toBe(3000);
        });

        it("should pass connectionId to LLM execution", async () => {
            const request: WorkflowGenerationRequest = {
                userPrompt: "Create a workflow",
                connectionId: "conn-123",
                userId: "user-123"
            };

            await generateWorkflow(request);

            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.connectionId).toBe("conn-123");
        });
    });
});
