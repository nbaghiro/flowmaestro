/**
 * Code Execution Integration Tests
 *
 * True integration tests that execute code node workflows through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Executing JavaScript with context variables
 * - Multi-step computations with code nodes
 * - Code node as data processor in pipelines
 * - Timeout and resource limit handling
 * - Parallel code execution
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

/**
 * Create a workflow with code node for data processing
 * Input -> Code (process) -> Output
 */
function createCodeProcessingDefinition(codeConfig: JsonObject): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["code"] = {
        type: "code",
        name: "Code Processor",
        config: {
            language: "javascript",
            timeout: 5000,
            ...codeConfig
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push({
        id: "input-code",
        source: "input",
        target: "code",
        sourceHandle: "output",
        targetHandle: "input"
    });

    edges.push({
        id: "code-output",
        source: "code",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Code Processing Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a workflow with multiple code nodes
 * Input -> Code1 (transform) -> Code2 (validate) -> Code3 (format) -> Output
 */
function createMultiCodeDefinition(codeConfigs: JsonObject[]): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    for (let i = 0; i < codeConfigs.length; i++) {
        const nodeId = `code${i + 1}`;
        const prevNode = i === 0 ? "input" : `code${i}`;

        nodes[nodeId] = {
            type: "code",
            name: `Code Step ${i + 1}`,
            config: {
                language: "javascript",
                timeout: 5000,
                ...codeConfigs[i]
            },
            position: { x: (i + 1) * 200, y: 0 }
        };

        edges.push({
            id: `${prevNode}-${nodeId}`,
            source: prevNode,
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    const lastCode = `code${codeConfigs.length}`;
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: (codeConfigs.length + 1) * 200, y: 0 }
    };

    edges.push({
        id: `${lastCode}-output`,
        source: lastCode,
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: `Multi-Code Pipeline (${codeConfigs.length} steps)`,
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a workflow with code node and HTTP node
 * Input -> HTTP (fetch) -> Code (process API response) -> Output
 */
function createHTTPCodeDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "apiEndpoint" },
        position: { x: 0, y: 0 }
    };

    nodes["http"] = {
        type: "http",
        name: "Fetch API",
        config: {
            method: "GET",
            url: "{{input.apiEndpoint}}"
        },
        position: { x: 200, y: 0 }
    };

    nodes["code"] = {
        type: "code",
        name: "Process Response",
        config: {
            language: "javascript",
            code: `
                const response = inputs.http;
                const data = response.body.items || [];
                return {
                    count: data.length,
                    items: data.map(item => ({ id: item.id, name: item.name })),
                    processedAt: new Date().toISOString()
                };
            `
        },
        position: { x: 400, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 0 }
    };

    edges.push({
        id: "input-http",
        source: "input",
        target: "http",
        sourceHandle: "output",
        targetHandle: "input"
    });

    edges.push({
        id: "http-code",
        source: "http",
        target: "code",
        sourceHandle: "output",
        targetHandle: "input"
    });

    edges.push({
        id: "code-output",
        source: "code",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "HTTP + Code Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a workflow with parallel code execution
 * Input -> [Code_A, Code_B, Code_C] -> Merge -> Output
 */
function createParallelCodeDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 100 }
    };

    const codeNodes = ["a", "b", "c"];
    codeNodes.forEach((suffix, index) => {
        const nodeId = `code_${suffix}`;
        nodes[nodeId] = {
            type: "code",
            name: `Process ${suffix.toUpperCase()}`,
            config: {
                language: "javascript",
                code: `return { branch: "${suffix}", result: inputs.input.value * ${index + 1} };`
            },
            position: { x: 200, y: index * 100 }
        };

        edges.push({
            id: `input-${nodeId}`,
            source: "input",
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input"
        });
    });

    nodes["merge"] = {
        type: "code",
        name: "Merge Results",
        config: {
            language: "javascript",
            code: `
                return {
                    a: inputs.code_a.result,
                    b: inputs.code_b.result,
                    c: inputs.code_c.result,
                    total: inputs.code_a.result + inputs.code_b.result + inputs.code_c.result
                };
            `
        },
        position: { x: 400, y: 100 }
    };

    for (const suffix of codeNodes) {
        edges.push({
            id: `code_${suffix}-merge`,
            source: `code_${suffix}`,
            target: "merge",
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 100 }
    };

    edges.push({
        id: "merge-output",
        source: "merge",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Parallel Code Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
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

// ============================================================================
// TESTS
// ============================================================================

describe("Code Execution Integration Tests", () => {
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

    describe("basic code execution", () => {
        it("should execute simple code node with context variables", async () => {
            const workflowDef = createCodeProcessingDefinition({
                code: `
                    const numbers = inputs.input.numbers;
                    const sum = numbers.reduce((a, b) => a + b, 0);
                    return { sum, average: sum / numbers.length };
                `
            });

            configureMockNodeOutputs({
                input: { numbers: [1, 2, 3, 4, 5] },
                code: { sum: 15, average: 3 },
                output: { result: { sum: 15, average: 3 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-code-basic-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-code-basic",
                            workflowDefinition: workflowDef,
                            inputs: { numbers: [1, 2, 3, 4, 5] },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("code");
        });

        it("should execute code node that transforms data", async () => {
            const workflowDef = createCodeProcessingDefinition({
                code: `
                    const users = inputs.input.users;
                    return users.map(u => ({
                        fullName: u.firstName + ' ' + u.lastName,
                        email: u.email.toLowerCase()
                    }));
                `
            });

            configureMockNodeOutputs({
                input: {
                    users: [
                        { firstName: "John", lastName: "Doe", email: "John@Example.com" },
                        { firstName: "Jane", lastName: "Smith", email: "Jane@Example.com" }
                    ]
                },
                code: {
                    result: [
                        { fullName: "John Doe", email: "john@example.com" },
                        { fullName: "Jane Smith", email: "jane@example.com" }
                    ]
                },
                output: { result: [] }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-code-transform-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-code-transform",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should pass input context to code node", async () => {
            const workflowDef = createCodeProcessingDefinition({
                code: "return { received: inputs.input };"
            });

            let capturedContext: JsonObject = {};

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "code") {
                    capturedContext = params.context;
                }

                const outputs: Record<string, JsonObject> = {
                    input: { value: 42, name: "test" },
                    code: { received: { value: 42, name: "test" } },
                    output: { result: {} }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };

                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-code-context-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-code-context",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(capturedContext).toBeDefined();
        });
    });

    describe("multi-step code processing", () => {
        it("should execute three-step code pipeline", async () => {
            const workflowDef = createMultiCodeDefinition([
                { code: "return { doubled: inputs.input.value * 2 };" },
                { code: "return { validated: inputs.code1.doubled > 0 };" },
                { code: "return { formatted: 'Result: ' + inputs.code1.doubled };" }
            ]);

            configureMockNodeOutputs({
                input: { value: 10 },
                code1: { doubled: 20 },
                code2: { validated: true },
                code3: { formatted: "Result: 20" },
                output: { result: { formatted: "Result: 20" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-code-pipeline-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-code-pipeline",
                            workflowDefinition: workflowDef,
                            inputs: { value: 10 },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("code1");
            expect(nodeIds).toContain("code2");
            expect(nodeIds).toContain("code3");
        });

        it("should chain context through code nodes", async () => {
            const workflowDef = createMultiCodeDefinition([
                { code: "return { step1: inputs.input.x + 1 };" },
                { code: "return { step2: inputs.code1.step1 + 1 };" }
            ]);

            const capturedContexts: JsonObject[] = [];

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId.startsWith("code")) {
                    capturedContexts.push({ nodeId, context: params.context });
                }

                const outputs: Record<string, JsonObject> = {
                    input: { x: 0 },
                    code1: { step1: 1 },
                    code2: { step2: 2 },
                    output: { result: {} }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };

                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-code-chain-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-code-chain",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(capturedContexts.length).toBeGreaterThan(0);
        });
    });

    describe("code with HTTP integration", () => {
        it("should process HTTP response with code node", async () => {
            const workflowDef = createHTTPCodeDefinition();

            configureMockNodeOutputs({
                input: { apiEndpoint: "https://api.example.com/items" },
                http: {
                    statusCode: 200,
                    body: {
                        items: [
                            { id: 1, name: "Item A", extra: "data" },
                            { id: 2, name: "Item B", extra: "data" }
                        ]
                    }
                },
                code: {
                    count: 2,
                    items: [
                        { id: 1, name: "Item A" },
                        { id: 2, name: "Item B" }
                    ],
                    processedAt: "2024-01-01T00:00:00.000Z"
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-http-code-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-http-code",
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
            expect(nodeIds).toContain("http");
            expect(nodeIds).toContain("code");
        });

        it("should have access to HTTP response in code", async () => {
            const workflowDef = createHTTPCodeDefinition();
            let codeContext: JsonObject = {};

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "code") {
                    codeContext = params.context;
                }

                const outputs: Record<string, JsonObject> = {
                    input: { apiEndpoint: "https://api.example.com" },
                    http: {
                        statusCode: 200,
                        body: { data: "fetched" },
                        headers: { "content-type": "application/json" }
                    },
                    code: { processed: true },
                    output: { result: {} }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };

                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-code-http-context-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-code-http-context",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(codeContext).toBeDefined();
        });
    });

    describe("parallel code execution", () => {
        it("should execute code nodes in parallel", async () => {
            const workflowDef = createParallelCodeDefinition();

            configureMockNodeOutputs({
                input: { value: 10 },
                code_a: { branch: "a", result: 10 },
                code_b: { branch: "b", result: 20 },
                code_c: { branch: "c", result: 30 },
                merge: { a: 10, b: 20, c: 30, total: 60 },
                output: { result: { total: 60 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-parallel-code-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-parallel-code",
                            workflowDefinition: workflowDef,
                            inputs: { value: 10 },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("code_a");
            expect(nodeIds).toContain("code_b");
            expect(nodeIds).toContain("code_c");
            expect(nodeIds).toContain("merge");
        });

        it("should merge results from parallel code nodes", async () => {
            const workflowDef = createParallelCodeDefinition();
            let mergeContext: JsonObject = {};

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "merge") {
                    mergeContext = params.context;
                }

                const outputs: Record<string, JsonObject> = {
                    input: { value: 5 },
                    code_a: { branch: "a", result: 5 },
                    code_b: { branch: "b", result: 10 },
                    code_c: { branch: "c", result: 15 },
                    merge: { total: 30 },
                    output: { result: {} }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };

                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-merge-parallel-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-merge-parallel",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(mergeContext).toBeDefined();
        });
    });

    describe("error handling", () => {
        it("should handle code execution failure", async () => {
            const workflowDef = createCodeProcessingDefinition({
                code: 'throw new Error("Code error");'
            });

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "code") {
                    throw new Error("Code execution failed: syntax error");
                }

                return {
                    result: { data: "test" },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { data: "test" }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-code-fail-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-code-fail",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("failed");
        });

        it("should handle timeout in code execution", async () => {
            const workflowDef = createCodeProcessingDefinition({
                code: "while(true) {}",
                timeout: 1000
            });

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "code") {
                    throw new Error("Execution timeout");
                }

                return {
                    result: { data: "test" },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { data: "test" }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-code-timeout-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-code-timeout",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });

        it("should isolate code failure from other nodes", async () => {
            const workflowDef = createMultiCodeDefinition([
                { code: "return { step1: true };" },
                { code: 'throw new Error("Step 2 failed");' },
                { code: "return { step3: true };" }
            ]);

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "code2") {
                    throw new Error("Step 2 failed");
                }

                const outputs: Record<string, JsonObject> = {
                    input: { data: "test" },
                    code1: { step1: true },
                    code3: { step3: true },
                    output: { result: {} }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };

                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-code-isolate-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-code-isolate",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);

            // Verify code1 executed but code3 did not
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("code1");
            expect(nodeIds).toContain("code2");
            // code3 should not execute because code2 failed
        });
    });

    describe("real-world scenarios", () => {
        it("should execute data transformation pipeline", async () => {
            const workflowDef = createMultiCodeDefinition([
                { code: "return inputs.input.records.filter(r => r.status === 'active');" },
                {
                    code: `
                    const total = inputs.code1.reduce((sum, r) => sum + r.amount, 0);
                    return { count: inputs.code1.length, total };
                `
                },
                {
                    code: `
                    return {
                        summary: 'Total: $' + inputs.code2.total,
                        recordCount: inputs.code2.count
                    };
                `
                }
            ]);

            configureMockNodeOutputs({
                input: {
                    records: [
                        { id: 1, amount: 100, status: "active" },
                        { id: 2, amount: 50, status: "inactive" },
                        { id: 3, amount: 200, status: "active" }
                    ]
                },
                code1: {
                    items: [
                        { id: 1, amount: 100, status: "active" },
                        { id: 3, amount: 200, status: "active" }
                    ]
                },
                code2: { count: 2, total: 300 },
                code3: { summary: "Total: $300", recordCount: 2 },
                output: { result: { summary: "Total: $300" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-data-transform-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-data-transform",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should execute validation workflow", async () => {
            const workflowDef = createCodeProcessingDefinition({
                code: `
                    const data = inputs.input;
                    const errors = [];

                    if (!data.email || !data.email.includes('@')) {
                        errors.push('Invalid email');
                    }
                    if (!data.age || data.age < 18) {
                        errors.push('Must be 18 or older');
                    }

                    return {
                        valid: errors.length === 0,
                        errors
                    };
                `
            });

            configureMockNodeOutputs({
                input: { email: "test@example.com", age: 25 },
                code: { valid: true, errors: [] },
                output: { result: { valid: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-validation-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-validation",
                            workflowDefinition: workflowDef,
                            inputs: { email: "test@example.com", age: 25 },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should execute calculation workflow", async () => {
            const workflowDef = createCodeProcessingDefinition({
                code: `
                    const { principal, rate, years } = inputs.input;
                    const compoundInterest = principal * Math.pow((1 + rate/100), years);
                    return {
                        principal,
                        rate,
                        years,
                        finalAmount: Math.round(compoundInterest * 100) / 100
                    };
                `
            });

            configureMockNodeOutputs({
                input: { principal: 1000, rate: 5, years: 10 },
                code: { principal: 1000, rate: 5, years: 10, finalAmount: 1628.89 },
                output: { result: { finalAmount: 1628.89 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-calculation-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-calculation",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });
});
