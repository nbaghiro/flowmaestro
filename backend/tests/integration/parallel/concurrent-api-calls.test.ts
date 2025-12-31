/**
 * Concurrent API Calls Integration Tests
 *
 * Tests for parallel API call execution patterns:
 * - Multiple HTTP calls in parallel
 * - Multiple LLM calls in parallel (different prompts)
 * - Mixed node types in parallel (HTTP + LLM + transform)
 * - Respect maxConcurrentNodes limit
 * - Rate limiting and throttling
 */

import type { WorkflowDefinition } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted
} from "../../../src/temporal/core/services/context";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";
import type { JsonObject, JsonValue } from "../../../src/temporal/core/types";

// ============================================================================
// HELPER TYPES
// ============================================================================

interface ApiCallResult {
    nodeId: string;
    nodeType: string;
    startTime: number;
    endTime: number;
    duration: number;
    output: JsonObject;
}

interface ConcurrentExecutionStats {
    totalCalls: number;
    maxConcurrent: number;
    totalDuration: number;
    averageCallDuration: number;
    callResults: ApiCallResult[];
}

type NodeType = "http" | "llm" | "transform" | "database";

interface MockApiConfig {
    nodeId: string;
    nodeType: NodeType;
    delay: number;
    response: JsonObject;
    shouldFail?: boolean;
    errorMessage?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a workflow with multiple parallel API nodes
 */
function createParallelApiWorkflow(apiConfigs: MockApiConfig[]): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: {},
        depth: 0,
        dependencies: [],
        dependents: apiConfigs.map((c) => c.nodeId)
    });

    // API nodes
    for (const config of apiConfigs) {
        nodes.set(config.nodeId, {
            id: config.nodeId,
            type: config.nodeType,
            name: config.nodeId,
            config: {
                delay: config.delay,
                mockResponse: config.response
            },
            depth: 1,
            dependencies: ["Input"],
            dependents: ["Merge"]
        });

        edges.set(`Input-${config.nodeId}`, {
            id: `Input-${config.nodeId}`,
            source: "Input",
            target: config.nodeId,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        edges.set(`${config.nodeId}-Merge`, {
            id: `${config.nodeId}-Merge`,
            source: config.nodeId,
            target: "Merge",
            sourceHandle: "output",
            targetHandle: config.nodeId,
            handleType: "default"
        });
    }

    // Merge node
    nodes.set("Merge", {
        id: "Merge",
        type: "transform",
        name: "Merge",
        config: { operation: "merge" },
        depth: 2,
        dependencies: apiConfigs.map((c) => c.nodeId),
        dependents: ["Output"]
    });

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: {},
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
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], apiConfigs.map((c) => c.nodeId), ["Merge"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate concurrent API execution
 */
async function simulateConcurrentApiCalls(
    apiConfigs: MockApiConfig[],
    maxConcurrent: number = 10
): Promise<ConcurrentExecutionStats> {
    const workflow = createParallelApiWorkflow(apiConfigs);
    let context = createContext({});
    let queue = initializeQueue(workflow);

    const callResults: ApiCallResult[] = [];
    let currentConcurrent = 0;
    let maxConcurrentObserved = 0;
    const executionStart = Date.now();

    // Execute Input
    queue = markExecuting(queue, ["Input"]);
    context = storeNodeOutput(context, "Input", { initialized: true });
    queue = markCompleted(queue, "Input", { initialized: true }, workflow);

    // Get ready API nodes
    let readyNodes = getReadyNodes(queue, maxConcurrent);
    const apiNodeIds = apiConfigs.map((c) => c.nodeId);

    // Batch execution respecting maxConcurrent
    while (readyNodes.some((n) => apiNodeIds.includes(n))) {
        const batch = readyNodes
            .filter((n) => apiNodeIds.includes(n))
            .slice(0, maxConcurrent - currentConcurrent);

        if (batch.length === 0) break;

        queue = markExecuting(queue, batch);
        currentConcurrent += batch.length;
        maxConcurrentObserved = Math.max(maxConcurrentObserved, currentConcurrent);

        // Execute batch in parallel
        const batchPromises = batch.map(async (nodeId) => {
            const config = apiConfigs.find((c) => c.nodeId === nodeId)!;
            const startTime = Date.now();

            // Simulate API delay
            await new Promise((resolve) => setTimeout(resolve, config.delay));

            const endTime = Date.now();

            let output: JsonObject;
            if (config.shouldFail) {
                output = {
                    error: true,
                    message: config.errorMessage || "API call failed"
                };
            } else {
                output = config.response as JsonObject;
            }

            return {
                nodeId,
                nodeType: config.nodeType,
                startTime,
                endTime,
                duration: endTime - startTime,
                output
            };
        });

        const batchResults = await Promise.all(batchPromises);

        for (const result of batchResults) {
            callResults.push(result);
            context = storeNodeOutput(context, result.nodeId, result.output);
            queue = markCompleted(queue, result.nodeId, result.output, workflow);
            currentConcurrent--;
        }

        readyNodes = getReadyNodes(queue, maxConcurrent);
    }

    // Execute Merge
    if (getReadyNodes(queue, maxConcurrent).includes("Merge")) {
        queue = markExecuting(queue, ["Merge"]);
        const mergedOutput: JsonObject = {
            merged: true,
            results: callResults.map((r) => ({ nodeId: r.nodeId, output: r.output })) as JsonValue
        };
        context = storeNodeOutput(context, "Merge", mergedOutput);
        queue = markCompleted(queue, "Merge", mergedOutput, workflow);
    }

    // Execute Output
    if (getReadyNodes(queue, maxConcurrent).includes("Output")) {
        queue = markExecuting(queue, ["Output"]);
        context = storeNodeOutput(context, "Output", { completed: true });
        queue = markCompleted(queue, "Output", { completed: true }, workflow);
    }

    const totalDuration = Date.now() - executionStart;
    const averageCallDuration =
        callResults.reduce((sum, r) => sum + r.duration, 0) / callResults.length;

    return {
        totalCalls: callResults.length,
        maxConcurrent: maxConcurrentObserved,
        totalDuration,
        averageCallDuration,
        callResults
    };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Concurrent API Calls", () => {
    describe("multiple HTTP calls in parallel", () => {
        it("should execute multiple HTTP calls concurrently", async () => {
            const configs: MockApiConfig[] = [
                {
                    nodeId: "Http1",
                    nodeType: "http",
                    delay: 30,
                    response: { endpoint: "/api/1", data: "response1" }
                },
                {
                    nodeId: "Http2",
                    nodeType: "http",
                    delay: 30,
                    response: { endpoint: "/api/2", data: "response2" }
                },
                {
                    nodeId: "Http3",
                    nodeType: "http",
                    delay: 30,
                    response: { endpoint: "/api/3", data: "response3" }
                }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            expect(stats.totalCalls).toBe(3);
            expect(stats.maxConcurrent).toBe(3);
            // Total should be around 30-50ms if parallel, not 90ms+ if sequential
            expect(stats.totalDuration).toBeLessThan(80);
        });

        it("should collect responses from all HTTP calls", async () => {
            const configs: MockApiConfig[] = [
                {
                    nodeId: "GetUser",
                    nodeType: "http",
                    delay: 10,
                    response: { user: { id: 1, name: "Alice" } }
                },
                {
                    nodeId: "GetOrders",
                    nodeType: "http",
                    delay: 10,
                    response: { orders: [{ id: 101 }, { id: 102 }] }
                },
                {
                    nodeId: "GetSettings",
                    nodeType: "http",
                    delay: 10,
                    response: { settings: { theme: "dark" } }
                }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            const userResult = stats.callResults.find((r) => r.nodeId === "GetUser");
            const ordersResult = stats.callResults.find((r) => r.nodeId === "GetOrders");
            const settingsResult = stats.callResults.find((r) => r.nodeId === "GetSettings");

            expect(userResult?.output).toEqual({ user: { id: 1, name: "Alice" } });
            expect(ordersResult?.output).toEqual({ orders: [{ id: 101 }, { id: 102 }] });
            expect(settingsResult?.output).toEqual({ settings: { theme: "dark" } });
        });

        it("should handle HTTP calls with different response times", async () => {
            const configs: MockApiConfig[] = [
                { nodeId: "Fast", nodeType: "http", delay: 10, response: { speed: "fast" } },
                { nodeId: "Medium", nodeType: "http", delay: 30, response: { speed: "medium" } },
                { nodeId: "Slow", nodeType: "http", delay: 50, response: { speed: "slow" } }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            // All should complete, slowest determines total time
            expect(stats.totalCalls).toBe(3);
            expect(stats.callResults.find((r) => r.nodeId === "Fast")?.duration).toBeLessThan(20);
            expect(
                stats.callResults.find((r) => r.nodeId === "Slow")?.duration
            ).toBeGreaterThanOrEqual(45);
        });
    });

    describe("multiple LLM calls in parallel", () => {
        it("should execute multiple LLM calls with different prompts", async () => {
            const configs: MockApiConfig[] = [
                {
                    nodeId: "LLM1",
                    nodeType: "llm",
                    delay: 40,
                    response: {
                        model: "gpt-4",
                        prompt: "Summarize the document",
                        completion: "This is a summary..."
                    }
                },
                {
                    nodeId: "LLM2",
                    nodeType: "llm",
                    delay: 40,
                    response: {
                        model: "gpt-4",
                        prompt: "Extract key points",
                        completion: "Key points: 1, 2, 3..."
                    }
                },
                {
                    nodeId: "LLM3",
                    nodeType: "llm",
                    delay: 40,
                    response: {
                        model: "gpt-4",
                        prompt: "Generate questions",
                        completion: "Question 1? Question 2?"
                    }
                }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            expect(stats.totalCalls).toBe(3);
            expect(stats.maxConcurrent).toBe(3);

            const llm1 = stats.callResults.find((r) => r.nodeId === "LLM1");
            expect(llm1?.output).toHaveProperty("completion");
        });

        it("should handle different LLM models in parallel", async () => {
            const configs: MockApiConfig[] = [
                {
                    nodeId: "OpenAI",
                    nodeType: "llm",
                    delay: 30,
                    response: { provider: "openai", model: "gpt-4", tokens: 150 }
                },
                {
                    nodeId: "Anthropic",
                    nodeType: "llm",
                    delay: 35,
                    response: { provider: "anthropic", model: "claude-3", tokens: 200 }
                },
                {
                    nodeId: "Google",
                    nodeType: "llm",
                    delay: 25,
                    response: { provider: "google", model: "gemini-pro", tokens: 175 }
                }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            expect(stats.totalCalls).toBe(3);

            const providers = stats.callResults.map(
                (r) => (r.output as { provider: string }).provider
            );
            expect(providers.sort()).toEqual(["anthropic", "google", "openai"]);
        });
    });

    describe("mixed node types in parallel", () => {
        it("should execute HTTP, LLM, and transform nodes concurrently", async () => {
            const configs: MockApiConfig[] = [
                {
                    nodeId: "FetchData",
                    nodeType: "http",
                    delay: 20,
                    response: { type: "http", data: [1, 2, 3] }
                },
                {
                    nodeId: "GenerateText",
                    nodeType: "llm",
                    delay: 30,
                    response: { type: "llm", text: "Generated content" }
                },
                {
                    nodeId: "ProcessLocal",
                    nodeType: "transform",
                    delay: 10,
                    response: { type: "transform", computed: 42 }
                }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            expect(stats.totalCalls).toBe(3);

            const types = stats.callResults.map((r) => r.nodeType);
            expect(types).toContain("http");
            expect(types).toContain("llm");
            expect(types).toContain("transform");
        });

        it("should handle database and API calls in parallel", async () => {
            const configs: MockApiConfig[] = [
                {
                    nodeId: "DbQuery",
                    nodeType: "database",
                    delay: 15,
                    response: { source: "database", rows: 100 }
                },
                {
                    nodeId: "ApiEnrich",
                    nodeType: "http",
                    delay: 25,
                    response: { source: "api", enriched: true }
                },
                {
                    nodeId: "LlmProcess",
                    nodeType: "llm",
                    delay: 35,
                    response: { source: "llm", processed: true }
                }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            expect(stats.totalCalls).toBe(3);

            // Verify all completed successfully
            for (const result of stats.callResults) {
                expect(result.output).toHaveProperty("source");
            }
        });
    });

    describe("maxConcurrentNodes limit", () => {
        it("should respect maxConcurrentNodes = 1 (sequential)", async () => {
            const configs: MockApiConfig[] = [
                { nodeId: "Node1", nodeType: "http", delay: 20, response: { n: 1 } },
                { nodeId: "Node2", nodeType: "http", delay: 20, response: { n: 2 } },
                { nodeId: "Node3", nodeType: "http", delay: 20, response: { n: 3 } }
            ];

            const stats = await simulateConcurrentApiCalls(configs, 1);

            expect(stats.maxConcurrent).toBe(1);
            // Sequential: ~60ms minimum (3 * 20ms)
            expect(stats.totalDuration).toBeGreaterThanOrEqual(55);
        });

        it("should respect maxConcurrentNodes = 2", async () => {
            const configs: MockApiConfig[] = [
                { nodeId: "Node1", nodeType: "http", delay: 25, response: { n: 1 } },
                { nodeId: "Node2", nodeType: "http", delay: 25, response: { n: 2 } },
                { nodeId: "Node3", nodeType: "http", delay: 25, response: { n: 3 } },
                { nodeId: "Node4", nodeType: "http", delay: 25, response: { n: 4 } }
            ];

            const stats = await simulateConcurrentApiCalls(configs, 2);

            expect(stats.maxConcurrent).toBe(2);
            // 2 batches of 2: ~50ms minimum
            expect(stats.totalDuration).toBeGreaterThanOrEqual(45);
        });

        it("should allow all nodes when maxConcurrent >= node count", async () => {
            const configs: MockApiConfig[] = [
                { nodeId: "Node1", nodeType: "http", delay: 20, response: { n: 1 } },
                { nodeId: "Node2", nodeType: "http", delay: 20, response: { n: 2 } },
                { nodeId: "Node3", nodeType: "http", delay: 20, response: { n: 3 } }
            ];

            const stats = await simulateConcurrentApiCalls(configs, 10);

            expect(stats.maxConcurrent).toBe(3);
            // All parallel: ~20-40ms
            expect(stats.totalDuration).toBeLessThan(60);
        });

        it("should batch execution when nodes exceed limit", async () => {
            const configs: MockApiConfig[] = Array.from({ length: 6 }, (_, i) => ({
                nodeId: `Node${i + 1}`,
                nodeType: "http" as NodeType,
                delay: 20,
                response: { index: i }
            }));

            const stats = await simulateConcurrentApiCalls(configs, 3);

            expect(stats.maxConcurrent).toBe(3);
            expect(stats.totalCalls).toBe(6);
            // 2 batches of 3: ~40ms minimum
            expect(stats.totalDuration).toBeGreaterThanOrEqual(35);
        });
    });

    describe("rate limiting simulation", () => {
        it("should handle simulated rate limit responses", async () => {
            const configs: MockApiConfig[] = [
                { nodeId: "Call1", nodeType: "http", delay: 10, response: { success: true } },
                {
                    nodeId: "Call2",
                    nodeType: "http",
                    delay: 10,
                    shouldFail: true,
                    response: {},
                    errorMessage: "Rate limit exceeded"
                },
                { nodeId: "Call3", nodeType: "http", delay: 10, response: { success: true } }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            const rateLimited = stats.callResults.find((r) => r.nodeId === "Call2");
            expect(rateLimited?.output).toEqual({
                error: true,
                message: "Rate limit exceeded"
            });

            const successful = stats.callResults.filter(
                (r) => !(r.output as { error?: boolean }).error
            );
            expect(successful).toHaveLength(2);
        });

        it("should simulate throttled execution", async () => {
            // Simulate API that allows 2 calls per "window"
            const configs: MockApiConfig[] = Array.from({ length: 4 }, (_, i) => ({
                nodeId: `ThrottledCall${i + 1}`,
                nodeType: "http" as NodeType,
                delay: 15,
                response: { callIndex: i }
            }));

            const stats = await simulateConcurrentApiCalls(configs, 2);

            expect(stats.maxConcurrent).toBe(2);
            expect(stats.totalCalls).toBe(4);
        });
    });

    describe("timing and performance", () => {
        it("should complete faster with parallel execution", async () => {
            const delay = 30;
            const nodeCount = 5;

            const configs: MockApiConfig[] = Array.from({ length: nodeCount }, (_, i) => ({
                nodeId: `Parallel${i}`,
                nodeType: "http" as NodeType,
                delay,
                response: { i }
            }));

            // Parallel execution
            const parallelStats = await simulateConcurrentApiCalls(configs, nodeCount);

            // Sequential simulation
            const sequentialStats = await simulateConcurrentApiCalls(configs, 1);

            // Parallel should be significantly faster
            expect(parallelStats.totalDuration).toBeLessThan(sequentialStats.totalDuration);
        });

        it("should track individual call durations", async () => {
            const configs: MockApiConfig[] = [
                { nodeId: "Short", nodeType: "http", delay: 10, response: {} },
                { nodeId: "Medium", nodeType: "http", delay: 30, response: {} },
                { nodeId: "Long", nodeType: "http", delay: 50, response: {} }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            const shortCall = stats.callResults.find((r) => r.nodeId === "Short");
            const longCall = stats.callResults.find((r) => r.nodeId === "Long");

            expect(shortCall?.duration).toBeLessThan(20);
            expect(longCall?.duration).toBeGreaterThanOrEqual(45);
        });

        it("should calculate average call duration", async () => {
            const configs: MockApiConfig[] = [
                { nodeId: "Call1", nodeType: "http", delay: 20, response: {} },
                { nodeId: "Call2", nodeType: "http", delay: 30, response: {} },
                { nodeId: "Call3", nodeType: "http", delay: 40, response: {} }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            // Average should be around 30ms (+/- overhead)
            expect(stats.averageCallDuration).toBeGreaterThan(25);
            expect(stats.averageCallDuration).toBeLessThan(45);
        });
    });

    describe("error handling in concurrent calls", () => {
        it("should continue other calls when one fails", async () => {
            const configs: MockApiConfig[] = [
                { nodeId: "Success1", nodeType: "http", delay: 10, response: { ok: true } },
                {
                    nodeId: "Failure",
                    nodeType: "http",
                    delay: 10,
                    shouldFail: true,
                    response: {},
                    errorMessage: "Connection timeout"
                },
                { nodeId: "Success2", nodeType: "http", delay: 10, response: { ok: true } }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            expect(stats.totalCalls).toBe(3);

            const successes = stats.callResults.filter((r) => (r.output as { ok?: boolean }).ok);
            const failures = stats.callResults.filter(
                (r) => (r.output as { error?: boolean }).error
            );

            expect(successes).toHaveLength(2);
            expect(failures).toHaveLength(1);
        });

        it("should handle multiple failures in parallel", async () => {
            const configs: MockApiConfig[] = [
                {
                    nodeId: "Fail1",
                    nodeType: "http",
                    delay: 10,
                    shouldFail: true,
                    response: {},
                    errorMessage: "Error 1"
                },
                {
                    nodeId: "Fail2",
                    nodeType: "http",
                    delay: 15,
                    shouldFail: true,
                    response: {},
                    errorMessage: "Error 2"
                },
                { nodeId: "Success", nodeType: "http", delay: 10, response: { survived: true } }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            const failures = stats.callResults.filter(
                (r) => (r.output as { error?: boolean }).error
            );
            expect(failures).toHaveLength(2);
        });

        it("should preserve error details for each failed call", async () => {
            const configs: MockApiConfig[] = [
                {
                    nodeId: "Timeout",
                    nodeType: "http",
                    delay: 10,
                    shouldFail: true,
                    response: {},
                    errorMessage: "Request timeout"
                },
                {
                    nodeId: "NotFound",
                    nodeType: "http",
                    delay: 10,
                    shouldFail: true,
                    response: {},
                    errorMessage: "Resource not found"
                }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            const timeout = stats.callResults.find((r) => r.nodeId === "Timeout");
            const notFound = stats.callResults.find((r) => r.nodeId === "NotFound");

            expect((timeout?.output as { message: string }).message).toBe("Request timeout");
            expect((notFound?.output as { message: string }).message).toBe("Resource not found");
        });
    });

    describe("real-world API patterns", () => {
        it("should handle fan-out API calls for data enrichment", async () => {
            // Simulate fetching user data from multiple sources
            const configs: MockApiConfig[] = [
                {
                    nodeId: "UserProfile",
                    nodeType: "http",
                    delay: 20,
                    response: { name: "Alice", email: "alice@test.com" }
                },
                {
                    nodeId: "UserOrders",
                    nodeType: "http",
                    delay: 25,
                    response: { orders: [{ id: 1 }, { id: 2 }], total: 2 }
                },
                {
                    nodeId: "UserPreferences",
                    nodeType: "http",
                    delay: 15,
                    response: { theme: "dark", notifications: true }
                },
                {
                    nodeId: "UserActivity",
                    nodeType: "http",
                    delay: 30,
                    response: { lastLogin: "2024-01-15", sessions: 42 }
                }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            expect(stats.totalCalls).toBe(4);
            expect(stats.maxConcurrent).toBe(4);

            // All data should be available for merge
            const profile = stats.callResults.find((r) => r.nodeId === "UserProfile");
            const orders = stats.callResults.find((r) => r.nodeId === "UserOrders");

            expect(profile?.output).toHaveProperty("name");
            expect(orders?.output).toHaveProperty("orders");
        });

        it("should handle multi-provider LLM comparison", async () => {
            // Simulate same prompt to multiple LLM providers
            const configs: MockApiConfig[] = [
                {
                    nodeId: "OpenAI",
                    nodeType: "llm",
                    delay: 40,
                    response: {
                        provider: "openai",
                        response: "OpenAI response",
                        tokens: 50,
                        cost: 0.002
                    }
                },
                {
                    nodeId: "Anthropic",
                    nodeType: "llm",
                    delay: 35,
                    response: {
                        provider: "anthropic",
                        response: "Anthropic response",
                        tokens: 45,
                        cost: 0.0015
                    }
                },
                {
                    nodeId: "Google",
                    nodeType: "llm",
                    delay: 45,
                    response: {
                        provider: "google",
                        response: "Google response",
                        tokens: 55,
                        cost: 0.001
                    }
                }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            // All providers should respond
            expect(stats.totalCalls).toBe(3);

            // Calculate total cost
            const totalCost = stats.callResults.reduce(
                (sum, r) => sum + ((r.output as { cost: number }).cost || 0),
                0
            );
            expect(totalCost).toBeCloseTo(0.0045, 4);
        });

        it("should handle webhook fan-out", async () => {
            // Simulate sending webhooks to multiple endpoints
            const webhookEndpoints = [
                "https://hook1.example.com/notify",
                "https://hook2.example.com/notify",
                "https://hook3.example.com/notify"
            ];

            const configs: MockApiConfig[] = webhookEndpoints.map((url, i) => ({
                nodeId: `Webhook${i + 1}`,
                nodeType: "http" as NodeType,
                delay: 15 + i * 5,
                response: { delivered: true, endpoint: url, timestamp: Date.now() }
            }));

            const stats = await simulateConcurrentApiCalls(configs);

            expect(stats.totalCalls).toBe(3);

            const deliveredCount = stats.callResults.filter(
                (r) => (r.output as { delivered: boolean }).delivered
            ).length;
            expect(deliveredCount).toBe(3);
        });
    });

    describe("edge cases", () => {
        it("should handle single API call (degenerate parallel)", async () => {
            const configs: MockApiConfig[] = [
                { nodeId: "Single", nodeType: "http", delay: 20, response: { single: true } }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            expect(stats.totalCalls).toBe(1);
            expect(stats.maxConcurrent).toBe(1);
        });

        it("should handle many concurrent calls", async () => {
            const configs: MockApiConfig[] = Array.from({ length: 20 }, (_, i) => ({
                nodeId: `MassCall${i}`,
                nodeType: "http" as NodeType,
                delay: 10,
                response: { index: i }
            }));

            const stats = await simulateConcurrentApiCalls(configs, 20);

            expect(stats.totalCalls).toBe(20);
            expect(stats.maxConcurrent).toBe(20);
        });

        it("should handle zero-delay calls", async () => {
            const configs: MockApiConfig[] = [
                {
                    nodeId: "Instant1",
                    nodeType: "transform",
                    delay: 0,
                    response: { instant: true }
                },
                {
                    nodeId: "Instant2",
                    nodeType: "transform",
                    delay: 0,
                    response: { instant: true }
                },
                { nodeId: "Instant3", nodeType: "transform", delay: 0, response: { instant: true } }
            ];

            const stats = await simulateConcurrentApiCalls(configs);

            expect(stats.totalCalls).toBe(3);
            expect(stats.totalDuration).toBeLessThan(50);
        });
    });
});
