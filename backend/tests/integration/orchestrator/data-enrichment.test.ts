/**
 * Data Enrichment Orchestration Tests
 *
 * Tests API fetch -> transform -> output patterns:
 * - Fetching external data via HTTP
 * - Transforming and extracting data
 * - Multiple enrichment sources
 * - Error handling for failed fetches
 * - Caching and deduplication patterns
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
 * Create a data enrichment workflow
 * Input -> HTTP (fetch) -> Transform (extract) -> Output
 */
function createEnrichmentWorkflow(enrichmentSteps: number = 1): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const executionLevels: string[][] = [];

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "entityId" },
        depth: 0,
        dependencies: [],
        dependents: ["HTTP1"]
    });
    executionLevels.push(["Input"]);

    // Create HTTP -> Transform pairs for each enrichment step
    for (let i = 1; i <= enrichmentSteps; i++) {
        const httpId = `HTTP${i}`;
        const transformId = `Transform${i}`;
        const prevNode = i === 1 ? "Input" : `Transform${i - 1}`;
        const nextNode = i === enrichmentSteps ? "Output" : `HTTP${i + 1}`;

        // HTTP node
        nodes.set(httpId, {
            id: httpId,
            type: "http",
            name: `Fetch ${i}`,
            config: {
                method: "GET",
                url: `https://api.example.com/enrich/${i}/{{${prevNode}.id || ${prevNode}.entityId}}`,
                headers: { Authorization: "Bearer token" }
            },
            depth: i * 2 - 1,
            dependencies: [prevNode],
            dependents: [transformId]
        });

        edges.set(`${prevNode}-${httpId}`, {
            id: `${prevNode}-${httpId}`,
            source: prevNode,
            target: httpId,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        executionLevels.push([httpId]);

        // Transform node
        nodes.set(transformId, {
            id: transformId,
            type: "transform",
            name: `Extract ${i}`,
            config: {
                operation: "extract",
                path: "data",
                outputVariable: "enrichedData"
            },
            depth: i * 2,
            dependencies: [httpId],
            dependents: [nextNode]
        });

        edges.set(`${httpId}-${transformId}`, {
            id: `${httpId}-${transformId}`,
            source: httpId,
            target: transformId,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        executionLevels.push([transformId]);
    }

    // Output node
    const lastTransform = `Transform${enrichmentSteps}`;
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "enrichedEntity" },
        depth: enrichmentSteps * 2 + 1,
        dependencies: [lastTransform],
        dependents: []
    });

    edges.set(`${lastTransform}-Output`, {
        id: `${lastTransform}-Output`,
        source: lastTransform,
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
 * Create a parallel enrichment workflow
 * Input -> [HTTP_A, HTTP_B, HTTP_C] -> Merge -> Output
 */
function createParallelEnrichmentWorkflow(
    sources: Array<{ id: string; url: string }>
): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const sourceIds = sources.map((s) => s.id);

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "entityId" },
        depth: 0,
        dependencies: [],
        dependents: sourceIds
    });

    // Parallel HTTP nodes
    for (const source of sources) {
        nodes.set(source.id, {
            id: source.id,
            type: "http",
            name: source.id,
            config: {
                method: "GET",
                url: source.url,
                headers: { Accept: "application/json" }
            },
            depth: 1,
            dependencies: ["Input"],
            dependents: ["Merge"]
        });

        edges.set(`Input-${source.id}`, {
            id: `Input-${source.id}`,
            source: "Input",
            target: source.id,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Merge node
    nodes.set("Merge", {
        id: "Merge",
        type: "transform",
        name: "Merge",
        config: {
            operation: "merge",
            sources: sourceIds
        },
        depth: 2,
        dependencies: sourceIds,
        dependents: ["Output"]
    });

    for (const sourceId of sourceIds) {
        edges.set(`${sourceId}-Merge`, {
            id: `${sourceId}-Merge`,
            source: sourceId,
            target: "Merge",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "enrichedEntity" },
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
        executionLevels: [["Input"], sourceIds, ["Merge"], ["Output"]],
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
}> {
    let context = createContext(inputs);
    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];

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
                    queueState = markFailed(
                        queueState,
                        nodeId,
                        result.error || "Unknown error",
                        workflow
                    );
                }
            } catch (error) {
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
        executionOrder
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Data Enrichment Orchestration", () => {
    beforeEach(() => {
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("sequential enrichment", () => {
        it("should execute single HTTP fetch and transform", async () => {
            const workflow = createEnrichmentWorkflow(1);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { entityId: "user-123" },
                    HTTP1: {
                        statusCode: 200,
                        body: { data: { name: "John Doe", email: "john@example.com" } }
                    },
                    Transform1: { enrichedData: { name: "John Doe", email: "john@example.com" } },
                    Output: { enrichedEntity: { name: "John Doe", email: "john@example.com" } }
                })
            );

            const { executionOrder, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { entityId: "user-123" }
            );

            expect(executionOrder).toEqual(["Input", "HTTP1", "Transform1", "Output"]);
            expect(finalOutputs.enrichedEntity).toBeDefined();
        });

        it("should execute multi-step enrichment pipeline", async () => {
            const workflow = createEnrichmentWorkflow(3);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { entityId: "company-456" },
                    HTTP1: {
                        statusCode: 200,
                        body: { data: { id: "company-456", name: "Acme Inc" } }
                    },
                    Transform1: { id: "company-456", name: "Acme Inc" },
                    HTTP2: { statusCode: 200, body: { data: { employees: 500, revenue: "10M" } } },
                    Transform2: {
                        id: "company-456",
                        name: "Acme Inc",
                        employees: 500,
                        revenue: "10M"
                    },
                    HTTP3: {
                        statusCode: 200,
                        body: { data: { industry: "Technology", founded: 2010 } }
                    },
                    Transform3: {
                        id: "company-456",
                        name: "Acme Inc",
                        employees: 500,
                        industry: "Technology"
                    },
                    Output: { enrichedEntity: { complete: true } }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities, {
                entityId: "company-456"
            });

            expect(executionOrder).toEqual([
                "Input",
                "HTTP1",
                "Transform1",
                "HTTP2",
                "Transform2",
                "HTTP3",
                "Transform3",
                "Output"
            ]);
        });

        it("should pass data between enrichment steps", async () => {
            const workflow = createEnrichmentWorkflow(2);
            const capturedContexts: JsonObject[] = [];

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { entityId: "lead-789" } },
                    HTTP1: {
                        customOutput: {
                            statusCode: 200,
                            body: { data: { email: "lead@company.com" } }
                        }
                    },
                    Transform1: {
                        customOutput: { email: "lead@company.com" },
                        onExecute: (input) => {
                            capturedContexts.push(getExecutionContext(input.context));
                        }
                    },
                    HTTP2: {
                        customOutput: {
                            statusCode: 200,
                            body: { data: { company: "Big Corp", size: "Enterprise" } }
                        }
                    },
                    Transform2: {
                        customOutput: { email: "lead@company.com", company: "Big Corp" },
                        onExecute: (input) => {
                            capturedContexts.push(getExecutionContext(input.context));
                        }
                    },
                    Output: { customOutput: { enrichedEntity: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities, { entityId: "lead-789" });

            // First transform should see HTTP1 output
            expect(capturedContexts[0].HTTP1).toBeDefined();
            // Second transform should see both HTTP outputs
            expect(capturedContexts[1].HTTP1).toBeDefined();
            expect(capturedContexts[1].Transform1).toBeDefined();
            expect(capturedContexts[1].HTTP2).toBeDefined();
        });
    });

    describe("parallel enrichment", () => {
        it("should fetch from multiple sources in parallel", async () => {
            const workflow = createParallelEnrichmentWorkflow([
                { id: "CRM", url: "https://crm.example.com/api/entity" },
                { id: "ERP", url: "https://erp.example.com/api/entity" },
                { id: "Analytics", url: "https://analytics.example.com/api/entity" }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { entityId: "customer-001" },
                    CRM: { statusCode: 200, body: { source: "crm", data: { name: "Customer A" } } },
                    ERP: { statusCode: 200, body: { source: "erp", data: { orders: 15 } } },
                    Analytics: {
                        statusCode: 200,
                        body: { source: "analytics", data: { visits: 1000 } }
                    },
                    Merge: {
                        crm: { name: "Customer A" },
                        erp: { orders: 15 },
                        analytics: { visits: 1000 }
                    },
                    Output: { enrichedEntity: { merged: true } }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities, {
                entityId: "customer-001"
            });

            // Input first, then parallel sources (in any order), then Merge, then Output
            expect(executionOrder[0]).toBe("Input");
            expect(executionOrder).toContain("CRM");
            expect(executionOrder).toContain("ERP");
            expect(executionOrder).toContain("Analytics");
            expect(executionOrder[executionOrder.length - 2]).toBe("Merge");
            expect(executionOrder[executionOrder.length - 1]).toBe("Output");
        });

        it("should merge data from multiple sources", async () => {
            const workflow = createParallelEnrichmentWorkflow([
                { id: "Source_A", url: "https://a.example.com/api" },
                { id: "Source_B", url: "https://b.example.com/api" }
            ]);

            let mergedData: JsonObject = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { entityId: "test-entity" } },
                    Source_A: {
                        customOutput: { statusCode: 200, body: { field_a: "value_a" } }
                    },
                    Source_B: {
                        customOutput: { statusCode: 200, body: { field_b: "value_b" } }
                    },
                    Merge: {
                        customOutput: { merged: { field_a: "value_a", field_b: "value_b" } },
                        onExecute: (input) => {
                            mergedData = getExecutionContext(input.context);
                        }
                    },
                    Output: { customOutput: { enrichedEntity: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // Merge should have access to both source outputs
            expect(mergedData.Source_A).toBeDefined();
            expect(mergedData.Source_B).toBeDefined();
        });
    });

    describe("error handling", () => {
        it("should handle HTTP fetch failure", async () => {
            const workflow = createEnrichmentWorkflow(1);
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { entityId: "bad-entity" } },
                    HTTP1: { shouldFail: true, errorMessage: "404 Not Found" },
                    Transform1: { customOutput: { data: "should not execute" } },
                    Output: { customOutput: { result: "should not execute" } }
                }
            });

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toContain("Input");
            expect(executionOrder).toContain("HTTP1");
            // Transform and Output should not execute due to HTTP failure
        });

        it("should handle partial failure in parallel enrichment", async () => {
            const workflow = createParallelEnrichmentWorkflow([
                { id: "Good_Source", url: "https://good.example.com" },
                { id: "Bad_Source", url: "https://bad.example.com" }
            ]);

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { entityId: "partial-test" } },
                    Good_Source: { customOutput: { statusCode: 200, body: { data: "success" } } },
                    Bad_Source: { shouldFail: true, errorMessage: "Service unavailable" },
                    Merge: { customOutput: { partial: true } },
                    Output: { customOutput: { enrichedEntity: {} } }
                }
            });

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            // Both sources should be attempted
            expect(executionOrder).toContain("Good_Source");
            expect(executionOrder).toContain("Bad_Source");
        });

        it("should handle transform failure", async () => {
            const workflow = createEnrichmentWorkflow(1);
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { entityId: "transform-fail" } },
                    HTTP1: { customOutput: { statusCode: 200, body: { data: { invalid: true } } } },
                    Transform1: { shouldFail: true, errorMessage: "Invalid data format" },
                    Output: { customOutput: { result: "should not execute" } }
                }
            });

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toContain("HTTP1");
            expect(executionOrder).toContain("Transform1");
            // Output should not execute due to transform failure
        });
    });

    describe("real-world scenarios", () => {
        it("should execute lead enrichment pipeline", async () => {
            // Simulate: Input email -> Clearbit -> LinkedIn -> Merge -> Score -> Output
            const workflow = createParallelEnrichmentWorkflow([
                { id: "Clearbit", url: "https://api.clearbit.com/enrich" },
                { id: "LinkedIn", url: "https://api.linkedin.com/lookup" }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { email: "john@company.com" },
                    Clearbit: {
                        statusCode: 200,
                        body: {
                            company: "Company Inc",
                            role: "Engineering Manager",
                            employees: "500-1000"
                        }
                    },
                    LinkedIn: {
                        statusCode: 200,
                        body: {
                            connections: 500,
                            experience: "10+ years",
                            skills: ["Leadership", "Engineering"]
                        }
                    },
                    Merge: {
                        company: "Company Inc",
                        role: "Engineering Manager",
                        connections: 500
                    },
                    Output: { enrichedEntity: { score: 85 } }
                })
            );

            const { executionOrder, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { email: "john@company.com" }
            );

            expect(executionOrder).toContain("Clearbit");
            expect(executionOrder).toContain("LinkedIn");
            expect(executionOrder).toContain("Merge");
            expect(finalOutputs.enrichedEntity).toBeDefined();
        });

        it("should execute product catalog enrichment", async () => {
            const workflow = createEnrichmentWorkflow(2);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { sku: "PROD-12345" },
                    HTTP1: {
                        statusCode: 200,
                        body: {
                            data: { name: "Widget Pro", price: 99.99, category: "Electronics" }
                        }
                    },
                    Transform1: { name: "Widget Pro", price: 99.99 },
                    HTTP2: {
                        statusCode: 200,
                        body: { data: { stock: 150, warehouse: "US-EAST", eta: "2 days" } }
                    },
                    Transform2: { name: "Widget Pro", price: 99.99, stock: 150, eta: "2 days" },
                    Output: { enrichedEntity: { complete: true } }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities, {
                sku: "PROD-12345"
            });

            expect(executionOrder).toEqual([
                "Input",
                "HTTP1",
                "Transform1",
                "HTTP2",
                "Transform2",
                "Output"
            ]);
        });
    });
});
