/**
 * Temporal Signal & Query Test Helpers
 *
 * Provides utilities for testing Temporal workflow signals, queries,
 * cancellation, and pause/resume functionality.
 */

import { Client } from "@temporalio/client";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker, Runtime } from "@temporalio/worker";
import { nanoid } from "nanoid";
import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";
import {
    cancelWorkflowSignal,
    pauseWorkflowSignal,
    resumeWorkflowSignal,
    humanReviewResponseSignal,
    executionProgressQuery,
    nodeStatusQuery,
    executionSummaryQuery,
    type HumanReviewResponsePayload
} from "../../../../src/temporal/workflows";
import { createMockActivities, type MockActivityConfig } from "../../../fixtures/activities";
import type {
    OrchestratorInput,
    OrchestratorResult,
    ExecutionProgressResult,
    NodeStatusResult,
    ExecutionSummaryResult
} from "../../../../src/temporal/workflows/workflow-orchestrator";

// ============================================================================
// TYPES
// ============================================================================

// Generic workflow handle type that can be used with any workflow
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkflowHandle = Awaited<ReturnType<Client["workflow"]["start"]>>;

export interface TemporalTestEnv {
    env: TestWorkflowEnvironment;
    worker: Worker;
    client: Client;
    taskQueue: string;
    cleanup: () => Promise<void>;
}

export interface WorkflowTestHandle {
    handle: WorkflowHandle;
    workflowId: string;
    executionId: string;
}

export interface SignalTestOptions {
    /** Delay before sending signal (ms) */
    delayMs?: number;
    /** Timeout for waiting on result (ms) */
    timeoutMs?: number;
}

// ============================================================================
// TEST ENVIRONMENT SETUP
// ============================================================================

/**
 * Create a Temporal test environment for signal/query testing.
 * This starts a local Temporal server with mocked activities.
 */
export async function createTemporalTestEnv(
    mockConfig: MockActivityConfig = {}
): Promise<TemporalTestEnv> {
    // Suppress noisy Temporal logs during tests
    Runtime.install({
        logger: {
            log: () => {},
            trace: () => {},
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {}
        }
    });

    const env = await TestWorkflowEnvironment.createLocal();
    const taskQueue = `test-temporal-queue-${nanoid()}`;

    // Create mocked activities
    const mockActivities = createMockActivities(mockConfig);

    // Create comprehensive mock activity implementations
    const activities = {
        // Node execution
        executeNode: mockActivities.executeNode,
        validateInputsActivity: mockActivities.validateInputsActivity,
        validateOutputsActivity: mockActivities.validateOutputsActivity,

        // Events (no-op for tests)
        emitExecutionStarted: jest.fn().mockResolvedValue(undefined),
        emitExecutionProgress: jest.fn().mockResolvedValue(undefined),
        emitExecutionCompleted: jest.fn().mockResolvedValue(undefined),
        emitExecutionFailed: jest.fn().mockResolvedValue(undefined),
        emitExecutionPaused: jest.fn().mockResolvedValue(undefined),
        emitNodeStarted: jest.fn().mockResolvedValue(undefined),
        emitNodeCompleted: jest.fn().mockResolvedValue(undefined),
        emitNodeFailed: jest.fn().mockResolvedValue(undefined),

        // Tracing (no-op for tests)
        createSpan: jest
            .fn()
            .mockResolvedValue({ spanId: "test-span-id", traceId: "test-trace-id" }),
        endSpan: jest.fn().mockResolvedValue(undefined),
        endSpanWithError: jest.fn().mockResolvedValue(undefined),
        setSpanAttributes: jest.fn().mockResolvedValue(undefined),

        // Credit activities (default: allow all, track nothing)
        shouldAllowExecution: jest.fn().mockResolvedValue(true),
        reserveCredits: jest.fn().mockResolvedValue(true),
        releaseCredits: jest.fn().mockResolvedValue(undefined),
        finalizeCredits: jest.fn().mockResolvedValue(undefined),
        calculateLLMCredits: jest.fn().mockResolvedValue(10),
        calculateNodeCredits: jest.fn().mockResolvedValue(1),
        estimateWorkflowCredits: jest.fn().mockResolvedValue({
            totalCredits: 100,
            breakdown: [],
            confidence: "estimate"
        }),
        getCreditsBalance: jest.fn().mockResolvedValue({
            available: 1000,
            subscription: 500,
            purchased: 500,
            bonus: 0,
            reserved: 0,
            subscriptionExpiresAt: null,
            usedThisMonth: 0,
            usedAllTime: 0
        })
    };

    const worker = await Worker.create({
        connection: env.nativeConnection,
        taskQueue,
        workflowsPath: require.resolve("../../../../src/temporal/workflows"),
        activities
    });

    // Start the worker in the background (don't use runUntil for signal tests)
    const workerRunPromise = worker.run();

    const cleanup = async () => {
        worker.shutdown();
        await workerRunPromise.catch(() => {
            // Ignore shutdown errors
        });
        await env.teardown();
    };

    return {
        env,
        worker,
        client: env.client,
        taskQueue,
        cleanup
    };
}

// ============================================================================
// WORKFLOW EXECUTION HELPERS
// ============================================================================

/**
 * Start a workflow without waiting for completion.
 * Returns a handle that can be used for signals, queries, and cancellation.
 */
export async function startWorkflow(
    testEnv: TemporalTestEnv,
    workflowDefinition: WorkflowDefinition,
    options: {
        inputs?: JsonObject;
        userId?: string;
    } = {}
): Promise<WorkflowTestHandle> {
    const { inputs = {}, userId = "test-user" } = options;

    const executionId = `test-execution-${nanoid()}`;
    const workflowId = `test-workflow-${nanoid()}`;

    const orchestratorInput: OrchestratorInput = {
        executionId,
        workflowDefinition,
        inputs,
        userId
    };

    const handle = await testEnv.client.workflow.start("orchestratorWorkflow", {
        workflowId,
        taskQueue: testEnv.taskQueue,
        args: [orchestratorInput]
    });

    return {
        handle,
        workflowId,
        executionId
    };
}

/**
 * Start a workflow and wait for it to complete.
 */
export async function runWorkflowToCompletion(
    testEnv: TemporalTestEnv,
    workflowDefinition: WorkflowDefinition,
    options: {
        inputs?: JsonObject;
        userId?: string;
        timeoutMs?: number;
    } = {}
): Promise<OrchestratorResult> {
    const { timeoutMs = 30000, ...restOptions } = options;

    const { handle } = await startWorkflow(testEnv, workflowDefinition, restOptions);

    const result = await Promise.race([
        handle.result(),
        new Promise<never>((_, reject) =>
            setTimeout(
                () => reject(new Error(`Workflow timed out after ${timeoutMs}ms`)),
                timeoutMs
            )
        )
    ]);

    return result as OrchestratorResult;
}

// ============================================================================
// SIGNAL HELPERS
// ============================================================================

/**
 * Send a cancellation signal to a running workflow.
 */
export async function sendCancelSignal(handle: WorkflowHandle, reason?: string): Promise<void> {
    await handle.signal(cancelWorkflowSignal, { reason });
}

/**
 * Send a pause signal to a running workflow.
 */
export async function sendPauseSignal(handle: WorkflowHandle, reason?: string): Promise<void> {
    await handle.signal(pauseWorkflowSignal, { reason });
}

/**
 * Send a resume signal to a paused workflow.
 */
export async function sendResumeSignal(
    handle: WorkflowHandle,
    contextUpdates?: JsonObject
): Promise<void> {
    await handle.signal(resumeWorkflowSignal, { contextUpdates });
}

/**
 * Send a human review response signal to a workflow waiting for user input.
 */
export async function sendHumanReviewResponseSignal(
    handle: WorkflowHandle,
    response: {
        variableName: string;
        response: JsonObject | string | number | boolean;
    }
): Promise<void> {
    const payload: HumanReviewResponsePayload = {
        variableName: response.variableName,
        response: response.response,
        submittedAt: Date.now()
    };
    await handle.signal(humanReviewResponseSignal, payload);
}

/**
 * Send a signal after a delay.
 */
export async function sendSignalWithDelay<T>(
    handle: WorkflowHandle,
    signal: { name: string },
    args: T,
    delayMs: number
): Promise<void> {
    await delay(delayMs);
    await handle.signal(signal.name, args);
}

/**
 * Cancel a workflow and wait for the result.
 */
export async function cancelWorkflowGracefully(
    handle: WorkflowHandle,
    options: {
        reason?: string;
        timeoutMs?: number;
    } = {}
): Promise<OrchestratorResult> {
    const { reason = "Test cancellation", timeoutMs = 10000 } = options;

    await sendCancelSignal(handle, reason);

    const result = await Promise.race([
        handle.result(),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Cancel timed out after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);

    return result as OrchestratorResult;
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Query execution progress from a running workflow.
 */
export async function queryExecutionProgress(
    handle: WorkflowHandle
): Promise<ExecutionProgressResult> {
    return await handle.query(executionProgressQuery);
}

/**
 * Query the status of a specific node.
 */
export async function queryNodeStatus(
    handle: WorkflowHandle,
    nodeId: string
): Promise<NodeStatusResult> {
    return await handle.query(nodeStatusQuery, nodeId);
}

/**
 * Query the overall execution summary.
 */
export async function queryExecutionSummary(
    handle: WorkflowHandle
): Promise<ExecutionSummaryResult> {
    return await handle.query(executionSummaryQuery);
}

// ============================================================================
// STATE WAITING HELPERS
// ============================================================================

/**
 * Wait for a workflow to reach a specific state.
 */
export async function waitForWorkflowState(
    handle: WorkflowHandle,
    expectedState: "running" | "paused" | "completed" | "failed" | "cancelled",
    options: {
        timeoutMs?: number;
        pollIntervalMs?: number;
    } = {}
): Promise<ExecutionSummaryResult> {
    const { timeoutMs = 10000, pollIntervalMs = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        try {
            const summary = await queryExecutionSummary(handle);
            if (summary.status === expectedState) {
                return summary;
            }
        } catch (error) {
            // Query might fail if workflow hasn't started yet
            if (!(error instanceof Error) || !error.message.includes("not found")) {
                throw error;
            }
        }

        await delay(pollIntervalMs);
    }

    throw new Error(`Timeout waiting for workflow state "${expectedState}" after ${timeoutMs}ms`);
}

/**
 * Wait for a specific number of nodes to complete.
 */
export async function waitForNodesComplete(
    handle: WorkflowHandle,
    nodeCount: number,
    options: {
        timeoutMs?: number;
        pollIntervalMs?: number;
    } = {}
): Promise<ExecutionProgressResult> {
    const { timeoutMs = 10000, pollIntervalMs = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        try {
            const progress = await queryExecutionProgress(handle);
            if (progress.completedNodes >= nodeCount) {
                return progress;
            }
        } catch (error) {
            // Query might fail if workflow hasn't started yet
            if (!(error instanceof Error) || !error.message.includes("not found")) {
                throw error;
            }
        }

        await delay(pollIntervalMs);
    }

    throw new Error(`Timeout waiting for ${nodeCount} nodes to complete after ${timeoutMs}ms`);
}

/**
 * Wait for workflow to be initialized (totalNodes > 0).
 * This is needed because the workflow graph building happens asynchronously.
 */
export async function waitForWorkflowInitialized(
    handle: WorkflowHandle,
    options: {
        timeoutMs?: number;
        pollIntervalMs?: number;
    } = {}
): Promise<ExecutionProgressResult> {
    const { timeoutMs = 10000, pollIntervalMs = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        try {
            const progress = await queryExecutionProgress(handle);
            if (progress.totalNodes > 0) {
                return progress;
            }
        } catch (error) {
            // Query might fail if workflow hasn't started yet
            if (!(error instanceof Error) || !error.message.includes("not found")) {
                throw error;
            }
        }

        await delay(pollIntervalMs);
    }

    throw new Error(`Timeout waiting for workflow to initialize after ${timeoutMs}ms`);
}

/**
 * Wait for a specific node to reach a status.
 */
export async function waitForNodeStatus(
    handle: WorkflowHandle,
    nodeId: string,
    expectedStatus: NodeStatusResult["status"],
    options: {
        timeoutMs?: number;
        pollIntervalMs?: number;
    } = {}
): Promise<NodeStatusResult> {
    const { timeoutMs = 10000, pollIntervalMs = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        try {
            const status = await queryNodeStatus(handle, nodeId);
            if (status.status === expectedStatus) {
                return status;
            }
        } catch (error) {
            // Query might fail if workflow hasn't started yet
            if (!(error instanceof Error) || !error.message.includes("not found")) {
                throw error;
            }
        }

        await delay(pollIntervalMs);
    }

    throw new Error(
        `Timeout waiting for node "${nodeId}" to reach status "${expectedStatus}" after ${timeoutMs}ms`
    );
}

// ============================================================================
// TEST WORKFLOW BUILDERS
// ============================================================================

/**
 * Create a simple linear workflow for testing signals/queries.
 * A -> B -> C with configurable delays.
 */
export function createLinearTestWorkflow(
    options: {
        name?: string;
        nodeCount?: number;
        nodeDelayMs?: number;
    } = {}
): WorkflowDefinition {
    const { name = "Linear Test Workflow", nodeCount = 3, nodeDelayMs = 100 } = options;

    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Create nodes
    for (let i = 0; i < nodeCount; i++) {
        const nodeId = i === 0 ? "Input" : i === nodeCount - 1 ? "Output" : `Node${i}`;
        const nodeType = i === 0 ? "input" : i === nodeCount - 1 ? "output" : "transform";

        nodes[nodeId] = {
            type: nodeType,
            name: nodeId,
            config: {
                operation: "passthrough",
                delayMs: nodeDelayMs
            },
            position: { x: i * 200, y: 100 }
        };

        // Create edge to next node
        if (i > 0) {
            const prevNodeId = i === 1 ? "Input" : `Node${i - 1}`;
            edges.push({
                id: `edge-${i}`,
                source: prevNodeId,
                target: nodeId,
                sourceHandle: "output",
                targetHandle: "input"
            });
        }
    }

    return {
        id: `test-workflow-${nanoid()}`,
        name,
        nodes,
        edges,
        entryPoint: "Input"
    };
}

/**
 * Create a workflow with parallel branches for testing concurrent execution.
 * A -> [B, C, D] -> E
 */
export function createParallelTestWorkflow(
    options: {
        name?: string;
        branchCount?: number;
        branchDelayMs?: number;
    } = {}
): WorkflowDefinition {
    const { name = "Parallel Test Workflow", branchCount = 3, branchDelayMs = 200 } = options;

    const nodes: WorkflowDefinition["nodes"] = {
        Input: {
            type: "input",
            name: "Input",
            config: {},
            position: { x: 0, y: 100 }
        },
        Output: {
            type: "output",
            name: "Output",
            config: {},
            position: { x: 400, y: 100 }
        }
    };

    const edges: WorkflowDefinition["edges"] = [];

    // Create branch nodes
    for (let i = 0; i < branchCount; i++) {
        const branchId = `Branch${i + 1}`;
        nodes[branchId] = {
            type: "transform",
            name: branchId,
            config: {
                operation: "passthrough",
                delayMs: branchDelayMs
            },
            position: { x: 200, y: i * 100 }
        };

        // Edge from Input to branch
        edges.push({
            id: `edge-in-${i}`,
            source: "Input",
            target: branchId,
            sourceHandle: "output",
            targetHandle: "input"
        });

        // Edge from branch to Output
        edges.push({
            id: `edge-out-${i}`,
            source: branchId,
            target: "Output",
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    return {
        id: `test-workflow-${nanoid()}`,
        name,
        nodes,
        edges,
        entryPoint: "Input"
    };
}

/**
 * Create a slow workflow that takes time to execute (for testing mid-execution signals).
 */
export function createSlowTestWorkflow(
    options: {
        name?: string;
        totalDelayMs?: number;
        nodeCount?: number;
    } = {}
): WorkflowDefinition {
    const { name = "Slow Test Workflow", totalDelayMs = 2000, nodeCount = 5 } = options;

    const delayPerNode = Math.floor(totalDelayMs / nodeCount);

    return createLinearTestWorkflow({
        name,
        nodeCount,
        nodeDelayMs: delayPerNode
    });
}

/**
 * Create a workflow with a humanReview node for testing human-in-the-loop signals.
 * Input -> HumanReview -> Output
 */
export function createHumanReviewTestWorkflow(
    options: {
        name?: string;
        variableName?: string;
        inputType?: "text" | "number" | "boolean" | "json";
        prompt?: string;
        required?: boolean;
        /** Add extra nodes before the human review */
        preReviewNodeCount?: number;
        /** Add extra nodes after the human review */
        postReviewNodeCount?: number;
    } = {}
): WorkflowDefinition {
    const {
        name = "Human Review Test Workflow",
        variableName = "userResponse",
        inputType = "text",
        prompt = "Please provide your input",
        required = true,
        preReviewNodeCount = 0,
        postReviewNodeCount = 0
    } = options;

    const nodes: WorkflowDefinition["nodes"] = {
        Input: {
            type: "input",
            name: "Input",
            config: {},
            position: { x: 0, y: 100 }
        }
    };

    const edges: WorkflowDefinition["edges"] = [];
    let lastNodeId = "Input";
    let xPos = 200;

    // Add pre-review nodes
    for (let i = 0; i < preReviewNodeCount; i++) {
        const nodeId = `PreReview${i + 1}`;
        nodes[nodeId] = {
            type: "transform",
            name: nodeId,
            config: { operation: "passthrough" },
            position: { x: xPos, y: 100 }
        };
        edges.push({
            id: `edge-pre-${i}`,
            source: lastNodeId,
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input"
        });
        lastNodeId = nodeId;
        xPos += 200;
    }

    // Add human review node
    nodes["HumanReview"] = {
        type: "humanReview",
        name: "Human Review",
        config: {
            variableName,
            inputType,
            prompt,
            required,
            description: `Waiting for ${inputType} input`
        },
        position: { x: xPos, y: 100 }
    };
    edges.push({
        id: "edge-to-review",
        source: lastNodeId,
        target: "HumanReview",
        sourceHandle: "output",
        targetHandle: "input"
    });
    lastNodeId = "HumanReview";
    xPos += 200;

    // Add post-review nodes
    for (let i = 0; i < postReviewNodeCount; i++) {
        const nodeId = `PostReview${i + 1}`;
        nodes[nodeId] = {
            type: "transform",
            name: nodeId,
            config: { operation: "passthrough" },
            position: { x: xPos, y: 100 }
        };
        edges.push({
            id: `edge-post-${i}`,
            source: lastNodeId,
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input"
        });
        lastNodeId = nodeId;
        xPos += 200;
    }

    // Add output node
    nodes["Output"] = {
        type: "output",
        name: "Output",
        config: {},
        position: { x: xPos, y: 100 }
    };
    edges.push({
        id: "edge-to-output",
        source: lastNodeId,
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        id: `test-workflow-${nanoid()}`,
        name,
        nodes,
        edges,
        entryPoint: "Input"
    };
}

/**
 * Create a workflow with multiple human review nodes in sequence.
 * Input -> HumanReview1 -> HumanReview2 -> Output
 */
export function createMultipleHumanReviewTestWorkflow(
    options: {
        name?: string;
        reviewCount?: number;
    } = {}
): WorkflowDefinition {
    const { name = "Multiple Human Review Workflow", reviewCount = 2 } = options;

    const nodes: WorkflowDefinition["nodes"] = {
        Input: {
            type: "input",
            name: "Input",
            config: {},
            position: { x: 0, y: 100 }
        },
        Output: {
            type: "output",
            name: "Output",
            config: {},
            position: { x: (reviewCount + 1) * 200, y: 100 }
        }
    };

    const edges: WorkflowDefinition["edges"] = [];
    let lastNodeId = "Input";

    for (let i = 0; i < reviewCount; i++) {
        const nodeId = `HumanReview${i + 1}`;
        nodes[nodeId] = {
            type: "humanReview",
            name: `Human Review ${i + 1}`,
            config: {
                variableName: `response${i + 1}`,
                inputType: "text",
                prompt: `Please provide input ${i + 1}`,
                required: true
            },
            position: { x: (i + 1) * 200, y: 100 }
        };
        edges.push({
            id: `edge-${i}`,
            source: lastNodeId,
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input"
        });
        lastNodeId = nodeId;
    }

    // Connect last review to output
    edges.push({
        id: "edge-to-output",
        source: lastNodeId,
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        id: `test-workflow-${nanoid()}`,
        name,
        nodes,
        edges,
        entryPoint: "Input"
    };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Simple delay function.
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function until it succeeds or times out.
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number;
        delayMs?: number;
        timeoutMs?: number;
    } = {}
): Promise<T> {
    const { maxAttempts = 10, delayMs = 100, timeoutMs = 10000 } = options;
    const startTime = Date.now();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (Date.now() - startTime > timeoutMs) {
            throw new Error(`Retry timed out after ${timeoutMs}ms`);
        }

        try {
            return await fn();
        } catch (error) {
            if (attempt === maxAttempts - 1) {
                throw error;
            }
            await delay(delayMs);
        }
    }

    throw new Error("Retry exhausted attempts");
}

/**
 * Wait for workflow result with timeout
 */
export async function waitForResult(
    handle: WorkflowHandle,
    timeoutMs: number = 10000
): Promise<OrchestratorResult> {
    const result = await Promise.race([
        handle.result(),
        new Promise<never>((_, reject) =>
            setTimeout(
                () => reject(new Error(`Workflow timed out after ${timeoutMs}ms`)),
                timeoutMs
            )
        )
    ]);

    return result as OrchestratorResult;
}
