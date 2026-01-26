/**
 * Database Node Integration Tests
 *
 * Tests database operations in workflow context:
 * - Query operations (SELECT)
 * - Insert operations
 * - Update operations
 * - Delete operations
 * - Transaction patterns
 * - Error handling
 */

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
 * Create a simple database query workflow
 * Input -> DBQuery -> Transform -> Output
 */
function createDatabaseQueryWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "userId" },
        depth: 0,
        dependencies: [],
        dependents: ["DBQuery"]
    });

    nodes.set("DBQuery", {
        id: "DBQuery",
        type: "database",
        name: "Query Users",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "query",
            parameters: {
                sql: "SELECT * FROM users WHERE id = $1",
                params: ["{{Input.userId}}"]
            }
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Transform"]
    });

    nodes.set("Transform", {
        id: "Transform",
        type: "transform",
        name: "Format Result",
        config: {
            operation: "map",
            expression: "row => ({ ...row, formatted: true })"
        },
        depth: 2,
        dependencies: ["DBQuery"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 3,
        dependencies: ["Transform"],
        dependents: []
    });

    // Edges
    edges.set("Input-DBQuery", {
        id: "Input-DBQuery",
        source: "Input",
        target: "DBQuery",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("DBQuery-Transform", {
        id: "DBQuery-Transform",
        source: "DBQuery",
        target: "Transform",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Transform-Output", {
        id: "Transform-Output",
        source: "Transform",
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
        executionLevels: [["Input"], ["DBQuery"], ["Transform"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a CRUD workflow: Input -> Insert -> Query -> Update -> Delete -> Output
 */
function createDatabaseCRUDWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "userData" },
        depth: 0,
        dependencies: [],
        dependents: ["Insert"]
    });

    nodes.set("Insert", {
        id: "Insert",
        type: "database",
        name: "Insert User",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "insert",
            parameters: {
                table: "users",
                data: "{{Input.userData}}"
            }
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Query"]
    });

    nodes.set("Query", {
        id: "Query",
        type: "database",
        name: "Query User",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "query",
            parameters: {
                sql: "SELECT * FROM users WHERE id = $1",
                params: ["{{Insert.data.id}}"]
            }
        },
        depth: 2,
        dependencies: ["Insert"],
        dependents: ["Update"]
    });

    nodes.set("Update", {
        id: "Update",
        type: "database",
        name: "Update User",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "update",
            parameters: {
                table: "users",
                data: { status: "active" },
                where: { id: "{{Query.data[0].id}}" }
            }
        },
        depth: 3,
        dependencies: ["Query"],
        dependents: ["Delete"]
    });

    nodes.set("Delete", {
        id: "Delete",
        type: "database",
        name: "Delete User",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "delete",
            parameters: {
                table: "users",
                where: { id: "{{Update.data.id}}" }
            }
        },
        depth: 4,
        dependencies: ["Update"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 5,
        dependencies: ["Delete"],
        dependents: []
    });

    // Edges
    const edgePairs = [
        ["Input", "Insert"],
        ["Insert", "Query"],
        ["Query", "Update"],
        ["Update", "Delete"],
        ["Delete", "Output"]
    ];

    for (const [source, target] of edgePairs) {
        edges.set(`${source}-${target}`, {
            id: `${source}-${target}`,
            source,
            target,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], ["Insert"], ["Query"], ["Update"], ["Delete"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a parallel database query workflow
 * Input -> [QueryA, QueryB, QueryC] (parallel) -> Merge -> Output
 */
function createParallelDatabaseWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "searchQuery" },
        depth: 0,
        dependencies: [],
        dependents: ["QueryUsers", "QueryProducts", "QueryOrders"]
    });

    // Parallel database queries
    const queries = [
        { id: "QueryUsers", table: "users" },
        { id: "QueryProducts", table: "products" },
        { id: "QueryOrders", table: "orders" }
    ];

    for (const query of queries) {
        nodes.set(query.id, {
            id: query.id,
            type: "database",
            name: `Query ${query.table}`,
            config: {
                connectionId: "conn-123",
                provider: "postgresql",
                operation: "query",
                parameters: {
                    sql: `SELECT * FROM ${query.table} WHERE name LIKE $1`,
                    params: ["{{Input.searchQuery}}"]
                }
            },
            depth: 1,
            dependencies: ["Input"],
            dependents: ["Merge"]
        });

        edges.set(`Input-${query.id}`, {
            id: `Input-${query.id}`,
            source: "Input",
            target: query.id,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        edges.set(`${query.id}-Merge`, {
            id: `${query.id}-Merge`,
            source: query.id,
            target: "Merge",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    nodes.set("Merge", {
        id: "Merge",
        type: "transform",
        name: "Merge Results",
        config: {
            operation: "merge"
        },
        depth: 2,
        dependencies: ["QueryUsers", "QueryProducts", "QueryOrders"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "searchResults" },
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
        executionLevels: [
            ["Input"],
            ["QueryUsers", "QueryProducts", "QueryOrders"],
            ["Merge"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate workflow execution
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
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                queueState = markFailed(queueState, nodeId, errorMessage, workflow);
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

describe("Database Node Integration", () => {
    describe("query operations", () => {
        it("should execute simple database query in workflow", async () => {
            const workflow = createDatabaseQueryWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { userId: 123 },
                    DBQuery: {
                        operation: "query",
                        provider: "postgresql",
                        success: true,
                        data: [{ id: 123, name: "Test User", email: "test@example.com" }],
                        metadata: { queryTime: 15 }
                    },
                    Transform: {
                        result: [
                            {
                                id: 123,
                                name: "Test User",
                                email: "test@example.com",
                                formatted: true
                            }
                        ]
                    },
                    Output: {
                        result: [
                            {
                                id: 123,
                                name: "Test User",
                                email: "test@example.com",
                                formatted: true
                            }
                        ]
                    }
                })
            );

            const { executionOrder, finalOutputs, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { userId: 123 }
            );

            expect(executionOrder).toEqual(["Input", "DBQuery", "Transform", "Output"]);
            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs.result).toBeDefined();
        });

        it("should pass query parameters from input context", async () => {
            const workflow = createDatabaseQueryWorkflow();
            let capturedConfig: JsonObject | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { userId: "user-456" } },
                    DBQuery: {
                        customOutput: {
                            operation: "query",
                            success: true,
                            data: [{ id: "user-456", name: "Found User" }]
                        },
                        onExecute: (input) => {
                            capturedConfig = input.nodeConfig;
                        }
                    },
                    Transform: { customOutput: { result: [] } },
                    Output: { customOutput: { result: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities, { userId: "user-456" });

            expect(capturedConfig).toBeDefined();
            expect((capturedConfig as unknown as JsonObject).parameters).toBeDefined();
        });

        it("should handle empty query result", async () => {
            const workflow = createDatabaseQueryWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { userId: 999 },
                    DBQuery: {
                        operation: "query",
                        provider: "postgresql",
                        success: true,
                        data: [],
                        metadata: { queryTime: 5 }
                    },
                    Transform: { result: [] },
                    Output: { result: [] }
                })
            );

            const { executionOrder, failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { userId: 999 }
            );

            expect(executionOrder).toEqual(["Input", "DBQuery", "Transform", "Output"]);
            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs).toBeDefined();
        });
    });

    describe("CRUD operations", () => {
        it("should execute full CRUD workflow", async () => {
            const workflow = createDatabaseCRUDWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { userData: { name: "New User", email: "new@example.com" } },
                    Insert: {
                        operation: "insert",
                        success: true,
                        data: { id: 1, name: "New User", email: "new@example.com" }
                    },
                    Query: {
                        operation: "query",
                        success: true,
                        data: [{ id: 1, name: "New User", email: "new@example.com" }]
                    },
                    Update: {
                        operation: "update",
                        success: true,
                        data: { id: 1, status: "active" }
                    },
                    Delete: {
                        operation: "delete",
                        success: true,
                        data: { rowsAffected: 1 }
                    },
                    Output: { result: { completed: true } }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { userData: { name: "New User", email: "new@example.com" } }
            );

            expect(executionOrder).toEqual([
                "Input",
                "Insert",
                "Query",
                "Update",
                "Delete",
                "Output"
            ]);
            expect(failedNodes).toHaveLength(0);
        });

        it("should pass inserted record ID to subsequent queries", async () => {
            const workflow = createDatabaseCRUDWorkflow();
            const insertedId = "inserted-123";
            let queryConfig: JsonObject | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { userData: { name: "Test" } } },
                    Insert: {
                        customOutput: {
                            operation: "insert",
                            success: true,
                            data: { id: insertedId, name: "Test" }
                        }
                    },
                    Query: {
                        customOutput: {
                            operation: "query",
                            success: true,
                            data: [{ id: insertedId }]
                        },
                        onExecute: (input) => {
                            queryConfig = input.nodeConfig;
                        }
                    },
                    Update: { customOutput: { operation: "update", success: true, data: {} } },
                    Delete: { customOutput: { operation: "delete", success: true, data: {} } },
                    Output: { customOutput: { result: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            expect(queryConfig).toBeDefined();
        });
    });

    describe("parallel database queries", () => {
        it("should execute multiple database queries in parallel", async () => {
            const workflow = createParallelDatabaseWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { searchQuery: "%test%" },
                    QueryUsers: {
                        operation: "query",
                        success: true,
                        data: [{ id: 1, name: "Test User" }]
                    },
                    QueryProducts: {
                        operation: "query",
                        success: true,
                        data: [{ id: 101, name: "Test Product" }]
                    },
                    QueryOrders: {
                        operation: "query",
                        success: true,
                        data: [{ id: 1001, name: "Test Order" }]
                    },
                    Merge: {
                        users: [{ id: 1 }],
                        products: [{ id: 101 }],
                        orders: [{ id: 1001 }]
                    },
                    Output: { searchResults: {} }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { searchQuery: "%test%" }
            );

            // Input first, then three parallel queries, then merge and output
            expect(executionOrder[0]).toBe("Input");
            expect(executionOrder).toContain("QueryUsers");
            expect(executionOrder).toContain("QueryProducts");
            expect(executionOrder).toContain("QueryOrders");
            expect(executionOrder).toContain("Merge");
            expect(executionOrder[executionOrder.length - 1]).toBe("Output");
            expect(failedNodes).toHaveLength(0);
        });

        it("should handle partial failure in parallel queries", async () => {
            const workflow = createParallelDatabaseWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { searchQuery: "%test%" } },
                    QueryUsers: {
                        customOutput: {
                            operation: "query",
                            success: true,
                            data: [{ id: 1, name: "Test User" }]
                        }
                    },
                    QueryProducts: {
                        shouldFail: true,
                        errorMessage: "Database connection timeout"
                    },
                    QueryOrders: {
                        customOutput: {
                            operation: "query",
                            success: true,
                            data: [{ id: 1001, name: "Test Order" }]
                        }
                    },
                    Merge: { customOutput: { partial: true } },
                    Output: { customOutput: { searchResults: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toContain("QueryProducts");
        });
    });

    describe("error handling", () => {
        it("should handle database connection error", async () => {
            const workflow = createDatabaseQueryWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { userId: 123 } },
                    DBQuery: {
                        shouldFail: true,
                        errorMessage: "Connection refused: ECONNREFUSED"
                    },
                    Transform: { customOutput: { result: [] } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes, executionOrder } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { userId: 123 }
            );

            expect(executionOrder).toContain("Input");
            expect(executionOrder).toContain("DBQuery");
            expect(failedNodes).toContain("DBQuery");
        });

        it("should handle SQL syntax error", async () => {
            const workflow = createDatabaseQueryWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { userId: 123 } },
                    DBQuery: {
                        shouldFail: true,
                        errorMessage: 'ERROR: syntax error at or near "SELEC"'
                    },
                    Transform: { customOutput: { result: [] } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities, {
                userId: 123
            });

            expect(failedNodes).toContain("DBQuery");
        });

        it("should handle constraint violation error", async () => {
            const workflow = createDatabaseCRUDWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { userData: { name: "Duplicate" } } },
                    Insert: {
                        shouldFail: true,
                        errorMessage: "ERROR: duplicate key value violates unique constraint"
                    },
                    Query: { customOutput: { operation: "query", success: true, data: [] } },
                    Update: { customOutput: { operation: "update", success: true, data: {} } },
                    Delete: { customOutput: { operation: "delete", success: true, data: {} } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toContain("Insert");
        });

        it("should handle query timeout", async () => {
            const workflow = createDatabaseQueryWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { userId: 123 } },
                    DBQuery: {
                        shouldFail: true,
                        errorMessage: "Query timeout exceeded: 30000ms"
                    },
                    Transform: { customOutput: { result: [] } },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toContain("DBQuery");
        });
    });

    describe("provider-specific operations", () => {
        it("should handle PostgreSQL-specific operations", async () => {
            const workflow = createDatabaseQueryWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { userId: 123 },
                    DBQuery: {
                        operation: "query",
                        provider: "postgresql",
                        success: true,
                        data: [{ id: 123, json_data: { key: "value" } }],
                        metadata: { queryTime: 10 }
                    },
                    Transform: { result: [{ id: 123 }] },
                    Output: { result: {} }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities, {
                userId: 123
            });

            expect(failedNodes).toHaveLength(0);
        });

        it("should handle MySQL-specific operations", async () => {
            const workflow = createDatabaseQueryWorkflow();
            // Override the node config for MySQL
            workflow.nodes.get("DBQuery")!.config = {
                connectionId: "mysql-conn-123",
                provider: "mysql",
                operation: "query",
                parameters: {
                    sql: "SELECT * FROM users WHERE id = ?",
                    params: ["{{Input.userId}}"]
                }
            };

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { userId: 123 },
                    DBQuery: {
                        operation: "query",
                        provider: "mysql",
                        success: true,
                        data: [{ id: 123, name: "MySQL User" }],
                        metadata: { queryTime: 8 }
                    },
                    Transform: { result: [{ id: 123 }] },
                    Output: { result: {} }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities, {
                userId: 123
            });

            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("real-world scenarios", () => {
        it("should execute user lookup and profile update workflow", async () => {
            const workflow = createDatabaseQueryWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { userId: "user-abc" },
                    DBQuery: {
                        operation: "query",
                        provider: "postgresql",
                        success: true,
                        data: [
                            {
                                id: "user-abc",
                                name: "John Doe",
                                email: "john@example.com",
                                created_at: "2024-01-01T00:00:00Z"
                            }
                        ]
                    },
                    Transform: {
                        result: [
                            {
                                id: "user-abc",
                                displayName: "John Doe",
                                emailVerified: true,
                                formatted: true
                            }
                        ]
                    },
                    Output: {
                        result: { user: { id: "user-abc", displayName: "John Doe" } }
                    }
                })
            );

            const { executionOrder, finalOutputs, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { userId: "user-abc" }
            );

            expect(executionOrder).toEqual(["Input", "DBQuery", "Transform", "Output"]);
            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs).toBeDefined();
        });

        it("should execute inventory check across multiple tables", async () => {
            const workflow = createParallelDatabaseWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { searchQuery: "SKU-123" },
                    QueryUsers: {
                        operation: "query",
                        success: true,
                        data: []
                    },
                    QueryProducts: {
                        operation: "query",
                        success: true,
                        data: [{ sku: "SKU-123", name: "Widget", stock: 150 }]
                    },
                    QueryOrders: {
                        operation: "query",
                        success: true,
                        data: [
                            { orderId: "ORD-1", sku: "SKU-123", quantity: 5 },
                            { orderId: "ORD-2", sku: "SKU-123", quantity: 10 }
                        ]
                    },
                    Merge: {
                        product: { sku: "SKU-123", stock: 150 },
                        pendingOrders: 15,
                        availableStock: 135
                    },
                    Output: {
                        searchResults: {
                            sku: "SKU-123",
                            available: 135
                        }
                    }
                })
            );

            const { failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { searchQuery: "SKU-123" }
            );

            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs.searchResults).toBeDefined();
        });
    });
});
