/**
 * Code Execution Orchestration Tests
 *
 * Tests code node integration in workflows:
 * - Executing JavaScript with context variables
 * - Multi-step computations with code nodes
 * - Code node as data processor in pipelines
 * - Timeout and resource limit handling
 * - Security isolation patterns
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
 * Create a workflow with code node for data processing
 * Input -> Code (process) -> Output
 */
function createCodeProcessingWorkflow(codeConfig: JsonObject): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "data" },
        depth: 0,
        dependencies: [],
        dependents: ["Code"]
    });

    nodes.set("Code", {
        id: "Code",
        type: "code",
        name: "Code Processor",
        config: {
            language: "javascript",
            timeout: 5000,
            ...codeConfig
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 2,
        dependencies: ["Code"],
        dependents: []
    });

    edges.set("Input-Code", {
        id: "Input-Code",
        source: "Input",
        target: "Code",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Code-Output", {
        id: "Code-Output",
        source: "Code",
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
        executionLevels: [["Input"], ["Code"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a workflow with multiple code nodes
 * Input -> Code1 (transform) -> Code2 (validate) -> Code3 (format) -> Output
 */
function createMultiCodeWorkflow(codeConfigs: JsonObject[]): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const executionLevels: string[][] = [];

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "data" },
        depth: 0,
        dependencies: [],
        dependents: ["Code1"]
    });
    executionLevels.push(["Input"]);

    for (let i = 0; i < codeConfigs.length; i++) {
        const nodeId = `Code${i + 1}`;
        const prevNode = i === 0 ? "Input" : `Code${i}`;
        const nextNode = i === codeConfigs.length - 1 ? "Output" : `Code${i + 2}`;

        nodes.set(nodeId, {
            id: nodeId,
            type: "code",
            name: `Code Step ${i + 1}`,
            config: {
                language: "javascript",
                timeout: 5000,
                ...codeConfigs[i]
            },
            depth: i + 1,
            dependencies: [prevNode],
            dependents: [nextNode]
        });

        edges.set(`${prevNode}-${nodeId}`, {
            id: `${prevNode}-${nodeId}`,
            source: prevNode,
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        executionLevels.push([nodeId]);
    }

    const lastCode = `Code${codeConfigs.length}`;
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: codeConfigs.length + 1,
        dependencies: [lastCode],
        dependents: []
    });

    edges.set(`${lastCode}-Output`, {
        id: `${lastCode}-Output`,
        source: lastCode,
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    executionLevels.push(["Output"]);

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels,
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a workflow with code node and HTTP node
 * Input -> HTTP (fetch) -> Code (process API response) -> Output
 */
function createHTTPCodeWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "apiEndpoint" },
        depth: 0,
        dependencies: [],
        dependents: ["HTTP"]
    });

    nodes.set("HTTP", {
        id: "HTTP",
        type: "http",
        name: "Fetch API",
        config: {
            method: "GET",
            url: "{{Input.apiEndpoint}}"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Code"]
    });

    nodes.set("Code", {
        id: "Code",
        type: "code",
        name: "Process Response",
        config: {
            language: "javascript",
            code: `
                const response = inputs.HTTP;
                const data = response.body.items || [];
                return {
                    count: data.length,
                    items: data.map(item => ({ id: item.id, name: item.name })),
                    processedAt: new Date().toISOString()
                };
            `
        },
        depth: 2,
        dependencies: ["HTTP"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 3,
        dependencies: ["Code"],
        dependents: []
    });

    edges.set("Input-HTTP", {
        id: "Input-HTTP",
        source: "Input",
        target: "HTTP",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("HTTP-Code", {
        id: "HTTP-Code",
        source: "HTTP",
        target: "Code",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Code-Output", {
        id: "Code-Output",
        source: "Code",
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
        executionLevels: [["Input"], ["HTTP"], ["Code"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a workflow with parallel code execution
 * Input -> [Code_A, Code_B, Code_C] -> Merge -> Output
 */
function createParallelCodeWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "data" },
        depth: 0,
        dependencies: [],
        dependents: ["Code_A", "Code_B", "Code_C"]
    });

    const codeNodes = ["A", "B", "C"];
    for (const suffix of codeNodes) {
        const nodeId = `Code_${suffix}`;
        nodes.set(nodeId, {
            id: nodeId,
            type: "code",
            name: `Process ${suffix}`,
            config: {
                language: "javascript",
                code: `return { branch: "${suffix}", result: inputs.Input.value * ${suffix.charCodeAt(0) - 64} };`
            },
            depth: 1,
            dependencies: ["Input"],
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
    }

    nodes.set("Merge", {
        id: "Merge",
        type: "code",
        name: "Merge Results",
        config: {
            language: "javascript",
            code: `
                return {
                    A: inputs.Code_A.result,
                    B: inputs.Code_B.result,
                    C: inputs.Code_C.result,
                    total: inputs.Code_A.result + inputs.Code_B.result + inputs.Code_C.result
                };
            `
        },
        depth: 2,
        dependencies: ["Code_A", "Code_B", "Code_C"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 3,
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
        executionLevels: [["Input"], ["Code_A", "Code_B", "Code_C"], ["Merge"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate workflow execution with mock activities
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
}> {
    let context = createContext(inputs);
    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];
    const failedNodes: string[] = [];

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
                    queueState = markFailed(
                        queueState,
                        nodeId,
                        result.error || "Unknown error",
                        workflow
                    );
                }
            } catch (error) {
                failedNodes.push(nodeId);
                queueState = markFailed(
                    queueState,
                    nodeId,
                    error instanceof Error ? error.message : "Unknown error",
                    workflow
                );
            }
        }
    }

    const finalOutputs = buildFinalOutputs(context, workflow.outputNodeIds);

    return {
        context,
        finalOutputs,
        executionOrder,
        failedNodes
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Code Execution Orchestration", () => {
    beforeEach(() => {
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("basic code execution", () => {
        it("should execute simple code node with context variables", async () => {
            const workflow = createCodeProcessingWorkflow({
                code: `
                    const numbers = inputs.Input.numbers;
                    const sum = numbers.reduce((a, b) => a + b, 0);
                    return { sum, average: sum / numbers.length };
                `
            });

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { numbers: [1, 2, 3, 4, 5] },
                    Code: { sum: 15, average: 3 },
                    Output: { result: { sum: 15, average: 3 } }
                })
            );

            const { executionOrder, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { numbers: [1, 2, 3, 4, 5] }
            );

            expect(executionOrder).toEqual(["Input", "Code", "Output"]);
            expect(finalOutputs.result).toEqual({ sum: 15, average: 3 });
        });

        it("should execute code node that transforms data", async () => {
            const workflow = createCodeProcessingWorkflow({
                code: `
                    const users = inputs.Input.users;
                    return users.map(u => ({
                        fullName: u.firstName + ' ' + u.lastName,
                        email: u.email.toLowerCase()
                    }));
                `
            });

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        users: [
                            { firstName: "John", lastName: "Doe", email: "John@Example.com" },
                            { firstName: "Jane", lastName: "Smith", email: "Jane@Example.com" }
                        ]
                    },
                    Code: {
                        result: [
                            { fullName: "John Doe", email: "john@example.com" },
                            { fullName: "Jane Smith", email: "jane@example.com" }
                        ]
                    },
                    Output: { result: [] }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toEqual(["Input", "Code", "Output"]);
        });

        it("should pass input context to code node", async () => {
            const workflow = createCodeProcessingWorkflow({
                code: "return { received: inputs.Input };"
            });

            let capturedContext: JsonObject = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { value: 42, name: "test" } },
                    Code: {
                        customOutput: { received: { value: 42, name: "test" } },
                        onExecute: (input) => {
                            capturedContext = getExecutionContext(input.context);
                        }
                    },
                    Output: { customOutput: { result: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            expect(capturedContext.Input).toEqual({ value: 42, name: "test" });
        });
    });

    describe("multi-step code processing", () => {
        it("should execute three-step code pipeline", async () => {
            const workflow = createMultiCodeWorkflow([
                { code: "return { doubled: inputs.Input.value * 2 };" },
                { code: "return { validated: inputs.Code1.doubled > 0 };" },
                { code: "return { formatted: 'Result: ' + inputs.Code1.doubled };" }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { value: 10 },
                    Code1: { doubled: 20 },
                    Code2: { validated: true },
                    Code3: { formatted: "Result: 20" },
                    Output: { result: { formatted: "Result: 20" } }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities, {
                value: 10
            });

            expect(executionOrder).toEqual(["Input", "Code1", "Code2", "Code3", "Output"]);
        });

        it("should chain context through code nodes", async () => {
            const workflow = createMultiCodeWorkflow([
                { code: "return { step1: inputs.Input.x + 1 };" },
                { code: "return { step2: inputs.Code1.step1 + 1 };" }
            ]);

            const capturedContexts: JsonObject[] = [];

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { x: 0 } },
                    Code1: {
                        customOutput: { step1: 1 },
                        onExecute: (input) => {
                            capturedContexts.push(getExecutionContext(input.context));
                        }
                    },
                    Code2: {
                        customOutput: { step2: 2 },
                        onExecute: (input) => {
                            capturedContexts.push(getExecutionContext(input.context));
                        }
                    },
                    Output: { customOutput: { result: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // Code1 should see Input
            expect(capturedContexts[0].Input).toEqual({ x: 0 });

            // Code2 should see Input and Code1
            expect(capturedContexts[1].Input).toEqual({ x: 0 });
            expect(capturedContexts[1].Code1).toEqual({ step1: 1 });
        });
    });

    describe("code with HTTP integration", () => {
        it("should process HTTP response with code node", async () => {
            const workflow = createHTTPCodeWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { apiEndpoint: "https://api.example.com/items" },
                    HTTP: {
                        statusCode: 200,
                        body: {
                            items: [
                                { id: 1, name: "Item A", extra: "data" },
                                { id: 2, name: "Item B", extra: "data" }
                            ]
                        }
                    },
                    Code: {
                        count: 2,
                        items: [
                            { id: 1, name: "Item A" },
                            { id: 2, name: "Item B" }
                        ],
                        processedAt: "2024-01-01T00:00:00.000Z"
                    },
                    Output: { result: {} }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toEqual(["Input", "HTTP", "Code", "Output"]);
        });

        it("should have access to HTTP response in code", async () => {
            const workflow = createHTTPCodeWorkflow();
            let codeContext: JsonObject = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { apiEndpoint: "https://api.example.com" } },
                    HTTP: {
                        customOutput: {
                            statusCode: 200,
                            body: { data: "fetched" },
                            headers: { "content-type": "application/json" }
                        }
                    },
                    Code: {
                        customOutput: { processed: true },
                        onExecute: (input) => {
                            codeContext = getExecutionContext(input.context);
                        }
                    },
                    Output: { customOutput: { result: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            expect(codeContext.HTTP).toBeDefined();
            expect((codeContext.HTTP as JsonObject).statusCode).toBe(200);
            expect((codeContext.HTTP as JsonObject).body).toEqual({ data: "fetched" });
        });
    });

    describe("parallel code execution", () => {
        it("should execute code nodes in parallel", async () => {
            const workflow = createParallelCodeWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { value: 10 },
                    Code_A: { branch: "A", result: 10 },
                    Code_B: { branch: "B", result: 20 },
                    Code_C: { branch: "C", result: 30 },
                    Merge: { A: 10, B: 20, C: 30, total: 60 },
                    Output: { result: { total: 60 } }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities, {
                value: 10
            });

            expect(executionOrder[0]).toBe("Input");
            expect(executionOrder).toContain("Code_A");
            expect(executionOrder).toContain("Code_B");
            expect(executionOrder).toContain("Code_C");
            expect(executionOrder[executionOrder.length - 2]).toBe("Merge");
            expect(executionOrder[executionOrder.length - 1]).toBe("Output");
        });

        it("should merge results from parallel code nodes", async () => {
            const workflow = createParallelCodeWorkflow();
            let mergeContext: JsonObject = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { value: 5 } },
                    Code_A: { customOutput: { branch: "A", result: 5 } },
                    Code_B: { customOutput: { branch: "B", result: 10 } },
                    Code_C: { customOutput: { branch: "C", result: 15 } },
                    Merge: {
                        customOutput: { total: 30 },
                        onExecute: (input) => {
                            mergeContext = getExecutionContext(input.context);
                        }
                    },
                    Output: { customOutput: { result: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            expect(mergeContext.Code_A).toEqual({ branch: "A", result: 5 });
            expect(mergeContext.Code_B).toEqual({ branch: "B", result: 10 });
            expect(mergeContext.Code_C).toEqual({ branch: "C", result: 15 });
        });
    });

    describe("error handling", () => {
        it("should handle code execution failure", async () => {
            const workflow = createCodeProcessingWorkflow({
                code: 'throw new Error("Code error");'
            });

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { data: "test" } },
                    Code: { shouldFail: true, errorMessage: "Code execution failed: syntax error" },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("Code");
            expect(failedNodes).toContain("Code");
        });

        it("should handle timeout in code execution", async () => {
            const workflow = createCodeProcessingWorkflow({
                code: "while(true) {}", // Infinite loop
                timeout: 1000
            });

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { data: "test" } },
                    Code: { shouldFail: true, errorMessage: "Execution timeout" },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toContain("Code");
        });

        it("should isolate code failure from other nodes", async () => {
            const workflow = createMultiCodeWorkflow([
                { code: "return { step1: true };" },
                { code: 'throw new Error("Step 2 failed");' },
                { code: "return { step3: true };" }
            ]);

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { data: "test" } },
                    Code1: { customOutput: { step1: true } },
                    Code2: { shouldFail: true, errorMessage: "Step 2 failed" },
                    Code3: { customOutput: { step3: true } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("Code1");
            expect(executionOrder).toContain("Code2");
            expect(failedNodes).toContain("Code2");
            // Code3 should not execute because Code2 failed
            expect(executionOrder).not.toContain("Output");
        });
    });

    describe("real-world scenarios", () => {
        it("should execute data transformation pipeline", async () => {
            const workflow = createMultiCodeWorkflow([
                {
                    code: `
                    // Parse and clean data
                    return inputs.Input.records.filter(r => r.status === 'active');
                `
                },
                {
                    code: `
                    // Aggregate data
                    const total = inputs.Code1.reduce((sum, r) => sum + r.amount, 0);
                    return { count: inputs.Code1.length, total };
                `
                },
                {
                    code: `
                    // Format output
                    return {
                        summary: 'Total: $' + inputs.Code2.total,
                        recordCount: inputs.Code2.count
                    };
                `
                }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        records: [
                            { id: 1, amount: 100, status: "active" },
                            { id: 2, amount: 50, status: "inactive" },
                            { id: 3, amount: 200, status: "active" }
                        ]
                    },
                    Code1: {
                        result: [
                            { id: 1, amount: 100, status: "active" },
                            { id: 3, amount: 200, status: "active" }
                        ]
                    },
                    Code2: { count: 2, total: 300 },
                    Code3: { summary: "Total: $300", recordCount: 2 },
                    Output: { result: { summary: "Total: $300" } }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toEqual(["Input", "Code1", "Code2", "Code3", "Output"]);
        });

        it("should execute validation workflow", async () => {
            const workflow = createCodeProcessingWorkflow({
                code: `
                    const data = inputs.Input;
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

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { email: "test@example.com", age: 25 },
                    Code: { valid: true, errors: [] },
                    Output: { result: { valid: true } }
                })
            );

            const { finalOutputs } = await simulateWorkflowExecution(workflow, mockActivities, {
                email: "test@example.com",
                age: 25
            });

            expect(finalOutputs.result).toEqual({ valid: true });
        });

        it("should execute calculation workflow", async () => {
            const workflow = createCodeProcessingWorkflow({
                code: `
                    const { principal, rate, years } = inputs.Input;
                    const compoundInterest = principal * Math.pow((1 + rate/100), years);
                    return {
                        principal,
                        rate,
                        years,
                        finalAmount: Math.round(compoundInterest * 100) / 100
                    };
                `
            });

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { principal: 1000, rate: 5, years: 10 },
                    Code: { principal: 1000, rate: 5, years: 10, finalAmount: 1628.89 },
                    Output: { result: { finalAmount: 1628.89 } }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toEqual(["Input", "Code", "Output"]);
        });
    });
});
