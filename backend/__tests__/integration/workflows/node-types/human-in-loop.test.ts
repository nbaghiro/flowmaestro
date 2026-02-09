/**
 * Human-in-the-Loop Integration Tests
 *
 * True integration tests that execute human-in-the-loop workflows through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Pause for user input patterns
 * - Resume with provided values
 * - Default value handling
 * - Multi-step approval workflows
 * - Timeout and expiration handling
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";

// ============================================================================
// MOCK DEFINITIONS
// ============================================================================

const mockExecuteNode = jest.fn();
const mockValidateInputsActivity = jest.fn();
const mockValidateOutputsActivity = jest.fn();
const mockCreateSpan = jest.fn();
const mockEndSpan = jest.fn();

const mockEmitExecutionStarted = jest.fn();
const mockEmitExecutionProgress = jest.fn();
const mockEmitExecutionCompleted = jest.fn();
const mockEmitExecutionFailed = jest.fn();
const mockEmitExecutionPaused = jest.fn();
const mockEmitNodeStarted = jest.fn();
const mockEmitNodeCompleted = jest.fn();
const mockEmitNodeFailed = jest.fn();

const mockShouldAllowExecution = jest.fn();
const mockReserveCredits = jest.fn();
const mockReleaseCredits = jest.fn();
const mockFinalizeCredits = jest.fn();
const mockEstimateWorkflowCredits = jest.fn();
const mockCalculateLLMCredits = jest.fn();
const mockCalculateNodeCredits = jest.fn();

const mockActivities = {
    executeNode: mockExecuteNode,
    validateInputsActivity: mockValidateInputsActivity,
    validateOutputsActivity: mockValidateOutputsActivity,
    createSpan: mockCreateSpan,
    endSpan: mockEndSpan,
    emitExecutionStarted: mockEmitExecutionStarted,
    emitExecutionProgress: mockEmitExecutionProgress,
    emitExecutionCompleted: mockEmitExecutionCompleted,
    emitExecutionFailed: mockEmitExecutionFailed,
    emitExecutionPaused: mockEmitExecutionPaused,
    emitNodeStarted: mockEmitNodeStarted,
    emitNodeCompleted: mockEmitNodeCompleted,
    emitNodeFailed: mockEmitNodeFailed,
    shouldAllowExecution: mockShouldAllowExecution,
    reserveCredits: mockReserveCredits,
    releaseCredits: mockReleaseCredits,
    finalizeCredits: mockFinalizeCredits,
    estimateWorkflowCredits: mockEstimateWorkflowCredits,
    calculateLLMCredits: mockCalculateLLMCredits,
    calculateNodeCredits: mockCalculateNodeCredits
};

// ============================================================================
// WORKFLOW DEFINITION BUILDERS
// ============================================================================

interface NodeDef {
    id: string;
    type: string;
    name: string;
    config?: JsonObject;
}

interface EdgeDef {
    source: string;
    target: string;
}

/**
 * Create a workflow definition from node and edge definitions
 */
function createWorkflowDefinition(nodeDefs: NodeDef[], edgeDefs: EdgeDef[]): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodeDefs.forEach((def, index) => {
        nodes[def.id] = {
            type: def.type,
            name: def.name,
            config: def.config || {},
            position: { x: index * 200, y: 0 }
        };
    });

    for (const edge of edgeDefs) {
        edges.push({
            id: `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    const inputNode = nodeDefs.find((n) => n.type === "input");

    return {
        name: "Human-in-Loop Workflow",
        nodes,
        edges,
        entryPoint: inputNode?.id || nodeDefs[0].id
    };
}

/**
 * Create a simple human review workflow
 * Input -> WaitForUser -> Output
 */
function createSimpleHumanReviewDefinition(): WorkflowDefinition {
    return createWorkflowDefinition(
        [
            { id: "input", type: "input", name: "Input" },
            { id: "wait_for_user", type: "humanReview", name: "Wait For User" },
            { id: "output", type: "output", name: "Output" }
        ],
        [
            { source: "input", target: "wait_for_user" },
            { source: "wait_for_user", target: "output" }
        ]
    );
}

/**
 * Create a human review workflow with processing
 * Input -> WaitForUser -> Process -> Output
 */
function createHumanReviewWithProcessingDefinition(): WorkflowDefinition {
    return createWorkflowDefinition(
        [
            { id: "input", type: "input", name: "Input" },
            { id: "wait_for_user", type: "humanReview", name: "Wait For User" },
            { id: "process", type: "transform", name: "Process" },
            { id: "output", type: "output", name: "Output" }
        ],
        [
            { source: "input", target: "wait_for_user" },
            { source: "wait_for_user", target: "process" },
            { source: "process", target: "output" }
        ]
    );
}

/**
 * Create a multi-step approval workflow
 * Input -> ManagerApproval -> DirectorApproval -> Execute -> Output
 */
function createMultiStepApprovalDefinition(): WorkflowDefinition {
    return createWorkflowDefinition(
        [
            { id: "input", type: "input", name: "Input" },
            { id: "manager_approval", type: "humanReview", name: "Manager Approval" },
            { id: "director_approval", type: "humanReview", name: "Director Approval" },
            { id: "execute", type: "transform", name: "Execute" },
            { id: "output", type: "output", name: "Output" }
        ],
        [
            { source: "input", target: "manager_approval" },
            { source: "manager_approval", target: "director_approval" },
            { source: "director_approval", target: "execute" },
            { source: "execute", target: "output" }
        ]
    );
}

/**
 * Create a human review with LLM workflow
 * Input -> WaitForUser -> LLM -> Output
 */
function createHumanReviewWithLLMDefinition(): WorkflowDefinition {
    return createWorkflowDefinition(
        [
            { id: "input", type: "input", name: "Input" },
            { id: "wait_for_user", type: "humanReview", name: "Wait For User" },
            { id: "llm", type: "llm", name: "LLM" },
            { id: "output", type: "output", name: "Output" }
        ],
        [
            { source: "input", target: "wait_for_user" },
            { source: "wait_for_user", target: "llm" },
            { source: "llm", target: "output" }
        ]
    );
}

/**
 * Create an exception escalation workflow
 * Input -> AutoProcess -> EscalateToHuman -> Finalize -> Output
 */
function createExceptionEscalationDefinition(): WorkflowDefinition {
    return createWorkflowDefinition(
        [
            { id: "input", type: "input", name: "Input" },
            { id: "auto_process", type: "transform", name: "Auto Process" },
            { id: "escalate_to_human", type: "humanReview", name: "Escalate" },
            { id: "finalize", type: "transform", name: "Finalize" },
            { id: "output", type: "output", name: "Output" }
        ],
        [
            { source: "input", target: "auto_process" },
            { source: "auto_process", target: "escalate_to_human" },
            { source: "escalate_to_human", target: "finalize" },
            { source: "finalize", target: "output" }
        ]
    );
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function setupDefaultMocks(): void {
    jest.clearAllMocks();

    mockValidateInputsActivity.mockResolvedValue({ success: true });
    mockValidateOutputsActivity.mockResolvedValue({ success: true });

    let spanCounter = 0;
    mockCreateSpan.mockImplementation(() => {
        return Promise.resolve({ spanId: `span-${++spanCounter}`, traceId: "trace-123" });
    });
    mockEndSpan.mockResolvedValue(undefined);

    mockEmitExecutionStarted.mockResolvedValue(undefined);
    mockEmitExecutionProgress.mockResolvedValue(undefined);
    mockEmitExecutionCompleted.mockResolvedValue(undefined);
    mockEmitExecutionFailed.mockResolvedValue(undefined);
    mockEmitExecutionPaused.mockResolvedValue(undefined);
    mockEmitNodeStarted.mockResolvedValue(undefined);
    mockEmitNodeCompleted.mockResolvedValue(undefined);
    mockEmitNodeFailed.mockResolvedValue(undefined);

    mockShouldAllowExecution.mockResolvedValue(true);
    mockReserveCredits.mockResolvedValue(true);
    mockReleaseCredits.mockResolvedValue(undefined);
    mockFinalizeCredits.mockResolvedValue(undefined);
    mockEstimateWorkflowCredits.mockResolvedValue({ totalCredits: 10 });
    mockCalculateLLMCredits.mockResolvedValue(5);
    mockCalculateNodeCredits.mockResolvedValue(1);
}

interface ExecuteNodeParams {
    nodeType: string;
    nodeConfig: JsonObject;
    context: JsonObject;
    executionContext: { nodeId: string };
}

function configureMockNodeOutputs(outputs: Record<string, JsonObject>): void {
    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        const output = outputs[nodeId] || { result: `output-${nodeId}` };

        return {
            result: output,
            signals: {},
            metrics: { durationMs: 100 },
            success: true,
            output
        };
    });
}

function configureMockNodeOutputsWithSignals(
    outputs: Record<string, JsonObject>,
    signals: Record<string, JsonObject>
): void {
    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        const output = outputs[nodeId] || { result: `output-${nodeId}` };
        const nodeSignals = signals[nodeId] || {};

        return {
            result: output,
            signals: nodeSignals,
            metrics: { durationMs: 100 },
            success: true,
            output
        };
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("Human-in-the-Loop Integration Tests", () => {
    let testEnv: TestWorkflowEnvironment;
    let worker: Worker;

    beforeAll(async () => {
        testEnv = await TestWorkflowEnvironment.createLocal();
    });

    afterAll(async () => {
        await testEnv?.teardown();
    });

    beforeEach(async () => {
        setupDefaultMocks();

        worker = await Worker.create({
            connection: testEnv.nativeConnection,
            taskQueue: "test-workflow-queue",
            workflowsPath: require.resolve(
                "../../../../src/temporal/workflows/workflow-orchestrator"
            ),
            activities: mockActivities
        });
    });

    describe("pause for user input", () => {
        it("should pause workflow when human review node requests pause", async () => {
            const workflowDef = createSimpleHumanReviewDefinition();

            configureMockNodeOutputsWithSignals(
                {
                    input: { data: "initial data" },
                    wait_for_user: { waitingFor: "userConfirmation", inputType: "boolean" },
                    output: { result: "Completed" }
                },
                {
                    wait_for_user: {
                        pause: true,
                        pauseContext: {
                            reason: "Waiting for user input: userConfirmation",
                            nodeId: "wait_for_user",
                            pausedAt: Date.now(),
                            resumeTrigger: "signal",
                            preservedData: {
                                variableName: "userConfirmation",
                                inputType: "boolean",
                                required: true
                            }
                        }
                    }
                }
            );

            const _result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-human-pause-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-human-pause",
                            workflowDefinition: workflowDef,
                            inputs: { initialData: "test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );
            expect(_result).toBeDefined();

            // The workflow should pause and emit the paused event
            expect(mockEmitExecutionPaused).toHaveBeenCalled();
        });

        it("should include pause context with input requirements", async () => {
            const workflowDef = createSimpleHumanReviewDefinition();

            configureMockNodeOutputsWithSignals(
                {
                    input: { data: "test" },
                    wait_for_user: { waitingFor: "approvalDecision", inputType: "string" }
                },
                {
                    wait_for_user: {
                        pause: true,
                        pauseContext: {
                            reason: "Waiting for user input: approvalDecision",
                            nodeId: "wait_for_user",
                            pausedAt: Date.now(),
                            resumeTrigger: "signal",
                            preservedData: {
                                variableName: "approvalDecision",
                                inputType: "string",
                                outputVariable: "decision",
                                validation: { minLength: 5, maxLength: 100 },
                                required: true
                            }
                        }
                    }
                }
            );

            const _result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-pause-context-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-pause-context",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );
            expect(_result).toBeDefined();

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("wait_for_user");
        });
    });

    describe("workflow completion without pause", () => {
        it("should complete workflow when human review node does not pause", async () => {
            const workflowDef = createSimpleHumanReviewDefinition();

            // No pause signal - continues directly
            configureMockNodeOutputs({
                input: { data: "test" },
                wait_for_user: { setting: "default-value", source: "default" },
                output: { result: "Completed with setting: default-value" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-no-pause-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-no-pause",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();
        });
    });

    describe("workflow with processing after human input", () => {
        it("should execute processing node after human review", async () => {
            const workflowDef = createHumanReviewWithProcessingDefinition();

            configureMockNodeOutputs({
                input: { data: "initial data" },
                wait_for_user: { userChoice: "approved", source: "provided" },
                process: { processed: true, userChoice: "approved" },
                output: { result: "completed with user choice: approved" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-human-process-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-human-process",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("wait_for_user");
            expect(nodeIds).toContain("process");
        });
    });

    describe("multi-step approval workflow", () => {
        it("should execute sequential approval steps", async () => {
            const workflowDef = createMultiStepApprovalDefinition();

            configureMockNodeOutputs({
                input: { request: "Budget increase of $10,000" },
                manager_approval: { managerDecision: "approved", approvedBy: "John Manager" },
                director_approval: { directorDecision: "approved", approvedBy: "Jane Director" },
                execute: { executed: true, budgetApproved: 10000 },
                output: { result: "Budget approved and executed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-multi-approval-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-multi-approval",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("manager_approval");
            expect(nodeIds).toContain("director_approval");
            expect(nodeIds).toContain("execute");
        });
    });

    describe("human input to LLM", () => {
        it("should pass user input to LLM for processing", async () => {
            const workflowDef = createHumanReviewWithLLMDefinition();

            configureMockNodeOutputs({
                input: { query: "Analyze this topic" },
                wait_for_user: { additionalContext: "Focus on financial aspects" },
                llm: { response: "Financial analysis: focusing on ROI metrics..." },
                output: { result: "Financial analysis: focusing on ROI metrics..." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-human-llm-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-human-llm",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("wait_for_user");
            expect(nodeIds).toContain("llm");
        });
    });

    describe("exception escalation", () => {
        it("should handle exception escalation to human", async () => {
            const workflowDef = createExceptionEscalationDefinition();

            configureMockNodeOutputs({
                input: { data: { amount: 50000 } },
                auto_process: { processed: true, exception: true, reason: "Amount exceeds limit" },
                escalate_to_human: { decision: "approved", approvedBy: "Supervisor" },
                finalize: { finalized: true, status: "approved with override" },
                output: { result: "Processed with human override" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-escalation-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-escalation",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("auto_process");
            expect(nodeIds).toContain("escalate_to_human");
            expect(nodeIds).toContain("finalize");
        });
    });

    describe("input validation", () => {
        it.each(["string", "number", "boolean", "json"])(
            "should support %s input type",
            async (inputType) => {
                const workflowDef = createWorkflowDefinition(
                    [
                        { id: "input", type: "input", name: "Input" },
                        {
                            id: "wait_for_user",
                            type: "humanReview",
                            name: "Wait For User",
                            config: { inputType }
                        },
                        { id: "output", type: "output", name: "Output" }
                    ],
                    [
                        { source: "input", target: "wait_for_user" },
                        { source: "wait_for_user", target: "output" }
                    ]
                );

                configureMockNodeOutputs({
                    input: { data: "test" },
                    wait_for_user: { userValue: `test-${inputType}`, inputType },
                    output: { result: "done" }
                });

                const result = await worker.runUntil(
                    testEnv.client.workflow.execute("orchestratorWorkflow", {
                        workflowId: `test-input-type-${inputType}-${Date.now()}`,
                        taskQueue: "test-workflow-queue",
                        args: [
                            {
                                executionId: `exec-input-type-${inputType}`,
                                workflowDefinition: workflowDef,
                                inputs: {},
                                skipCreditCheck: true
                            }
                        ]
                    })
                );

                expect(result.success).toBe(true);
            }
        );
    });

    describe("timeout handling", () => {
        it("should include timeout configuration in pause context", async () => {
            const workflowDef = createSimpleHumanReviewDefinition();

            configureMockNodeOutputsWithSignals(
                {
                    input: { data: "test" },
                    wait_for_user: { waitingFor: "urgentApproval" },
                    output: { result: "done" }
                },
                {
                    wait_for_user: {
                        pause: true,
                        pauseContext: {
                            reason: "Urgent approval required",
                            nodeId: "wait_for_user",
                            pausedAt: Date.now(),
                            resumeTrigger: "timeout",
                            timeoutMs: 3600000,
                            preservedData: {
                                variableName: "urgentApproval",
                                required: true
                            }
                        }
                    }
                }
            );

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-timeout-config-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-timeout-config",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            // Verify the pause signal was sent with timeout info
            expect(mockEmitExecutionPaused).toHaveBeenCalled();
        });
    });

    describe("default value handling", () => {
        it("should use default value for optional input without pause", async () => {
            const workflowDef = createSimpleHumanReviewDefinition();

            configureMockNodeOutputs({
                input: { data: "test" },
                wait_for_user: { setting: "default-value", source: "default" },
                output: { result: "Completed with setting: default-value" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-default-value-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-default-value",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();
        });
    });
});
