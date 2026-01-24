/**
 * WorkflowChatService Tests
 *
 * Tests for workflow chat operations (WorkflowChatService.ts)
 */

// Mock the logger
jest.mock("../../core/logging", () => ({
    getLogger: jest.fn().mockReturnValue({
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn()
    })
}));

// Mock the ConnectionRepository
const mockFindById = jest.fn();
jest.mock("../../storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => ({
        findById: mockFindById
    }))
}));

// Mock executeLLMNode
const mockExecuteLLMNode = jest.fn();
jest.mock("../../temporal/activities/execution/handlers/ai/llm", () => ({
    executeLLMNode: (...args: unknown[]) => mockExecuteLLMNode(...args)
}));

import { WorkflowChatService, type StreamCallbacks } from "../WorkflowChatService";
import type { WorkflowContext, ChatMessage } from "../../api/schemas/chat-schemas";

describe("WorkflowChatService", () => {
    let service: WorkflowChatService;
    const mockConnectionId = "conn-123";
    const mockConnection = {
        id: mockConnectionId,
        provider: "openai",
        metadata: { provider_config: { default_model: "gpt-4" } }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new WorkflowChatService();
        mockFindById.mockResolvedValue(mockConnection);
        mockExecuteLLMNode.mockResolvedValue({ text: "AI response" });
    });

    describe("processChat", () => {
        const mockContext: WorkflowContext = {
            nodes: [{ id: "node-1", type: "llm", data: { label: "LLM Node" } }],
            edges: [],
            selectedNodeId: null
        };
        const mockHistory: ChatMessage[] = [];

        describe("conversational mode (null action)", () => {
            it("should handle conversation without changes", async () => {
                const result = await service.processChat(
                    null,
                    "What does this workflow do?",
                    mockContext,
                    mockHistory,
                    mockConnectionId,
                    undefined
                );

                expect(result.response).toBe("AI response");
                expect(result.changes).toBeUndefined();
                expect(mockExecuteLLMNode).toHaveBeenCalled();
            });

            it("should include conversation history in context", async () => {
                const history: ChatMessage[] = [
                    { role: "user", content: "Hello" },
                    { role: "assistant", content: "Hi!" }
                ];

                await service.processChat(
                    null,
                    "What about now?",
                    mockContext,
                    history,
                    mockConnectionId,
                    undefined
                );

                const callArgs = mockExecuteLLMNode.mock.calls[0][0];
                expect(callArgs.prompt).toContain("User: Hello");
                expect(callArgs.prompt).toContain("Assistant: Hi!");
            });

            it("should call onComplete callback", async () => {
                const onComplete = jest.fn();
                const callbacks: StreamCallbacks = { onComplete };

                await service.processChat(
                    null,
                    "Test message",
                    mockContext,
                    mockHistory,
                    mockConnectionId,
                    undefined,
                    callbacks
                );

                expect(onComplete).toHaveBeenCalledWith({
                    response: "AI response",
                    changes: undefined
                });
            });

            it("should call onError callback on failure", async () => {
                const error = new Error("LLM failed");
                mockExecuteLLMNode.mockRejectedValue(error);
                const onError = jest.fn();
                const callbacks: StreamCallbacks = { onError };

                await expect(
                    service.processChat(
                        null,
                        "Test message",
                        mockContext,
                        mockHistory,
                        mockConnectionId,
                        undefined,
                        callbacks
                    )
                ).rejects.toThrow("LLM failed");

                expect(onError).toHaveBeenCalledWith(error);
            });

            it("should support thinking configuration", async () => {
                mockExecuteLLMNode.mockResolvedValue({
                    text: "Response",
                    thinking: "Let me think about this..."
                });

                const result = await service.processChat(
                    null,
                    "Complex question",
                    mockContext,
                    mockHistory,
                    mockConnectionId,
                    undefined,
                    undefined,
                    { enableThinking: true, thinkingBudget: 2048 }
                );

                expect(result.thinking).toBe("Let me think about this...");
                const callArgs = mockExecuteLLMNode.mock.calls[0][0];
                expect(callArgs.enableThinking).toBe(true);
                expect(callArgs.thinkingBudget).toBe(2048);
            });
        });

        describe("add action", () => {
            it("should suggest nodes to add", async () => {
                mockExecuteLLMNode.mockResolvedValue({
                    text: JSON.stringify({
                        explanation: "Adding an HTTP node",
                        nodes: [
                            {
                                type: "http",
                                label: "Fetch Data",
                                config: { url: "https://api.example.com" }
                            }
                        ]
                    })
                });

                const result = await service.processChat(
                    "add",
                    "Add an HTTP node to fetch data",
                    mockContext,
                    mockHistory,
                    mockConnectionId,
                    undefined
                );

                expect(result.response).toBe("Adding an HTTP node");
                expect(result.changes).toHaveLength(1);
                expect(result.changes![0].type).toBe("add");
                expect(result.changes![0].nodeType).toBe("http");
            });

            it("should handle non-JSON response gracefully", async () => {
                mockExecuteLLMNode.mockResolvedValue({
                    text: "I cannot add nodes because..."
                });

                const result = await service.processChat(
                    "add",
                    "Add something",
                    mockContext,
                    mockHistory,
                    mockConnectionId,
                    undefined
                );

                expect(result.response).toBe("I cannot add nodes because...");
                expect(result.changes).toBeUndefined();
            });
        });

        describe("modify action", () => {
            it("should suggest node modifications", async () => {
                mockExecuteLLMNode.mockResolvedValue({
                    text: JSON.stringify({
                        explanation: "Updating the LLM node temperature",
                        nodes: [{ nodeId: "node-1", updates: { config: { temperature: 0.5 } } }]
                    })
                });

                const result = await service.processChat(
                    "modify",
                    "Lower the temperature on the LLM node",
                    mockContext,
                    mockHistory,
                    mockConnectionId,
                    undefined
                );

                expect(result.response).toBe("Updating the LLM node temperature");
                expect(result.changes).toHaveLength(1);
                expect(result.changes![0].type).toBe("modify");
                expect(result.changes![0].nodeId).toBe("node-1");
            });
        });

        describe("remove action", () => {
            it("should suggest nodes to remove", async () => {
                mockExecuteLLMNode.mockResolvedValue({
                    text: JSON.stringify({
                        explanation: "Removing the unused node",
                        nodeIds: ["node-1"]
                    })
                });

                const result = await service.processChat(
                    "remove",
                    "Remove the LLM node",
                    mockContext,
                    mockHistory,
                    mockConnectionId,
                    undefined
                );

                expect(result.response).toBe("Removing the unused node");
                expect(result.changes).toHaveLength(1);
                expect(result.changes![0].type).toBe("remove");
                expect(result.changes![0].nodeId).toBe("node-1");
            });
        });

        describe("unsupported action", () => {
            it("should throw for unsupported action", async () => {
                await expect(
                    service.processChat(
                        // @ts-expect-error Testing invalid action
                        "invalid",
                        "Test",
                        mockContext,
                        mockHistory,
                        mockConnectionId,
                        undefined
                    )
                ).rejects.toThrow("Unsupported action: invalid");
            });
        });
    });

    describe("explainWorkflow", () => {
        it("should explain workflow", async () => {
            const context: WorkflowContext = {
                nodes: [
                    { id: "node-1", type: "input" },
                    { id: "node-2", type: "llm" },
                    { id: "node-3", type: "output" }
                ],
                edges: [
                    { source: "node-1", target: "node-2" },
                    { source: "node-2", target: "node-3" }
                ],
                selectedNodeId: null
            };

            mockExecuteLLMNode.mockResolvedValue({
                text: "This workflow takes input, processes it with an LLM, and outputs the result."
            });

            const result = await service.explainWorkflow(context, mockConnectionId, undefined);

            expect(result.response).toContain("takes input");
            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.systemPrompt).toContain("explanation");
        });

        it("should pass streaming callbacks", async () => {
            const context: WorkflowContext = { nodes: [], edges: [], selectedNodeId: null };
            const onToken = jest.fn();

            await service.explainWorkflow(context, mockConnectionId, undefined, { onToken });

            expect(mockExecuteLLMNode).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
                onToken
            });
        });
    });

    describe("debugWorkflow", () => {
        it("should analyze and debug workflow", async () => {
            const context: WorkflowContext = {
                nodes: [{ id: "node-1", type: "http", data: { config: {} } }],
                edges: [],
                selectedNodeId: null
            };

            mockExecuteLLMNode.mockResolvedValue({
                text: "The HTTP node is missing a URL configuration."
            });

            const result = await service.debugWorkflow(
                context,
                "Why is my HTTP request failing?",
                mockConnectionId,
                undefined
            );

            expect(result.response).toContain("missing a URL");
        });
    });

    describe("optimizeWorkflow", () => {
        it("should suggest optimizations", async () => {
            const context: WorkflowContext = {
                nodes: [
                    { id: "node-1", type: "llm" },
                    { id: "node-2", type: "llm" },
                    { id: "node-3", type: "llm" }
                ],
                edges: [
                    { source: "node-1", target: "node-2" },
                    { source: "node-2", target: "node-3" }
                ],
                selectedNodeId: null
            };

            mockExecuteLLMNode.mockResolvedValue({
                text: "Consider combining sequential LLM calls into a single call."
            });

            const result = await service.optimizeWorkflow(context, mockConnectionId, undefined);

            expect(result.response).toContain("combining");
        });
    });

    describe("Provider and model handling", () => {
        it("should use connection provider", async () => {
            mockFindById.mockResolvedValue({
                id: mockConnectionId,
                provider: "anthropic",
                metadata: {}
            });

            const context: WorkflowContext = { nodes: [], edges: [], selectedNodeId: null };
            await service.explainWorkflow(context, mockConnectionId, undefined);

            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.provider).toBe("anthropic");
        });

        it("should throw for non-existent connection", async () => {
            mockFindById.mockResolvedValue(null);

            const context: WorkflowContext = { nodes: [], edges: [], selectedNodeId: null };
            await expect(
                service.explainWorkflow(context, "invalid-conn", undefined)
            ).rejects.toThrow("Connection not found");
        });

        it("should throw for unsupported provider", async () => {
            mockFindById.mockResolvedValue({
                id: mockConnectionId,
                provider: "unsupported-provider",
                metadata: {}
            });

            const context: WorkflowContext = { nodes: [], edges: [], selectedNodeId: null };
            await expect(
                service.explainWorkflow(context, mockConnectionId, undefined)
            ).rejects.toThrow("Unsupported provider");
        });

        it("should use specified model over default", async () => {
            const context: WorkflowContext = { nodes: [], edges: [], selectedNodeId: null };
            await service.explainWorkflow(context, mockConnectionId, "gpt-4-turbo");

            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.model).toBe("gpt-4-turbo");
        });

        it("should use default model from metadata", async () => {
            mockFindById.mockResolvedValue({
                id: mockConnectionId,
                provider: "openai",
                metadata: { provider_config: { default_model: "custom-model" } }
            });

            const context: WorkflowContext = { nodes: [], edges: [], selectedNodeId: null };
            await service.explainWorkflow(context, mockConnectionId, undefined);

            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.model).toBe("custom-model");
        });

        it("should use provider default when no model specified", async () => {
            mockFindById.mockResolvedValue({
                id: mockConnectionId,
                provider: "anthropic",
                metadata: {}
            });

            const context: WorkflowContext = { nodes: [], edges: [], selectedNodeId: null };
            await service.explainWorkflow(context, mockConnectionId, undefined);

            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.model).toBe("claude-3-5-sonnet-20241022");
        });
    });

    describe("Workflow context serialization", () => {
        it("should handle empty workflow", async () => {
            const context: WorkflowContext = {
                nodes: [],
                edges: [],
                selectedNodeId: null
            };

            await service.explainWorkflow(context, mockConnectionId, undefined);

            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.prompt).toContain("Empty workflow");
        });

        it("should summarize large workflows", async () => {
            const nodes = [];
            for (let i = 0; i < 25; i++) {
                nodes.push({ id: `node-${i}`, type: "llm" });
            }
            const context: WorkflowContext = {
                nodes,
                edges: [],
                selectedNodeId: null
            };

            await service.explainWorkflow(context, mockConnectionId, undefined);

            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.prompt).toContain("Workflow Summary");
            expect(callArgs.prompt).toContain("25 nodes total");
        });

        it("should include selected node info in context", async () => {
            const context: WorkflowContext = {
                nodes: [{ id: "node-1", type: "llm", data: { label: "Main LLM" } }],
                edges: [],
                selectedNodeId: "node-1"
            };

            await service.processChat(
                null,
                "Tell me about the selected node",
                context,
                [],
                mockConnectionId,
                undefined
            );

            const callArgs = mockExecuteLLMNode.mock.calls[0][0];
            expect(callArgs.systemPrompt).toContain("Selected node: llm");
        });
    });
});
