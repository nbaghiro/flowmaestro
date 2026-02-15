/**
 * Database Pattern Integration Tests
 *
 * True integration tests that verify database operation behavior through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - SQL queries (SELECT, INSERT, UPDATE, DELETE)
 * - MongoDB operations (find, insertOne, updateOne)
 * - Knowledge base queries (semantic search)
 * - Chained database workflows
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
 * Create a SQL query workflow
 * Input -> Database (SELECT) -> Output
 */
function createSqlQueryDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["query"] = {
        type: "database",
        name: "Query Users",
        config: {
            connectionId: "conn-postgres-1",
            provider: "postgresql",
            operation: "query",
            parameters: {
                query: "SELECT * FROM users WHERE status = $1",
                values: ["${input.data.status}"]
            },
            outputVariable: "queryResult"
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
        { id: "input-query", source: "input", target: "query" },
        { id: "query-output", source: "query", target: "output" }
    );

    return {
        name: "SQL Query Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a SQL insert workflow
 * Input -> Database (INSERT) -> Output
 */
function createSqlInsertDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["insert"] = {
        type: "database",
        name: "Insert User",
        config: {
            connectionId: "conn-postgres-1",
            provider: "postgresql",
            operation: "insert",
            parameters: {
                table: "users",
                values: {
                    name: "${input.data.name}",
                    email: "${input.data.email}",
                    status: "active"
                },
                returning: ["id", "created_at"]
            },
            outputVariable: "insertResult"
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
        { id: "input-insert", source: "input", target: "insert" },
        { id: "insert-output", source: "insert", target: "output" }
    );

    return {
        name: "SQL Insert Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a MongoDB find workflow
 * Input -> Database (find) -> Output
 */
function createMongoFindDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["find"] = {
        type: "database",
        name: "Find Documents",
        config: {
            connectionId: "conn-mongodb-1",
            provider: "mongodb",
            operation: "find",
            parameters: {
                collection: "orders",
                filter: { status: "${input.data.status}" },
                sort: { createdAt: -1 },
                limit: 10
            },
            outputVariable: "documents"
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
        { id: "input-find", source: "input", target: "find" },
        { id: "find-output", source: "find", target: "output" }
    );

    return {
        name: "MongoDB Find Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a knowledge base query workflow
 * Input -> KBQuery -> Output
 */
function createKbQueryDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["kbQuery"] = {
        type: "kbQuery",
        name: "Search Knowledge Base",
        config: {
            knowledgeBaseId: "kb-docs-1",
            queryText: "${input.data.question}",
            includeMetadata: true,
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
        { id: "input-kb", source: "input", target: "kbQuery" },
        { id: "kb-output", source: "kbQuery", target: "output" }
    );

    return {
        name: "Knowledge Base Query Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a query and process workflow
 * Input -> Database (SELECT) -> Transform -> Output
 */
function createQueryProcessDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["query"] = {
        type: "database",
        name: "Fetch Orders",
        config: {
            connectionId: "conn-postgres-1",
            provider: "postgresql",
            operation: "query",
            parameters: {
                query: "SELECT * FROM orders WHERE user_id = $1",
                values: ["${input.data.userId}"]
            },
            outputVariable: "orders"
        },
        position: { x: 200, y: 0 }
    };

    nodes["transform"] = {
        type: "transform",
        name: "Calculate Stats",
        config: {
            operation: "custom",
            inputData: "${query.orders}",
            expression:
                "{ totalOrders: $.length, totalAmount: $.reduce((sum, o) => sum + o.amount, 0) }",
            outputVariable: "stats"
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
        { id: "input-query", source: "input", target: "query" },
        { id: "query-transform", source: "query", target: "transform" },
        { id: "transform-output", source: "transform", target: "output" }
    );

    return {
        name: "Query and Process Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a RAG (Retrieval-Augmented Generation) workflow
 * Input -> KBQuery -> LLM (with context) -> Output
 */
function createRagWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["kbQuery"] = {
        type: "kbQuery",
        name: "Retrieve Context",
        config: {
            knowledgeBaseId: "kb-docs-1",
            queryText: "${input.data.question}",
            includeMetadata: true,
            outputVariable: "context"
        },
        position: { x: 200, y: 0 }
    };

    nodes["llm"] = {
        type: "code",
        name: "Generate Answer",
        config: {
            language: "javascript",
            code: "return { answer: 'Based on the context: ' + context.data.combinedText.substring(0, 100) + '...' };",
            outputVariable: "response"
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
        { id: "input-kb", source: "input", target: "kbQuery" },
        { id: "kb-llm", source: "kbQuery", target: "llm" },
        { id: "llm-output", source: "llm", target: "output" }
    );

    return {
        name: "RAG Workflow",
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

describe("Database Pattern Integration Tests", () => {
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

    describe("SQL operations", () => {
        it("should execute SELECT query", async () => {
            const workflowDef = createSqlQueryDefinition();

            configureMockNodeOutputs({
                query: {
                    operation: "query",
                    provider: "postgresql",
                    success: true,
                    data: [
                        { id: 1, name: "Alice", email: "alice@example.com", status: "active" },
                        { id: 2, name: "Bob", email: "bob@example.com", status: "active" }
                    ],
                    metadata: { queryTime: 45 }
                },
                output: { result: { rows: 2 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-sql-select-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-sql-select",
                            workflowDefinition: workflowDef,
                            inputs: { data: { status: "active" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("query");
        });

        it("should execute INSERT operation", async () => {
            const workflowDef = createSqlInsertDefinition();

            configureMockNodeOutputs({
                insert: {
                    operation: "insert",
                    provider: "postgresql",
                    success: true,
                    data: { id: 123, created_at: "2024-01-15T10:30:00Z" },
                    metadata: { queryTime: 32 }
                },
                output: { result: { inserted: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-sql-insert-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-sql-insert",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    name: "Charlie",
                                    email: "charlie@example.com"
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
            expect(nodeIds).toContain("insert");
        });
    });

    describe("MongoDB operations", () => {
        it("should execute find operation", async () => {
            const workflowDef = createMongoFindDefinition();

            configureMockNodeOutputs({
                find: {
                    operation: "find",
                    provider: "mongodb",
                    success: true,
                    data: [
                        { _id: "order1", userId: "user1", amount: 99.99, status: "pending" },
                        { _id: "order2", userId: "user1", amount: 149.99, status: "pending" }
                    ],
                    metadata: { queryTime: 28 }
                },
                output: { result: { documents: 2 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-mongo-find-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-mongo-find",
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
            expect(nodeIds).toContain("find");
        });
    });

    describe("knowledge base queries", () => {
        it("should perform semantic search", async () => {
            const workflowDef = createKbQueryDefinition();

            configureMockNodeOutputs({
                kbQuery: {
                    success: true,
                    data: {
                        query: "How do I reset my password?",
                        results: [
                            {
                                content: "To reset your password, click on 'Forgot Password'...",
                                similarity: 0.92,
                                documentName: "user-guide.pdf",
                                chunkIndex: 15
                            },
                            {
                                content: "Password requirements include at least 8 characters...",
                                similarity: 0.85,
                                documentName: "security-policy.pdf",
                                chunkIndex: 3
                            }
                        ],
                        topResult: {
                            content: "To reset your password, click on 'Forgot Password'...",
                            similarity: 0.92
                        },
                        combinedText: "Result 1: To reset your password...",
                        count: 2,
                        metadata: {
                            knowledgeBaseId: "kb-docs-1",
                            knowledgeBaseName: "Documentation"
                        }
                    }
                },
                output: { result: { found: 2 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-kb-query-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-kb-query",
                            workflowDefinition: workflowDef,
                            inputs: { data: { question: "How do I reset my password?" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("kbQuery");
        });
    });

    describe("chained database workflows", () => {
        it("should query and process data", async () => {
            const workflowDef = createQueryProcessDefinition();

            configureMockNodeOutputs({
                query: {
                    operation: "query",
                    provider: "postgresql",
                    success: true,
                    data: [
                        { id: 1, userId: "user1", amount: 150.0 },
                        { id: 2, userId: "user1", amount: 75.5 },
                        { id: 3, userId: "user1", amount: 200.0 }
                    ]
                },
                transform: {
                    totalOrders: 3,
                    totalAmount: 425.5
                },
                output: { result: { processed: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-query-process-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-query-process",
                            workflowDefinition: workflowDef,
                            inputs: { data: { userId: "user1" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("query");
            expect(nodeIds).toContain("transform");
        });

        it("should execute RAG workflow", async () => {
            const workflowDef = createRagWorkflowDefinition();

            configureMockNodeOutputs({
                kbQuery: {
                    success: true,
                    data: {
                        query: "What is the return policy?",
                        results: [
                            {
                                content: "Our return policy allows returns within 30 days...",
                                similarity: 0.94
                            }
                        ],
                        combinedText: "Our return policy allows returns within 30 days...",
                        count: 1
                    }
                },
                llm: {
                    answer: "Based on the context: Our return policy allows returns within 30 days..."
                },
                output: { result: { answered: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-rag-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-rag",
                            workflowDefinition: workflowDef,
                            inputs: { data: { question: "What is the return policy?" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("kbQuery");
            expect(nodeIds).toContain("llm");
        });
    });

    describe("error handling", () => {
        it("should handle database connection failure", async () => {
            const workflowDef = createSqlQueryDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "query") {
                    throw new Error("Connection refused: Unable to connect to database");
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
                    workflowId: "test-db-conn-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-db-conn-error",
                            workflowDefinition: workflowDef,
                            inputs: { data: { status: "active" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it("should handle knowledge base not found", async () => {
            const workflowDef = createKbQueryDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "kbQuery") {
                    throw new Error("Knowledge base not found: kb-docs-1");
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
                    workflowId: "test-kb-not-found-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-kb-not-found",
                            workflowDefinition: workflowDef,
                            inputs: { data: { question: "Test question" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });
    });

    describe("real-world scenarios", () => {
        it("should handle customer lookup workflow", async () => {
            const workflowDef = createSqlQueryDefinition();

            configureMockNodeOutputs({
                query: {
                    operation: "query",
                    provider: "postgresql",
                    success: true,
                    data: [
                        {
                            id: 42,
                            name: "Acme Corp",
                            email: "contact@acme.com",
                            status: "active",
                            tier: "enterprise",
                            contractValue: 50000
                        }
                    ],
                    metadata: { queryTime: 12 }
                },
                output: { result: { customerFound: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-customer-lookup-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-customer-lookup",
                            workflowDefinition: workflowDef,
                            inputs: { data: { status: "active" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });
});
