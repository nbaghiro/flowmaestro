/**
 * Integration Node Handler Unit Tests
 *
 * Tests integration node handler with mocked dependencies:
 * - ConnectionRepository mocked for connection lookup
 * - ExecutionRouter mocked for provider operations
 * - Full handler execution tests for various providers
 */

// Mock config before importing handler
jest.mock("../../../../../core/config", () => ({
    config: {
        ai: {
            openai: { apiKey: "test-openai-key" },
            anthropic: { apiKey: "test-anthropic-key" }
        },
        database: {
            host: "localhost",
            port: 5432,
            database: "test",
            user: "test",
            password: "test"
        }
    }
}));

// Mock database module
jest.mock("../../../../../storage/database", () => ({
    Database: {
        getInstance: jest.fn().mockReturnValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            getPool: jest.fn()
        })
    }
}));

// Mock ConnectionRepository
const mockFindByIdWithData = jest.fn();
jest.mock("../../../../../storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => ({
        findByIdWithData: mockFindByIdWithData
    }))
}));

// Mock ExecutionRouter
const mockExecute = jest.fn();
jest.mock("../../../../../integrations/core/ExecutionRouter", () => ({
    ExecutionRouter: jest.fn().mockImplementation(() => ({
        execute: mockExecute
    }))
}));

// Mock provider registry
jest.mock("../../../../../integrations/registry", () => ({
    providerRegistry: {}
}));

import type { JsonObject } from "@flowmaestro/shared";
import {
    createTestContext,
    createTestMetadata
} from "../../../../../../__tests__/helpers/handler-test-utils";
import { IntegrationNodeHandler, createIntegrationNodeHandler } from "../integrations/integration";
import type { ContextSnapshot } from "../../../../../temporal/core/types";

// Helper to create handler input
function createHandlerInput(
    overrides: {
        nodeType?: string;
        nodeConfig?: Record<string, unknown>;
        context?: ContextSnapshot;
    } = {}
) {
    const defaultConfig = {
        provider: "slack",
        operation: "sendMessage",
        connectionId: "conn-123",
        parameters: {
            channel: "#general",
            text: "Hello from integration!"
        }
    };

    return {
        nodeType: overrides.nodeType || "integration",
        nodeConfig: { ...defaultConfig, ...overrides.nodeConfig },
        context: overrides.context || createTestContext(),
        metadata: createTestMetadata({ nodeId: "test-integration-node" })
    };
}

// Create mock connection data
function createMockConnection(
    overrides: Partial<{
        id: string;
        status: string;
        provider: string;
        data: Record<string, unknown>;
    }> = {}
) {
    return {
        id: overrides.id || "conn-123",
        user_id: "user-123",
        provider: overrides.provider || "slack",
        name: "My Integration Connection",
        status: overrides.status || "active",
        data: overrides.data || {
            access_token: "xoxb-test-token",
            team_id: "T12345"
        },
        created_at: new Date(),
        updated_at: new Date()
    };
}

describe("IntegrationNodeHandler", () => {
    let handler: IntegrationNodeHandler;

    beforeEach(() => {
        handler = createIntegrationNodeHandler();
        jest.clearAllMocks();
        mockFindByIdWithData.mockResolvedValue(createMockConnection());
        mockExecute.mockResolvedValue({
            success: true,
            data: { ok: true }
        });
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("IntegrationNodeHandler");
        });

        it("supports integration node type", () => {
            expect(handler.supportedNodeTypes).toContain("integration");
        });

        it("can handle integration type", () => {
            expect(handler.canHandle("integration")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("action")).toBe(false);
            expect(handler.canHandle("api")).toBe(false);
            expect(handler.canHandle("webhook")).toBe(false);
        });
    });

    describe("connection validation", () => {
        it("returns error when connection not found", async () => {
            mockFindByIdWithData.mockResolvedValue(null);

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "non-existent-conn",
                    parameters: { channel: "#test", text: "Hello" }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.integrationResult).toBeDefined();
            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(false);
            expect((integrationResult.error as JsonObject).message).toContain("not found");
        });

        it("returns error when connection is not active", async () => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection({ status: "expired" }));

            const input = createHandlerInput();

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(false);
            expect((integrationResult.error as JsonObject).message).toContain("not active");
        });

        it("retrieves connection credentials from repository", async () => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
            mockExecute.mockResolvedValue({
                success: true,
                data: { messageId: "msg-123" }
            });

            const input = createHandlerInput();
            await handler.execute(input);

            expect(mockFindByIdWithData).toHaveBeenCalledWith("conn-123");
        });
    });

    describe("Slack provider execution", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection({ provider: "slack" }));
        });

        it("executes Slack sendMessage operation", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: {
                    ok: true,
                    channel: "C12345",
                    ts: "1234567890.123456"
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-slack",
                    parameters: {
                        channel: "#general",
                        text: "Hello Slack!"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);
            expect(integrationResult.provider).toBe("slack");
            expect(integrationResult.operation).toBe("sendMessage");
        });

        it("passes parameters to Slack SDK", async () => {
            mockExecute.mockResolvedValue({ success: true, data: { ok: true } });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-slack",
                    parameters: {
                        channel: "#alerts",
                        text: "Alert message",
                        blocks: [{ type: "section", text: { type: "mrkdwn", text: "*Alert*" } }]
                    }
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                "slack",
                "sendMessage",
                expect.objectContaining({
                    channel: "#alerts",
                    text: "Alert message",
                    blocks: expect.any(Array)
                }),
                expect.any(Object),
                expect.any(Object)
            );
        });
    });

    describe("Coda provider execution", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(
                createMockConnection({
                    provider: "coda",
                    data: { api_key: "coda-api-key" }
                })
            );
        });

        it("executes Coda listDocs operation", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: {
                    items: [
                        { id: "doc1", name: "Document 1" },
                        { id: "doc2", name: "Document 2" }
                    ]
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "coda",
                    operation: "listDocs",
                    connectionId: "conn-coda",
                    parameters: {}
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);
            expect(integrationResult.provider).toBe("coda");
        });

        it("executes Coda insertRows operation", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { requestId: "req-123", addedRowCount: 5 }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "coda",
                    operation: "insertRows",
                    connectionId: "conn-coda",
                    parameters: {
                        docId: "doc-123",
                        tableId: "table-456",
                        rows: [
                            { Name: "Alice", Age: 30 },
                            { Name: "Bob", Age: 25 }
                        ]
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);
            expect((integrationResult.data as JsonObject).addedRowCount).toBe(5);
        });
    });

    describe("Gmail provider execution", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(
                createMockConnection({
                    provider: "gmail",
                    data: {
                        access_token: "ya29.test-token",
                        refresh_token: "1//test-refresh"
                    }
                })
            );
        });

        it("executes Gmail sendEmail operation", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { id: "msg-123", threadId: "thread-456" }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "gmail",
                    operation: "sendEmail",
                    connectionId: "conn-gmail",
                    parameters: {
                        to: "user@example.com",
                        subject: "Test Email",
                        body: "Hello from integration!"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);
            expect(integrationResult.provider).toBe("gmail");
        });
    });

    describe("output handling", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
        });

        it("returns integration result on success", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { id: "result-123" }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.integrationResult).toBeDefined();
            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);
            expect(integrationResult.data).toEqual({ id: "result-123" });
        });

        it("uses outputVariable when specified", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { items: [1, 2, 3] }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "coda",
                    operation: "listDocs",
                    connectionId: "conn-coda",
                    parameters: {},
                    outputVariable: "codaDocs"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.codaDocs).toEqual({ items: [1, 2, 3] });
        });

        it("returns null with error on failure", async () => {
            mockExecute.mockResolvedValue({
                success: false,
                error: {
                    type: "api_error",
                    message: "Channel not found",
                    retryable: false
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: { channel: "#invalid", text: "Hello" },
                    outputVariable: "slackResult"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.slackResult).toBeNull();
        });

        it("includes request time in metadata", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { ok: true }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.metadata).toBeDefined();
            expect((integrationResult.metadata as JsonObject).requestTime).toBeGreaterThanOrEqual(
                0
            );
        });
    });

    describe("error handling", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
        });

        it("handles provider API errors gracefully", async () => {
            mockExecute.mockResolvedValue({
                success: false,
                error: {
                    type: "api_error",
                    message: "Invalid channel",
                    retryable: false
                }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(false);
            expect(integrationResult.error).toBeDefined();
        });

        it("handles authentication errors", async () => {
            mockExecute.mockResolvedValue({
                success: false,
                error: {
                    type: "auth_error",
                    message: "Token expired",
                    retryable: false
                }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(false);
            expect((integrationResult.error as JsonObject).type).toBe("auth_error");
        });

        it("handles rate limit errors", async () => {
            mockExecute.mockResolvedValue({
                success: false,
                error: {
                    type: "rate_limit",
                    message: "Too many requests",
                    retryable: true
                }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(false);
            expect((integrationResult.error as JsonObject).type).toBe("rate_limit");
            expect((integrationResult.error as JsonObject).retryable).toBe(true);
        });

        it("handles execution exceptions", async () => {
            mockExecute.mockRejectedValue(new Error("Network timeout"));

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(false);
            expect((integrationResult.error as JsonObject).message).toContain("Network timeout");
        });

        it("includes error details in result", async () => {
            mockExecute.mockResolvedValue({
                success: false,
                error: {
                    type: "validation_error",
                    message: "Missing required parameter: channel",
                    retryable: false
                }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            const error = integrationResult.error as JsonObject;
            expect(error.type).toBe("validation_error");
            expect(error.message).toContain("Missing required parameter");
        });
    });

    describe("metrics", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
            mockExecute.mockResolvedValue({ success: true, data: {} });
        });

        it("records execution duration", async () => {
            const input = createHandlerInput();
            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("tracks request time per operation", async () => {
            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect((integrationResult.metadata as JsonObject).requestTime).toBeGreaterThanOrEqual(
                0
            );
        });
    });

    describe("execution context", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
            mockExecute.mockResolvedValue({ success: true, data: {} });
        });

        it("passes workflow context to execution router", async () => {
            const context = createTestContext({
                inputs: {
                    workflowId: "wf-test-123"
                }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: { channel: "#test", text: "Hello" },
                    nodeId: "node-integration-456"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                "slack",
                "sendMessage",
                expect.any(Object),
                expect.any(Object),
                expect.objectContaining({
                    mode: "workflow"
                })
            );
        });

        it("includes nodeId in execution context when provided", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: { channel: "#test", text: "Hello" },
                    nodeId: "my-integration-node"
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                "slack",
                "sendMessage",
                expect.any(Object),
                expect.any(Object),
                expect.objectContaining({
                    nodeId: "my-integration-node"
                })
            );
        });
    });

    describe("multiple providers", () => {
        it("handles different providers in sequence", async () => {
            // First - Slack
            mockFindByIdWithData.mockResolvedValue(createMockConnection({ provider: "slack" }));
            mockExecute.mockResolvedValue({ success: true, data: { ts: "123" } });

            const slackInput = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-slack",
                    parameters: { channel: "#alerts", text: "Alert" }
                }
            });

            await handler.execute(slackInput);
            expect(mockExecute).toHaveBeenLastCalledWith(
                "slack",
                "sendMessage",
                expect.any(Object),
                expect.any(Object),
                expect.any(Object)
            );

            // Second - Coda
            mockFindByIdWithData.mockResolvedValue(createMockConnection({ provider: "coda" }));
            mockExecute.mockResolvedValue({ success: true, data: { items: [] } });

            const codaInput = createHandlerInput({
                nodeConfig: {
                    provider: "coda",
                    operation: "listDocs",
                    connectionId: "conn-coda",
                    parameters: {}
                }
            });

            await handler.execute(codaInput);
            expect(mockExecute).toHaveBeenLastCalledWith(
                "coda",
                "listDocs",
                expect.any(Object),
                expect.any(Object),
                expect.any(Object)
            );
        });
    });
});
