/**
 * Temporal Test Environment Helper
 *
 * Provides utilities for testing Temporal workflows with mocked activities.
 * Uses @temporalio/testing package for realistic workflow execution.
 */

import { Client, WorkflowExecutionAlreadyStartedError } from "@temporalio/client";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker, Runtime } from "@temporalio/worker";
import { nanoid } from "nanoid";
import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";
import { createMockActivities, type MockActivityConfig } from "../fixtures/activities";
import type {
    OrchestratorInput,
    OrchestratorResult
} from "../../src/temporal/workflows/workflow-orchestrator";

// ============================================================================
// TYPES
// ============================================================================

export interface TestEnvironment {
    env: TestWorkflowEnvironment;
    worker: Worker;
    client: Client;
    cleanup: () => Promise<void>;
}

export interface WorkflowTestResult {
    result: OrchestratorResult;
    executionLog: Array<{
        nodeId: string;
        nodeType: string;
        timestamp: number;
        success: boolean;
        output?: JsonObject;
        error?: string;
    }>;
    durationMs: number;
}

export interface WorkflowTestOptions {
    /** Mock configuration for node behavior */
    mockConfig?: MockActivityConfig;
    /** Custom inputs for the workflow */
    inputs?: JsonObject;
    /** User ID for the execution */
    userId?: string;
    /** Timeout for workflow execution in ms */
    timeout?: number;
}

export interface WorkflowAssertions {
    /** Expect workflow to succeed */
    expectSuccess?: boolean;
    /** Expect specific output values */
    expectOutputs?: Partial<JsonObject>;
    /** Expect these nodes to have completed */
    expectCompletedNodes?: string[];
    /** Expect these nodes to have failed */
    expectFailedNodes?: string[];
    /** Expect nodes to execute in this order */
    expectExecutionOrder?: string[];
    /** Expect specific error message */
    expectError?: string | RegExp;
}

// ============================================================================
// TEST ENVIRONMENT SETUP
// ============================================================================

/**
 * Create a test environment with mocked activities
 * This starts a local Temporal server for testing
 */
export async function createTestEnvironment(
    mockConfig: MockActivityConfig = {}
): Promise<TestEnvironment> {
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
        emitNodeStarted: jest.fn().mockResolvedValue(undefined),
        emitNodeCompleted: jest.fn().mockResolvedValue(undefined),
        emitNodeFailed: jest.fn().mockResolvedValue(undefined),

        // Tracing (no-op for tests)
        createSpan: jest
            .fn()
            .mockResolvedValue({ spanId: "test-span-id", traceId: "test-trace-id" }),
        endSpan: jest.fn().mockResolvedValue(undefined),
        endSpanWithError: jest.fn().mockResolvedValue(undefined),
        setSpanAttributes: jest.fn().mockResolvedValue(undefined)
    };

    const worker = await Worker.create({
        connection: env.nativeConnection,
        taskQueue: "test-workflow-queue",
        workflowsPath: require.resolve("../../src/temporal/workflows"),
        activities
    });

    const cleanup = async () => {
        await worker.shutdown();
        await env.teardown();
    };

    return {
        env,
        worker,
        client: env.client,
        cleanup
    };
}

/**
 * Create a lightweight test environment that only runs the worker
 * during workflow execution (better for parallel tests)
 */
export async function createLightweightTestEnv(): Promise<{
    env: TestWorkflowEnvironment;
    runWorkflow: <T>(
        workflowFn: string,
        input: unknown,
        activities: Record<string, unknown>
    ) => Promise<T>;
    cleanup: () => Promise<void>;
}> {
    const env = await TestWorkflowEnvironment.createLocal();

    const runWorkflow = async <T>(
        workflowFn: string,
        input: unknown,
        activities: Record<string, unknown>
    ): Promise<T> => {
        const taskQueue = `test-queue-${nanoid()}`;

        const worker = await Worker.create({
            connection: env.nativeConnection,
            taskQueue,
            workflowsPath: require.resolve("../../src/temporal/workflows"),
            activities
        });

        try {
            const result = await worker.runUntil(
                env.client.workflow.execute(workflowFn, {
                    workflowId: `test-${nanoid()}`,
                    taskQueue,
                    args: [input]
                })
            );
            return result as T;
        } finally {
            await worker.shutdown();
        }
    };

    return {
        env,
        runWorkflow,
        cleanup: () => env.teardown()
    };
}

// ============================================================================
// WORKFLOW EXECUTION HELPERS
// ============================================================================

/**
 * Run a workflow with the test environment and return results with execution log
 */
export async function runWorkflowTest(
    testEnv: TestEnvironment,
    workflowDefinition: WorkflowDefinition,
    options: WorkflowTestOptions = {}
): Promise<WorkflowTestResult> {
    const { inputs = {}, userId = "test-user", timeout = 30000 } = options;

    const executionId = `test-execution-${nanoid()}`;
    const workflowId = `test-workflow-${nanoid()}`;

    const orchestratorInput: OrchestratorInput = {
        executionId,
        workflowDefinition,
        inputs,
        userId
    };

    const startTime = Date.now();

    try {
        const result = await testEnv.worker.runUntil(
            testEnv.client.workflow.execute("orchestratorWorkflow", {
                workflowId,
                taskQueue: "test-workflow-queue",
                args: [orchestratorInput],
                workflowExecutionTimeout: timeout
            })
        );

        const durationMs = Date.now() - startTime;

        // Get execution log from mock activities
        // Note: In a real implementation, you'd get this from the mock
        const executionLog: WorkflowTestResult["executionLog"] = [];

        return {
            result: result as OrchestratorResult,
            executionLog,
            durationMs
        };
    } catch (error) {
        const durationMs = Date.now() - startTime;

        if (error instanceof WorkflowExecutionAlreadyStartedError) {
            throw new Error(`Workflow ${workflowId} already started`);
        }

        // Return failure result for workflow errors
        return {
            result: {
                success: false,
                outputs: {},
                error: error instanceof Error ? error.message : String(error)
            },
            executionLog: [],
            durationMs
        };
    }
}

/**
 * Run a workflow and apply assertions
 */
export async function runWorkflowAndAssert(
    testEnv: TestEnvironment,
    workflowDefinition: WorkflowDefinition,
    options: WorkflowTestOptions = {},
    assertions: WorkflowAssertions = {}
): Promise<WorkflowTestResult> {
    const result = await runWorkflowTest(testEnv, workflowDefinition, options);

    // Apply assertions
    if (assertions.expectSuccess !== undefined) {
        expect(result.result.success).toBe(assertions.expectSuccess);
    }

    if (assertions.expectOutputs) {
        for (const [key, value] of Object.entries(assertions.expectOutputs)) {
            expect(result.result.outputs[key]).toEqual(value);
        }
    }

    if (assertions.expectError) {
        expect(result.result.error).toBeDefined();
        if (typeof assertions.expectError === "string") {
            expect(result.result.error).toContain(assertions.expectError);
        } else {
            expect(result.result.error).toMatch(assertions.expectError);
        }
    }

    if (assertions.expectCompletedNodes) {
        const completedNodes = result.executionLog.filter((e) => e.success).map((e) => e.nodeId);
        for (const nodeId of assertions.expectCompletedNodes) {
            expect(completedNodes).toContain(nodeId);
        }
    }

    if (assertions.expectFailedNodes) {
        const failedNodes = result.executionLog.filter((e) => !e.success).map((e) => e.nodeId);
        for (const nodeId of assertions.expectFailedNodes) {
            expect(failedNodes).toContain(nodeId);
        }
    }

    if (assertions.expectExecutionOrder) {
        const actualOrder = result.executionLog.map((e) => e.nodeId);
        expect(actualOrder).toEqual(assertions.expectExecutionOrder);
    }

    return result;
}

// ============================================================================
// MOCK ACTIVITY FACTORIES
// ============================================================================

/**
 * Create mock activities with default behavior
 */
export function createDefaultMockActivities() {
    return createMockActivities({});
}

/**
 * Create mock activities where specific nodes fail
 */
export function createFailingNodeActivities(
    failingNodes: Record<string, string>
): MockActivityConfig {
    const nodeConfigs: MockActivityConfig["nodeConfigs"] = {};

    for (const [nodeId, errorMessage] of Object.entries(failingNodes)) {
        nodeConfigs[nodeId] = {
            shouldFail: true,
            errorMessage
        };
    }

    return { nodeConfigs };
}

/**
 * Create mock activities with custom outputs for specific nodes
 */
export function createCustomOutputActivities(
    outputs: Record<string, JsonObject>
): MockActivityConfig {
    const nodeConfigs: MockActivityConfig["nodeConfigs"] = {};

    for (const [nodeId, customOutput] of Object.entries(outputs)) {
        nodeConfigs[nodeId] = { customOutput };
    }

    return { nodeConfigs };
}

/**
 * Create mock activities with delays for specific nodes (for testing parallel execution)
 */
export function createDelayedActivities(delays: Record<string, number>): MockActivityConfig {
    const nodeConfigs: MockActivityConfig["nodeConfigs"] = {};

    for (const [nodeId, delay] of Object.entries(delays)) {
        nodeConfigs[nodeId] = { delay };
    }

    return { nodeConfigs };
}

// ============================================================================
// WORKFLOW DEFINITION BUILDER
// ============================================================================

/**
 * Helper to create a simple workflow definition for testing
 */
export function createTestWorkflowDefinition(config: {
    name: string;
    nodes: Array<{
        id: string;
        type: string;
        config?: JsonObject;
        position?: { x: number; y: number };
    }>;
    edges: Array<{
        source: string;
        target: string;
        sourceHandle?: string;
        targetHandle?: string;
    }>;
}): WorkflowDefinition {
    const nodes: Record<
        string,
        {
            id: string;
            type: string;
            data: JsonObject;
            position: { x: number; y: number };
        }
    > = {};

    for (const node of config.nodes) {
        nodes[node.id] = {
            id: node.id,
            type: node.type,
            data: node.config || {},
            position: node.position || { x: 0, y: 0 }
        };
    }

    const edges = config.edges.map((edge, index) => ({
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || "output",
        targetHandle: edge.targetHandle || "input"
    }));

    return {
        id: `test-workflow-${nanoid()}`,
        name: config.name,
        nodes,
        edges,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    } as WorkflowDefinition;
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Wait for a condition to be true (useful for async assertions)
 */
export async function waitFor(
    condition: () => boolean | Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = 5000, interval = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Create a promise that resolves after a delay
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
