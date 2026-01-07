/**
 * API Orchestration Workflow Tests
 *
 * Tests multi-API orchestration patterns:
 * Call APIs → Merge Data → Transform → Respond
 *
 * Simulates API gateway-like orchestration workflows.
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
} from "../../../src/temporal/core/services/context";
import { createMockActivities, withOutputs } from "../../fixtures/activities";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createAPIOrchestrationWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "API Request",
        config: { name: "request" },
        depth: 0,
        dependencies: [],
        dependents: ["ValidateRequest"]
    });

    // Validate incoming request
    nodes.set("ValidateRequest", {
        id: "ValidateRequest",
        type: "conditional",
        name: "Validate Request",
        config: {
            condition: "{{Input.request.userId}} !== null && {{Input.request.userId}} !== ''"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["FetchUserData", "RejectRequest"]
    });

    // Reject invalid request
    nodes.set("RejectRequest", {
        id: "RejectRequest",
        type: "output",
        name: "Reject Request",
        config: {
            name: "error",
            statusCode: 400
        },
        depth: 2,
        dependencies: ["ValidateRequest"],
        dependents: []
    });

    // Parallel API calls
    nodes.set("FetchUserData", {
        id: "FetchUserData",
        type: "http",
        name: "Fetch User Data",
        config: {
            method: "GET",
            url: "https://api.users.example.com/users/{{Input.request.userId}}"
        },
        depth: 2,
        dependencies: ["ValidateRequest"],
        dependents: ["FetchOrders", "FetchPreferences"]
    });

    nodes.set("FetchOrders", {
        id: "FetchOrders",
        type: "http",
        name: "Fetch Orders",
        config: {
            method: "GET",
            url: "https://api.orders.example.com/users/{{Input.request.userId}}/orders?limit=10"
        },
        depth: 3,
        dependencies: ["FetchUserData"],
        dependents: ["MergeData"]
    });

    nodes.set("FetchPreferences", {
        id: "FetchPreferences",
        type: "http",
        name: "Fetch Preferences",
        config: {
            method: "GET",
            url: "https://api.preferences.example.com/users/{{Input.request.userId}}"
        },
        depth: 3,
        dependencies: ["FetchUserData"],
        dependents: ["MergeData"]
    });

    // Merge API responses
    nodes.set("MergeData", {
        id: "MergeData",
        type: "transform",
        name: "Merge Data",
        config: {
            operation: "merge",
            sources: ["FetchUserData", "FetchOrders", "FetchPreferences"]
        },
        depth: 4,
        dependencies: ["FetchOrders", "FetchPreferences"],
        dependents: ["EnrichData"]
    });

    // Enrich with computed fields
    nodes.set("EnrichData", {
        id: "EnrichData",
        type: "code",
        name: "Enrich Data",
        config: {
            language: "javascript",
            code: `
                const user = inputs.FetchUserData.body;
                const orders = inputs.FetchOrders.body.orders || [];
                const prefs = inputs.FetchPreferences.body;

                return {
                    user: {
                        ...user,
                        orderCount: orders.length,
                        totalSpent: orders.reduce((sum, o) => sum + o.amount, 0),
                        memberSince: user.createdAt
                    },
                    recentOrders: orders.slice(0, 5),
                    preferences: prefs,
                    computedAt: new Date().toISOString()
                };
            `
        },
        depth: 5,
        dependencies: ["MergeData"],
        dependents: ["CacheResponse"]
    });

    // Cache the response
    nodes.set("CacheResponse", {
        id: "CacheResponse",
        type: "http",
        name: "Cache Response",
        config: {
            method: "POST",
            url: "https://api.cache.example.com/set",
            body: {
                key: "user_profile_{{Input.request.userId}}",
                value: "{{EnrichData}}",
                ttl: 300
            }
        },
        depth: 6,
        dependencies: ["EnrichData"],
        dependents: ["FormatResponse"]
    });

    // Format final response
    nodes.set("FormatResponse", {
        id: "FormatResponse",
        type: "transform",
        name: "Format Response",
        config: {
            operation: "custom",
            expression: `{
                success: true,
                data: EnrichData,
                meta: {
                    cached: CacheResponse.success,
                    sources: ['users', 'orders', 'preferences'],
                    requestId: request.requestId
                }
            }`
        },
        depth: 7,
        dependencies: ["CacheResponse"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "response" },
        depth: 8,
        dependencies: ["FormatResponse"],
        dependents: []
    });

    // Edges
    edges.set("Input-ValidateRequest", {
        id: "Input-ValidateRequest",
        source: "Input",
        target: "ValidateRequest",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("ValidateRequest-FetchUserData", {
        id: "ValidateRequest-FetchUserData",
        source: "ValidateRequest",
        target: "FetchUserData",
        sourceHandle: "true",
        targetHandle: "input",
        handleType: "true"
    });

    edges.set("ValidateRequest-RejectRequest", {
        id: "ValidateRequest-RejectRequest",
        source: "ValidateRequest",
        target: "RejectRequest",
        sourceHandle: "false",
        targetHandle: "input",
        handleType: "false"
    });

    edges.set("FetchUserData-FetchOrders", {
        id: "FetchUserData-FetchOrders",
        source: "FetchUserData",
        target: "FetchOrders",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("FetchUserData-FetchPreferences", {
        id: "FetchUserData-FetchPreferences",
        source: "FetchUserData",
        target: "FetchPreferences",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("FetchOrders-MergeData", {
        id: "FetchOrders-MergeData",
        source: "FetchOrders",
        target: "MergeData",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("FetchPreferences-MergeData", {
        id: "FetchPreferences-MergeData",
        source: "FetchPreferences",
        target: "MergeData",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("MergeData-EnrichData", {
        id: "MergeData-EnrichData",
        source: "MergeData",
        target: "EnrichData",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("EnrichData-CacheResponse", {
        id: "EnrichData-CacheResponse",
        source: "EnrichData",
        target: "CacheResponse",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("CacheResponse-FormatResponse", {
        id: "CacheResponse-FormatResponse",
        source: "CacheResponse",
        target: "FormatResponse",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("FormatResponse-Output", {
        id: "FormatResponse-Output",
        source: "FormatResponse",
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
            ["ValidateRequest"],
            ["FetchUserData", "RejectRequest"],
            ["FetchOrders", "FetchPreferences"],
            ["MergeData"],
            ["EnrichData"],
            ["CacheResponse"],
            ["FormatResponse"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output", "RejectRequest"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

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

        if (readyNodes.length === 0) break;

        queueState = markExecuting(queueState, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId)!;
            executionOrder.push(nodeId);

            try {
                const result = await mockActivities.executeNode(
                    node.type,
                    node.config as JsonObject,
                    context,
                    { nodeId, nodeName: node.name, executionId: "test-execution" }
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

    return {
        context,
        finalOutputs: buildFinalOutputs(context, workflow.outputNodeIds),
        executionOrder,
        failedNodes
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("API Orchestration Workflow", () => {
    describe("successful orchestration", () => {
        it("should orchestrate multiple API calls and merge results", async () => {
            const workflow = createAPIOrchestrationWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        request: { userId: "user-123", requestId: "req-001" }
                    },
                    ValidateRequest: { valid: true, condition: true },
                    RejectRequest: { skipped: true },
                    FetchUserData: {
                        statusCode: 200,
                        body: {
                            id: "user-123",
                            name: "John Doe",
                            email: "john@example.com",
                            createdAt: "2023-01-01"
                        },
                        latency: 45
                    },
                    FetchOrders: {
                        statusCode: 200,
                        body: {
                            orders: [
                                { id: "ord-1", amount: 100, date: "2024-01-10" },
                                { id: "ord-2", amount: 250, date: "2024-01-15" }
                            ]
                        },
                        latency: 62
                    },
                    FetchPreferences: {
                        statusCode: 200,
                        body: { theme: "dark", notifications: true, language: "en" },
                        latency: 38
                    },
                    MergeData: {
                        user: { id: "user-123", name: "John Doe" },
                        orders: [],
                        preferences: {}
                    },
                    EnrichData: {
                        user: { id: "user-123", name: "John Doe", orderCount: 2, totalSpent: 350 },
                        recentOrders: [],
                        preferences: {}
                    },
                    CacheResponse: { success: true, key: "user_profile_user-123" },
                    FormatResponse: {
                        success: true,
                        data: {},
                        meta: { sources: ["users", "orders", "preferences"] }
                    },
                    Output: { response: { success: true } }
                })
            );

            const { executionOrder, failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("FetchUserData");
            expect(executionOrder).toContain("FetchOrders");
            expect(executionOrder).toContain("FetchPreferences");
            expect(executionOrder).toContain("MergeData");
            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs.response).toBeDefined();
        });

        it("should execute parallel API calls concurrently", async () => {
            const workflow = createAPIOrchestrationWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { request: { userId: "user-456" } },
                    ValidateRequest: { valid: true },
                    RejectRequest: { skipped: true },
                    FetchUserData: { statusCode: 200, body: { id: "user-456" }, latency: 50 },
                    FetchOrders: { statusCode: 200, body: { orders: [] }, latency: 55 },
                    FetchPreferences: { statusCode: 200, body: {}, latency: 48 },
                    MergeData: { merged: true },
                    EnrichData: { enriched: true },
                    CacheResponse: { success: true },
                    FormatResponse: { success: true },
                    Output: { response: {} }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            // Orders and Preferences should be in execution order after UserData
            const userDataIndex = executionOrder.indexOf("FetchUserData");
            const ordersIndex = executionOrder.indexOf("FetchOrders");
            const prefsIndex = executionOrder.indexOf("FetchPreferences");

            expect(ordersIndex).toBeGreaterThan(userDataIndex);
            expect(prefsIndex).toBeGreaterThan(userDataIndex);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("request validation", () => {
        it("should reject invalid requests", async () => {
            const workflow = createAPIOrchestrationWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { request: { userId: null, requestId: "req-invalid" } },
                    ValidateRequest: { valid: false, condition: false },
                    RejectRequest: { error: { statusCode: 400, message: "Invalid userId" } },
                    FetchUserData: { skipped: true },
                    FetchOrders: { skipped: true },
                    FetchPreferences: { skipped: true },
                    MergeData: { skipped: true },
                    EnrichData: { skipped: true },
                    CacheResponse: { skipped: true },
                    FormatResponse: { skipped: true },
                    Output: { skipped: true }
                })
            );

            const { executionOrder, failedNodes } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("ValidateRequest");
            expect(failedNodes).toHaveLength(0);
        });

        it("should validate request headers", async () => {
            const workflow = createAPIOrchestrationWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        request: {
                            userId: "user-789",
                            headers: { Authorization: "Bearer token123" }
                        }
                    },
                    ValidateRequest: { valid: true },
                    RejectRequest: { skipped: true },
                    FetchUserData: { statusCode: 200, body: { id: "user-789" } },
                    FetchOrders: { statusCode: 200, body: { orders: [] } },
                    FetchPreferences: { statusCode: 200, body: {} },
                    MergeData: { merged: true },
                    EnrichData: { enriched: true },
                    CacheResponse: { success: true },
                    FormatResponse: { success: true },
                    Output: { response: {} }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("error handling", () => {
        it("should handle user API failure", async () => {
            const workflow = createAPIOrchestrationWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { request: { userId: "user-err" } } },
                    ValidateRequest: { customOutput: { valid: true } },
                    RejectRequest: { customOutput: { skipped: true } },
                    FetchUserData: { shouldFail: true, errorMessage: "User service unavailable" },
                    FetchOrders: { customOutput: {} },
                    FetchPreferences: { customOutput: {} },
                    MergeData: { customOutput: {} },
                    EnrichData: { customOutput: {} },
                    CacheResponse: { customOutput: {} },
                    FormatResponse: { customOutput: {} },
                    Output: { customOutput: { response: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toContain("FetchUserData");
        });

        it("should handle partial API failures gracefully", async () => {
            const workflow = createAPIOrchestrationWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { request: { userId: "user-partial" } } },
                    ValidateRequest: { customOutput: { valid: true } },
                    RejectRequest: { customOutput: { skipped: true } },
                    FetchUserData: {
                        customOutput: { statusCode: 200, body: { id: "user-partial" } }
                    },
                    FetchOrders: { customOutput: { statusCode: 200, body: { orders: [] } } },
                    FetchPreferences: {
                        shouldFail: true,
                        errorMessage: "Preferences service timeout"
                    },
                    MergeData: { customOutput: {} },
                    EnrichData: { customOutput: {} },
                    CacheResponse: { customOutput: {} },
                    FormatResponse: { customOutput: {} },
                    Output: { customOutput: { response: {} } }
                }
            });

            const { failedNodes, executionOrder } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(failedNodes).toContain("FetchPreferences");
            expect(executionOrder).toContain("FetchOrders");
        });

        it("should handle cache service failure without breaking response", async () => {
            const workflow = createAPIOrchestrationWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { request: { userId: "user-cache-fail" } } },
                    ValidateRequest: { customOutput: { valid: true } },
                    RejectRequest: { customOutput: { skipped: true } },
                    FetchUserData: { customOutput: { statusCode: 200, body: { id: "user" } } },
                    FetchOrders: { customOutput: { statusCode: 200, body: { orders: [] } } },
                    FetchPreferences: { customOutput: { statusCode: 200, body: {} } },
                    MergeData: { customOutput: { merged: true } },
                    EnrichData: { customOutput: { enriched: true } },
                    CacheResponse: { shouldFail: true, errorMessage: "Redis connection refused" },
                    FormatResponse: { customOutput: {} },
                    Output: { customOutput: { response: {} } }
                }
            });

            const { failedNodes, executionOrder } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(failedNodes).toContain("CacheResponse");
            expect(executionOrder).toContain("EnrichData");
        });

        it("should handle API rate limiting", async () => {
            const workflow = createAPIOrchestrationWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { request: { userId: "user-rate-limit" } } },
                    ValidateRequest: { customOutput: { valid: true } },
                    RejectRequest: { customOutput: { skipped: true } },
                    FetchUserData: { customOutput: { statusCode: 200, body: { id: "user" } } },
                    FetchOrders: {
                        shouldFail: true,
                        errorMessage: "429 Too Many Requests - Rate limit exceeded"
                    },
                    FetchPreferences: { customOutput: { statusCode: 200, body: {} } },
                    MergeData: { customOutput: {} },
                    EnrichData: { customOutput: {} },
                    CacheResponse: { customOutput: {} },
                    FormatResponse: { customOutput: {} },
                    Output: { customOutput: { response: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toContain("FetchOrders");
        });
    });

    describe("performance tracking", () => {
        it("should track latency from all API calls", async () => {
            const workflow = createAPIOrchestrationWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { request: { userId: "user-perf" } },
                    ValidateRequest: { valid: true },
                    RejectRequest: { skipped: true },
                    FetchUserData: { statusCode: 200, body: {}, latency: 45 },
                    FetchOrders: { statusCode: 200, body: { orders: [] }, latency: 120 },
                    FetchPreferences: { statusCode: 200, body: {}, latency: 35 },
                    MergeData: { merged: true },
                    EnrichData: { enriched: true },
                    CacheResponse: { success: true, latency: 15 },
                    FormatResponse: {
                        success: true,
                        meta: { totalLatency: 215, slowestApi: "orders" }
                    },
                    Output: { response: {} }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("data transformation", () => {
        it("should correctly merge data from multiple sources", async () => {
            const workflow = createAPIOrchestrationWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { request: { userId: "user-merge" } },
                    ValidateRequest: { valid: true },
                    RejectRequest: { skipped: true },
                    FetchUserData: {
                        statusCode: 200,
                        body: { id: "user-merge", name: "Jane Smith", email: "jane@example.com" }
                    },
                    FetchOrders: {
                        statusCode: 200,
                        body: {
                            orders: [
                                { id: "o1", amount: 50 },
                                { id: "o2", amount: 75 },
                                { id: "o3", amount: 125 }
                            ]
                        }
                    },
                    FetchPreferences: {
                        statusCode: 200,
                        body: { theme: "light", notifications: false }
                    },
                    MergeData: {
                        user: { id: "user-merge", name: "Jane Smith" },
                        orders: [{ id: "o1" }, { id: "o2" }, { id: "o3" }],
                        preferences: { theme: "light" }
                    },
                    EnrichData: {
                        user: {
                            id: "user-merge",
                            name: "Jane Smith",
                            orderCount: 3,
                            totalSpent: 250
                        },
                        recentOrders: [{ id: "o1" }, { id: "o2" }, { id: "o3" }],
                        preferences: { theme: "light" }
                    },
                    CacheResponse: { success: true },
                    FormatResponse: { success: true, data: {} },
                    Output: { response: {} }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });

        it("should enrich data with computed fields", async () => {
            const workflow = createAPIOrchestrationWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { request: { userId: "user-enrich" } },
                    ValidateRequest: { valid: true },
                    RejectRequest: { skipped: true },
                    FetchUserData: {
                        statusCode: 200,
                        body: { id: "user-enrich", createdAt: "2022-06-15" }
                    },
                    FetchOrders: {
                        statusCode: 200,
                        body: { orders: [{ amount: 100 }, { amount: 200 }, { amount: 300 }] }
                    },
                    FetchPreferences: { statusCode: 200, body: {} },
                    MergeData: { merged: true },
                    EnrichData: {
                        user: {
                            id: "user-enrich",
                            orderCount: 3,
                            totalSpent: 600,
                            averageOrderValue: 200,
                            membershipDays: 565
                        }
                    },
                    CacheResponse: { success: true },
                    FormatResponse: { success: true },
                    Output: { response: {} }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("caching behavior", () => {
        it("should cache successful responses", async () => {
            const workflow = createAPIOrchestrationWorkflow();
            let cachePayload: JsonObject | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { request: { userId: "user-cache" } } },
                    ValidateRequest: { customOutput: { valid: true } },
                    RejectRequest: { customOutput: { skipped: true } },
                    FetchUserData: {
                        customOutput: { statusCode: 200, body: { id: "user-cache" } }
                    },
                    FetchOrders: { customOutput: { statusCode: 200, body: { orders: [] } } },
                    FetchPreferences: { customOutput: { statusCode: 200, body: {} } },
                    MergeData: { customOutput: { merged: true } },
                    EnrichData: { customOutput: { enriched: true } },
                    CacheResponse: {
                        customOutput: { success: true, key: "user_profile_user-cache", ttl: 300 },
                        onExecute: (input) => {
                            cachePayload = input.nodeConfig;
                        }
                    },
                    FormatResponse: { customOutput: { success: true } },
                    Output: { customOutput: { response: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(failedNodes).toHaveLength(0);
            expect(cachePayload).toBeDefined();
        });
    });
});
