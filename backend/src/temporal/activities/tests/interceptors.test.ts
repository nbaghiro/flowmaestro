/**
 * Temporal Activity Interceptor Tests
 *
 * Tests for the OTel activity interceptor that traces activity executions.
 */

import * as observability from "../../../core/observability";
import { createOTelActivityInterceptor } from "../interceptors";
import type { Context as ActivityContext } from "@temporalio/activity";
import type { ActivityExecuteInput, ActivityInboundCallsInterceptor } from "@temporalio/worker";

// Mock dependencies
jest.mock("../../../core/logging", () => ({
    createServiceLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
    })
}));

jest.mock("../../../core/observability", () => ({
    SpanType: { NODE_EXECUTION: "NODE_EXECUTION" },
    startSpan: jest.fn().mockReturnValue({
        traceId: "mock-trace-id",
        spanId: "mock-span-id"
    }),
    endSpan: jest.fn(),
    setSpanAttributes: jest.fn()
}));

const mockStartSpan = observability.startSpan as jest.Mock;
const mockEndSpan = observability.endSpan as jest.Mock;
const mockSetSpanAttributes = observability.setSpanAttributes as jest.Mock;

describe("OTel Activity Interceptor", () => {
    let mockActivityContext: ActivityContext;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock activity context
        mockActivityContext = {
            info: {
                activityType: "testActivity",
                attempt: 1,
                taskQueue: "test-queue",
                workflowExecution: {
                    workflowId: "workflow-123",
                    runId: "run-456"
                },
                workflowType: "TestWorkflow"
            }
        } as unknown as ActivityContext;
    });

    // Helper to create mock input with proper typing
    function createMockInput(args: unknown[] = []): ActivityExecuteInput {
        return {
            args,
            headers: {}
        } as ActivityExecuteInput;
    }

    // Helper to safely get the execute function
    function getExecuteFn(inbound: ActivityInboundCallsInterceptor) {
        const executeFn = inbound.execute;
        if (!executeFn) {
            throw new Error("execute method not defined");
        }
        return executeFn.bind(inbound);
    }

    describe("createOTelActivityInterceptor", () => {
        it("should create interceptor with inbound handler", () => {
            const interceptors = createOTelActivityInterceptor(mockActivityContext);

            expect(interceptors).toHaveProperty("inbound");
            expect(interceptors.inbound).toBeDefined();
        });
    });

    describe("inbound interceptor execute", () => {
        it("should start span before activity execution", async () => {
            const interceptors = createOTelActivityInterceptor(mockActivityContext);
            const inbound = interceptors.inbound as ActivityInboundCallsInterceptor;
            const execute = getExecuteFn(inbound);

            const mockInput = createMockInput(["arg1", "arg2"]);
            const mockNext = jest.fn().mockResolvedValue("result");

            await execute(mockInput, mockNext);

            expect(mockStartSpan).toHaveBeenCalledWith({
                name: "activity:testActivity",
                spanType: expect.any(String),
                entityId: "workflow-123",
                attributes: {
                    "activity.name": "testActivity",
                    "activity.attempt": 1,
                    "activity.taskQueue": "test-queue",
                    "workflow.id": "workflow-123",
                    "workflow.runId": "run-456",
                    "workflow.type": "TestWorkflow"
                }
            });
        });

        it("should call next handler", async () => {
            const interceptors = createOTelActivityInterceptor(mockActivityContext);
            const inbound = interceptors.inbound as ActivityInboundCallsInterceptor;
            const execute = getExecuteFn(inbound);

            const mockInput = createMockInput(["arg1"]);
            const mockNext = jest.fn().mockResolvedValue("activity-result");

            const result = await execute(mockInput, mockNext);

            expect(mockNext).toHaveBeenCalledWith(mockInput);
            expect(result).toBe("activity-result");
        });

        it("should set success attributes on completion", async () => {
            const interceptors = createOTelActivityInterceptor(mockActivityContext);
            const inbound = interceptors.inbound as ActivityInboundCallsInterceptor;
            const execute = getExecuteFn(inbound);

            const mockInput = createMockInput();
            const mockNext = jest.fn().mockResolvedValue("success");

            await execute(mockInput, mockNext);

            expect(mockSetSpanAttributes).toHaveBeenCalledWith(
                "mock-span-id",
                expect.objectContaining({
                    "activity.status": "completed"
                })
            );
        });

        it("should include duration in attributes", async () => {
            const interceptors = createOTelActivityInterceptor(mockActivityContext);
            const inbound = interceptors.inbound as ActivityInboundCallsInterceptor;
            const execute = getExecuteFn(inbound);

            const mockInput = createMockInput();
            const mockNext = jest.fn().mockResolvedValue("done");

            await execute(mockInput, mockNext);

            expect(mockSetSpanAttributes).toHaveBeenCalledWith(
                "mock-span-id",
                expect.objectContaining({
                    "activity.duration_ms": expect.any(Number)
                })
            );
        });

        it("should end span after successful execution", async () => {
            const interceptors = createOTelActivityInterceptor(mockActivityContext);
            const inbound = interceptors.inbound as ActivityInboundCallsInterceptor;
            const execute = getExecuteFn(inbound);

            const mockInput = createMockInput();
            const mockNext = jest.fn().mockResolvedValue("ok");

            await execute(mockInput, mockNext);

            expect(mockEndSpan).toHaveBeenCalledWith("mock-span-id");
        });

        it("should set failure attributes on error", async () => {
            const interceptors = createOTelActivityInterceptor(mockActivityContext);
            const inbound = interceptors.inbound as ActivityInboundCallsInterceptor;
            const execute = getExecuteFn(inbound);

            const mockInput = createMockInput();
            const error = new Error("Activity failed");
            const mockNext = jest.fn().mockRejectedValue(error);

            await expect(execute(mockInput, mockNext)).rejects.toThrow("Activity failed");

            expect(mockSetSpanAttributes).toHaveBeenCalledWith(
                "mock-span-id",
                expect.objectContaining({
                    "activity.status": "failed"
                })
            );
        });

        it("should end span with error on failure", async () => {
            const interceptors = createOTelActivityInterceptor(mockActivityContext);
            const inbound = interceptors.inbound as ActivityInboundCallsInterceptor;
            const execute = getExecuteFn(inbound);

            const mockInput = createMockInput();
            const error = new Error("Something went wrong");
            const mockNext = jest.fn().mockRejectedValue(error);

            await expect(execute(mockInput, mockNext)).rejects.toThrow();

            expect(mockEndSpan).toHaveBeenCalledWith("mock-span-id", {
                error
            });
        });

        it("should re-throw error after recording", async () => {
            const interceptors = createOTelActivityInterceptor(mockActivityContext);
            const inbound = interceptors.inbound as ActivityInboundCallsInterceptor;
            const execute = getExecuteFn(inbound);

            const mockInput = createMockInput();
            const error = new Error("Must propagate");
            const mockNext = jest.fn().mockRejectedValue(error);

            await expect(execute(mockInput, mockNext)).rejects.toThrow("Must propagate");
        });

        it("should handle non-Error thrown values", async () => {
            const interceptors = createOTelActivityInterceptor(mockActivityContext);
            const inbound = interceptors.inbound as ActivityInboundCallsInterceptor;
            const execute = getExecuteFn(inbound);

            const mockInput = createMockInput();
            const mockNext = jest.fn().mockRejectedValue("string error");

            await expect(execute(mockInput, mockNext)).rejects.toBe("string error");

            // Should convert to Error for span
            expect(mockEndSpan).toHaveBeenCalledWith("mock-span-id", {
                error: expect.any(Error)
            });
        });
    });

    describe("activity info extraction", () => {
        it("should use activity type as span name suffix", async () => {
            const customContext = {
                ...mockActivityContext,
                info: {
                    ...mockActivityContext.info,
                    activityType: "customActivityName"
                }
            } as unknown as ActivityContext;

            const interceptors = createOTelActivityInterceptor(customContext);
            const inbound = interceptors.inbound as ActivityInboundCallsInterceptor;
            const execute = getExecuteFn(inbound);

            const mockInput = createMockInput();
            const mockNext = jest.fn().mockResolvedValue(undefined);

            await execute(mockInput, mockNext);

            expect(mockStartSpan).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "activity:customActivityName"
                })
            );
        });

        it("should track retry attempts", async () => {
            const retryContext = {
                ...mockActivityContext,
                info: {
                    ...mockActivityContext.info,
                    attempt: 3
                }
            } as unknown as ActivityContext;

            const interceptors = createOTelActivityInterceptor(retryContext);
            const inbound = interceptors.inbound as ActivityInboundCallsInterceptor;
            const execute = getExecuteFn(inbound);

            const mockInput = createMockInput();
            const mockNext = jest.fn().mockResolvedValue(undefined);

            await execute(mockInput, mockNext);

            expect(mockStartSpan).toHaveBeenCalledWith(
                expect.objectContaining({
                    attributes: expect.objectContaining({
                        "activity.attempt": 3
                    })
                })
            );
        });
    });
});
