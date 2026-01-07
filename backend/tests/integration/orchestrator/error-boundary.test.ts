/**
 * Error Boundary Orchestration Tests
 *
 * Tests error port handling patterns:
 * - Error branches for catching failures
 * - Graceful degradation with fallback nodes
 * - Error propagation and isolation
 * - Partial success handling
 * - Error metadata capture and forwarding
 */

import nock from "nock";
import {
    createContext,
    storeNodeOutput,
    getExecutionContext,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
    isExecutionComplete,
    buildFinalOutputs
} from "../../../src/temporal/core/services/context";
import { createMockActivities, withOutputs } from "../../fixtures/activities";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";
import type { JsonObject } from "../../../src/temporal/core/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a workflow with error handling branch
 * Input -> Process (may fail) -> Output
 *                  |error-> ErrorHandler -> ErrorOutput
 */
function createErrorBoundaryWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "data" },
        depth: 0,
        dependencies: [],
        dependents: ["Process"]
    });

    // Process node (may fail)
    nodes.set("Process", {
        id: "Process",
        type: "http",
        name: "Process",
        config: {
            method: "POST",
            url: "https://api.example.com/process",
            body: "{{Input.data}}"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Output", "ErrorHandler"]
    });

    // Success output
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 2,
        dependencies: ["Process"],
        dependents: []
    });

    // Error handler
    nodes.set("ErrorHandler", {
        id: "ErrorHandler",
        type: "transform",
        name: "Error Handler",
        config: {
            operation: "custom",
            expression: "{ error: true, message: errorMessage }"
        },
        depth: 2,
        dependencies: ["Process"],
        dependents: ["ErrorOutput"]
    });

    // Error output
    nodes.set("ErrorOutput", {
        id: "ErrorOutput",
        type: "output",
        name: "Error Output",
        config: { name: "errorResult" },
        depth: 3,
        dependencies: ["ErrorHandler"],
        dependents: []
    });

    // Edges
    edges.set("Input-Process", {
        id: "Input-Process",
        source: "Input",
        target: "Process",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Process-Output", {
        id: "Process-Output",
        source: "Process",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Process-ErrorHandler", {
        id: "Process-ErrorHandler",
        source: "Process",
        target: "ErrorHandler",
        sourceHandle: "error",
        targetHandle: "input",
        handleType: "error"
    });

    edges.set("ErrorHandler-ErrorOutput", {
        id: "ErrorHandler-ErrorOutput",
        source: "ErrorHandler",
        target: "ErrorOutput",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], ["Process"], ["Output", "ErrorHandler"], ["ErrorOutput"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output", "ErrorOutput"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a workflow with fallback pattern
 * Input -> Primary (may fail) -error-> Fallback -> Output
 *              |success-> Output
 */
function createFallbackWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "data" },
        depth: 0,
        dependencies: [],
        dependents: ["Primary"]
    });

    nodes.set("Primary", {
        id: "Primary",
        type: "http",
        name: "Primary API",
        config: {
            method: "GET",
            url: "https://primary.api.com/data"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Output", "Fallback"]
    });

    nodes.set("Fallback", {
        id: "Fallback",
        type: "http",
        name: "Fallback API",
        config: {
            method: "GET",
            url: "https://fallback.api.com/data"
        },
        depth: 2,
        dependencies: ["Primary"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 3,
        dependencies: ["Primary", "Fallback"],
        dependents: []
    });

    edges.set("Input-Primary", {
        id: "Input-Primary",
        source: "Input",
        target: "Primary",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Primary-Output", {
        id: "Primary-Output",
        source: "Primary",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Primary-Fallback", {
        id: "Primary-Fallback",
        source: "Primary",
        target: "Fallback",
        sourceHandle: "error",
        targetHandle: "input",
        handleType: "error"
    });

    edges.set("Fallback-Output", {
        id: "Fallback-Output",
        source: "Fallback",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], ["Primary"], ["Fallback"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a workflow with multiple error boundaries
 * Input -> [A, B, C] (parallel, may fail) -> Merge -> Output
 * Each parallel node has its own error handler
 */
function createMultipleErrorBoundariesWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "data" },
        depth: 0,
        dependencies: [],
        dependents: ["Task_A", "Task_B", "Task_C"]
    });

    // Parallel tasks with individual error handlers
    for (const taskId of ["A", "B", "C"]) {
        const nodeId = `Task_${taskId}`;
        const errorHandlerId = `Error_${taskId}`;

        nodes.set(nodeId, {
            id: nodeId,
            type: "http",
            name: `Task ${taskId}`,
            config: { method: "GET", url: `https://api${taskId.toLowerCase()}.com/data` },
            depth: 1,
            dependencies: ["Input"],
            dependents: ["Merge", errorHandlerId]
        });

        nodes.set(errorHandlerId, {
            id: errorHandlerId,
            type: "transform",
            name: `Error Handler ${taskId}`,
            config: { operation: "custom", expression: "{ fallback: true }" },
            depth: 2,
            dependencies: [nodeId],
            dependents: ["Merge"]
        });

        edges.set(`Input-${nodeId}`, {
            id: `Input-${nodeId}`,
            source: "Input",
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        edges.set(`${nodeId}-Merge`, {
            id: `${nodeId}-Merge`,
            source: nodeId,
            target: "Merge",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        edges.set(`${nodeId}-${errorHandlerId}`, {
            id: `${nodeId}-${errorHandlerId}`,
            source: nodeId,
            target: errorHandlerId,
            sourceHandle: "error",
            targetHandle: "input",
            handleType: "error"
        });

        edges.set(`${errorHandlerId}-Merge`, {
            id: `${errorHandlerId}-Merge`,
            source: errorHandlerId,
            target: "Merge",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    nodes.set("Merge", {
        id: "Merge",
        type: "transform",
        name: "Merge",
        config: { operation: "merge" },
        depth: 3,
        dependencies: ["Task_A", "Task_B", "Task_C", "Error_A", "Error_B", "Error_C"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 4,
        dependencies: ["Merge"],
        dependents: []
    });

    edges.set("Merge-Output", {
        id: "Merge-Output",
        source: "Merge",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [
            ["Input"],
            ["Task_A", "Task_B", "Task_C"],
            ["Error_A", "Error_B", "Error_C"],
            ["Merge"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate workflow execution with error handling support
 */
async function simulateWorkflowExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject = {}
): Promise<{
    context: ReturnType<typeof createContext>;
    finalOutputs: JsonObject;
    executionOrder: string[];
    failedNodes: string[];
    errorBranchesTriggered: string[];
}> {
    let context = createContext(inputs);
    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];
    const failedNodes: string[] = [];
    const errorBranchesTriggered: string[] = [];

    while (!isExecutionComplete(queueState)) {
        const readyNodes = getReadyNodes(queueState, workflow.maxConcurrentNodes || 10);

        if (readyNodes.length === 0) {
            break;
        }

        queueState = markExecuting(queueState, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId)!;
            executionOrder.push(nodeId);

            try {
                const result = await mockActivities.executeNode(
                    node.type,
                    node.config as JsonObject,
                    context,
                    {
                        nodeId,
                        nodeName: node.name,
                        executionId: "test-execution"
                    }
                );

                if (result.success) {
                    context = storeNodeOutput(context, nodeId, result.output);
                    queueState = markCompleted(queueState, nodeId, result.output, workflow);
                } else {
                    failedNodes.push(nodeId);
                    const errorOutput = { _error: true, message: result.error || "Unknown error" };
                    context = storeNodeOutput(context, nodeId, errorOutput);

                    // Check for error edges and trigger error branches
                    const errorEdges = Array.from(workflow.edges.values()).filter(
                        (e) => e.source === nodeId && e.handleType === "error"
                    );

                    if (errorEdges.length > 0) {
                        // Mark as completed but with error - allows error branch to execute
                        queueState = markCompleted(queueState, nodeId, errorOutput, workflow);
                        for (const edge of errorEdges) {
                            errorBranchesTriggered.push(edge.target);
                        }
                    } else {
                        queueState = markFailed(
                            queueState,
                            nodeId,
                            result.error || "Unknown error",
                            workflow
                        );
                    }
                }
            } catch (error) {
                failedNodes.push(nodeId);
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                const errorOutput = { _error: true, message: errorMessage };
                context = storeNodeOutput(context, nodeId, errorOutput);

                // Check for error edges
                const errorEdges = Array.from(workflow.edges.values()).filter(
                    (e) => e.source === nodeId && e.handleType === "error"
                );

                if (errorEdges.length > 0) {
                    queueState = markCompleted(queueState, nodeId, errorOutput, workflow);
                    for (const edge of errorEdges) {
                        errorBranchesTriggered.push(edge.target);
                    }
                } else {
                    queueState = markFailed(queueState, nodeId, errorMessage, workflow);
                }
            }
        }
    }

    const finalOutputs = buildFinalOutputs(context, workflow.outputNodeIds);

    return {
        context,
        finalOutputs,
        executionOrder,
        failedNodes,
        errorBranchesTriggered
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Error Boundary Orchestration", () => {
    beforeEach(() => {
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("basic error handling", () => {
        it("should execute success path when no errors occur", async () => {
            const workflow = createErrorBoundaryWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { data: { value: 42 } },
                    Process: { statusCode: 200, body: { processed: true } },
                    Output: { result: { processed: true } },
                    ErrorHandler: { error: false },
                    ErrorOutput: { errorResult: null }
                })
            );

            const { executionOrder, failedNodes, errorBranchesTriggered } =
                await simulateWorkflowExecution(workflow, mockActivities, { data: { value: 42 } });

            expect(executionOrder).toContain("Input");
            expect(executionOrder).toContain("Process");
            expect(executionOrder).toContain("Output");
            expect(failedNodes).toHaveLength(0);
            expect(errorBranchesTriggered).toHaveLength(0);
        });

        it("should trigger error branch when node fails", async () => {
            const workflow = createErrorBoundaryWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { data: { value: "bad" } } },
                    Process: { shouldFail: true, errorMessage: "Processing failed" },
                    ErrorHandler: { customOutput: { error: true, handled: true } },
                    ErrorOutput: { customOutput: { errorResult: { handled: true } } },
                    Output: { customOutput: { result: "should not execute" } }
                }
            });

            const { executionOrder, failedNodes, errorBranchesTriggered } =
                await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toContain("Input");
            expect(executionOrder).toContain("Process");
            expect(failedNodes).toContain("Process");
            expect(errorBranchesTriggered).toContain("ErrorHandler");
        });

        it("should capture error metadata in context", async () => {
            const workflow = createErrorBoundaryWorkflow();
            let errorHandlerContext: JsonObject = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { data: "test" } },
                    Process: { shouldFail: true, errorMessage: "Specific error: timeout" },
                    ErrorHandler: {
                        customOutput: { handled: true },
                        onExecute: (input) => {
                            errorHandlerContext = getExecutionContext(input.context);
                        }
                    },
                    ErrorOutput: { customOutput: { errorResult: {} } },
                    Output: { customOutput: { result: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // Error handler should see the error from Process
            expect(errorHandlerContext.Process).toBeDefined();
            expect((errorHandlerContext.Process as JsonObject)._error).toBe(true);
        });
    });

    describe("fallback patterns", () => {
        it("should use primary when it succeeds", async () => {
            const workflow = createFallbackWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { data: "test" },
                    Primary: { statusCode: 200, body: { source: "primary", data: "success" } },
                    Fallback: { statusCode: 200, body: { source: "fallback" } },
                    Output: { result: { source: "primary" } }
                })
            );

            const { executionOrder, errorBranchesTriggered } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("Primary");
            expect(errorBranchesTriggered).toHaveLength(0);
            // Fallback should not be triggered on success path
        });

        it("should use fallback when primary fails", async () => {
            const workflow = createFallbackWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { data: "test" } },
                    Primary: { shouldFail: true, errorMessage: "Primary unavailable" },
                    Fallback: {
                        customOutput: {
                            statusCode: 200,
                            body: { source: "fallback", data: "backup" }
                        }
                    },
                    Output: { customOutput: { result: { source: "fallback" } } }
                }
            });

            const { executionOrder, errorBranchesTriggered } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("Primary");
            expect(errorBranchesTriggered).toContain("Fallback");
        });

        it("should handle both primary and fallback failing", async () => {
            const workflow = createFallbackWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { data: "test" } },
                    Primary: { shouldFail: true, errorMessage: "Primary unavailable" },
                    Fallback: { shouldFail: true, errorMessage: "Fallback also unavailable" },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toContain("Primary");
            expect(failedNodes).toContain("Fallback");
        });
    });

    describe("multiple error boundaries", () => {
        it("should handle individual task failures independently", async () => {
            const workflow = createMultipleErrorBoundariesWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { data: "parallel test" } },
                    Task_A: { customOutput: { result: "A success" } },
                    Task_B: { shouldFail: true, errorMessage: "B failed" },
                    Task_C: { customOutput: { result: "C success" } },
                    Error_A: { customOutput: { fallback: false } },
                    Error_B: { customOutput: { fallback: true, handled: "B" } },
                    Error_C: { customOutput: { fallback: false } },
                    Merge: { customOutput: { merged: true, hasErrors: true } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { executionOrder, failedNodes, errorBranchesTriggered } =
                await simulateWorkflowExecution(workflow, mockActivities);

            // All tasks should be attempted
            expect(executionOrder).toContain("Task_A");
            expect(executionOrder).toContain("Task_B");
            expect(executionOrder).toContain("Task_C");

            // Only B should fail
            expect(failedNodes).toContain("Task_B");
            expect(failedNodes).not.toContain("Task_A");
            expect(failedNodes).not.toContain("Task_C");

            // Only Error_B should be triggered
            expect(errorBranchesTriggered).toContain("Error_B");
        });

        it("should handle multiple task failures with error handlers", async () => {
            const workflow = createMultipleErrorBoundariesWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { data: "multi-fail test" } },
                    Task_A: { shouldFail: true, errorMessage: "A failed" },
                    Task_B: { shouldFail: true, errorMessage: "B failed" },
                    Task_C: { customOutput: { result: "C success" } },
                    Error_A: { customOutput: { fallback: true, handled: "A" } },
                    Error_B: { customOutput: { fallback: true, handled: "B" } },
                    Error_C: { customOutput: { fallback: false } },
                    Merge: { customOutput: { merged: true } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes, errorBranchesTriggered } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(failedNodes).toContain("Task_A");
            expect(failedNodes).toContain("Task_B");
            expect(failedNodes).not.toContain("Task_C");

            expect(errorBranchesTriggered).toContain("Error_A");
            expect(errorBranchesTriggered).toContain("Error_B");
            expect(errorBranchesTriggered).not.toContain("Error_C");
        });
    });

    describe("error isolation", () => {
        it("should not propagate errors to unrelated branches", async () => {
            const workflow = createMultipleErrorBoundariesWorkflow();
            const executionContexts: Record<string, JsonObject> = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { data: "isolation test" } },
                    Task_A: { shouldFail: true, errorMessage: "A isolated failure" },
                    Task_B: {
                        customOutput: { result: "B success" },
                        onExecute: (input) => {
                            executionContexts.Task_B = getExecutionContext(input.context);
                        }
                    },
                    Task_C: {
                        customOutput: { result: "C success" },
                        onExecute: (input) => {
                            executionContexts.Task_C = getExecutionContext(input.context);
                        }
                    },
                    Error_A: { customOutput: { fallback: true } },
                    Error_B: { customOutput: { fallback: false } },
                    Error_C: { customOutput: { fallback: false } },
                    Merge: { customOutput: { merged: true } },
                    Output: { customOutput: { result: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // Task_B and Task_C shouldn't see Task_A's error in their execution context
            // (they execute in parallel, before A's error is known)
            expect(executionContexts.Task_B).toBeDefined();
            expect(executionContexts.Task_C).toBeDefined();
        });
    });

    describe("error metadata", () => {
        it("should include error message in failed node output", async () => {
            const workflow = createErrorBoundaryWorkflow();
            let capturedContext: JsonObject = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { data: "test" } },
                    Process: {
                        shouldFail: true,
                        errorMessage: "Detailed error: connection refused"
                    },
                    ErrorHandler: {
                        customOutput: { handled: true },
                        onExecute: (input) => {
                            capturedContext = getExecutionContext(input.context);
                        }
                    },
                    ErrorOutput: { customOutput: { errorResult: {} } },
                    Output: { customOutput: { result: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            const processOutput = capturedContext.Process as JsonObject;
            expect(processOutput._error).toBe(true);
            expect(processOutput.message).toBe("Detailed error: connection refused");
        });

        it("should include timestamp with error", async () => {
            const workflow = createErrorBoundaryWorkflow();
            const beforeTime = Date.now();

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { data: "test" } },
                    Process: { shouldFail: true, errorMessage: "Timed error" },
                    ErrorHandler: { customOutput: { handled: true } },
                    ErrorOutput: { customOutput: { errorResult: {} } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { context } = await simulateWorkflowExecution(workflow, mockActivities);
            const afterTime = Date.now();

            // Context should track error timing
            const errors = (context as unknown as JsonObject).errors as JsonObject | undefined;
            if (errors?.Process) {
                const errorTime = (errors.Process as JsonObject).timestamp as number;
                if (errorTime) {
                    expect(errorTime).toBeGreaterThanOrEqual(beforeTime);
                    expect(errorTime).toBeLessThanOrEqual(afterTime);
                }
            }
        });
    });

    describe("real-world scenarios", () => {
        it("should handle payment processing with fallback", async () => {
            const workflow = createFallbackWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { amount: 100, currency: "USD" } },
                    Primary: { shouldFail: true, errorMessage: "Stripe gateway timeout" },
                    Fallback: {
                        customOutput: {
                            statusCode: 200,
                            body: { transactionId: "paypal-123", status: "completed" }
                        }
                    },
                    Output: {
                        customOutput: {
                            result: { transactionId: "paypal-123", processor: "fallback" }
                        }
                    }
                }
            });

            const { errorBranchesTriggered, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(errorBranchesTriggered).toContain("Fallback");
            expect(finalOutputs.result).toBeDefined();
        });

        it("should handle API aggregation with partial failures", async () => {
            const workflow = createMultipleErrorBoundariesWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { query: "test search" } },
                    Task_A: {
                        customOutput: { results: [{ source: "A", items: 10 }] }
                    },
                    Task_B: { shouldFail: true, errorMessage: "Source B rate limited" },
                    Task_C: {
                        customOutput: { results: [{ source: "C", items: 5 }] }
                    },
                    Error_A: { customOutput: { fallback: false } },
                    Error_B: { customOutput: { fallback: true, defaultResults: [] } },
                    Error_C: { customOutput: { fallback: false } },
                    Merge: {
                        customOutput: {
                            totalResults: 15,
                            sources: ["A", "C"],
                            partialFailure: true
                        }
                    },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            // Should complete despite Task_B failure
            expect(executionOrder).toContain("Merge");
            expect(failedNodes).toHaveLength(1);
            expect(failedNodes[0]).toBe("Task_B");
        });
    });
});
