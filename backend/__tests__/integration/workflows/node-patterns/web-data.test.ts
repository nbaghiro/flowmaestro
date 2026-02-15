/**
 * Web Data Pattern Integration Tests
 *
 * True integration tests that verify web data handling behavior through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Web browsing (page fetching)
 * - Web search operations
 * - HTTP requests (GET, POST, PUT, DELETE)
 * - Chained web operations (search -> browse -> process)
 * - Authentication handling (basic, bearer, API key)
 * - Error handling and retries
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
 * Create a basic web browse workflow
 * Input -> WebBrowse -> Output
 */
function createWebBrowseDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["browse"] = {
        type: "webBrowse",
        name: "Fetch Page",
        config: {
            url: "${input.data.url}",
            extractText: true,
            maxLength: 10000,
            outputVariable: "pageContent"
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
        { id: "input-browse", source: "input", target: "browse" },
        { id: "browse-output", source: "browse", target: "output" }
    );

    return {
        name: "Web Browse Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a web search workflow
 * Input -> WebSearch -> Output
 */
function createWebSearchDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["search"] = {
        type: "webSearch",
        name: "Search Web",
        config: {
            query: "${input.data.query}",
            maxResults: 10,
            searchType: "web",
            outputVariable: "searchResults"
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
        { id: "input-search", source: "input", target: "search" },
        { id: "search-output", source: "search", target: "output" }
    );

    return {
        name: "Web Search Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create an HTTP request workflow
 * Input -> HTTP -> Output
 */
function createHttpRequestDefinition(method: string = "GET"): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["http"] = {
        type: "http",
        name: "HTTP Request",
        config: {
            url: "${input.data.url}",
            method,
            headers: [{ key: "Content-Type", value: "application/json" }],
            ...(method !== "GET" && { body: "${input.data.body}" }),
            bodyType: "json",
            timeout: 30,
            retryCount: 2,
            outputVariable: "response"
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
        { id: "input-http", source: "input", target: "http" },
        { id: "http-output", source: "http", target: "output" }
    );

    return {
        name: `HTTP ${method} Workflow`,
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create an HTTP workflow with authentication
 * Input -> HTTP (with auth) -> Output
 */
function createHttpAuthDefinition(authType: "basic" | "bearer" | "apiKey"): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["http"] = {
        type: "http",
        name: "Authenticated Request",
        config: {
            url: "${input.data.url}",
            method: "GET",
            authType,
            authCredentials: "${input.data.credentials}",
            timeout: 30,
            outputVariable: "response"
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
        { id: "input-http", source: "input", target: "http" },
        { id: "http-output", source: "http", target: "output" }
    );

    return {
        name: `HTTP ${authType} Auth Workflow`,
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a chained web workflow
 * Input -> Search -> Browse (first result) -> Transform -> Output
 */
function createSearchBrowseChainDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["search"] = {
        type: "webSearch",
        name: "Search",
        config: {
            query: "${input.data.query}",
            maxResults: 5,
            searchType: "web",
            outputVariable: "searchResults"
        },
        position: { x: 200, y: 0 }
    };

    nodes["browse"] = {
        type: "webBrowse",
        name: "Browse First Result",
        config: {
            url: "${search.searchResults.results[0].url}",
            extractText: true,
            maxLength: 5000,
            outputVariable: "pageContent"
        },
        position: { x: 400, y: 0 }
    };

    nodes["transform"] = {
        type: "transform",
        name: "Extract Summary",
        config: {
            operation: "custom",
            inputData: "${browse.pageContent}",
            expression:
                "{ title: $.url, length: $.contentLength, preview: $.content.substring(0, 200) }",
            outputVariable: "summary"
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
        { id: "input-search", source: "input", target: "search" },
        { id: "search-browse", source: "search", target: "browse" },
        { id: "browse-transform", source: "browse", target: "transform" },
        { id: "transform-output", source: "transform", target: "output" }
    );

    return {
        name: "Search Browse Chain Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create an API aggregation workflow
 * Input -> HTTP (API 1) -> HTTP (API 2) -> Merge -> Output
 */
function createApiAggregationDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["api1"] = {
        type: "http",
        name: "Fetch Users",
        config: {
            url: "https://api.example.com/users",
            method: "GET",
            timeout: 30,
            outputVariable: "users"
        },
        position: { x: 200, y: -50 }
    };

    nodes["api2"] = {
        type: "http",
        name: "Fetch Orders",
        config: {
            url: "https://api.example.com/orders",
            method: "GET",
            timeout: 30,
            outputVariable: "orders"
        },
        position: { x: 200, y: 50 }
    };

    nodes["merge"] = {
        type: "transform",
        name: "Merge Results",
        config: {
            operation: "merge",
            inputData: "${api1.users}",
            mergeData: "${api2.orders}",
            outputVariable: "combined"
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
        { id: "input-api1", source: "input", target: "api1" },
        { id: "input-api2", source: "input", target: "api2" },
        { id: "api1-merge", source: "api1", target: "merge" },
        { id: "api2-merge", source: "api2", target: "merge" },
        { id: "merge-output", source: "merge", target: "output" }
    );

    return {
        name: "API Aggregation Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a webhook workflow
 * Input -> HTTP POST (webhook) -> Transform (extract response) -> Output
 */
function createWebhookDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["webhook"] = {
        type: "http",
        name: "Send Webhook",
        config: {
            url: "${input.data.webhookUrl}",
            method: "POST",
            headers: [
                { key: "Content-Type", value: "application/json" },
                { key: "X-Webhook-Secret", value: "${input.data.secret}" }
            ],
            body: JSON.stringify({
                event: "${input.data.event}",
                payload: "${input.data.payload}"
            }),
            bodyType: "json",
            timeout: 10,
            retryCount: 3,
            outputVariable: "webhookResponse"
        },
        position: { x: 200, y: 0 }
    };

    nodes["extract"] = {
        type: "transform",
        name: "Extract Status",
        config: {
            operation: "custom",
            inputData: "${webhook.webhookResponse}",
            expression: "{ success: $.status === 200, acknowledged: $.data.acknowledged }",
            outputVariable: "status"
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
        { id: "input-webhook", source: "input", target: "webhook" },
        { id: "webhook-extract", source: "webhook", target: "extract" },
        { id: "extract-output", source: "extract", target: "output" }
    );

    return {
        name: "Webhook Workflow",
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

        const signals: Record<string, JsonValue> = {};

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

describe("Web Data Pattern Integration Tests", () => {
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

    describe("web browsing", () => {
        it("should fetch and extract page content", async () => {
            const workflowDef = createWebBrowseDefinition();

            configureMockNodeOutputs({
                browse: {
                    url: "https://example.com",
                    content: "Example page content with important information",
                    contentType: "text/html",
                    contentLength: 42
                },
                output: { result: { fetched: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-web-browse-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-web-browse",
                            workflowDefinition: workflowDef,
                            inputs: { data: { url: "https://example.com" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("browse");
            expect(nodeIds).toContain("output");
        });

        it("should handle max content length", async () => {
            const workflowDef = createWebBrowseDefinition();

            configureMockNodeOutputs({
                browse: {
                    url: "https://longcontent.com",
                    content: "A".repeat(10000),
                    contentType: "text/html",
                    contentLength: 10000
                },
                output: { result: { truncated: false } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-web-browse-maxlen-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-web-browse-maxlen",
                            workflowDefinition: workflowDef,
                            inputs: { data: { url: "https://longcontent.com" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("web search", () => {
        it("should perform web search", async () => {
            const workflowDef = createWebSearchDefinition();

            configureMockNodeOutputs({
                search: {
                    query: "test query",
                    results: [
                        { title: "Result 1", url: "https://r1.com", snippet: "Snippet 1" },
                        { title: "Result 2", url: "https://r2.com", snippet: "Snippet 2" },
                        { title: "Result 3", url: "https://r3.com", snippet: "Snippet 3" }
                    ]
                },
                output: { result: { count: 3 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-web-search-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-web-search",
                            workflowDefinition: workflowDef,
                            inputs: { data: { query: "test query" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("search");
        });

        it("should handle empty search results", async () => {
            const workflowDef = createWebSearchDefinition();

            configureMockNodeOutputs({
                search: {
                    query: "obscure query with no results",
                    results: [],
                    message: "No results found"
                },
                output: { result: { count: 0 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-web-search-empty-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-web-search-empty",
                            workflowDefinition: workflowDef,
                            inputs: { data: { query: "obscure query with no results" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("HTTP requests", () => {
        it("should make GET request", async () => {
            const workflowDef = createHttpRequestDefinition("GET");

            configureMockNodeOutputs({
                http: {
                    status: 200,
                    statusText: "OK",
                    headers: { "content-type": "application/json" },
                    data: { id: 1, name: "Test" },
                    responseTime: 150
                },
                output: { result: { success: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-http-get-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-http-get",
                            workflowDefinition: workflowDef,
                            inputs: { data: { url: "https://api.example.com/data" } },
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
        });

        it("should make POST request with body", async () => {
            const workflowDef = createHttpRequestDefinition("POST");

            configureMockNodeOutputs({
                http: {
                    status: 201,
                    statusText: "Created",
                    headers: { "content-type": "application/json" },
                    data: { id: 123, created: true },
                    responseTime: 200
                },
                output: { result: { created: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-http-post-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-http-post",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    url: "https://api.example.com/items",
                                    body: JSON.stringify({ name: "New Item" })
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should make PUT request", async () => {
            const workflowDef = createHttpRequestDefinition("PUT");

            configureMockNodeOutputs({
                http: {
                    status: 200,
                    statusText: "OK",
                    headers: { "content-type": "application/json" },
                    data: { id: 1, updated: true },
                    responseTime: 180
                },
                output: { result: { updated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-http-put-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-http-put",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    url: "https://api.example.com/items/1",
                                    body: JSON.stringify({ name: "Updated Item" })
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("HTTP authentication", () => {
        it("should handle bearer token authentication", async () => {
            const workflowDef = createHttpAuthDefinition("bearer");

            configureMockNodeOutputs({
                http: {
                    status: 200,
                    statusText: "OK",
                    headers: { "content-type": "application/json" },
                    data: { user: "authenticated", role: "admin" },
                    responseTime: 100
                },
                output: { result: { authenticated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-http-bearer-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-http-bearer",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    url: "https://api.example.com/protected",
                                    credentials: "my-secret-token"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should handle basic authentication", async () => {
            const workflowDef = createHttpAuthDefinition("basic");

            configureMockNodeOutputs({
                http: {
                    status: 200,
                    statusText: "OK",
                    headers: { "content-type": "application/json" },
                    data: { access: "granted" },
                    responseTime: 120
                },
                output: { result: { authenticated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-http-basic-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-http-basic",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    url: "https://api.example.com/secure",
                                    credentials: "username:password"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should handle API key authentication", async () => {
            const workflowDef = createHttpAuthDefinition("apiKey");

            configureMockNodeOutputs({
                http: {
                    status: 200,
                    statusText: "OK",
                    headers: { "content-type": "application/json" },
                    data: { data: "protected resource" },
                    responseTime: 90
                },
                output: { result: { authorized: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-http-apikey-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-http-apikey",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    url: "https://api.example.com/v2/data",
                                    credentials: "sk-api-key-12345"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("chained web operations", () => {
        it("should search then browse first result", async () => {
            const workflowDef = createSearchBrowseChainDefinition();

            configureMockNodeOutputs({
                search: {
                    query: "AI automation",
                    results: [
                        {
                            title: "AI Article",
                            url: "https://ai-news.com/article",
                            snippet: "About AI"
                        }
                    ]
                },
                browse: {
                    url: "https://ai-news.com/article",
                    content: "Full article content about AI and automation...",
                    contentType: "text/html",
                    contentLength: 1500
                },
                transform: {
                    title: "https://ai-news.com/article",
                    length: 1500,
                    preview: "Full article content about AI and automation..."
                },
                output: { result: { processed: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-search-browse-chain-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-search-browse-chain",
                            workflowDefinition: workflowDef,
                            inputs: { data: { query: "AI automation" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("search");
            expect(nodeIds).toContain("browse");
            expect(nodeIds).toContain("transform");
        });

        it("should aggregate multiple API calls", async () => {
            const workflowDef = createApiAggregationDefinition();

            configureMockNodeOutputs({
                api1: {
                    status: 200,
                    data: {
                        users: [
                            { id: 1, name: "Alice" },
                            { id: 2, name: "Bob" }
                        ]
                    }
                },
                api2: {
                    status: 200,
                    data: {
                        orders: [
                            { id: 101, userId: 1 },
                            { id: 102, userId: 2 }
                        ]
                    }
                },
                merge: {
                    users: [
                        { id: 1, name: "Alice" },
                        { id: 2, name: "Bob" }
                    ],
                    orders: [
                        { id: 101, userId: 1 },
                        { id: 102, userId: 2 }
                    ]
                },
                output: { result: { combined: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-api-aggregation-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-api-aggregation",
                            workflowDefinition: workflowDef,
                            inputs: { data: {} },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("api1");
            expect(nodeIds).toContain("api2");
            expect(nodeIds).toContain("merge");
        });
    });

    describe("webhook operations", () => {
        it("should send webhook with payload", async () => {
            const workflowDef = createWebhookDefinition();

            configureMockNodeOutputs({
                webhook: {
                    status: 200,
                    statusText: "OK",
                    data: { acknowledged: true, id: "webhook-123" },
                    responseTime: 80
                },
                extract: {
                    success: true,
                    acknowledged: true
                },
                output: { result: { sent: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-webhook-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-webhook",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    webhookUrl: "https://hooks.example.com/trigger",
                                    secret: "webhook-secret-key",
                                    event: "order.completed",
                                    payload: { orderId: 12345 }
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
            expect(nodeIds).toContain("webhook");
            expect(nodeIds).toContain("extract");
        });
    });

    describe("error handling", () => {
        it("should handle web browse failure", async () => {
            const workflowDef = createWebBrowseDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "browse") {
                    throw new Error("Failed to fetch URL: Connection timeout");
                }

                return {
                    result: { executed: nodeId },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { executed: nodeId }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-web-browse-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-web-browse-error",
                            workflowDefinition: workflowDef,
                            inputs: { data: { url: "https://unreachable.example.com" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it("should handle HTTP 404 response", async () => {
            const workflowDef = createHttpRequestDefinition("GET");

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "http") {
                    throw new Error("HTTP 404: Resource not found");
                }

                return {
                    result: { executed: nodeId },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { executed: nodeId }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-http-404-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-http-404",
                            workflowDefinition: workflowDef,
                            inputs: { data: { url: "https://api.example.com/nonexistent" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });

        it("should handle authentication failure", async () => {
            const workflowDef = createHttpAuthDefinition("bearer");

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "http") {
                    throw new Error("HTTP 401: Unauthorized - Invalid or expired token");
                }

                return {
                    result: { executed: nodeId },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { executed: nodeId }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-auth-failure-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-auth-failure",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    url: "https://api.example.com/protected",
                                    credentials: "invalid-token"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });
    });

    describe("real-world scenarios", () => {
        it("should handle competitor price monitoring workflow", async () => {
            const workflowDef = createSearchBrowseChainDefinition();

            configureMockNodeOutputs({
                search: {
                    query: "competitor product pricing",
                    results: [
                        {
                            title: "Competitor Store",
                            url: "https://competitor.com/product",
                            snippet: "Price info"
                        }
                    ]
                },
                browse: {
                    url: "https://competitor.com/product",
                    content: "Product: Widget Pro, Price: $99.99, In Stock: Yes",
                    contentType: "text/html",
                    contentLength: 500
                },
                transform: {
                    title: "https://competitor.com/product",
                    length: 500,
                    preview: "Product: Widget Pro, Price: $99.99, In Stock: Yes"
                },
                output: { result: { monitored: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-price-monitor-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-price-monitor",
                            workflowDefinition: workflowDef,
                            inputs: { data: { query: "competitor product pricing" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should handle API integration workflow", async () => {
            const workflowDef = createApiAggregationDefinition();

            configureMockNodeOutputs({
                api1: {
                    status: 200,
                    data: {
                        users: [{ id: 1, name: "John Doe", email: "john@example.com" }]
                    }
                },
                api2: {
                    status: 200,
                    data: {
                        orders: [{ id: 501, userId: 1, total: 149.99, status: "shipped" }]
                    }
                },
                merge: {
                    users: [{ id: 1, name: "John Doe", email: "john@example.com" }],
                    orders: [{ id: 501, userId: 1, total: 149.99, status: "shipped" }],
                    summary: { totalUsers: 1, totalOrders: 1, totalRevenue: 149.99 }
                },
                output: { result: { integrated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-api-integration-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-api-integration",
                            workflowDefinition: workflowDef,
                            inputs: { data: {} },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });
});
