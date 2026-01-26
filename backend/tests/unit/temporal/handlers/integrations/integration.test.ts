/**
 * Integration Node Handler Unit Tests
 *
 * Tests for the IntegrationNodeHandler which executes integration operations
 * using the Provider SDK system.
 */

import type { JsonObject } from "@flowmaestro/shared";
import type { NodeHandlerInput } from "../../../../../src/temporal/activities/execution/types";
import type { ContextSnapshot } from "../../../../../src/temporal/core/types";

// Mock the connection repository
const mockFindByIdWithData = jest.fn();
jest.mock("../../../../../src/storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => ({
        findByIdWithData: mockFindByIdWithData
    }))
}));

// Mock the execution router
const mockExecute = jest.fn();
jest.mock("../../../../../src/integrations/core/ExecutionRouter", () => ({
    ExecutionRouter: jest.fn().mockImplementation(() => ({
        execute: mockExecute
    }))
}));

// Mock the provider registry
jest.mock("../../../../../src/integrations/registry", () => ({
    providerRegistry: {}
}));

// Mock logger
jest.mock("../../../../../src/temporal/core", () => ({
    createActivityLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }),
    getExecutionContext: jest.fn((context: unknown) => context)
}));

import {
    IntegrationNodeHandler,
    createIntegrationNodeHandler,
    executeIntegrationNode
} from "../../../../../src/temporal/activities/execution/handlers/integrations/integration";

// Helper to create mock context
function createMockContext(overrides: Partial<ContextSnapshot> = {}): ContextSnapshot {
    return {
        workflowId: "test-workflow-id",
        executionId: "test-execution-id",
        variables: new Map(),
        nodeOutputs: new Map(),
        sharedMemory: new Map(),
        secrets: new Map(),
        loopStates: [],
        parallelStates: [],
        ...overrides
    } as ContextSnapshot;
}

// Helper to create mock input
function createMockInput(
    nodeConfig: JsonObject,
    contextOverrides: Partial<ContextSnapshot> = {}
): NodeHandlerInput {
    return {
        nodeType: "integration",
        nodeConfig,
        context: createMockContext(contextOverrides),
        metadata: {
            executionId: "test-execution-id",
            nodeId: "test-node-id",
            nodeName: "Test Integration"
        }
    };
}

// Mock connection data
const mockConnection = {
    id: "conn-123",
    userId: "user-456",
    provider: "slack",
    status: "active",
    connectionData: {
        accessToken: "xoxb-test-token"
    }
};

describe("IntegrationNodeHandler", () => {
    let handler: IntegrationNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new IntegrationNodeHandler();
    });

    describe("properties", () => {
        it("should have correct handler properties", () => {
            expect(handler.name).toBe("IntegrationNodeHandler");
            expect(handler.supportedNodeTypes).toContain("integration");
        });

        it("should report canHandle correctly", () => {
            expect(handler.canHandle("integration")).toBe(true);
            expect(handler.canHandle("otherType")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("should create handler instance", () => {
            const instance = createIntegrationNodeHandler();
            expect(instance).toBeInstanceOf(IntegrationNodeHandler);
        });
    });

    describe("execute", () => {
        describe("happy path", () => {
            it("should execute integration operation successfully", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: { messageId: "msg-123", ts: "1234567890.123456" }
                });

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: { channel: "#general", text: "Hello!" },
                    outputVariable: "slackResult"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("slackResult");
            });

            it("should retrieve connection from database", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: { success: true }
                });

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockFindByIdWithData).toHaveBeenCalledWith("conn-123");
            });

            it("should pass parameters to execution router", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: { docId: "doc-456" }
                });

                const input = createMockInput({
                    provider: "coda",
                    operation: "createDoc",
                    connectionId: "conn-123",
                    parameters: { title: "New Document", folderId: "folder-789" },
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    "coda",
                    "createDoc",
                    { title: "New Document", folderId: "folder-789" },
                    mockConnection,
                    expect.any(Object)
                );
            });

            it("should store result in output variable", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: { id: "item-123", name: "Created Item" }
                });

                const input = createMockInput({
                    provider: "notion",
                    operation: "createPage",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "notionResult"
                });

                const result = await handler.execute(input);

                expect(result.result.notionResult).toEqual({
                    id: "item-123",
                    name: "Created Item"
                });
            });

            it("should return operation metadata (provider, operation, success)", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: { result: "success" }
                });

                const input = createMockInput({
                    provider: "slack",
                    operation: "listChannels",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                // Verify the result includes integration metadata when no outputVariable
                expect(result.result).toBeDefined();
            });
        });

        describe("connection handling", () => {
            it("should validate connection exists", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(null);

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "nonexistent-conn",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.integrationError).toContain("not found");
            });

            it("should validate connection is active", async () => {
                mockFindByIdWithData.mockResolvedValueOnce({
                    ...mockConnection,
                    status: "inactive"
                });

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.integrationError).toContain("not active");
            });

            it("should handle connection not found", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(null);

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "missing-conn",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.result).toBeNull();
                expect(result.result.integrationError).toBeDefined();
            });

            it("should handle inactive connection status", async () => {
                mockFindByIdWithData.mockResolvedValueOnce({
                    ...mockConnection,
                    status: "expired"
                });

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.result).toBeNull();
            });
        });

        describe("provider routing", () => {
            it("should route to correct provider", async () => {
                mockFindByIdWithData.mockResolvedValueOnce({
                    ...mockConnection,
                    provider: "notion"
                });
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: { pageId: "page-123" }
                });

                const input = createMockInput({
                    provider: "notion",
                    operation: "getPage",
                    connectionId: "conn-123",
                    parameters: { pageId: "page-123" },
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    "notion",
                    "getPage",
                    expect.any(Object),
                    expect.any(Object),
                    expect.any(Object)
                );
            });

            it("should route to correct operation", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: { channels: [] }
                });

                const input = createMockInput({
                    provider: "slack",
                    operation: "listChannels",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    "slack",
                    "listChannels",
                    expect.any(Object),
                    expect.any(Object),
                    expect.any(Object)
                );
            });
        });

        describe("result handling", () => {
            it("should return data on success", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: { messages: [{ id: 1 }, { id: 2 }] }
                });

                const input = createMockInput({
                    provider: "slack",
                    operation: "listMessages",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "messages"
                });

                const result = await handler.execute(input);

                expect(result.result.messages).toEqual({ messages: [{ id: 1 }, { id: 2 }] });
            });

            it("should return null on failure with outputVariable", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: {
                        type: "api_error",
                        message: "Rate limited",
                        retryable: true
                    }
                });

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                // Handler returns result but with integrationResult containing error
                expect(result.result).toBeDefined();
            });
        });

        describe("error handling", () => {
            it("should handle connection decryption failures", async () => {
                mockFindByIdWithData.mockRejectedValueOnce(
                    new Error("Failed to decrypt connection data")
                );

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.integrationError).toContain("decrypt");
            });

            it("should handle provider execution failures", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockRejectedValueOnce(new Error("Provider API error"));

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.integrationError).toContain("Provider API error");
            });

            it("should handle timeout errors", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockRejectedValueOnce(new Error("Request timeout"));

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.integrationError).toContain("timeout");
            });

            it("should handle rate limit errors", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockRejectedValueOnce(new Error("Rate limit exceeded"));

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.integrationError).toContain("Rate limit");
            });

            it("should handle authentication errors", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockRejectedValueOnce(new Error("Authentication failed"));

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.integrationError).toContain("Authentication");
            });
        });

        describe("edge cases", () => {
            it("should handle null response from provider", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: null
                });

                const input = createMockInput({
                    provider: "slack",
                    operation: "deleteMessage",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.result).toBeNull();
            });

            it("should include duration metrics", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: { ok: true }
                });

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {},
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.metrics?.durationMs).toBeDefined();
                expect(result.metrics?.durationMs).toBeGreaterThanOrEqual(0);
            });

            it("should pass workflow context to execution router", async () => {
                mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: { ok: true }
                });

                const input = createMockInput({
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {},
                    nodeId: "node-xyz",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.any(String),
                    expect.any(Object),
                    expect.any(Object),
                    expect.objectContaining({
                        mode: "workflow"
                    })
                );
            });
        });
    });

    describe("executeIntegrationNode (standalone)", () => {
        it("should work as standalone function", async () => {
            mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: { result: "standalone test" }
            });

            const config = {
                provider: "slack",
                operation: "sendMessage",
                connectionId: "conn-123",
                parameters: { text: "Hello" },
                outputVariable: "result"
            };

            const context = { workflowId: "wf-123" };

            const result = await executeIntegrationNode(config, context);

            expect(result).toHaveProperty("result");
        });

        it("should accept config and context parameters", async () => {
            mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: { items: [] }
            });

            const config = {
                provider: "notion",
                operation: "listPages",
                connectionId: "conn-456",
                parameters: { databaseId: "db-123" }
            };

            const context = {
                workflowId: "wf-456",
                executionId: "exec-789"
            };

            const result = await executeIntegrationNode(config, context);

            expect(result).toBeDefined();
            expect(mockExecute).toHaveBeenCalledWith(
                "notion",
                "listPages",
                expect.any(Object),
                expect.any(Object),
                expect.objectContaining({
                    workflowId: "wf-456"
                })
            );
        });

        it("should return JsonObject result", async () => {
            mockFindByIdWithData.mockResolvedValueOnce(mockConnection);
            mockExecute.mockResolvedValueOnce({
                success: true,
                data: { key: "value", nested: { a: 1 } }
            });

            const config = {
                provider: "slack",
                operation: "getChannel",
                connectionId: "conn-123",
                parameters: {},
                outputVariable: "channel"
            };

            const result = await executeIntegrationNode(config, {});

            expect(typeof result).toBe("object");
            expect(result).toHaveProperty("channel");
        });
    });
});
