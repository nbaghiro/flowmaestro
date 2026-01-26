/**
 * Trigger Handler Workflow Tests
 *
 * Tests for the triggered workflow execution covering:
 * - Workflow preparation (fetching workflow, creating execution)
 * - Orchestrator integration
 * - Execution completion handling
 * - Error handling and recovery
 */

import type { JsonValue, WorkflowDefinition, JsonObject } from "@flowmaestro/shared";

// ============================================================================
// MOCK SETUP
// ============================================================================

interface MockActivityResults {
    prepareTriggeredExecution: {
        executionId: string;
        workflowDefinition: WorkflowDefinition;
        inputs: Record<string, JsonValue>;
    } | null;
    prepareTriggeredExecutionError: Error | null;
    orchestratorResult: {
        success: boolean;
        outputs: JsonObject;
        error?: string;
    };
    orchestratorError: Error | null;
    completeTriggeredExecutionCalled: boolean;
    completeTriggeredExecutionArgs: {
        executionId: string;
        success: boolean;
        outputs?: Record<string, JsonValue>;
        error?: string;
    } | null;
}

const mockActivityResults: MockActivityResults = {
    prepareTriggeredExecution: null,
    prepareTriggeredExecutionError: null,
    orchestratorResult: { success: true, outputs: {} },
    orchestratorError: null,
    completeTriggeredExecutionCalled: false,
    completeTriggeredExecutionArgs: null
};

function resetMocks(): void {
    mockActivityResults.prepareTriggeredExecution = null;
    mockActivityResults.prepareTriggeredExecutionError = null;
    mockActivityResults.orchestratorResult = { success: true, outputs: {} };
    mockActivityResults.orchestratorError = null;
    mockActivityResults.completeTriggeredExecutionCalled = false;
    mockActivityResults.completeTriggeredExecutionArgs = null;
}

// ============================================================================
// MOCK ACTIVITIES
// ============================================================================

const mockPrepareTriggeredExecution = jest.fn().mockImplementation(() => {
    if (mockActivityResults.prepareTriggeredExecutionError) {
        throw mockActivityResults.prepareTriggeredExecutionError;
    }
    return Promise.resolve(mockActivityResults.prepareTriggeredExecution);
});

const mockCompleteTriggeredExecution = jest
    .fn()
    .mockImplementation(
        (
            executionId: string,
            success: boolean,
            outputs?: Record<string, JsonValue>,
            error?: string
        ) => {
            mockActivityResults.completeTriggeredExecutionCalled = true;
            mockActivityResults.completeTriggeredExecutionArgs = {
                executionId,
                success,
                outputs,
                error
            };
            return Promise.resolve();
        }
    );

const mockOrchestratorWorkflow = jest.fn().mockImplementation(() => {
    if (mockActivityResults.orchestratorError) {
        throw mockActivityResults.orchestratorError;
    }
    return Promise.resolve(mockActivityResults.orchestratorResult);
});

// ============================================================================
// WORKFLOW SIMULATION
// ============================================================================

interface TriggeredWorkflowInput {
    triggerId: string;
    workflowId: string;
    payload?: Record<string, JsonValue>;
}

interface TriggeredWorkflowResult {
    success: boolean;
    executionId: string;
    outputs?: Record<string, JsonValue>;
    error?: string;
}

/**
 * Simulates the triggered workflow execution
 */
async function simulateTriggeredWorkflow(
    input: TriggeredWorkflowInput
): Promise<TriggeredWorkflowResult> {
    const { triggerId, workflowId, payload = {} } = input;

    try {
        // Step 1: Prepare execution
        const preparation = await mockPrepareTriggeredExecution({
            triggerId,
            workflowId,
            payload
        });

        // Step 2: Execute the workflow using orchestrator
        let orchestratorResult;
        try {
            orchestratorResult = await mockOrchestratorWorkflow({
                executionId: preparation.executionId,
                workflowDefinition: preparation.workflowDefinition,
                inputs: preparation.inputs
            });
        } catch (error) {
            // Handle orchestrator failure
            await mockCompleteTriggeredExecution(
                preparation.executionId,
                false,
                undefined,
                `Orchestrator error: ${error}`
            );

            return {
                success: false,
                executionId: preparation.executionId,
                error: `Workflow execution failed: ${error}`
            };
        }

        // Step 3: Complete execution with results
        await mockCompleteTriggeredExecution(
            preparation.executionId,
            orchestratorResult.success,
            orchestratorResult.outputs,
            orchestratorResult.error
        );

        return {
            success: orchestratorResult.success,
            executionId: preparation.executionId,
            outputs: orchestratorResult.outputs,
            error: orchestratorResult.error
        };
    } catch (error) {
        return {
            success: false,
            executionId: "",
            error: `Fatal error in triggered workflow: ${error}`
        };
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createTestWorkflowDefinition(): WorkflowDefinition {
    return {
        name: "Test Triggered Workflow",
        description: "Test workflow for trigger tests",
        nodes: {
            input1: {
                type: "input",
                name: "Input Node",
                config: { inputName: "data" },
                position: { x: 0, y: 0 }
            },
            output1: {
                type: "output",
                name: "Output Node",
                config: {},
                position: { x: 200, y: 0 }
            }
        },
        edges: [{ id: "e1", source: "input1", target: "output1" }],
        entryPoint: "input1"
    };
}

function createTestInput(overrides: Partial<TriggeredWorkflowInput> = {}): TriggeredWorkflowInput {
    return {
        triggerId: "trigger-123",
        workflowId: "workflow-456",
        payload: { key: "value" },
        ...overrides
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Triggered Workflow", () => {
    beforeEach(() => {
        resetMocks();
        jest.clearAllMocks();
    });

    describe("workflow preparation", () => {
        it("should prepare execution with trigger and workflow info", async () => {
            mockActivityResults.prepareTriggeredExecution = {
                executionId: "exec-789",
                workflowDefinition: createTestWorkflowDefinition(),
                inputs: { key: "value" }
            };

            const input = createTestInput();
            const result = await simulateTriggeredWorkflow(input);

            expect(result.success).toBe(true);
            expect(result.executionId).toBe("exec-789");
            expect(mockPrepareTriggeredExecution).toHaveBeenCalledWith({
                triggerId: "trigger-123",
                workflowId: "workflow-456",
                payload: { key: "value" }
            });
        });

        it("should handle missing payload gracefully", async () => {
            mockActivityResults.prepareTriggeredExecution = {
                executionId: "exec-789",
                workflowDefinition: createTestWorkflowDefinition(),
                inputs: {}
            };

            const input = createTestInput({ payload: undefined });
            const result = await simulateTriggeredWorkflow(input);

            expect(result.success).toBe(true);
            expect(mockPrepareTriggeredExecution).toHaveBeenCalledWith({
                triggerId: "trigger-123",
                workflowId: "workflow-456",
                payload: {}
            });
        });

        it("should fail if workflow not found", async () => {
            mockActivityResults.prepareTriggeredExecutionError = new Error(
                "Workflow not found: workflow-456"
            );

            const input = createTestInput();
            const result = await simulateTriggeredWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Workflow not found");
            expect(result.executionId).toBe("");
        });

        it("should fail if trigger not found", async () => {
            mockActivityResults.prepareTriggeredExecutionError = new Error(
                "Trigger not found: trigger-123"
            );

            const input = createTestInput();
            const result = await simulateTriggeredWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Trigger not found");
        });
    });

    describe("orchestrator execution", () => {
        beforeEach(() => {
            mockActivityResults.prepareTriggeredExecution = {
                executionId: "exec-789",
                workflowDefinition: createTestWorkflowDefinition(),
                inputs: { key: "value" }
            };
        });

        it("should execute workflow through orchestrator", async () => {
            mockActivityResults.orchestratorResult = {
                success: true,
                outputs: { result: "success" }
            };

            const input = createTestInput();
            const result = await simulateTriggeredWorkflow(input);

            expect(result.success).toBe(true);
            expect(result.outputs).toEqual({ result: "success" });
            expect(mockOrchestratorWorkflow).toHaveBeenCalledWith({
                executionId: "exec-789",
                workflowDefinition: expect.any(Object),
                inputs: { key: "value" }
            });
        });

        it("should pass workflow definition to orchestrator", async () => {
            const input = createTestInput();
            await simulateTriggeredWorkflow(input);

            expect(mockOrchestratorWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    workflowDefinition: expect.objectContaining({
                        name: "Test Triggered Workflow"
                    })
                })
            );
        });

        it("should handle orchestrator failure", async () => {
            mockActivityResults.orchestratorError = new Error("Node execution failed");

            const input = createTestInput();
            const result = await simulateTriggeredWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Workflow execution failed");
            expect(result.error).toContain("Node execution failed");
            expect(result.executionId).toBe("exec-789");
        });

        it("should complete execution even if orchestrator fails", async () => {
            mockActivityResults.orchestratorError = new Error("Orchestrator crashed");

            const input = createTestInput();
            await simulateTriggeredWorkflow(input);

            expect(mockActivityResults.completeTriggeredExecutionCalled).toBe(true);
            expect(mockActivityResults.completeTriggeredExecutionArgs?.success).toBe(false);
            expect(mockActivityResults.completeTriggeredExecutionArgs?.error).toContain(
                "Orchestrator error"
            );
        });

        it("should handle orchestrator returning failure result", async () => {
            mockActivityResults.orchestratorResult = {
                success: false,
                outputs: {},
                error: "Validation failed"
            };

            const input = createTestInput();
            const result = await simulateTriggeredWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Validation failed");
        });
    });

    describe("execution completion", () => {
        beforeEach(() => {
            mockActivityResults.prepareTriggeredExecution = {
                executionId: "exec-789",
                workflowDefinition: createTestWorkflowDefinition(),
                inputs: {}
            };
        });

        it("should complete execution on success", async () => {
            mockActivityResults.orchestratorResult = {
                success: true,
                outputs: { data: "processed" }
            };

            const input = createTestInput();
            await simulateTriggeredWorkflow(input);

            expect(mockCompleteTriggeredExecution).toHaveBeenCalledWith(
                "exec-789",
                true,
                { data: "processed" },
                undefined
            );
        });

        it("should complete execution on failure with error", async () => {
            mockActivityResults.orchestratorResult = {
                success: false,
                outputs: {},
                error: "Processing failed"
            };

            const input = createTestInput();
            await simulateTriggeredWorkflow(input);

            expect(mockCompleteTriggeredExecution).toHaveBeenCalledWith(
                "exec-789",
                false,
                {},
                "Processing failed"
            );
        });

        it("should return outputs from completed execution", async () => {
            mockActivityResults.orchestratorResult = {
                success: true,
                outputs: {
                    processedData: { items: [1, 2, 3] },
                    metadata: { count: 3 }
                }
            };

            const input = createTestInput();
            const result = await simulateTriggeredWorkflow(input);

            expect(result.outputs).toEqual({
                processedData: { items: [1, 2, 3] },
                metadata: { count: 3 }
            });
        });
    });

    describe("error handling", () => {
        it("should handle fatal errors during preparation", async () => {
            mockActivityResults.prepareTriggeredExecutionError = new Error(
                "Database connection failed"
            );

            const input = createTestInput();
            const result = await simulateTriggeredWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Fatal error");
            expect(result.error).toContain("Database connection failed");
            expect(result.executionId).toBe("");
        });

        it("should not call complete if preparation fails", async () => {
            mockActivityResults.prepareTriggeredExecutionError = new Error("Preparation failed");

            const input = createTestInput();
            await simulateTriggeredWorkflow(input);

            expect(mockCompleteTriggeredExecution).not.toHaveBeenCalled();
        });

        it("should handle empty workflow definition", async () => {
            mockActivityResults.prepareTriggeredExecution = {
                executionId: "exec-789",
                workflowDefinition: {
                    name: "Empty Workflow",
                    nodes: {},
                    edges: [],
                    entryPoint: ""
                } as WorkflowDefinition,
                inputs: {}
            };

            const input = createTestInput();
            const result = await simulateTriggeredWorkflow(input);

            // Should still attempt to execute
            expect(mockOrchestratorWorkflow).toHaveBeenCalled();
            expect(result.executionId).toBe("exec-789");
        });
    });

    describe("payload handling", () => {
        beforeEach(() => {
            mockActivityResults.prepareTriggeredExecution = {
                executionId: "exec-789",
                workflowDefinition: createTestWorkflowDefinition(),
                inputs: {}
            };
        });

        it("should pass complex payload to preparation", async () => {
            const complexPayload = {
                webhookData: {
                    event: "user.created",
                    user: { id: "u-123", name: "Test User" }
                },
                headers: { "x-signature": "abc123" },
                timestamp: 1234567890
            };

            const input = createTestInput({ payload: complexPayload });
            await simulateTriggeredWorkflow(input);

            expect(mockPrepareTriggeredExecution).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: complexPayload
                })
            );
        });

        it("should handle array payload", async () => {
            const arrayPayload = {
                items: [
                    { id: 1, name: "Item 1" },
                    { id: 2, name: "Item 2" }
                ]
            };

            const input = createTestInput({ payload: arrayPayload });
            await simulateTriggeredWorkflow(input);

            expect(mockPrepareTriggeredExecution).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: arrayPayload
                })
            );
        });

        it("should handle null values in payload", async () => {
            const payloadWithNulls = {
                value: null,
                nested: { field: null }
            };

            const input = createTestInput({
                payload: payloadWithNulls as Record<string, JsonValue>
            });
            await simulateTriggeredWorkflow(input);

            expect(mockPrepareTriggeredExecution).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: payloadWithNulls
                })
            );
        });
    });

    describe("trigger types", () => {
        beforeEach(() => {
            mockActivityResults.prepareTriggeredExecution = {
                executionId: "exec-789",
                workflowDefinition: createTestWorkflowDefinition(),
                inputs: {}
            };
        });

        it("should handle schedule trigger", async () => {
            const input = createTestInput({
                triggerId: "schedule-trigger-123",
                payload: { scheduledTime: "2024-01-01T00:00:00Z" }
            });

            const result = await simulateTriggeredWorkflow(input);

            expect(result.success).toBe(true);
            expect(mockPrepareTriggeredExecution).toHaveBeenCalledWith(
                expect.objectContaining({
                    triggerId: "schedule-trigger-123"
                })
            );
        });

        it("should handle webhook trigger", async () => {
            const input = createTestInput({
                triggerId: "webhook-trigger-456",
                payload: {
                    method: "POST",
                    body: { event: "order.created" }
                }
            });

            const result = await simulateTriggeredWorkflow(input);

            expect(result.success).toBe(true);
        });

        it("should handle event trigger", async () => {
            const input = createTestInput({
                triggerId: "event-trigger-789",
                payload: {
                    eventType: "file.uploaded",
                    fileId: "file-123"
                }
            });

            const result = await simulateTriggeredWorkflow(input);

            expect(result.success).toBe(true);
        });
    });
});
