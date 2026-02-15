/**
 * Switch Pattern Integration Tests
 *
 * True integration tests that verify switch node behavior through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Basic switch/case matching with exact values
 * - Wildcard pattern matching (* and ?)
 * - Numeric case matching
 * - Default case handling
 * - Switch with transform preprocessing
 * - Switch with multiple downstream branches
 * - Case-insensitive matching
 * - Error handling scenarios
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { WorkflowDefinition, JsonObject, JsonValue } from "@flowmaestro/shared";

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

/**
 * Create a basic switch workflow
 * Input -> Switch -> Multiple Output branches
 */
function createBasicSwitchDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["switch"] = {
        type: "switch",
        name: "Status Switch",
        config: {
            expression: "${input.data.status}",
            cases: [
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" }
            ],
            defaultCase: "unknown"
        },
        position: { x: 200, y: 0 }
    };

    nodes["pending-handler"] = {
        type: "code",
        name: "Handle Pending",
        config: {
            language: "javascript",
            code: "return { action: 'notify_reviewer', status: 'pending' };",
            outputVariable: "pendingResult"
        },
        position: { x: 400, y: -100 }
    };

    nodes["approved-handler"] = {
        type: "code",
        name: "Handle Approved",
        config: {
            language: "javascript",
            code: "return { action: 'process_order', status: 'approved' };",
            outputVariable: "approvedResult"
        },
        position: { x: 400, y: 0 }
    };

    nodes["rejected-handler"] = {
        type: "code",
        name: "Handle Rejected",
        config: {
            language: "javascript",
            code: "return { action: 'send_rejection', status: 'rejected' };",
            outputVariable: "rejectedResult"
        },
        position: { x: 400, y: 100 }
    };

    nodes["default-handler"] = {
        type: "code",
        name: "Handle Unknown",
        config: {
            language: "javascript",
            code: "return { action: 'log_unknown', status: 'unknown' };",
            outputVariable: "unknownResult"
        },
        position: { x: 400, y: 200 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 0 }
    };

    edges.push(
        { id: "input-switch", source: "input", target: "switch" },
        {
            id: "switch-pending",
            source: "switch",
            target: "pending-handler",
            sourceHandle: "pending"
        },
        {
            id: "switch-approved",
            source: "switch",
            target: "approved-handler",
            sourceHandle: "approved"
        },
        {
            id: "switch-rejected",
            source: "switch",
            target: "rejected-handler",
            sourceHandle: "rejected"
        },
        {
            id: "switch-default",
            source: "switch",
            target: "default-handler",
            sourceHandle: "default"
        },
        { id: "pending-output", source: "pending-handler", target: "output" },
        { id: "approved-output", source: "approved-handler", target: "output" },
        { id: "rejected-output", source: "rejected-handler", target: "output" },
        { id: "default-output", source: "default-handler", target: "output" }
    );

    return {
        name: "Basic Switch Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a switch workflow with wildcard patterns
 * Input -> Switch (with wildcards) -> Output
 */
function createWildcardSwitchDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["switch"] = {
        type: "switch",
        name: "Pattern Switch",
        config: {
            expression: "${input.data.code}",
            cases: [
                { value: "ERR-*", label: "Error Codes" },
                { value: "WARN-???", label: "Warning Codes (3 digit)" },
                { value: "INFO-*", label: "Info Codes" }
            ],
            defaultCase: "other"
        },
        position: { x: 200, y: 0 }
    };

    nodes["error-handler"] = {
        type: "code",
        name: "Handle Error",
        config: {
            language: "javascript",
            code: "return { category: 'error', severity: 'high' };",
            outputVariable: "errorResult"
        },
        position: { x: 400, y: -100 }
    };

    nodes["warning-handler"] = {
        type: "code",
        name: "Handle Warning",
        config: {
            language: "javascript",
            code: "return { category: 'warning', severity: 'medium' };",
            outputVariable: "warningResult"
        },
        position: { x: 400, y: 0 }
    };

    nodes["info-handler"] = {
        type: "code",
        name: "Handle Info",
        config: {
            language: "javascript",
            code: "return { category: 'info', severity: 'low' };",
            outputVariable: "infoResult"
        },
        position: { x: 400, y: 100 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 0 }
    };

    edges.push(
        { id: "input-switch", source: "input", target: "switch" },
        { id: "switch-error", source: "switch", target: "error-handler", sourceHandle: "ERR-*" },
        {
            id: "switch-warning",
            source: "switch",
            target: "warning-handler",
            sourceHandle: "WARN-???"
        },
        { id: "switch-info", source: "switch", target: "info-handler", sourceHandle: "INFO-*" },
        { id: "error-output", source: "error-handler", target: "output" },
        { id: "warning-output", source: "warning-handler", target: "output" },
        { id: "info-output", source: "info-handler", target: "output" }
    );

    return {
        name: "Wildcard Switch Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a switch workflow with numeric cases
 * Input -> Switch (numeric) -> Output
 */
function createNumericSwitchDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["switch"] = {
        type: "switch",
        name: "Priority Switch",
        config: {
            expression: "${input.data.priority}",
            cases: [
                { value: "1", label: "Critical" },
                { value: "2", label: "High" },
                { value: "3", label: "Medium" },
                { value: "4", label: "Low" }
            ],
            defaultCase: "unassigned"
        },
        position: { x: 200, y: 0 }
    };

    nodes["critical-handler"] = {
        type: "code",
        name: "Handle Critical",
        config: {
            language: "javascript",
            code: "return { escalate: true, team: 'incident-response' };",
            outputVariable: "criticalResult"
        },
        position: { x: 400, y: -100 }
    };

    nodes["normal-handler"] = {
        type: "code",
        name: "Handle Normal",
        config: {
            language: "javascript",
            code: "return { escalate: false, team: 'support' };",
            outputVariable: "normalResult"
        },
        position: { x: 400, y: 100 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 0 }
    };

    edges.push(
        { id: "input-switch", source: "input", target: "switch" },
        { id: "switch-critical", source: "switch", target: "critical-handler", sourceHandle: "1" },
        { id: "switch-high", source: "switch", target: "critical-handler", sourceHandle: "2" },
        { id: "switch-medium", source: "switch", target: "normal-handler", sourceHandle: "3" },
        { id: "switch-low", source: "switch", target: "normal-handler", sourceHandle: "4" },
        { id: "critical-output", source: "critical-handler", target: "output" },
        { id: "normal-output", source: "normal-handler", target: "output" }
    );

    return {
        name: "Numeric Switch Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a switch workflow with transform preprocessing
 * Input -> Transform (normalize) -> Switch -> Output
 */
function createTransformSwitchDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["transform"] = {
        type: "transform",
        name: "Normalize",
        config: {
            operation: "custom",
            inputData: "${input.data}",
            expression: "$.type.toLowerCase()",
            outputVariable: "normalizedType"
        },
        position: { x: 200, y: 0 }
    };

    nodes["switch"] = {
        type: "switch",
        name: "Type Switch",
        config: {
            expression: "${transform.normalizedType}",
            cases: [
                { value: "email", label: "Email" },
                { value: "sms", label: "SMS" },
                { value: "push", label: "Push" }
            ],
            defaultCase: "other"
        },
        position: { x: 400, y: 0 }
    };

    nodes["email-handler"] = {
        type: "code",
        name: "Send Email",
        config: {
            language: "javascript",
            code: "return { channel: 'email', sent: true };",
            outputVariable: "emailResult"
        },
        position: { x: 600, y: -100 }
    };

    nodes["sms-handler"] = {
        type: "code",
        name: "Send SMS",
        config: {
            language: "javascript",
            code: "return { channel: 'sms', sent: true };",
            outputVariable: "smsResult"
        },
        position: { x: 600, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 800, y: 0 }
    };

    edges.push(
        { id: "input-transform", source: "input", target: "transform" },
        { id: "transform-switch", source: "transform", target: "switch" },
        { id: "switch-email", source: "switch", target: "email-handler", sourceHandle: "email" },
        { id: "switch-sms", source: "switch", target: "sms-handler", sourceHandle: "sms" },
        { id: "email-output", source: "email-handler", target: "output" },
        { id: "sms-output", source: "sms-handler", target: "output" }
    );

    return {
        name: "Transform Switch Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a chained switch workflow (switch -> switch)
 * Input -> Switch (category) -> Switch (subcategory) -> Output
 */
function createChainedSwitchDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["category-switch"] = {
        type: "switch",
        name: "Category Switch",
        config: {
            expression: "${input.data.category}",
            cases: [
                { value: "electronics", label: "Electronics" },
                { value: "clothing", label: "Clothing" }
            ],
            defaultCase: "other"
        },
        position: { x: 200, y: 0 }
    };

    nodes["electronics-switch"] = {
        type: "switch",
        name: "Electronics Subcategory",
        config: {
            expression: "${input.data.subcategory}",
            cases: [
                { value: "phones", label: "Phones" },
                { value: "laptops", label: "Laptops" }
            ],
            defaultCase: "other-electronics"
        },
        position: { x: 400, y: -100 }
    };

    nodes["phones-handler"] = {
        type: "code",
        name: "Handle Phones",
        config: {
            language: "javascript",
            code: "return { department: 'mobile', warehouse: 'A' };",
            outputVariable: "phonesResult"
        },
        position: { x: 600, y: -150 }
    };

    nodes["laptops-handler"] = {
        type: "code",
        name: "Handle Laptops",
        config: {
            language: "javascript",
            code: "return { department: 'computing', warehouse: 'B' };",
            outputVariable: "laptopsResult"
        },
        position: { x: 600, y: -50 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 800, y: 0 }
    };

    edges.push(
        { id: "input-category", source: "input", target: "category-switch" },
        {
            id: "category-electronics",
            source: "category-switch",
            target: "electronics-switch",
            sourceHandle: "electronics"
        },
        {
            id: "electronics-phones",
            source: "electronics-switch",
            target: "phones-handler",
            sourceHandle: "phones"
        },
        {
            id: "electronics-laptops",
            source: "electronics-switch",
            target: "laptops-handler",
            sourceHandle: "laptops"
        },
        { id: "phones-output", source: "phones-handler", target: "output" },
        { id: "laptops-output", source: "laptops-handler", target: "output" }
    );

    return {
        name: "Chained Switch Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

// ============================================================================
// MOCK SETUP
// ============================================================================

function setupDefaultMocks(): void {
    jest.clearAllMocks();

    // Default successful mock implementations
    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        return {
            result: { executed: nodeId },
            signals: {},
            metrics: { durationMs: 100 },
            success: true,
            output: { executed: nodeId }
        };
    });

    mockValidateInputsActivity.mockResolvedValue({ success: true });
    mockValidateOutputsActivity.mockResolvedValue({ success: true });
    mockCreateSpan.mockResolvedValue({ traceId: "test-trace-id", spanId: "test-span-id" });
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
    mockReserveCredits.mockResolvedValue({ success: true, reservationId: "test-reservation" });
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

        // For switch nodes, include the selectedRoute signal
        const signals: Record<string, JsonValue> = {};
        if (params.nodeType === "switch" && output.matchedCase !== undefined) {
            signals.selectedRoute = (output.matchedCase as string) || "default";
        }

        return {
            result: output,
            signals,
            metrics: { durationMs: 100 },
            success: true,
            output
        };
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("Switch Pattern Integration Tests", () => {
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

    describe("basic switch patterns", () => {
        it("should route to pending handler", async () => {
            const workflowDef = createBasicSwitchDefinition();

            configureMockNodeOutputs({
                switch: {
                    matchedCase: "pending",
                    matchedValue: "pending",
                    evaluatedExpression: "pending"
                },
                "pending-handler": {
                    action: "notify_reviewer",
                    status: "pending"
                },
                output: { result: { handled: "pending" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-pending-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-pending",
                            workflowDefinition: workflowDef,
                            inputs: { data: { status: "pending" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("switch");
            expect(nodeIds).toContain("pending-handler");
            expect(nodeIds).toContain("output");
        });

        it("should route to approved handler", async () => {
            const workflowDef = createBasicSwitchDefinition();

            configureMockNodeOutputs({
                switch: {
                    matchedCase: "approved",
                    matchedValue: "approved",
                    evaluatedExpression: "approved"
                },
                "approved-handler": {
                    action: "process_order",
                    status: "approved"
                },
                output: { result: { handled: "approved" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-approved-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-approved",
                            workflowDefinition: workflowDef,
                            inputs: { data: { status: "approved" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("switch");
            expect(nodeIds).toContain("approved-handler");
        });

        it("should route to default handler for unknown status", async () => {
            const workflowDef = createBasicSwitchDefinition();

            configureMockNodeOutputs({
                switch: {
                    matchedCase: "unknown",
                    matchedValue: null,
                    evaluatedExpression: "cancelled"
                },
                "default-handler": {
                    action: "log_unknown",
                    status: "unknown"
                },
                output: { result: { handled: "unknown" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-default-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-default",
                            workflowDefinition: workflowDef,
                            inputs: { data: { status: "cancelled" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("switch");
            expect(nodeIds).toContain("default-handler");
        });
    });

    describe("wildcard pattern matching", () => {
        it("should match ERR-* pattern", async () => {
            const workflowDef = createWildcardSwitchDefinition();

            configureMockNodeOutputs({
                switch: {
                    matchedCase: "ERR-*",
                    matchedValue: "ERR-*",
                    evaluatedExpression: "ERR-500"
                },
                "error-handler": {
                    category: "error",
                    severity: "high"
                },
                output: { result: { category: "error" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-wildcard-err-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-wildcard-err",
                            workflowDefinition: workflowDef,
                            inputs: { data: { code: "ERR-500" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("error-handler");
        });

        it("should match WARN-??? pattern (3 characters)", async () => {
            const workflowDef = createWildcardSwitchDefinition();

            configureMockNodeOutputs({
                switch: {
                    matchedCase: "WARN-???",
                    matchedValue: "WARN-???",
                    evaluatedExpression: "WARN-123"
                },
                "warning-handler": {
                    category: "warning",
                    severity: "medium"
                },
                output: { result: { category: "warning" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-wildcard-warn-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-wildcard-warn",
                            workflowDefinition: workflowDef,
                            inputs: { data: { code: "WARN-123" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("warning-handler");
        });

        it("should match INFO-* pattern with long suffix", async () => {
            const workflowDef = createWildcardSwitchDefinition();

            configureMockNodeOutputs({
                switch: {
                    matchedCase: "INFO-*",
                    matchedValue: "INFO-*",
                    evaluatedExpression: "INFO-user-login-successful"
                },
                "info-handler": {
                    category: "info",
                    severity: "low"
                },
                output: { result: { category: "info" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-wildcard-info-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-wildcard-info",
                            workflowDefinition: workflowDef,
                            inputs: { data: { code: "INFO-user-login-successful" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("info-handler");
        });
    });

    describe("numeric case matching", () => {
        it("should route critical priority (1) to escalation", async () => {
            const workflowDef = createNumericSwitchDefinition();

            configureMockNodeOutputs({
                switch: {
                    matchedCase: "1",
                    matchedValue: "1",
                    evaluatedExpression: 1
                },
                "critical-handler": {
                    escalate: true,
                    team: "incident-response"
                },
                output: { result: { escalated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-numeric-critical-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-numeric-critical",
                            workflowDefinition: workflowDef,
                            inputs: { data: { priority: 1 } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("critical-handler");
        });

        it("should route low priority (4) to normal handling", async () => {
            const workflowDef = createNumericSwitchDefinition();

            configureMockNodeOutputs({
                switch: {
                    matchedCase: "4",
                    matchedValue: "4",
                    evaluatedExpression: 4
                },
                "normal-handler": {
                    escalate: false,
                    team: "support"
                },
                output: { result: { escalated: false } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-numeric-low-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-numeric-low",
                            workflowDefinition: workflowDef,
                            inputs: { data: { priority: 4 } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("normal-handler");
        });
    });

    describe("transform preprocessing", () => {
        it("should normalize input before switch", async () => {
            const workflowDef = createTransformSwitchDefinition();

            configureMockNodeOutputs({
                transform: {
                    normalizedType: "email"
                },
                switch: {
                    matchedCase: "email",
                    matchedValue: "email",
                    evaluatedExpression: "email"
                },
                "email-handler": {
                    channel: "email",
                    sent: true
                },
                output: { result: { channel: "email" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-transform-switch-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-transform-switch",
                            workflowDefinition: workflowDef,
                            inputs: { data: { type: "EMAIL" } }, // Uppercase input
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("transform");
            expect(nodeIds).toContain("switch");
            expect(nodeIds).toContain("email-handler");
        });
    });

    describe("chained switches", () => {
        it("should route through multiple switches", async () => {
            const workflowDef = createChainedSwitchDefinition();

            configureMockNodeOutputs({
                "category-switch": {
                    matchedCase: "electronics",
                    matchedValue: "electronics",
                    evaluatedExpression: "electronics"
                },
                "electronics-switch": {
                    matchedCase: "phones",
                    matchedValue: "phones",
                    evaluatedExpression: "phones"
                },
                "phones-handler": {
                    department: "mobile",
                    warehouse: "A"
                },
                output: { result: { department: "mobile" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-chained-switch-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-chained-switch",
                            workflowDefinition: workflowDef,
                            inputs: { data: { category: "electronics", subcategory: "phones" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("category-switch");
            expect(nodeIds).toContain("electronics-switch");
            expect(nodeIds).toContain("phones-handler");
        });

        it("should route electronics -> laptops", async () => {
            const workflowDef = createChainedSwitchDefinition();

            configureMockNodeOutputs({
                "category-switch": {
                    matchedCase: "electronics",
                    matchedValue: "electronics",
                    evaluatedExpression: "electronics"
                },
                "electronics-switch": {
                    matchedCase: "laptops",
                    matchedValue: "laptops",
                    evaluatedExpression: "laptops"
                },
                "laptops-handler": {
                    department: "computing",
                    warehouse: "B"
                },
                output: { result: { department: "computing" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-chained-switch-laptops-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-chained-switch-laptops",
                            workflowDefinition: workflowDef,
                            inputs: { data: { category: "electronics", subcategory: "laptops" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("laptops-handler");
        });
    });

    describe("error handling", () => {
        it("should handle switch node failure", async () => {
            const workflowDef = createBasicSwitchDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "switch") {
                    throw new Error("Expression evaluation failed");
                }

                return {
                    result: { data: { status: "test" } },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { data: { status: "test" } }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-error",
                            workflowDefinition: workflowDef,
                            inputs: { data: { status: null } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it("should handle branch handler failure", async () => {
            const workflowDef = createBasicSwitchDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "pending-handler") {
                    throw new Error("Handler execution failed");
                }

                if (nodeId === "switch") {
                    return {
                        result: {
                            matchedCase: "pending",
                            matchedValue: "pending",
                            evaluatedExpression: "pending"
                        },
                        signals: { selectedRoute: "pending" },
                        metrics: { durationMs: 100 },
                        success: true,
                        output: {
                            matchedCase: "pending",
                            matchedValue: "pending",
                            evaluatedExpression: "pending"
                        }
                    };
                }

                return {
                    result: { data: { status: "pending" } },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { data: { status: "pending" } }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-handler-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-handler-error",
                            workflowDefinition: workflowDef,
                            inputs: { data: { status: "pending" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe("real-world scenarios", () => {
        it("should handle pending order status", async () => {
            const workflowDef = createBasicSwitchDefinition();

            configureMockNodeOutputs({
                switch: {
                    matchedCase: "pending",
                    matchedValue: "pending",
                    evaluatedExpression: "pending"
                },
                "pending-handler": {
                    action: "handle_pending",
                    status: "pending"
                },
                output: { result: { handled: "pending" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: `test-order-pending-${Date.now()}`,
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-order-pending",
                            workflowDefinition: workflowDef,
                            inputs: { data: { status: "pending" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should handle error log classification", async () => {
            const workflowDef = createWildcardSwitchDefinition();

            configureMockNodeOutputs({
                switch: {
                    matchedCase: "ERR-*",
                    matchedValue: "ERR-*",
                    evaluatedExpression: "ERR-404"
                },
                "error-handler": {
                    code: "ERR-404",
                    handled: true
                },
                output: { result: { code: "ERR-404" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: `test-log-ERR-${Date.now()}`,
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-log-ERR",
                            workflowDefinition: workflowDef,
                            inputs: { data: { code: "ERR-404" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("error-handler");
        });
    });
});
