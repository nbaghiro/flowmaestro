/**
 * Action Node Handler Unit Tests
 *
 * Tests action node handler with mocked external dependencies:
 * - ConnectionRepository mocked for connection lookup
 * - ExecutionRouter mocked for provider operations
 * - Full handler execution tests with various providers
 */

// Mock config before importing handler
jest.mock("../../../src/core/config", () => ({
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
jest.mock("../../../src/storage/database", () => ({
    Database: {
        getInstance: jest.fn().mockReturnValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            getPool: jest.fn()
        })
    }
}));

// Mock ConnectionRepository
const mockFindByIdWithData = jest.fn();
jest.mock("../../../src/storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => ({
        findByIdWithData: mockFindByIdWithData
    }))
}));

// Mock ExecutionRouter
const mockExecute = jest.fn();
jest.mock("../../../src/integrations/core/ExecutionRouter", () => ({
    ExecutionRouter: jest.fn().mockImplementation(() => ({
        execute: mockExecute
    }))
}));

// Mock provider registry
jest.mock("../../../src/integrations/registry", () => ({
    providerRegistry: {}
}));

import type { JsonObject } from "@flowmaestro/shared";
import {
    ActionNodeHandler,
    createActionNodeHandler
} from "../../../src/temporal/activities/execution/handlers/outputs/action";
import { createTestContext, createTestMetadata } from "../../helpers/handler-test-utils";
import { setupHttpMocking, teardownHttpMocking, clearHttpMocks } from "../../helpers/http-mock";
import type { ContextSnapshot } from "../../../src/temporal/core/types";

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
            text: "Hello from workflow!"
        }
    };

    return {
        nodeType: overrides.nodeType || "action",
        nodeConfig: { ...defaultConfig, ...overrides.nodeConfig },
        context: overrides.context || createTestContext(),
        metadata: createTestMetadata({ nodeId: "test-node-123" })
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
        name: "My Slack Connection",
        status: overrides.status || "active",
        data: overrides.data || {
            access_token: "xoxb-test-token",
            team_id: "T12345"
        },
        created_at: new Date(),
        updated_at: new Date()
    };
}

describe("ActionNodeHandler", () => {
    let handler: ActionNodeHandler;

    beforeAll(() => {
        setupHttpMocking();
    });

    afterAll(() => {
        teardownHttpMocking();
    });

    beforeEach(() => {
        handler = createActionNodeHandler();
        jest.clearAllMocks();
        clearHttpMocks();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("ActionNodeHandler");
        });

        it("supports action node type", () => {
            expect(handler.supportedNodeTypes).toContain("action");
        });

        it("can handle action type", () => {
            expect(handler.canHandle("action")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("output")).toBe(false);
            expect(handler.canHandle("integration")).toBe(false);
            expect(handler.canHandle("http")).toBe(false);
        });
    });

    describe("connection validation", () => {
        it("throws error when connection not found", async () => {
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

            expect(result.actionResult).toBeDefined();
            const actionResult = result.actionResult as JsonObject;
            expect(actionResult.success).toBe(false);
            expect(actionResult.error).toBeDefined();
            expect((actionResult.error as JsonObject).message).toContain("not found");
        });

        it("throws error when connection is not active", async () => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection({ status: "expired" }));

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: { channel: "#test", text: "Hello" }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.actionResult).toBeDefined();
            const actionResult = result.actionResult as JsonObject;
            expect(actionResult.success).toBe(false);
            expect((actionResult.error as JsonObject).message).toContain("not active");
        });

        it("retrieves connection credentials from repository", async () => {
            const mockConnection = createMockConnection();
            mockFindByIdWithData.mockResolvedValue(mockConnection);
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

        it("executes Slack sendMessage action", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: {
                    ok: true,
                    channel: "C12345",
                    ts: "1234567890.123456",
                    message: {
                        text: "Hello from workflow!",
                        user: "U12345"
                    }
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {
                        channel: "#general",
                        text: "Hello from workflow!"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.actionResult).toBeDefined();
            const actionResult = result.actionResult as JsonObject;
            expect(actionResult.success).toBe(true);
            expect(actionResult.provider).toBe("slack");
            expect(actionResult.operation).toBe("sendMessage");
            expect((actionResult.data as JsonObject).ok).toBe(true);
        });

        it("passes parameters to Slack provider", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { ok: true, ts: "123" }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: {
                        channel: "#alerts",
                        text: "Alert: High CPU usage",
                        thread_ts: "1234567890.000000"
                    }
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                "slack",
                "sendMessage",
                {
                    channel: "#alerts",
                    text: "Alert: High CPU usage",
                    thread_ts: "1234567890.000000"
                },
                expect.any(Object),
                expect.any(Object)
            );
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

        it("executes Gmail sendEmail action", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: {
                    id: "msg-12345",
                    threadId: "thread-12345",
                    labelIds: ["SENT"]
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "gmail",
                    operation: "sendEmail",
                    connectionId: "conn-gmail",
                    parameters: {
                        to: "user@example.com",
                        subject: "Workflow notification",
                        body: "Your workflow has completed successfully."
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const actionResult = result.actionResult as JsonObject;
            expect(actionResult.success).toBe(true);
            expect(actionResult.provider).toBe("gmail");
            expect(actionResult.operation).toBe("sendEmail");
            expect((actionResult.data as JsonObject).id).toBe("msg-12345");
        });

        it("handles Gmail with CC and attachments", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { id: "msg-with-cc", threadId: "thread-456" }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "gmail",
                    operation: "sendEmail",
                    connectionId: "conn-gmail",
                    parameters: {
                        to: "primary@example.com",
                        cc: "cc@example.com",
                        subject: "Report",
                        body: "Please see attached report.",
                        attachments: [
                            {
                                filename: "report.pdf",
                                content: "base64-encoded-content"
                            }
                        ]
                    }
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                "gmail",
                "sendEmail",
                expect.objectContaining({
                    to: "primary@example.com",
                    cc: "cc@example.com",
                    attachments: expect.any(Array)
                }),
                expect.any(Object),
                expect.any(Object)
            );
        });
    });

    describe("Discord provider execution", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(
                createMockConnection({
                    provider: "discord",
                    data: {
                        access_token: "discord-bot-token",
                        guild_id: "guild-123"
                    }
                })
            );
        });

        it("executes Discord sendMessage action", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: {
                    id: "discord-msg-123",
                    channel_id: "channel-456",
                    content: "Hello Discord!"
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "discord",
                    operation: "sendMessage",
                    connectionId: "conn-discord",
                    parameters: {
                        channelId: "channel-456",
                        content: "Hello Discord!"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const actionResult = result.actionResult as JsonObject;
            expect(actionResult.success).toBe(true);
            expect(actionResult.provider).toBe("discord");
        });

        it("handles Discord embed messages", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { id: "msg-with-embed" }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "discord",
                    operation: "sendMessage",
                    connectionId: "conn-discord",
                    parameters: {
                        channelId: "channel-789",
                        embeds: [
                            {
                                title: "Workflow Complete",
                                description: "Your workflow finished successfully",
                                color: 0x00ff00
                            }
                        ]
                    }
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                "discord",
                "sendMessage",
                expect.objectContaining({
                    embeds: expect.any(Array)
                }),
                expect.any(Object),
                expect.any(Object)
            );
        });
    });

    describe("output handling", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
        });

        it("returns action result on success", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { messageId: "msg-success" }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.actionResult).toBeDefined();
            const actionResult = result.actionResult as JsonObject;
            expect(actionResult.success).toBe(true);
            expect(actionResult.data).toEqual({ messageId: "msg-success" });
        });

        it("uses outputVariable when specified", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { id: "custom-output-id" }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: { channel: "#test", text: "Hello" },
                    outputVariable: "slackResponse"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.slackResponse).toEqual({ id: "custom-output-id" });
        });

        it("sets outputVariable to null on failure with custom output", async () => {
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
                    parameters: { channel: "#nonexistent", text: "Hello" },
                    outputVariable: "slackResponse"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            // When using custom outputVariable and operation returns success: false,
            // the outputVariable is set to null (data is not set on failure)
            expect(result.slackResponse).toBeNull();
        });

        it("includes request time in metadata", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { ok: true }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const actionResult = result.actionResult as JsonObject;
            expect(actionResult.metadata).toBeDefined();
            expect((actionResult.metadata as JsonObject).requestTime).toBeGreaterThanOrEqual(0);
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
                    message: "channel_not_found",
                    retryable: false
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: { channel: "#invalid", text: "Hello" }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const actionResult = result.actionResult as JsonObject;
            expect(actionResult.success).toBe(false);
            expect(actionResult.error).toBeDefined();
        });

        it("handles authentication errors", async () => {
            mockExecute.mockResolvedValue({
                success: false,
                error: {
                    type: "auth_error",
                    message: "invalid_auth",
                    retryable: false
                }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const actionResult = result.actionResult as JsonObject;
            expect(actionResult.success).toBe(false);
            expect((actionResult.error as JsonObject).type).toBe("auth_error");
        });

        it("handles rate limit errors with retryable flag", async () => {
            mockExecute.mockResolvedValue({
                success: false,
                error: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const actionResult = result.actionResult as JsonObject;
            expect(actionResult.success).toBe(false);
            expect((actionResult.error as JsonObject).type).toBe("rate_limit");
            expect((actionResult.error as JsonObject).retryable).toBe(true);
        });

        it("handles execution exceptions", async () => {
            mockExecute.mockRejectedValue(new Error("Network timeout"));

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const actionResult = result.actionResult as JsonObject;
            expect(actionResult.success).toBe(false);
            expect((actionResult.error as JsonObject).message).toContain("Network timeout");
        });

        it("includes error details in result", async () => {
            mockExecute.mockResolvedValue({
                success: false,
                error: {
                    type: "validation_error",
                    message: "Missing required field: channel",
                    retryable: false
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: { text: "Hello" } // Missing channel
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const actionResult = result.actionResult as JsonObject;
            expect(actionResult.error).toBeDefined();
            const error = actionResult.error as JsonObject;
            expect(error.type).toBe("validation_error");
            expect(error.message).toContain("Missing required field");
        });
    });

    describe("metrics", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
        });

        it("records execution duration", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { ok: true }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("tracks request time per action", async () => {
            mockExecute.mockResolvedValue({
                success: true,
                data: { ok: true }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const actionResult = result.actionResult as JsonObject;
            expect((actionResult.metadata as JsonObject).requestTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe("execution context", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
            mockExecute.mockResolvedValue({
                success: true,
                data: { ok: true }
            });
        });

        it("passes workflow context to execution router", async () => {
            const context = createTestContext({
                inputs: {
                    workflowId: "wf-test-123",
                    nodeId: "node-action-456"
                }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-123",
                    parameters: { channel: "#test", text: "Hello" },
                    nodeId: "node-action-456"
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

        it("handles multiple providers in sequence", async () => {
            // First action - Slack
            const slackInput = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-slack",
                    parameters: { channel: "#alerts", text: "Alert sent" }
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

            // Second action - Discord (would be different handler call in workflow)
            mockFindByIdWithData.mockResolvedValue(createMockConnection({ provider: "discord" }));

            const discordInput = createHandlerInput({
                nodeConfig: {
                    provider: "discord",
                    operation: "sendMessage",
                    connectionId: "conn-discord",
                    parameters: { channelId: "chan-123", content: "Discord alert" }
                }
            });

            await handler.execute(discordInput);
            expect(mockExecute).toHaveBeenLastCalledWith(
                "discord",
                "sendMessage",
                expect.any(Object),
                expect.any(Object),
                expect.any(Object)
            );
        });
    });

    describe("provider-specific operations", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
            mockExecute.mockResolvedValue({
                success: true,
                data: { ok: true }
            });
        });

        it("handles Slack updateMessage operation", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "updateMessage",
                    connectionId: "conn-123",
                    parameters: {
                        channel: "#general",
                        ts: "1234567890.123456",
                        text: "Updated message content"
                    }
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                "slack",
                "updateMessage",
                expect.objectContaining({
                    ts: "1234567890.123456",
                    text: "Updated message content"
                }),
                expect.any(Object),
                expect.any(Object)
            );
        });

        it("handles Slack deleteMessage operation", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "deleteMessage",
                    connectionId: "conn-123",
                    parameters: {
                        channel: "#general",
                        ts: "1234567890.123456"
                    }
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                "slack",
                "deleteMessage",
                expect.objectContaining({
                    channel: "#general",
                    ts: "1234567890.123456"
                }),
                expect.any(Object),
                expect.any(Object)
            );
        });

        it("handles Notion createPage operation", async () => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection({ provider: "notion" }));

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "notion",
                    operation: "createPage",
                    connectionId: "conn-notion",
                    parameters: {
                        parentId: "database-123",
                        properties: {
                            Name: { title: [{ text: { content: "New Page" } }] },
                            Status: { select: { name: "In Progress" } }
                        }
                    }
                }
            });

            await handler.execute(input);

            expect(mockExecute).toHaveBeenCalledWith(
                "notion",
                "createPage",
                expect.objectContaining({
                    parentId: "database-123",
                    properties: expect.any(Object)
                }),
                expect.any(Object),
                expect.any(Object)
            );
        });
    });
});
