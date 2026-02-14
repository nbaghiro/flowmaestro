/**
 * Agent Core Activities Unit Tests
 *
 * Tests for: getAgentConfig, executeToolCall, validateInput, validateOutput,
 * tool generation utilities, and built-in functions
 */

// Mock logger utilities
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

jest.mock("../../../../temporal/core", () => ({
    activityLogger: mockLogger,
    createActivityLogger: jest.fn(() => mockLogger)
}));

// Mock all external dependencies before imports
jest.mock("../../../../storage/repositories/AgentRepository");
jest.mock("../../../../storage/repositories/AgentExecutionRepository");
jest.mock("../../../../storage/repositories/WorkflowRepository");
jest.mock("../../../../storage/repositories/ConnectionRepository");
jest.mock("../../../../storage/repositories/SafetyLogRepository");
jest.mock("../../../../core/safety/safety-pipeline");
jest.mock("../../../../tools/validation");
jest.mock("../../../../integrations/core/ExecutionRouter");
jest.mock("../../../../integrations/registry");
jest.mock("../../../../services/events/RedisEventBus");
jest.mock("../events", () => ({
    emitAgentToken: jest.fn()
}));
jest.mock("../memory", () => ({
    searchThreadMemory: jest.fn(),
    injectThreadMemoryTool: jest.fn((tools) => tools)
}));
jest.mock("../../../../core/config", () => ({
    config: {
        ai: {
            openai: { apiKey: "test-openai-key" },
            anthropic: { apiKey: "test-anthropic-key" },
            google: { apiKey: "test-google-key" },
            cohere: { apiKey: "test-cohere-key" },
            huggingface: { apiKey: "test-hf-key" }
        },
        temporal: { address: "localhost:7233" },
        redis: { host: "localhost", port: 6379 }
    }
}));
jest.mock("../../../../storage/database", () => ({
    db: {
        query: jest.fn()
    }
}));
jest.mock("../../../../services/redis", () => ({
    redis: {
        zrangebyscore: jest.fn().mockResolvedValue([]),
        zremrangebyscore: jest.fn().mockResolvedValue(0),
        zadd: jest.fn().mockResolvedValue(1),
        get: jest.fn().mockResolvedValue(null),
        incr: jest.fn().mockResolvedValue(1),
        decr: jest.fn().mockResolvedValue(0),
        expire: jest.fn().mockResolvedValue(1)
    }
}));
jest.mock("../../../../core/utils/llm-rate-limiter", () => ({
    getLLMRateLimiter: jest.fn(() => ({
        checkLimit: jest.fn().mockResolvedValue({ allowed: true }),
        recordCall: jest.fn().mockResolvedValue(undefined),
        incrementConcurrent: jest.fn().mockResolvedValue(undefined),
        decrementConcurrent: jest.fn().mockResolvedValue(undefined)
    })),
    RateLimitExceededError: class RateLimitExceededError extends Error {
        constructor(message: string) {
            super(message);
            this.name = "RateLimitExceededError";
        }
    }
}));

import type { JsonObject } from "@flowmaestro/shared";
import { SafetyPipeline } from "../../../../core/safety/safety-pipeline";
import { SafetyLogRepository } from "../../../../storage/repositories/SafetyLogRepository";
import {
    validateToolInput,
    coerceToolArguments,
    createValidationErrorResponse
} from "../../../../tools/validation";
import {
    getAgentConfig,
    executeToolCall,
    validateInput,
    validateOutput,
    logSafetyEvent,
    generateAgentTool,
    generateAgentToolName,
    generateKnowledgeBaseTool,
    generateKnowledgeBaseToolName,
    isAgentTool,
    getAgentIdFromTool
} from "../core";

import type { Tool } from "../../../../storage/models/Agent";
import type { ToolCall } from "../../../../storage/models/AgentExecution";

const mockSafetyLogRepo = jest.mocked(SafetyLogRepository);
const mockSafetyPipeline = jest.mocked(SafetyPipeline);
const mockValidateToolInput = jest.mocked(validateToolInput);
const mockCoerceToolArguments = jest.mocked(coerceToolArguments);
const mockCreateValidationErrorResponse = jest.mocked(createValidationErrorResponse);

// Helper to create a test safety context
const createTestSafetyContext = (direction: "input" | "output") => ({
    userId: "user-1",
    agentId: "agent-1",
    executionId: "exec-1",
    direction,
    messageRole: "user" as const
});

// Helper to create a test safety config (mocked anyway, just needs to be a valid object)
const createTestSafetyConfig = () =>
    ({
        enablePiiDetection: true,
        enablePromptInjectionDetection: true,
        enableContentModeration: true,
        piiRedactionEnabled: true
    }) as Parameters<typeof validateInput>[0]["config"];

describe("Agent Core Activities", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getAgentConfig", () => {
        // Note: getAgentConfig tests require complex module mocking that can't easily be done
        // with jest.mock at module level. The function is tested through integration tests.
        // These unit tests focus on the behavior using the module-level mocks.

        it("should throw error when agent not found", async () => {
            // The module-level mock returns undefined by default, triggering the "not found" error
            await expect(
                getAgentConfig({
                    agentId: "nonexistent",
                    userId: "user-1"
                })
            ).rejects.toThrow("Agent nonexistent not found or access denied");
        });
    });

    describe("executeToolCall", () => {
        const mockFunctionTool: Tool = {
            id: "tool-1",
            name: "get_current_time",
            type: "function",
            description: "Get the current time",
            schema: {
                type: "object",
                properties: {
                    timezone: { type: "string" }
                }
            },
            config: { functionName: "get_current_time" }
        };

        const mockToolCall: ToolCall = {
            id: "call-1",
            name: "get_current_time",
            arguments: { timezone: "UTC" }
        };

        it("should throw error when tool not found", async () => {
            await expect(
                executeToolCall({
                    executionId: "exec-1",
                    toolCall: { id: "call-1", name: "unknown_tool", arguments: {} },
                    availableTools: [mockFunctionTool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                })
            ).rejects.toThrow('Tool "unknown_tool" not found in available tools');
        });

        it("should throw error when tool validation fails", async () => {
            mockCoerceToolArguments.mockReturnValue({ timezone: "UTC" });
            mockValidateToolInput.mockReturnValue({
                success: false,
                error: { message: "Invalid timezone format" }
            } as ReturnType<typeof validateToolInput>);
            mockCreateValidationErrorResponse.mockReturnValue({
                error: "Validation failed",
                hint: "Check timezone format"
            });

            await expect(
                executeToolCall({
                    executionId: "exec-1",
                    toolCall: mockToolCall,
                    availableTools: [mockFunctionTool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                })
            ).rejects.toThrow("Tool validation failed");
        });

        it("should execute function tool successfully", async () => {
            mockCoerceToolArguments.mockReturnValue({ timezone: "UTC" });
            mockValidateToolInput.mockReturnValue({
                success: true,
                data: { timezone: "UTC" }
            } as ReturnType<typeof validateToolInput>);

            const result = await executeToolCall({
                executionId: "exec-1",
                toolCall: mockToolCall,
                availableTools: [mockFunctionTool],
                userId: "user-1",
                workspaceId: "workspace-1"
            });

            expect(result).toHaveProperty("timestamp");
            expect(result).toHaveProperty("timezone", "UTC");
        });

        it("should throw error for unknown tool type", async () => {
            const unknownTypeTool: Tool = {
                ...mockFunctionTool,
                type: "unknown" as Tool["type"]
            };

            mockCoerceToolArguments.mockReturnValue({});
            mockValidateToolInput.mockReturnValue({
                success: true,
                data: {}
            } as ReturnType<typeof validateToolInput>);

            await expect(
                executeToolCall({
                    executionId: "exec-1",
                    toolCall: { id: "call-1", name: "get_current_time", arguments: {} },
                    availableTools: [unknownTypeTool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                })
            ).rejects.toThrow("Unknown tool type: unknown");
        });
    });

    describe("validateInput", () => {
        it("should allow content that passes safety checks", async () => {
            const mockPipelineInstance = {
                process: jest.fn().mockResolvedValue({
                    content: "Hello, how can I help?",
                    shouldProceed: true,
                    results: [{ type: "content_moderation", action: "allow", passed: true }]
                })
            };
            mockSafetyPipeline.mockImplementation(
                () => mockPipelineInstance as unknown as SafetyPipeline
            );

            const result = await validateInput({
                content: "Hello, how can I help?",
                context: createTestSafetyContext("input"),
                config: createTestSafetyConfig()
            });

            expect(result.shouldProceed).toBe(true);
            expect(result.violations).toHaveLength(0);
            expect(result.content).toBe("Hello, how can I help?");
        });

        it("should block content that fails safety checks", async () => {
            const mockSafetyLogInstance = {
                create: jest.fn().mockResolvedValue({})
            };
            mockSafetyLogRepo.mockImplementation(
                () => mockSafetyLogInstance as unknown as SafetyLogRepository
            );

            const mockPipelineInstance = {
                process: jest.fn().mockResolvedValue({
                    content: "[BLOCKED]",
                    shouldProceed: false,
                    results: [
                        {
                            type: "content_moderation",
                            action: "block",
                            passed: false,
                            metadata: { reason: "Contains harmful content" }
                        }
                    ]
                })
            };
            mockSafetyPipeline.mockImplementation(
                () => mockPipelineInstance as unknown as SafetyPipeline
            );

            const result = await validateInput({
                content: "Some harmful content",
                context: createTestSafetyContext("input"),
                config: createTestSafetyConfig()
            });

            expect(result.shouldProceed).toBe(false);
            expect(result.violations).toHaveLength(1);
            expect(result.violations[0].action).toBe("block");
        });

        it("should redact content when safety pipeline redacts", async () => {
            const mockSafetyLogInstance = {
                create: jest.fn().mockResolvedValue({})
            };
            mockSafetyLogRepo.mockImplementation(
                () => mockSafetyLogInstance as unknown as SafetyLogRepository
            );

            const mockPipelineInstance = {
                process: jest.fn().mockResolvedValue({
                    content: "My SSN is [REDACTED]",
                    shouldProceed: true,
                    results: [
                        {
                            type: "pii_detection",
                            action: "redact",
                            passed: true,
                            redactedContent: "My SSN is [REDACTED]"
                        }
                    ]
                })
            };
            mockSafetyPipeline.mockImplementation(
                () => mockPipelineInstance as unknown as SafetyPipeline
            );

            const result = await validateInput({
                content: "My SSN is 123-45-6789",
                context: createTestSafetyContext("input"),
                config: createTestSafetyConfig()
            });

            expect(result.shouldProceed).toBe(true);
            expect(result.content).toBe("My SSN is [REDACTED]");
            expect(result.violations).toHaveLength(1);
            expect(result.violations[0].action).toBe("redact");
        });
    });

    describe("validateOutput", () => {
        it("should allow output that passes safety checks", async () => {
            const mockPipelineInstance = {
                process: jest.fn().mockResolvedValue({
                    content: "Here is the information you requested.",
                    shouldProceed: true,
                    results: [{ type: "content_moderation", action: "allow", passed: true }]
                })
            };
            mockSafetyPipeline.mockImplementation(
                () => mockPipelineInstance as unknown as SafetyPipeline
            );

            const result = await validateOutput({
                content: "Here is the information you requested.",
                context: createTestSafetyContext("output"),
                config: createTestSafetyConfig()
            });

            expect(result.shouldProceed).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        it("should block harmful output", async () => {
            const mockSafetyLogInstance = {
                create: jest.fn().mockResolvedValue({})
            };
            mockSafetyLogRepo.mockImplementation(
                () => mockSafetyLogInstance as unknown as SafetyLogRepository
            );

            const mockPipelineInstance = {
                process: jest.fn().mockResolvedValue({
                    content: "[BLOCKED]",
                    shouldProceed: false,
                    results: [{ type: "content_moderation", action: "block", passed: false }]
                })
            };
            mockSafetyPipeline.mockImplementation(
                () => mockPipelineInstance as unknown as SafetyPipeline
            );

            const result = await validateOutput({
                content: "Harmful output content",
                context: createTestSafetyContext("output"),
                config: createTestSafetyConfig()
            });

            expect(result.shouldProceed).toBe(false);
            expect(result.violations).toHaveLength(1);
        });
    });

    describe("logSafetyEvent", () => {
        it("should log safety event to database", async () => {
            const mockCreate = jest.fn().mockResolvedValue({});
            const mockSafetyLogInstance = { create: mockCreate };
            mockSafetyLogRepo.mockImplementation(
                () => mockSafetyLogInstance as unknown as SafetyLogRepository
            );

            await logSafetyEvent({
                userId: "user-1",
                agentId: "agent-1",
                executionId: "exec-1",
                threadId: "thread-1",
                result: {
                    type: "content_moderation",
                    passed: false,
                    action: "block",
                    metadata: { reason: "Test" }
                },
                direction: "input",
                originalContent: "Test content"
            });

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: "user-1",
                    agent_id: "agent-1",
                    execution_id: "exec-1",
                    thread_id: "thread-1",
                    check_type: "content_moderation",
                    action: "block",
                    direction: "input",
                    original_content: "Test content"
                })
            );
        });
    });

    describe("generateAgentToolName", () => {
        it("should generate valid tool name from agent name", () => {
            expect(generateAgentToolName("Customer Support Agent")).toBe(
                "call_customer_support_agent"
            );
        });

        it("should handle special characters", () => {
            expect(generateAgentToolName("Sales & Marketing Bot!")).toBe(
                "call_sales_marketing_bot"
            );
        });

        it("should handle names starting with numbers", () => {
            expect(generateAgentToolName("123 Bot")).toBe("call_agent_123_bot");
        });

        it("should handle empty strings", () => {
            expect(generateAgentToolName("")).toBe("call_agent_");
        });

        it("should remove leading/trailing underscores", () => {
            expect(generateAgentToolName("__test__")).toBe("call_test");
        });
    });

    describe("generateAgentTool", () => {
        it("should generate tool from agent model", () => {
            const agent = {
                id: "agent-123",
                name: "Research Assistant",
                description: "Helps with research tasks"
            };

            const tool = generateAgentTool(agent as Parameters<typeof generateAgentTool>[0]);

            expect(tool.id).toBe("agent-tool-agent-123");
            expect(tool.type).toBe("agent");
            expect(tool.name).toBe("call_research_assistant");
            expect(tool.description).toContain("Research Assistant");
            expect(tool.description).toContain("Helps with research tasks");
            expect(tool.config.agentId).toBe("agent-123");
            expect(tool.schema).toHaveProperty("properties.input");
        });

        it("should handle agent without description", () => {
            const agent = {
                id: "agent-456",
                name: "Simple Bot",
                description: null
            };

            const tool = generateAgentTool(agent as Parameters<typeof generateAgentTool>[0]);

            expect(tool.description).toContain("Simple Bot");
        });
    });

    describe("generateKnowledgeBaseToolName", () => {
        it("should generate valid tool name from KB name", () => {
            expect(generateKnowledgeBaseToolName("Product Documentation")).toBe(
                "search_product_documentation"
            );
        });

        it("should handle special characters", () => {
            expect(generateKnowledgeBaseToolName("FAQ & Support Docs")).toBe(
                "search_faq_support_docs"
            );
        });

        it("should handle names starting with numbers", () => {
            expect(generateKnowledgeBaseToolName("2024 Policies")).toBe("search_kb_2024_policies");
        });
    });

    describe("generateKnowledgeBaseTool", () => {
        it("should generate tool from knowledge base model", () => {
            const kb = {
                id: "kb-123",
                name: "Company Wiki",
                description: "Internal company documentation"
            };

            const tool = generateKnowledgeBaseTool(
                kb as Parameters<typeof generateKnowledgeBaseTool>[0]
            );

            expect(tool.id).toBe("kb-tool-kb-123");
            expect(tool.type).toBe("knowledge_base");
            expect(tool.name).toBe("search_company_wiki");
            expect(tool.description).toContain("Company Wiki");
            expect(tool.config.knowledgeBaseId).toBe("kb-123");
            expect(tool.schema.properties).toHaveProperty("query");
            expect(tool.schema.properties).toHaveProperty("topK");
            expect(tool.schema.properties).toHaveProperty("minScore");
        });
    });

    describe("isAgentTool", () => {
        it("should return true for agent tools", () => {
            const tool: Tool = {
                id: "tool-1",
                name: "call_agent",
                type: "agent",
                description: "Call an agent",
                schema: {},
                config: { agentId: "agent-1" }
            };

            expect(isAgentTool(tool)).toBe(true);
        });

        it("should return false for non-agent tools", () => {
            const tool: Tool = {
                id: "tool-1",
                name: "function",
                type: "function",
                description: "A function",
                schema: {},
                config: {}
            };

            expect(isAgentTool(tool)).toBe(false);
        });
    });

    describe("getAgentIdFromTool", () => {
        it("should extract agent ID from agent tool", () => {
            const tool: Tool = {
                id: "tool-1",
                name: "call_agent",
                type: "agent",
                description: "Call an agent",
                schema: {},
                config: { agentId: "agent-123" }
            };

            expect(getAgentIdFromTool(tool)).toBe("agent-123");
        });

        it("should return null for non-agent tools", () => {
            const tool: Tool = {
                id: "tool-1",
                name: "function",
                type: "function",
                description: "A function",
                schema: {},
                config: {}
            };

            expect(getAgentIdFromTool(tool)).toBeNull();
        });

        it("should return null when agentId is missing", () => {
            const tool: Tool = {
                id: "tool-1",
                name: "call_agent",
                type: "agent",
                description: "Call an agent",
                schema: {},
                config: {}
            };

            expect(getAgentIdFromTool(tool)).toBeNull();
        });
    });

    describe("Built-in functions", () => {
        describe("get_current_time", () => {
            it("should execute get_current_time with default timezone", async () => {
                const tool: Tool = {
                    id: "tool-1",
                    name: "get_current_time",
                    type: "function",
                    description: "Get current time",
                    schema: { type: "object", properties: {} },
                    config: { functionName: "get_current_time" }
                };

                mockCoerceToolArguments.mockReturnValue({});
                mockValidateToolInput.mockReturnValue({
                    success: true,
                    data: {}
                } as ReturnType<typeof validateToolInput>);

                const result = await executeToolCall({
                    executionId: "exec-1",
                    toolCall: { id: "call-1", name: "get_current_time", arguments: {} },
                    availableTools: [tool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                });

                expect(result).toHaveProperty("timestamp");
                expect(result).toHaveProperty("timezone", "UTC");
                expect(result).toHaveProperty("unix");
                expect(result).toHaveProperty("formatted");
            });
        });

        describe("calculate", () => {
            it("should execute calculate with valid expression", async () => {
                const tool: Tool = {
                    id: "tool-1",
                    name: "calculate",
                    type: "function",
                    description: "Calculate expression",
                    schema: { type: "object", properties: {} },
                    config: { functionName: "calculate" }
                };

                mockCoerceToolArguments.mockReturnValue({ expression: "2 + 2" });
                mockValidateToolInput.mockReturnValue({
                    success: true,
                    data: { expression: "2 + 2" }
                } as ReturnType<typeof validateToolInput>);

                const result = await executeToolCall({
                    executionId: "exec-1",
                    toolCall: {
                        id: "call-1",
                        name: "calculate",
                        arguments: { expression: "2 + 2" }
                    },
                    availableTools: [tool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                });

                expect(result).toHaveProperty("expression", "2 + 2");
                expect(result).toHaveProperty("result", 4);
            });
        });

        describe("validate_email", () => {
            it("should validate correct email format", async () => {
                const tool: Tool = {
                    id: "tool-1",
                    name: "validate_email",
                    type: "function",
                    description: "Validate email",
                    schema: { type: "object", properties: {} },
                    config: { functionName: "validate_email" }
                };

                mockCoerceToolArguments.mockReturnValue({ email: "test@example.com" });
                mockValidateToolInput.mockReturnValue({
                    success: true,
                    data: { email: "test@example.com" }
                } as ReturnType<typeof validateToolInput>);

                const result = await executeToolCall({
                    executionId: "exec-1",
                    toolCall: {
                        id: "call-1",
                        name: "validate_email",
                        arguments: { email: "test@example.com" }
                    },
                    availableTools: [tool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                });

                expect(result).toHaveProperty("isValid", true);
                expect(result).toHaveProperty("email", "test@example.com");
            });

            it("should invalidate incorrect email format", async () => {
                const tool: Tool = {
                    id: "tool-1",
                    name: "validate_email",
                    type: "function",
                    description: "Validate email",
                    schema: { type: "object", properties: {} },
                    config: { functionName: "validate_email" }
                };

                mockCoerceToolArguments.mockReturnValue({ email: "invalid-email" });
                mockValidateToolInput.mockReturnValue({
                    success: true,
                    data: { email: "invalid-email" }
                } as ReturnType<typeof validateToolInput>);

                const result = await executeToolCall({
                    executionId: "exec-1",
                    toolCall: {
                        id: "call-1",
                        name: "validate_email",
                        arguments: { email: "invalid-email" }
                    },
                    availableTools: [tool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                });

                expect(result).toHaveProperty("isValid", false);
            });
        });

        describe("generate_uuid", () => {
            it("should generate valid UUID", async () => {
                const tool: Tool = {
                    id: "tool-1",
                    name: "generate_uuid",
                    type: "function",
                    description: "Generate UUID",
                    schema: { type: "object", properties: {} },
                    config: { functionName: "generate_uuid" }
                };

                mockCoerceToolArguments.mockReturnValue({});
                mockValidateToolInput.mockReturnValue({
                    success: true,
                    data: {}
                } as ReturnType<typeof validateToolInput>);

                const result = await executeToolCall({
                    executionId: "exec-1",
                    toolCall: { id: "call-1", name: "generate_uuid", arguments: {} },
                    availableTools: [tool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                });

                expect(result).toHaveProperty("uuid");
                expect((result as JsonObject).uuid).toMatch(
                    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
                );
            });
        });

        describe("encode_base64 / decode_base64", () => {
            it("should encode text to base64", async () => {
                const tool: Tool = {
                    id: "tool-1",
                    name: "encode_base64",
                    type: "function",
                    description: "Encode to base64",
                    schema: { type: "object", properties: {} },
                    config: { functionName: "encode_base64" }
                };

                mockCoerceToolArguments.mockReturnValue({ text: "Hello World" });
                mockValidateToolInput.mockReturnValue({
                    success: true,
                    data: { text: "Hello World" }
                } as ReturnType<typeof validateToolInput>);

                const result = await executeToolCall({
                    executionId: "exec-1",
                    toolCall: {
                        id: "call-1",
                        name: "encode_base64",
                        arguments: { text: "Hello World" }
                    },
                    availableTools: [tool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                });

                expect(result).toHaveProperty("encoded", "SGVsbG8gV29ybGQ=");
            });

            it("should decode base64 to text", async () => {
                const tool: Tool = {
                    id: "tool-1",
                    name: "decode_base64",
                    type: "function",
                    description: "Decode from base64",
                    schema: { type: "object", properties: {} },
                    config: { functionName: "decode_base64" }
                };

                mockCoerceToolArguments.mockReturnValue({ encoded: "SGVsbG8gV29ybGQ=" });
                mockValidateToolInput.mockReturnValue({
                    success: true,
                    data: { encoded: "SGVsbG8gV29ybGQ=" }
                } as ReturnType<typeof validateToolInput>);

                const result = await executeToolCall({
                    executionId: "exec-1",
                    toolCall: {
                        id: "call-1",
                        name: "decode_base64",
                        arguments: { encoded: "SGVsbG8gV29ybGQ=" }
                    },
                    availableTools: [tool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                });

                expect(result).toHaveProperty("decoded", "Hello World");
            });
        });

        describe("hash_text", () => {
            it("should hash text with default sha256", async () => {
                const tool: Tool = {
                    id: "tool-1",
                    name: "hash_text",
                    type: "function",
                    description: "Hash text",
                    schema: { type: "object", properties: {} },
                    config: { functionName: "hash_text" }
                };

                mockCoerceToolArguments.mockReturnValue({ text: "Hello" });
                mockValidateToolInput.mockReturnValue({
                    success: true,
                    data: { text: "Hello" }
                } as ReturnType<typeof validateToolInput>);

                const result = await executeToolCall({
                    executionId: "exec-1",
                    toolCall: { id: "call-1", name: "hash_text", arguments: { text: "Hello" } },
                    availableTools: [tool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                });

                expect(result).toHaveProperty("algorithm", "sha256");
                expect(result).toHaveProperty("hash");
                // SHA256 of "Hello" is known
                expect((result as JsonObject).hash).toBe(
                    "185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969"
                );
            });
        });

        describe("generate_random_number", () => {
            it("should generate number within range", async () => {
                const tool: Tool = {
                    id: "tool-1",
                    name: "generate_random_number",
                    type: "function",
                    description: "Generate random number",
                    schema: { type: "object", properties: {} },
                    config: { functionName: "generate_random_number" }
                };

                mockCoerceToolArguments.mockReturnValue({ min: 1, max: 10 });
                mockValidateToolInput.mockReturnValue({
                    success: true,
                    data: { min: 1, max: 10 }
                } as ReturnType<typeof validateToolInput>);

                const result = await executeToolCall({
                    executionId: "exec-1",
                    toolCall: {
                        id: "call-1",
                        name: "generate_random_number",
                        arguments: { min: 1, max: 10 }
                    },
                    availableTools: [tool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                });

                expect(result).toHaveProperty("number");
                expect((result as JsonObject).number).toBeGreaterThanOrEqual(1);
                expect((result as JsonObject).number).toBeLessThanOrEqual(10);
            });
        });

        describe("parse_json", () => {
            it("should parse valid JSON", async () => {
                const tool: Tool = {
                    id: "tool-1",
                    name: "parse_json",
                    type: "function",
                    description: "Parse JSON",
                    schema: { type: "object", properties: {} },
                    config: { functionName: "parse_json" }
                };

                mockCoerceToolArguments.mockReturnValue({ json: '{"key": "value"}' });
                mockValidateToolInput.mockReturnValue({
                    success: true,
                    data: { json: '{"key": "value"}' }
                } as ReturnType<typeof validateToolInput>);

                const result = await executeToolCall({
                    executionId: "exec-1",
                    toolCall: {
                        id: "call-1",
                        name: "parse_json",
                        arguments: { json: '{"key": "value"}' }
                    },
                    availableTools: [tool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                });

                expect(result).toHaveProperty("success", true);
                expect(result).toHaveProperty("data");
                expect((result as JsonObject).data).toEqual({ key: "value" });
            });

            it("should handle invalid JSON", async () => {
                const tool: Tool = {
                    id: "tool-1",
                    name: "parse_json",
                    type: "function",
                    description: "Parse JSON",
                    schema: { type: "object", properties: {} },
                    config: { functionName: "parse_json" }
                };

                mockCoerceToolArguments.mockReturnValue({ json: "not valid json" });
                mockValidateToolInput.mockReturnValue({
                    success: true,
                    data: { json: "not valid json" }
                } as ReturnType<typeof validateToolInput>);

                const result = await executeToolCall({
                    executionId: "exec-1",
                    toolCall: {
                        id: "call-1",
                        name: "parse_json",
                        arguments: { json: "not valid json" }
                    },
                    availableTools: [tool],
                    userId: "user-1",
                    workspaceId: "workspace-1"
                });

                expect(result).toHaveProperty("success", false);
                expect(result).toHaveProperty("error");
            });
        });
    });
});
