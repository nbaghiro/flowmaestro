/**
 * Tracing Activities Tests
 *
 * Tests for OpenTelemetry span management and orchestration span activities.
 */

import * as observability from "../../../core/observability";
import {
    SpanType,
    createSpan,
    endSpan,
    endSpanWithError,
    setSpanAttributes,
    createAgentRunSpan,
    createIterationSpan,
    createToolCallSpan,
    createModelGenerationSpan,
    endModelGenerationSpan,
    createWorkflowRunSpan,
    endWorkflowRunSpan,
    createNodeExecutionSpan,
    endNodeExecutionSpan
} from "../tracing";

// Mock the observability module
jest.mock("../../../core/observability", () => ({
    startSpan: jest.fn().mockReturnValue({
        traceId: "mock-trace-id",
        spanId: "mock-span-id",
        parentSpanId: undefined
    }),
    endSpan: jest.fn(),
    setSpanAttributes: jest.fn(),
    setLLMAttributes: jest.fn(),
    recordWorkflowExecution: jest.fn(),
    recordWorkflowDuration: jest.fn(),
    recordNodeExecution: jest.fn(),
    recordNodeDuration: jest.fn(),
    recordLLMRequest: jest.fn(),
    recordLLMTokens: jest.fn(),
    recordLLMDuration: jest.fn(),
    recordLLMCost: jest.fn(),
    recordToolExecution: jest.fn()
}));

// Cast mocked functions for assertions
const mockStartSpan = observability.startSpan as jest.Mock;
const mockEndSpan = observability.endSpan as jest.Mock;
const mockSetSpanAttributes = observability.setSpanAttributes as jest.Mock;
const mockSetLLMAttributes = observability.setLLMAttributes as jest.Mock;
const mockRecordWorkflowExecution = observability.recordWorkflowExecution as jest.Mock;
const mockRecordWorkflowDuration = observability.recordWorkflowDuration as jest.Mock;
const mockRecordNodeExecution = observability.recordNodeExecution as jest.Mock;
const mockRecordNodeDuration = observability.recordNodeDuration as jest.Mock;
const mockRecordLLMRequest = observability.recordLLMRequest as jest.Mock;
const mockRecordLLMTokens = observability.recordLLMTokens as jest.Mock;
const mockRecordLLMDuration = observability.recordLLMDuration as jest.Mock;
const mockRecordLLMCost = observability.recordLLMCost as jest.Mock;
const mockRecordToolExecution = observability.recordToolExecution as jest.Mock;

describe("Tracing Activities", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("SpanType", () => {
        it("should export SpanType enum values", () => {
            expect(SpanType.WORKFLOW_RUN).toBeDefined();
            expect(SpanType.NODE_EXECUTION).toBeDefined();
            expect(SpanType.AGENT_RUN).toBeDefined();
            expect(SpanType.AGENT_ITERATION).toBeDefined();
            expect(SpanType.MODEL_GENERATION).toBeDefined();
            expect(SpanType.TOOL_EXECUTION).toBeDefined();
        });
    });

    describe("createSpan", () => {
        it("should create span with basic parameters", async () => {
            const result = await createSpan({
                name: "test-span",
                spanType: SpanType.NODE_EXECUTION
            });

            expect(mockStartSpan).toHaveBeenCalledWith({
                name: "test-span",
                spanType: SpanType.NODE_EXECUTION,
                entityId: undefined,
                parentSpanId: undefined,
                input: undefined,
                attributes: undefined
            });
            expect(result.traceId).toBe("mock-trace-id");
            expect(result.spanId).toBe("mock-span-id");
        });

        it("should create span with all parameters", async () => {
            await createSpan({
                name: "full-span",
                spanType: SpanType.WORKFLOW_RUN,
                entityId: "entity-123",
                parentSpanId: "parent-456",
                input: { key: "value" },
                attributes: { attr1: "val1" }
            });

            expect(mockStartSpan).toHaveBeenCalledWith({
                name: "full-span",
                spanType: SpanType.WORKFLOW_RUN,
                entityId: "entity-123",
                parentSpanId: "parent-456",
                input: { key: "value" },
                attributes: { attr1: "val1" }
            });
        });
    });

    describe("endSpan", () => {
        it("should end span with spanId only", async () => {
            await endSpan({ spanId: "span-123" });

            expect(mockEndSpan).toHaveBeenCalledWith("span-123", {
                output: undefined,
                error: undefined,
                attributes: undefined
            });
        });

        it("should end span with output", async () => {
            await endSpan({
                spanId: "span-123",
                output: { result: "success" }
            });

            expect(mockEndSpan).toHaveBeenCalledWith("span-123", {
                output: { result: "success" },
                error: undefined,
                attributes: undefined
            });
        });

        it("should end span with error", async () => {
            const error = new Error("test error");
            await endSpan({
                spanId: "span-123",
                error
            });

            expect(mockEndSpan).toHaveBeenCalledWith("span-123", {
                output: undefined,
                error,
                attributes: undefined
            });
        });

        it("should end span with attributes", async () => {
            await endSpan({
                spanId: "span-123",
                attributes: { status: "completed", durationMs: 100 }
            });

            expect(mockEndSpan).toHaveBeenCalledWith("span-123", {
                output: undefined,
                error: undefined,
                attributes: { status: "completed", durationMs: 100 }
            });
        });
    });

    describe("endSpanWithError", () => {
        it("should end span with error", async () => {
            const error = new Error("failure");
            await endSpanWithError({ spanId: "span-123", error });

            expect(mockEndSpan).toHaveBeenCalledWith("span-123", {
                error
            });
        });

        it("should handle error object format", async () => {
            const errorObj = { message: "custom error", type: "CustomError", stack: "..." };
            await endSpanWithError({ spanId: "span-123", error: errorObj });

            expect(mockEndSpan).toHaveBeenCalledWith("span-123", {
                error: errorObj
            });
        });
    });

    describe("setSpanAttributes", () => {
        it("should set attributes on span", async () => {
            await setSpanAttributes({
                spanId: "span-123",
                attributes: { key1: "value1", key2: 42, key3: true }
            });

            expect(mockSetSpanAttributes).toHaveBeenCalledWith("span-123", {
                key1: "value1",
                key2: 42,
                key3: true
            });
        });
    });

    describe("createAgentRunSpan", () => {
        it("should create agent run span", async () => {
            const result = await createAgentRunSpan({
                agentId: "agent-123",
                name: "Test Agent",
                userId: "user-456",
                sessionId: "session-789"
            });

            expect(mockStartSpan).toHaveBeenCalledWith({
                name: "Test Agent",
                spanType: SpanType.AGENT_RUN,
                entityId: "agent-123",
                input: undefined,
                attributes: {
                    userId: "user-456",
                    sessionId: "session-789"
                }
            });
            expect(result.spanId).toBe("mock-span-id");
        });

        it("should record workflow execution metric", async () => {
            await createAgentRunSpan({
                agentId: "agent-123",
                name: "Test Agent"
            });

            expect(mockRecordWorkflowExecution).toHaveBeenCalledWith({
                workflowId: "agent-123",
                userId: undefined,
                status: "started"
            });
        });
    });

    describe("createIterationSpan", () => {
        it("should create iteration span", async () => {
            await createIterationSpan({
                traceId: "trace-123",
                parentSpanId: "parent-456",
                iterationNumber: 3,
                input: { step: "process" }
            });

            expect(mockStartSpan).toHaveBeenCalledWith({
                name: "Iteration 3",
                spanType: SpanType.AGENT_ITERATION,
                parentSpanId: "parent-456",
                input: { step: "process" },
                attributes: { iterationNumber: 3 }
            });
        });
    });

    describe("createToolCallSpan", () => {
        it("should create tool call span", async () => {
            await createToolCallSpan({
                traceId: "trace-123",
                parentSpanId: "parent-456",
                toolName: "search_web",
                toolType: "external",
                input: { query: "test" }
            });

            expect(mockStartSpan).toHaveBeenCalledWith({
                name: "search_web",
                spanType: SpanType.TOOL_EXECUTION,
                parentSpanId: "parent-456",
                input: { query: "test" },
                attributes: {
                    toolName: "search_web",
                    toolType: "external"
                }
            });
        });

        it("should record tool execution metric", async () => {
            await createToolCallSpan({
                traceId: "trace-123",
                parentSpanId: "parent-456",
                toolName: "calculator"
            });

            expect(mockRecordToolExecution).toHaveBeenCalledWith({
                toolName: "calculator",
                status: "success"
            });
        });
    });

    describe("createModelGenerationSpan", () => {
        it("should create model generation span", async () => {
            await createModelGenerationSpan({
                traceId: "trace-123",
                parentSpanId: "parent-456",
                modelId: "gpt-4",
                provider: "openai",
                temperature: 0.7,
                maxTokens: 1000
            });

            expect(mockStartSpan).toHaveBeenCalledWith({
                name: "openai/gpt-4",
                spanType: SpanType.MODEL_GENERATION,
                parentSpanId: "parent-456",
                input: undefined,
                attributes: {
                    modelId: "gpt-4",
                    provider: "openai",
                    temperature: 0.7,
                    maxTokens: 1000
                }
            });
        });

        it("should set LLM-specific attributes", async () => {
            await createModelGenerationSpan({
                traceId: "trace-123",
                parentSpanId: "parent-456",
                modelId: "claude-3",
                provider: "anthropic",
                temperature: 0.5,
                maxTokens: 2000
            });

            expect(mockSetLLMAttributes).toHaveBeenCalledWith("mock-span-id", {
                provider: "anthropic",
                model: "claude-3",
                temperature: 0.5,
                maxTokens: 2000
            });
        });
    });

    describe("endModelGenerationSpan", () => {
        it("should end model generation span with metrics", async () => {
            await endModelGenerationSpan({
                spanId: "span-123",
                provider: "openai",
                model: "gpt-4",
                promptTokens: 100,
                completionTokens: 50,
                totalCost: 0.01,
                durationMs: 500
            });

            // Check LLM attributes were set
            expect(mockSetLLMAttributes).toHaveBeenCalledWith("span-123", {
                provider: "openai",
                model: "gpt-4",
                promptTokens: 100,
                completionTokens: 50,
                totalTokens: 150,
                totalCost: 0.01
            });

            // Check metrics were recorded
            expect(mockRecordLLMRequest).toHaveBeenCalled();
            expect(mockRecordLLMTokens).toHaveBeenCalled();
            expect(mockRecordLLMDuration).toHaveBeenCalledWith(expect.any(Object), 500);
            expect(mockRecordLLMCost).toHaveBeenCalledWith(expect.any(Object), 0.01);
        });

        it("should handle error in model generation", async () => {
            const error = new Error("API error");
            await endModelGenerationSpan({
                spanId: "span-123",
                provider: "openai",
                model: "gpt-4",
                error
            });

            expect(mockRecordLLMRequest).toHaveBeenCalledWith({
                provider: "openai",
                model: "gpt-4",
                status: "error"
            });
            expect(mockEndSpan).toHaveBeenCalledWith("span-123", {
                output: undefined,
                error
            });
        });

        it("should handle partial token information", async () => {
            await endModelGenerationSpan({
                spanId: "span-123",
                provider: "anthropic",
                model: "claude-3"
                // No token info provided
            });

            expect(mockSetLLMAttributes).toHaveBeenCalledWith("span-123", {
                provider: "anthropic",
                model: "claude-3"
            });
            // Token metrics should not be recorded
            expect(mockRecordLLMTokens).not.toHaveBeenCalled();
        });
    });

    describe("createWorkflowRunSpan", () => {
        it("should create workflow run span", async () => {
            await createWorkflowRunSpan({
                workflowId: "wf-123",
                name: "My Workflow",
                userId: "user-456",
                requestId: "req-789"
            });

            expect(mockStartSpan).toHaveBeenCalledWith({
                name: "My Workflow",
                spanType: SpanType.WORKFLOW_RUN,
                entityId: "wf-123",
                input: undefined,
                attributes: {
                    userId: "user-456",
                    requestId: "req-789"
                }
            });
        });

        it("should record workflow execution started metric", async () => {
            await createWorkflowRunSpan({
                workflowId: "wf-123",
                name: "Test Workflow",
                userId: "user-456"
            });

            expect(mockRecordWorkflowExecution).toHaveBeenCalledWith({
                workflowId: "wf-123",
                userId: "user-456",
                status: "started"
            });
        });
    });

    describe("endWorkflowRunSpan", () => {
        it("should end workflow run span with success", async () => {
            await endWorkflowRunSpan({
                spanId: "span-123",
                workflowId: "wf-456",
                userId: "user-789",
                durationMs: 5000,
                status: "completed",
                output: { result: "done" }
            });

            expect(mockRecordWorkflowExecution).toHaveBeenCalledWith({
                workflowId: "wf-456",
                userId: "user-789",
                status: "completed"
            });
            expect(mockRecordWorkflowDuration).toHaveBeenCalledWith(
                {
                    workflowId: "wf-456",
                    userId: "user-789",
                    status: "completed"
                },
                5000
            );
            expect(mockEndSpan).toHaveBeenCalledWith("span-123", {
                output: { result: "done" },
                error: undefined,
                attributes: {
                    durationMs: 5000,
                    status: "completed"
                }
            });
        });

        it("should end workflow run span with failure", async () => {
            const error = new Error("workflow failed");
            await endWorkflowRunSpan({
                spanId: "span-123",
                workflowId: "wf-456",
                durationMs: 3000,
                status: "failed",
                error
            });

            expect(mockRecordWorkflowExecution).toHaveBeenCalledWith({
                workflowId: "wf-456",
                userId: undefined,
                status: "failed"
            });
        });
    });

    describe("createNodeExecutionSpan", () => {
        it("should create node execution span", async () => {
            await createNodeExecutionSpan({
                traceId: "trace-123",
                parentSpanId: "parent-456",
                nodeId: "node-789",
                nodeName: "HTTP Request",
                nodeType: "http",
                workflowId: "wf-000"
            });

            expect(mockStartSpan).toHaveBeenCalledWith({
                name: "HTTP Request",
                spanType: SpanType.NODE_EXECUTION,
                entityId: "node-789",
                parentSpanId: "parent-456",
                input: undefined,
                attributes: {
                    nodeId: "node-789",
                    nodeType: "http",
                    workflowId: "wf-000"
                }
            });
        });

        it("should record node execution started metric", async () => {
            await createNodeExecutionSpan({
                traceId: "trace-123",
                parentSpanId: "parent-456",
                nodeId: "node-789",
                nodeName: "LLM Call",
                nodeType: "llm",
                workflowId: "wf-000"
            });

            expect(mockRecordNodeExecution).toHaveBeenCalledWith({
                workflowId: "wf-000",
                nodeId: "node-789",
                nodeType: "llm",
                status: "started"
            });
        });

        it("should not record metric without workflowId or nodeType", async () => {
            await createNodeExecutionSpan({
                traceId: "trace-123",
                parentSpanId: "parent-456",
                nodeId: "node-789",
                nodeName: "Node"
            });

            expect(mockRecordNodeExecution).not.toHaveBeenCalled();
        });
    });

    describe("endNodeExecutionSpan", () => {
        it("should end node execution span with success", async () => {
            await endNodeExecutionSpan({
                spanId: "span-123",
                workflowId: "wf-456",
                nodeId: "node-789",
                nodeType: "transform",
                durationMs: 200,
                status: "completed",
                output: { data: "transformed" }
            });

            expect(mockRecordNodeExecution).toHaveBeenCalledWith({
                workflowId: "wf-456",
                nodeId: "node-789",
                nodeType: "transform",
                status: "completed"
            });
            expect(mockRecordNodeDuration).toHaveBeenCalledWith(
                {
                    workflowId: "wf-456",
                    nodeId: "node-789",
                    nodeType: "transform",
                    status: "completed"
                },
                200
            );
        });

        it("should end node execution span with error", async () => {
            const error = new Error("node failed");
            await endNodeExecutionSpan({
                spanId: "span-123",
                workflowId: "wf-456",
                nodeId: "node-789",
                nodeType: "http",
                durationMs: 5000,
                status: "failed",
                error
            });

            expect(mockRecordNodeExecution).toHaveBeenCalledWith({
                workflowId: "wf-456",
                nodeId: "node-789",
                nodeType: "http",
                status: "failed"
            });
            expect(mockEndSpan).toHaveBeenCalledWith("span-123", {
                output: undefined,
                error,
                attributes: {
                    durationMs: 5000,
                    status: "failed"
                }
            });
        });

        it("should handle skipped status", async () => {
            await endNodeExecutionSpan({
                spanId: "span-123",
                workflowId: "wf-456",
                nodeId: "node-789",
                nodeType: "conditional",
                durationMs: 10,
                status: "skipped"
            });

            expect(mockRecordNodeExecution).toHaveBeenCalledWith({
                workflowId: "wf-456",
                nodeId: "node-789",
                nodeType: "conditional",
                status: "skipped"
            });
        });
    });
});
