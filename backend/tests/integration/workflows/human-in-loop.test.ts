/**
 * Human-in-the-Loop Orchestration Tests
 *
 * Tests workflows that pause for human input and resume:
 * - Pause for user input patterns
 * - Resume with provided values
 * - Default value handling
 * - Multi-step approval workflows
 * - Parallel human input collection
 * - Timeout and expiration handling
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
    isExecutionComplete,
    buildFinalOutputs
} from "../../../src/temporal/core";
import { createMockActivities, withOutputsAndSignals } from "../../fixtures/activities";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge,
    PauseContext
} from "../../../src/temporal/activities/execution/types";

// ============================================================================
// HELPER FUNCTIONS
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
    handleType?: "default" | "true" | "false";
}

/**
 * Create a workflow from node and edge definitions
 */
function createWorkflow(nodeDefs: NodeDef[], edgeDefs: EdgeDef[]): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Build adjacency maps
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();

    for (const { source, target } of edgeDefs) {
        if (!outgoing.has(source)) outgoing.set(source, []);
        if (!incoming.has(target)) incoming.set(target, []);
        outgoing.get(source)!.push(target);
        incoming.get(target)!.push(source);
    }

    // Create nodes
    for (const { id, type, name, config } of nodeDefs) {
        nodes.set(id, {
            id,
            type: type as ExecutableNode["type"],
            name,
            config: config || {},
            depth: 0,
            dependencies: incoming.get(id) || [],
            dependents: outgoing.get(id) || []
        });
    }

    // Create edges
    for (const { source, target, handleType } of edgeDefs) {
        const edgeId = `${source}-${target}`;
        edges.set(edgeId, {
            id: edgeId,
            source,
            target,
            sourceHandle: handleType || "default",
            targetHandle: "input",
            handleType: handleType || "default"
        });
    }

    // Find input and output nodes
    const inputNodes = nodeDefs.filter((n) => n.type === "input").map((n) => n.id);
    const outputNodes = nodeDefs.filter((n) => n.type === "output").map((n) => n.id);

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [],
        triggerNodeId: inputNodes[0] || nodeDefs[0].id,
        outputNodeIds: outputNodes,
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

interface PauseInfo {
    nodeId: string;
    pauseContext: PauseContext;
    result: JsonObject;
}

interface SimulationResult {
    context: ReturnType<typeof createContext>;
    finalOutputs: JsonObject;
    executionOrder: string[];
    pausedAt: PauseInfo | null;
    completed: boolean;
}

/**
 * Simulate workflow execution until pause or completion
 */
async function simulateUntilPauseOrComplete(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject = {}
): Promise<SimulationResult> {
    let context = createContext(inputs);
    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];
    let pausedAt: PauseInfo | null = null;

    while (!isExecutionComplete(queueState) && !pausedAt) {
        const readyNodes = getReadyNodes(queueState, workflow.maxConcurrentNodes || 10);
        if (readyNodes.length === 0) break;

        queueState = markExecuting(queueState, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId)!;
            executionOrder.push(nodeId);

            try {
                const result = await mockActivities.executeNode(node.type, node.config, context, {
                    executionId: "test",
                    nodeId,
                    nodeName: node.name
                });

                if (result.success) {
                    const signals = result.signals as {
                        pause?: boolean;
                        pauseContext?: PauseContext;
                    };

                    // Check for pause signal
                    if (signals?.pause && signals?.pauseContext) {
                        pausedAt = {
                            nodeId,
                            pauseContext: signals.pauseContext,
                            result: result.output
                        };
                        context = storeNodeOutput(context, nodeId, result.output);
                        queueState = markCompleted(queueState, nodeId, result.output, workflow);
                        break;
                    }

                    context = storeNodeOutput(context, nodeId, result.output);
                    queueState = markCompleted(queueState, nodeId, result.output, workflow);
                } else {
                    queueState = markFailed(
                        queueState,
                        nodeId,
                        result.error || "Unknown error",
                        workflow
                    );
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                queueState = markFailed(queueState, nodeId, message, workflow);
            }
        }
    }

    const finalOutputs = buildFinalOutputs(context, workflow.outputNodeIds);
    return {
        context,
        finalOutputs,
        executionOrder,
        pausedAt,
        completed: isExecutionComplete(queueState) && !pausedAt
    };
}

/**
 * Resume workflow from pause with provided input
 */
async function resumeFromPause(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    previousContext: ReturnType<typeof createContext>,
    resumeInputs: JsonObject
): Promise<SimulationResult> {
    // Merge resume inputs with previous context inputs
    const inputs = { ...previousContext.inputs, ...resumeInputs };
    let context = createContext(inputs);

    // Restore previous node outputs
    for (const [nodeId, output] of previousContext.nodeOutputs) {
        context = storeNodeOutput(context, nodeId, output);
    }

    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];
    let pausedAt: PauseInfo | null = null;

    // Mark previously completed nodes as completed
    for (const [nodeId] of previousContext.nodeOutputs) {
        const node = workflow.nodes.get(nodeId);
        if (node) {
            const output = previousContext.nodeOutputs.get(nodeId);
            if (output) {
                queueState = markCompleted(queueState, nodeId, output, workflow);
            }
        }
    }

    while (!isExecutionComplete(queueState) && !pausedAt) {
        const readyNodes = getReadyNodes(queueState, workflow.maxConcurrentNodes || 10);
        if (readyNodes.length === 0) break;

        queueState = markExecuting(queueState, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId)!;
            executionOrder.push(nodeId);

            try {
                const result = await mockActivities.executeNode(node.type, node.config, context, {
                    executionId: "test",
                    nodeId,
                    nodeName: node.name
                });

                if (result.success) {
                    const signals = result.signals as {
                        pause?: boolean;
                        pauseContext?: PauseContext;
                    };

                    if (signals?.pause && signals?.pauseContext) {
                        pausedAt = {
                            nodeId,
                            pauseContext: signals.pauseContext,
                            result: result.output
                        };
                        context = storeNodeOutput(context, nodeId, result.output);
                        queueState = markCompleted(queueState, nodeId, result.output, workflow);
                        break;
                    }

                    context = storeNodeOutput(context, nodeId, result.output);
                    queueState = markCompleted(queueState, nodeId, result.output, workflow);
                } else {
                    queueState = markFailed(
                        queueState,
                        nodeId,
                        result.error || "Unknown error",
                        workflow
                    );
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                queueState = markFailed(queueState, nodeId, message, workflow);
            }
        }
    }

    const finalOutputs = buildFinalOutputs(context, workflow.outputNodeIds);
    return {
        context,
        finalOutputs,
        executionOrder,
        pausedAt,
        completed: isExecutionComplete(queueState) && !pausedAt
    };
}

/**
 * Create a pause context for testing
 */
function createPauseContext(
    nodeId: string,
    variableName: string,
    options: Partial<PauseContext> = {}
): JsonObject {
    return {
        reason: `Waiting for user input: ${variableName}`,
        nodeId,
        pausedAt: Date.now(),
        resumeTrigger: "signal",
        preservedData: {
            variableName,
            required: true,
            ...options.preservedData
        },
        ...options
    } as JsonObject;
}

// ============================================================================
// TESTS
// ============================================================================

describe("Human-in-the-Loop Orchestration", () => {
    describe("pause for user input", () => {
        it("should pause workflow when user input is required", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "WaitForUser", type: "waitForUser", name: "Wait For User" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "WaitForUser" },
                    { source: "WaitForUser", target: "Output" }
                ]
            );

            const pauseContext = createPauseContext("WaitForUser", "userConfirmation", {
                preservedData: {
                    variableName: "userConfirmation",
                    inputType: "boolean",
                    required: true
                }
            });

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "initial data" },
                        WaitForUser: {
                            waitingFor: "userConfirmation",
                            inputType: "boolean"
                        }
                    },
                    {
                        WaitForUser: { pause: true, pauseContext }
                    }
                )
            );

            const result = await simulateUntilPauseOrComplete(workflow, mockActivities, {
                initialData: "test"
            });

            expect(result.pausedAt).not.toBeNull();
            expect(result.pausedAt?.nodeId).toBe("WaitForUser");
            expect(result.pausedAt?.pauseContext.reason).toContain("user input");
            expect(result.completed).toBe(false);
            expect(result.executionOrder).toContain("Input");
            expect(result.executionOrder).toContain("WaitForUser");
        });

        it("should include pause context with input requirements", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "WaitForUser", type: "waitForUser", name: "Wait For User" }
                ],
                [{ source: "Input", target: "WaitForUser" }]
            );

            const pauseContext = createPauseContext("WaitForUser", "approvalDecision", {
                preservedData: {
                    variableName: "approvalDecision",
                    inputType: "string",
                    outputVariable: "decision",
                    validation: { minLength: 5, maxLength: 100 },
                    required: true
                }
            });

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "test" },
                        WaitForUser: { waitingFor: "approvalDecision", inputType: "string" }
                    },
                    { WaitForUser: { pause: true, pauseContext } }
                )
            );

            const result = await simulateUntilPauseOrComplete(workflow, mockActivities, {});

            expect(result.pausedAt?.pauseContext.preservedData).toBeDefined();
            const preserved = result.pausedAt?.pauseContext.preservedData as {
                variableName?: string;
                inputType?: string;
                validation?: { minLength?: number; maxLength?: number };
            };
            expect(preserved?.variableName).toBe("approvalDecision");
            expect(preserved?.inputType).toBe("string");
            expect(preserved?.validation?.minLength).toBe(5);
        });
    });

    describe("resume with user input", () => {
        it("should resume workflow after receiving user input", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "WaitForUser", type: "waitForUser", name: "Wait For User" },
                    { id: "Process", type: "transform", name: "Process" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "WaitForUser" },
                    { source: "WaitForUser", target: "Process" },
                    { source: "Process", target: "Output" }
                ]
            );

            const pauseContext = createPauseContext("WaitForUser", "userChoice");

            // First run with pause
            const pauseMockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "initial data" },
                        WaitForUser: { waitingFor: "userChoice" }
                    },
                    { WaitForUser: { pause: true, pauseContext } }
                )
            );

            const pauseResult = await simulateUntilPauseOrComplete(
                workflow,
                pauseMockActivities,
                {}
            );

            expect(pauseResult.pausedAt).not.toBeNull();
            expect(pauseResult.completed).toBe(false);

            // Resume without pause - different mock for resume
            const resumeMockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        WaitForUser: { userChoice: "approved", source: "provided" },
                        Process: { processed: true, userChoice: "approved" },
                        Output: { result: "completed with user choice: approved" }
                    },
                    {} // No pause signals on resume
                )
            );

            const resumeResult = await resumeFromPause(
                workflow,
                resumeMockActivities,
                pauseResult.context,
                { userChoice: "approved" }
            );

            expect(resumeResult.completed).toBe(true);
            expect(resumeResult.executionOrder).toContain("Process");
            expect(resumeResult.executionOrder).toContain("Output");
            expect(resumeResult.finalOutputs.result).toContain("approved");
        });

        it("should pass user input to subsequent nodes", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "WaitForUser", type: "waitForUser", name: "Wait For User" },
                    { id: "LLM", type: "llm", name: "LLM" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "WaitForUser" },
                    { source: "WaitForUser", target: "LLM" },
                    { source: "LLM", target: "Output" }
                ]
            );

            const pauseContext = createPauseContext("WaitForUser", "additionalContext");

            // Initial run - pause
            const pauseMock = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { query: "Analyze this topic" },
                        WaitForUser: { waitingFor: "additionalContext" }
                    },
                    { WaitForUser: { pause: true, pauseContext } }
                )
            );

            const pauseResult = await simulateUntilPauseOrComplete(workflow, pauseMock, {});

            // Resume with context
            const resumeMock = createMockActivities(
                withOutputsAndSignals(
                    {
                        WaitForUser: { additionalContext: "Focus on financial aspects" },
                        LLM: { response: "Financial analysis: focusing on ROI metrics..." },
                        Output: { result: "Financial analysis: focusing on ROI metrics..." }
                    },
                    {}
                )
            );

            const resumeResult = await resumeFromPause(workflow, resumeMock, pauseResult.context, {
                additionalContext: "Focus on financial aspects"
            });

            expect(resumeResult.finalOutputs.result).toContain("Financial analysis");
        });
    });

    describe("default value handling", () => {
        it("should use default value for optional input without pause", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "WaitForUser", type: "waitForUser", name: "Wait For User" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "WaitForUser" },
                    { source: "WaitForUser", target: "Output" }
                ]
            );

            // No pause signal - continues with default
            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "test" },
                        WaitForUser: { setting: "default-value", source: "default" },
                        Output: { result: "Completed with setting: default-value" }
                    },
                    {} // No pause
                )
            );

            const result = await simulateUntilPauseOrComplete(workflow, mockActivities, {});

            expect(result.pausedAt).toBeNull();
            expect(result.completed).toBe(true);
            expect(result.finalOutputs.result).toContain("default-value");
        });

        it("should pause for required input even with default value", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "WaitForUser", type: "waitForUser", name: "Wait For User" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "WaitForUser" },
                    { source: "WaitForUser", target: "Output" }
                ]
            );

            const pauseContext = createPauseContext("WaitForUser", "requiredInput", {
                preservedData: { variableName: "requiredInput", required: true }
            });

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "test" },
                        WaitForUser: { waitingFor: "requiredInput" }
                    },
                    { WaitForUser: { pause: true, pauseContext } }
                )
            );

            const result = await simulateUntilPauseOrComplete(workflow, mockActivities, {});

            expect(result.pausedAt).not.toBeNull();
            expect(result.completed).toBe(false);
        });
    });

    describe("multi-step approval workflow", () => {
        it("should handle sequential approval steps", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "ManagerApproval", type: "waitForUser", name: "Manager Approval" },
                    { id: "DirectorApproval", type: "waitForUser", name: "Director Approval" },
                    { id: "Execute", type: "transform", name: "Execute" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "ManagerApproval" },
                    { source: "ManagerApproval", target: "DirectorApproval" },
                    { source: "DirectorApproval", target: "Execute" },
                    { source: "Execute", target: "Output" }
                ]
            );

            // Step 1: Pause for manager approval
            const managerPause = createPauseContext("ManagerApproval", "managerDecision");
            const step1Mock = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { request: "Budget increase of $10,000" },
                        ManagerApproval: { waitingFor: "managerDecision" }
                    },
                    { ManagerApproval: { pause: true, pauseContext: managerPause } }
                )
            );

            const step1 = await simulateUntilPauseOrComplete(workflow, step1Mock, {});
            expect(step1.pausedAt?.nodeId).toBe("ManagerApproval");

            // Step 2: Resume with manager approval, pause for director
            const directorPause = createPauseContext("DirectorApproval", "directorDecision");
            const step2Mock = createMockActivities(
                withOutputsAndSignals(
                    {
                        ManagerApproval: {
                            managerDecision: "approved",
                            approvedBy: "John Manager"
                        },
                        DirectorApproval: { waitingFor: "directorDecision" }
                    },
                    { DirectorApproval: { pause: true, pauseContext: directorPause } }
                )
            );

            const step2 = await resumeFromPause(workflow, step2Mock, step1.context, {
                managerDecision: "approved"
            });
            expect(step2.pausedAt?.nodeId).toBe("DirectorApproval");

            // Step 3: Resume with director approval, complete
            const step3Mock = createMockActivities(
                withOutputsAndSignals(
                    {
                        DirectorApproval: {
                            directorDecision: "approved",
                            approvedBy: "Jane Director"
                        },
                        Execute: { executed: true, budgetApproved: 10000 },
                        Output: { result: "Budget approved and executed" }
                    },
                    {}
                )
            );

            const step3 = await resumeFromPause(workflow, step3Mock, step2.context, {
                directorDecision: "approved"
            });

            expect(step3.completed).toBe(true);
            expect(step3.finalOutputs.result).toContain("Budget approved");
        });
    });

    describe("input validation", () => {
        it("should preserve validation rules in pause context", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "WaitForUser", type: "waitForUser", name: "Wait For User" }
                ],
                [{ source: "Input", target: "WaitForUser" }]
            );

            const pauseContext = createPauseContext("WaitForUser", "email", {
                preservedData: {
                    variableName: "email",
                    inputType: "string",
                    outputVariable: "userEmail",
                    validation: {
                        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                        minLength: 5,
                        maxLength: 100,
                        required: true
                    },
                    required: true
                }
            });

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "test" },
                        WaitForUser: { waitingFor: "email", inputType: "string" }
                    },
                    { WaitForUser: { pause: true, pauseContext } }
                )
            );

            const result = await simulateUntilPauseOrComplete(workflow, mockActivities, {});

            const validation = result.pausedAt?.pauseContext.preservedData?.validation as {
                pattern?: string;
                minLength?: number;
                maxLength?: number;
            };
            expect(validation).toBeDefined();
            expect(validation?.pattern).toContain("@");
            expect(validation?.minLength).toBe(5);
            expect(validation?.maxLength).toBe(100);
        });

        it("should support different input types", async () => {
            const inputTypes = ["string", "number", "boolean", "json"];

            for (const inputType of inputTypes) {
                const workflow = createWorkflow(
                    [
                        { id: "Input", type: "input", name: "Input" },
                        { id: "WaitForUser", type: "waitForUser", name: "Wait For User" }
                    ],
                    [{ source: "Input", target: "WaitForUser" }]
                );

                const pauseContext = createPauseContext("WaitForUser", "userValue", {
                    preservedData: {
                        variableName: "userValue",
                        inputType,
                        required: true
                    }
                });

                const mockActivities = createMockActivities(
                    withOutputsAndSignals(
                        {
                            Input: { data: "test" },
                            WaitForUser: { waitingFor: "userValue", inputType }
                        },
                        { WaitForUser: { pause: true, pauseContext } }
                    )
                );

                const result = await simulateUntilPauseOrComplete(workflow, mockActivities, {});

                expect(result.pausedAt?.pauseContext.preservedData?.inputType).toBe(inputType);
            }
        });
    });

    describe("timeout handling", () => {
        it("should include timeout configuration in pause context", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "WaitForUser", type: "waitForUser", name: "Wait For User" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "WaitForUser" },
                    { source: "WaitForUser", target: "Output" }
                ]
            );

            const pauseContext = {
                reason: "Urgent approval required",
                nodeId: "WaitForUser",
                pausedAt: Date.now(),
                resumeTrigger: "timeout",
                timeoutMs: 3600000, // 1 hour timeout
                preservedData: {
                    variableName: "urgentApproval",
                    required: true
                }
            } as JsonObject;

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "test" },
                        WaitForUser: { waitingFor: "urgentApproval" }
                    },
                    { WaitForUser: { pause: true, pauseContext } }
                )
            );

            const result = await simulateUntilPauseOrComplete(workflow, mockActivities, {});

            expect(result.pausedAt?.pauseContext.resumeTrigger).toBe("timeout");
            expect(result.pausedAt?.pauseContext.timeoutMs).toBe(3600000);
        });

        it("should track pause duration", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "WaitForUser", type: "waitForUser", name: "Wait For User" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "WaitForUser" },
                    { source: "WaitForUser", target: "Output" }
                ]
            );

            const pauseTime = Date.now();
            const pauseContext = {
                reason: "Waiting for decision",
                nodeId: "WaitForUser",
                pausedAt: pauseTime,
                resumeTrigger: "signal",
                preservedData: { variableName: "decision" }
            } as JsonObject;

            const mockActivities = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: "test" },
                        WaitForUser: { waitingFor: "decision" }
                    },
                    { WaitForUser: { pause: true, pauseContext } }
                )
            );

            const result = await simulateUntilPauseOrComplete(workflow, mockActivities, {});

            expect(result.pausedAt?.pauseContext.pausedAt).toBe(pauseTime);
            expect(typeof result.pausedAt?.pauseContext.pausedAt).toBe("number");
        });
    });

    describe("complex human-in-loop patterns", () => {
        it("should handle exception escalation", async () => {
            const workflow = createWorkflow(
                [
                    { id: "Input", type: "input", name: "Input" },
                    { id: "AutoProcess", type: "transform", name: "Auto Process" },
                    { id: "EscalateToHuman", type: "waitForUser", name: "Escalate" },
                    { id: "Finalize", type: "transform", name: "Finalize" },
                    { id: "Output", type: "output", name: "Output" }
                ],
                [
                    { source: "Input", target: "AutoProcess" },
                    { source: "AutoProcess", target: "EscalateToHuman" },
                    { source: "EscalateToHuman", target: "Finalize" },
                    { source: "Finalize", target: "Output" }
                ]
            );

            const pauseContext = {
                reason: "Exception: Amount $50,000 exceeds auto-approval limit",
                nodeId: "EscalateToHuman",
                pausedAt: Date.now(),
                resumeTrigger: "signal",
                preservedData: {
                    variableName: "humanDecision",
                    inputType: "json",
                    required: true
                }
            } as JsonObject;

            // Auto-process triggers exception
            const exceptionMock = createMockActivities(
                withOutputsAndSignals(
                    {
                        Input: { data: { amount: 50000 } },
                        AutoProcess: {
                            processed: true,
                            exception: true,
                            reason: "Amount exceeds limit"
                        },
                        EscalateToHuman: { waitingFor: "humanDecision" }
                    },
                    { EscalateToHuman: { pause: true, pauseContext } }
                )
            );

            const exception = await simulateUntilPauseOrComplete(workflow, exceptionMock, {});
            expect(exception.pausedAt?.pauseContext.reason).toContain("Exception");

            // Human resolves exception
            const resolveMock = createMockActivities(
                withOutputsAndSignals(
                    {
                        EscalateToHuman: { decision: "approved", approvedBy: "Supervisor" },
                        Finalize: { finalized: true, status: "approved with override" },
                        Output: { result: "Processed with human override" }
                    },
                    {}
                )
            );

            const resolved = await resumeFromPause(workflow, resolveMock, exception.context, {
                humanDecision: { approved: true, note: "Special approval" }
            });

            expect(resolved.completed).toBe(true);
            expect(resolved.finalOutputs.result).toContain("override");
        });
    });
});
