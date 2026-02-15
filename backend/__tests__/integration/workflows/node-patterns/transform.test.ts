/**
 * Data Transformation Pattern Integration Tests
 *
 * True integration tests that execute transform workflows through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Sequential transform chains (parse -> reshape -> format)
 * - Data validation and cleaning pipelines
 * - Complex JSON restructuring
 * - Array operations (map, filter, reduce, sort)
 * - XML and JSON parsing workflows
 * - Merge and extract operations
 * - Transform combined with other node types
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
 * Create a sequential transform chain
 * Input -> Transform1 (parse) -> Transform2 (filter) -> Transform3 (map) -> Output
 */
function createTransformChainDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "rawData" },
        position: { x: 0, y: 0 }
    };

    nodes["parse"] = {
        type: "transform",
        name: "Parse JSON",
        config: {
            operation: "parseJSON",
            inputData: "${input.rawData}",
            outputVariable: "parsed"
        },
        position: { x: 200, y: 0 }
    };

    nodes["filter"] = {
        type: "transform",
        name: "Filter Active",
        config: {
            operation: "filter",
            inputData: "${parse.parsed}",
            expression: "item => item.status === 'active'",
            outputVariable: "activeItems"
        },
        position: { x: 400, y: 0 }
    };

    nodes["transform"] = {
        type: "transform",
        name: "Map to Summary",
        config: {
            operation: "map",
            inputData: "${filter.activeItems}",
            expression: "item => ({ id: item.id, name: item.name })",
            outputVariable: "summaries"
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
        {
            id: "input-parse",
            source: "input",
            target: "parse",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "parse-filter",
            source: "parse",
            target: "filter",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "filter-transform",
            source: "filter",
            target: "transform",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "transform-output",
            source: "transform",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Transform Chain Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a map operation workflow
 * Input -> Transform (map) -> Output
 */
function createMapTransformDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "items" },
        position: { x: 0, y: 0 }
    };

    nodes["map"] = {
        type: "transform",
        name: "Map Items",
        config: {
            operation: "map",
            inputData: "${input.items}",
            expression:
                "item => ({ ...item, processed: true, processedAt: new Date().toISOString() })",
            outputVariable: "mappedItems"
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        {
            id: "input-map",
            source: "input",
            target: "map",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "map-output",
            source: "map",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Map Transform Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a reduce operation workflow for aggregation
 * Input -> Transform (reduce) -> Output
 */
function createReduceTransformDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "orders" },
        position: { x: 0, y: 0 }
    };

    nodes["reduce"] = {
        type: "transform",
        name: "Calculate Total",
        config: {
            operation: "reduce",
            inputData: "${input.orders}",
            expression:
                "(acc, order) => ({ total: (acc.total || 0) + order.amount, count: (acc.count || 0) + 1 })",
            outputVariable: "summary"
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        {
            id: "input-reduce",
            source: "input",
            target: "reduce",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "reduce-output",
            source: "reduce",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Reduce Transform Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a sort operation workflow
 * Input -> Transform (sort) -> Output
 */
function createSortTransformDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "records" },
        position: { x: 0, y: 0 }
    };

    nodes["sort"] = {
        type: "transform",
        name: "Sort by Date",
        config: {
            operation: "sort",
            inputData: "${input.records}",
            expression: "(a, b) => new Date(b.date) - new Date(a.date)",
            outputVariable: "sorted"
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        {
            id: "input-sort",
            source: "input",
            target: "sort",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "sort-output",
            source: "sort",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Sort Transform Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a merge operation workflow
 * Input -> HTTP1 -> Transform (merge) with HTTP2 -> Output
 */
function createMergeTransformDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "userId" },
        position: { x: 0, y: 100 }
    };

    nodes["fetch_profile"] = {
        type: "http",
        name: "Fetch Profile",
        config: {
            method: "GET",
            url: "https://api.example.com/users/{{input.userId}}/profile"
        },
        position: { x: 200, y: 0 }
    };

    nodes["fetch_orders"] = {
        type: "http",
        name: "Fetch Orders",
        config: {
            method: "GET",
            url: "https://api.example.com/users/{{input.userId}}/orders"
        },
        position: { x: 200, y: 200 }
    };

    nodes["merge"] = {
        type: "transform",
        name: "Merge Data",
        config: {
            operation: "merge",
            inputData: "${fetch_profile.body}",
            expression: "${fetch_orders.body}",
            outputVariable: "combined"
        },
        position: { x: 400, y: 100 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 100 }
    };

    edges.push(
        {
            id: "input-profile",
            source: "input",
            target: "fetch_profile",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "input-orders",
            source: "input",
            target: "fetch_orders",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "profile-merge",
            source: "fetch_profile",
            target: "merge",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "orders-merge",
            source: "fetch_orders",
            target: "merge",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "merge-output",
            source: "merge",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Merge Transform Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create an extract operation workflow
 * Input -> Transform (extract) -> Output
 */
function createExtractTransformDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "response" },
        position: { x: 0, y: 0 }
    };

    nodes["extract"] = {
        type: "transform",
        name: "Extract Data",
        config: {
            operation: "extract",
            inputData: "${input.response}",
            expression: "data.results",
            outputVariable: "extracted"
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        {
            id: "input-extract",
            source: "input",
            target: "extract",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "extract-output",
            source: "extract",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Extract Transform Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a JSONata custom transform workflow
 * Input -> Transform (custom JSONata) -> Output
 */
function createJSONataTransformDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["jsonata"] = {
        type: "transform",
        name: "JSONata Transform",
        config: {
            operation: "custom",
            inputData: "${input.data}",
            expression: "$data.items[price > 100].{ 'name': name, 'discountedPrice': price * 0.9 }",
            outputVariable: "transformed"
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        {
            id: "input-jsonata",
            source: "input",
            target: "jsonata",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "jsonata-output",
            source: "jsonata",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "JSONata Transform Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create an XML parsing workflow
 * Input -> Transform (parseXML) -> Transform (extract) -> Output
 */
function createXMLParseDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "xmlString" },
        position: { x: 0, y: 0 }
    };

    nodes["parse"] = {
        type: "transform",
        name: "Parse XML",
        config: {
            operation: "parseXML",
            inputData: "${input.xmlString}",
            outputVariable: "parsedXML"
        },
        position: { x: 200, y: 0 }
    };

    nodes["extract"] = {
        type: "transform",
        name: "Extract Items",
        config: {
            operation: "extract",
            inputData: "${parse.parsedXML}",
            expression: "catalog.items.item",
            outputVariable: "items"
        },
        position: { x: 400, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 0 }
    };

    edges.push(
        {
            id: "input-parse",
            source: "input",
            target: "parse",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "parse-extract",
            source: "parse",
            target: "extract",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "extract-output",
            source: "extract",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "XML Parse Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a data validation pipeline
 * Input -> Transform (filter valid) -> Transform (map clean) -> Conditional -> Output
 */
function createValidationPipelineDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "records" },
        position: { x: 0, y: 0 }
    };

    nodes["filter_valid"] = {
        type: "transform",
        name: "Filter Valid",
        config: {
            operation: "filter",
            inputData: "${input.records}",
            expression: "item => item.email && item.email.includes('@')",
            outputVariable: "validRecords"
        },
        position: { x: 200, y: 0 }
    };

    nodes["clean"] = {
        type: "transform",
        name: "Clean Data",
        config: {
            operation: "map",
            inputData: "${filter_valid.validRecords}",
            expression:
                "item => ({ ...item, email: item.email.toLowerCase().trim(), name: item.name.trim() })",
            outputVariable: "cleanedRecords"
        },
        position: { x: 400, y: 0 }
    };

    nodes["count_check"] = {
        type: "code",
        name: "Count Check",
        config: {
            language: "javascript",
            code: `
                const cleaned = inputs.clean.cleanedRecords || [];
                const original = inputs.input.records || [];
                return {
                    validCount: cleaned.length,
                    invalidCount: original.length - cleaned.length,
                    records: cleaned
                };
            `
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
        {
            id: "input-filter",
            source: "input",
            target: "filter_valid",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "filter-clean",
            source: "filter_valid",
            target: "clean",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "clean-count",
            source: "clean",
            target: "count_check",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "count-output",
            source: "count_check",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Validation Pipeline Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a transform with HTTP for data enrichment
 * Input -> Transform (parse) -> HTTP (enrich) -> Transform (merge) -> Output
 */
function createTransformWithHTTPDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "jsonData" },
        position: { x: 0, y: 0 }
    };

    nodes["parse"] = {
        type: "transform",
        name: "Parse Input",
        config: {
            operation: "parseJSON",
            inputData: "${input.jsonData}",
            outputVariable: "parsed"
        },
        position: { x: 200, y: 0 }
    };

    nodes["enrich"] = {
        type: "http",
        name: "Enrich Data",
        config: {
            method: "POST",
            url: "https://api.example.com/enrich",
            body: "{{parse.parsed}}"
        },
        position: { x: 400, y: 0 }
    };

    nodes["merge"] = {
        type: "transform",
        name: "Merge Results",
        config: {
            operation: "merge",
            inputData: "${parse.parsed}",
            expression: "${enrich.body}",
            outputVariable: "enriched"
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
        {
            id: "input-parse",
            source: "input",
            target: "parse",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "parse-enrich",
            source: "parse",
            target: "enrich",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "enrich-merge",
            source: "enrich",
            target: "merge",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "merge-output",
            source: "merge",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Transform with HTTP Workflow",
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

describe("Data Transformation Pattern Integration Tests", () => {
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

    describe("transform chain patterns", () => {
        it("should execute sequential parse -> filter -> map chain", async () => {
            const workflowDef = createTransformChainDefinition();

            const rawData = JSON.stringify([
                { id: 1, name: "Item A", status: "active" },
                { id: 2, name: "Item B", status: "inactive" },
                { id: 3, name: "Item C", status: "active" }
            ]);

            configureMockNodeOutputs({
                input: { rawData },
                parse: {
                    parsed: [
                        { id: 1, name: "Item A", status: "active" },
                        { id: 2, name: "Item B", status: "inactive" },
                        { id: 3, name: "Item C", status: "active" }
                    ]
                },
                filter: {
                    activeItems: [
                        { id: 1, name: "Item A", status: "active" },
                        { id: 3, name: "Item C", status: "active" }
                    ]
                },
                transform: {
                    summaries: [
                        { id: 1, name: "Item A" },
                        { id: 3, name: "Item C" }
                    ]
                },
                output: { result: [] }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-transform-chain-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-transform-chain",
                            workflowDefinition: workflowDef,
                            inputs: { rawData },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("parse");
            expect(nodeIds).toContain("filter");
            expect(nodeIds).toContain("transform");
        });
    });

    describe("map operation", () => {
        it("should transform each item in array", async () => {
            const workflowDef = createMapTransformDefinition();

            configureMockNodeOutputs({
                input: {
                    items: [
                        { id: 1, value: "a" },
                        { id: 2, value: "b" }
                    ]
                },
                map: {
                    mappedItems: [
                        { id: 1, value: "a", processed: true, processedAt: "2024-01-01T00:00:00Z" },
                        { id: 2, value: "b", processed: true, processedAt: "2024-01-01T00:00:00Z" }
                    ]
                },
                output: { result: [] }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-map-transform-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-map-transform",
                            workflowDefinition: workflowDef,
                            inputs: {
                                items: [
                                    { id: 1, value: "a" },
                                    { id: 2, value: "b" }
                                ]
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("map");
        });

        it("should handle empty array", async () => {
            const workflowDef = createMapTransformDefinition();

            configureMockNodeOutputs({
                input: { items: [] },
                map: { mappedItems: [] },
                output: { result: [] }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-map-empty-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-map-empty",
                            workflowDefinition: workflowDef,
                            inputs: { items: [] },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("reduce operation", () => {
        it("should aggregate values across array", async () => {
            const workflowDef = createReduceTransformDefinition();

            configureMockNodeOutputs({
                input: {
                    orders: [
                        { id: 1, amount: 100 },
                        { id: 2, amount: 250 },
                        { id: 3, amount: 150 }
                    ]
                },
                reduce: {
                    summary: { total: 500, count: 3 }
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-reduce-transform-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-reduce-transform",
                            workflowDefinition: workflowDef,
                            inputs: {
                                orders: [
                                    { id: 1, amount: 100 },
                                    { id: 2, amount: 250 },
                                    { id: 3, amount: 150 }
                                ]
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("reduce");
        });
    });

    describe("sort operation", () => {
        it("should sort records by date descending", async () => {
            const workflowDef = createSortTransformDefinition();

            configureMockNodeOutputs({
                input: {
                    records: [
                        { id: 1, date: "2024-01-01" },
                        { id: 2, date: "2024-03-15" },
                        { id: 3, date: "2024-02-10" }
                    ]
                },
                sort: {
                    sorted: [
                        { id: 2, date: "2024-03-15" },
                        { id: 3, date: "2024-02-10" },
                        { id: 1, date: "2024-01-01" }
                    ]
                },
                output: { result: [] }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-sort-transform-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-sort-transform",
                            workflowDefinition: workflowDef,
                            inputs: {
                                records: [
                                    { id: 1, date: "2024-01-01" },
                                    { id: 2, date: "2024-03-15" },
                                    { id: 3, date: "2024-02-10" }
                                ]
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("sort");
        });
    });

    describe("merge operation", () => {
        it("should merge data from multiple HTTP sources", async () => {
            const workflowDef = createMergeTransformDefinition();

            configureMockNodeOutputs({
                input: { userId: "user-123" },
                fetch_profile: {
                    statusCode: 200,
                    body: { name: "John Doe", email: "john@example.com" }
                },
                fetch_orders: {
                    statusCode: 200,
                    body: { orders: [{ id: 1, total: 99.99 }], count: 1 }
                },
                merge: {
                    combined: {
                        name: "John Doe",
                        email: "john@example.com",
                        orders: [{ id: 1, total: 99.99 }],
                        count: 1
                    }
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-merge-transform-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-merge-transform",
                            workflowDefinition: workflowDef,
                            inputs: { userId: "user-123" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("fetch_profile");
            expect(nodeIds).toContain("fetch_orders");
            expect(nodeIds).toContain("merge");
        });
    });

    describe("extract operation", () => {
        it("should extract nested data from response", async () => {
            const workflowDef = createExtractTransformDefinition();

            configureMockNodeOutputs({
                input: {
                    response: {
                        status: "success",
                        data: {
                            results: [
                                { id: 1, value: "A" },
                                { id: 2, value: "B" }
                            ],
                            total: 2
                        }
                    }
                },
                extract: {
                    extracted: [
                        { id: 1, value: "A" },
                        { id: 2, value: "B" }
                    ]
                },
                output: { result: [] }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-extract-transform-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-extract-transform",
                            workflowDefinition: workflowDef,
                            inputs: {
                                response: {
                                    status: "success",
                                    data: {
                                        results: [
                                            { id: 1, value: "A" },
                                            { id: 2, value: "B" }
                                        ],
                                        total: 2
                                    }
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("extract");
        });
    });

    describe("JSONata custom transform", () => {
        it("should apply JSONata expression", async () => {
            const workflowDef = createJSONataTransformDefinition();

            configureMockNodeOutputs({
                input: {
                    data: {
                        items: [
                            { name: "Widget A", price: 50 },
                            { name: "Widget B", price: 150 },
                            { name: "Widget C", price: 200 }
                        ]
                    }
                },
                jsonata: {
                    transformed: [
                        { name: "Widget B", discountedPrice: 135 },
                        { name: "Widget C", discountedPrice: 180 }
                    ]
                },
                output: { result: [] }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-jsonata-transform-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-jsonata-transform",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    items: [
                                        { name: "Widget A", price: 50 },
                                        { name: "Widget B", price: 150 },
                                        { name: "Widget C", price: 200 }
                                    ]
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("jsonata");
        });
    });

    describe("XML parsing", () => {
        it("should parse XML and extract items", async () => {
            const workflowDef = createXMLParseDefinition();

            const xmlString = `
                <catalog>
                    <items>
                        <item><id>1</id><name>Item A</name></item>
                        <item><id>2</id><name>Item B</name></item>
                    </items>
                </catalog>
            `;

            configureMockNodeOutputs({
                input: { xmlString },
                parse: {
                    parsedXML: {
                        catalog: {
                            items: {
                                item: [
                                    { id: "1", name: "Item A" },
                                    { id: "2", name: "Item B" }
                                ]
                            }
                        }
                    }
                },
                extract: {
                    items: [
                        { id: "1", name: "Item A" },
                        { id: "2", name: "Item B" }
                    ]
                },
                output: { result: [] }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-xml-parse-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-xml-parse",
                            workflowDefinition: workflowDef,
                            inputs: { xmlString },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("parse");
            expect(nodeIds).toContain("extract");
        });
    });

    describe("validation pipeline", () => {
        it("should filter invalid records and clean data", async () => {
            const workflowDef = createValidationPipelineDefinition();

            configureMockNodeOutputs({
                input: {
                    records: [
                        { name: " John Doe ", email: "JOHN@example.com" },
                        { name: "Jane", email: "invalid-email" },
                        { name: " Bob Smith ", email: "bob@example.com " }
                    ]
                },
                filter_valid: {
                    validRecords: [
                        { name: " John Doe ", email: "JOHN@example.com" },
                        { name: " Bob Smith ", email: "bob@example.com " }
                    ]
                },
                clean: {
                    cleanedRecords: [
                        { name: "John Doe", email: "john@example.com" },
                        { name: "Bob Smith", email: "bob@example.com" }
                    ]
                },
                count_check: {
                    validCount: 2,
                    invalidCount: 1,
                    records: [
                        { name: "John Doe", email: "john@example.com" },
                        { name: "Bob Smith", email: "bob@example.com" }
                    ]
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-validation-pipeline-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-validation-pipeline",
                            workflowDefinition: workflowDef,
                            inputs: {
                                records: [
                                    { name: " John Doe ", email: "JOHN@example.com" },
                                    { name: "Jane", email: "invalid-email" },
                                    { name: " Bob Smith ", email: "bob@example.com " }
                                ]
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("filter_valid");
            expect(nodeIds).toContain("clean");
            expect(nodeIds).toContain("count_check");
        });
    });

    describe("transform with HTTP", () => {
        it("should parse, enrich via HTTP, and merge", async () => {
            const workflowDef = createTransformWithHTTPDefinition();

            const jsonData = JSON.stringify({ id: "123", type: "product" });

            configureMockNodeOutputs({
                input: { jsonData },
                parse: {
                    parsed: { id: "123", type: "product" }
                },
                enrich: {
                    statusCode: 200,
                    body: { category: "Electronics", tags: ["gadget", "tech"] }
                },
                merge: {
                    enriched: {
                        id: "123",
                        type: "product",
                        category: "Electronics",
                        tags: ["gadget", "tech"]
                    }
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-transform-http-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-transform-http",
                            workflowDefinition: workflowDef,
                            inputs: { jsonData },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("parse");
            expect(nodeIds).toContain("enrich");
            expect(nodeIds).toContain("merge");
        });
    });

    describe("error handling", () => {
        it("should handle invalid JSON parse", async () => {
            const workflowDef = createTransformChainDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "parse") {
                    throw new Error("Invalid JSON: Unexpected token");
                }

                return {
                    result: { rawData: "invalid-json" },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { rawData: "invalid-json" }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-parse-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-parse-error",
                            workflowDefinition: workflowDef,
                            inputs: { rawData: "invalid-json{" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("failed");
        });

        it("should handle transform operation on non-array", async () => {
            const workflowDef = createMapTransformDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "map") {
                    throw new Error("Map operation requires array input");
                }

                return {
                    result: { items: "not-an-array" },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { items: "not-an-array" }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-map-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-map-error",
                            workflowDefinition: workflowDef,
                            inputs: { items: "not-an-array" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });
    });

    describe("real-world transform scenarios", () => {
        it("should process CSV-like data", async () => {
            const workflowDef = createValidationPipelineDefinition();

            const csvRecords = [
                { name: "Alice Johnson", email: "alice@company.com", department: "Engineering" },
                { name: "Bob Wilson", email: "bob@company.com", department: "Sales" },
                { name: "Charlie Brown", email: "invalid", department: "Marketing" }
            ];

            configureMockNodeOutputs({
                input: { records: csvRecords },
                filter_valid: {
                    validRecords: [
                        {
                            name: "Alice Johnson",
                            email: "alice@company.com",
                            department: "Engineering"
                        },
                        { name: "Bob Wilson", email: "bob@company.com", department: "Sales" }
                    ]
                },
                clean: {
                    cleanedRecords: [
                        {
                            name: "Alice Johnson",
                            email: "alice@company.com",
                            department: "Engineering"
                        },
                        { name: "Bob Wilson", email: "bob@company.com", department: "Sales" }
                    ]
                },
                count_check: {
                    validCount: 2,
                    invalidCount: 1,
                    records: []
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-csv-process-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-csv-process",
                            workflowDefinition: workflowDef,
                            inputs: { records: csvRecords },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should transform API response for frontend", async () => {
            const workflowDef = createExtractTransformDefinition();

            configureMockNodeOutputs({
                input: {
                    response: {
                        status: 200,
                        data: {
                            results: [
                                { id: 1, name: "Product A", price: 99.99, inStock: true },
                                { id: 2, name: "Product B", price: 149.99, inStock: false }
                            ],
                            pagination: { page: 1, total: 100 }
                        }
                    }
                },
                extract: {
                    extracted: [
                        { id: 1, name: "Product A", price: 99.99, inStock: true },
                        { id: 2, name: "Product B", price: 149.99, inStock: false }
                    ]
                },
                output: { result: [] }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-api-transform-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-api-transform",
                            workflowDefinition: workflowDef,
                            inputs: {
                                response: {
                                    status: 200,
                                    data: {
                                        results: [
                                            {
                                                id: 1,
                                                name: "Product A",
                                                price: 99.99,
                                                inStock: true
                                            },
                                            {
                                                id: 2,
                                                name: "Product B",
                                                price: 149.99,
                                                inStock: false
                                            }
                                        ],
                                        pagination: { page: 1, total: 100 }
                                    }
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should calculate order statistics", async () => {
            const workflowDef = createReduceTransformDefinition();

            const orders = [
                { id: "ORD-001", amount: 125.5, status: "completed" },
                { id: "ORD-002", amount: 89.99, status: "completed" },
                { id: "ORD-003", amount: 299.0, status: "completed" },
                { id: "ORD-004", amount: 45.0, status: "completed" },
                { id: "ORD-005", amount: 175.25, status: "completed" }
            ];

            configureMockNodeOutputs({
                input: { orders },
                reduce: {
                    summary: { total: 734.74, count: 5 }
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-order-stats-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-order-stats",
                            workflowDefinition: workflowDef,
                            inputs: { orders },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });
});
