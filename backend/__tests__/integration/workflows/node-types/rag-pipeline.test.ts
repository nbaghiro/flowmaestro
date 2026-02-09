/**
 * RAG Pipeline Integration Tests
 *
 * True integration tests that execute RAG (Retrieval-Augmented Generation)
 * workflows through the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Knowledge base query and retrieval
 * - Context enhancement with retrieved documents
 * - LLM generation with augmented context
 * - Multi-source retrieval and merging
 * - Relevance scoring and filtering
 * - Citation tracking
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
 * Create a RAG workflow definition
 * Input -> Embed Query -> KB Search -> Rank/Filter -> Augment Context -> LLM -> Output
 */
function createRAGWorkflowDefinition(options: {
    topK?: number;
    minRelevanceScore?: number;
    sources?: string[];
}): WorkflowDefinition {
    const { topK = 5, minRelevanceScore = 0.7, sources = ["knowledge_base"] } = options;
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "User Query",
        config: { inputName: "query" },
        position: { x: 0, y: 0 }
    };

    nodes["embed_query"] = {
        type: "embeddings",
        name: "Embed Query",
        config: {
            provider: "openai",
            model: "text-embedding-3-small",
            inputField: "query"
        },
        position: { x: 200, y: 0 }
    };

    edges.push({
        id: "input-embed_query",
        source: "input",
        target: "embed_query",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["kb_search"] = {
        type: "knowledgeBaseQuery",
        name: "KB Search",
        config: {
            sources,
            topK,
            minScore: minRelevanceScore,
            includeMetadata: true
        },
        position: { x: 400, y: 0 }
    };

    edges.push({
        id: "embed_query-kb_search",
        source: "embed_query",
        target: "kb_search",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["rank_filter"] = {
        type: "transform",
        name: "Rank Filter",
        config: {
            operation: "filter_and_rank",
            minScore: minRelevanceScore,
            maxResults: topK
        },
        position: { x: 600, y: 0 }
    };

    edges.push({
        id: "kb_search-rank_filter",
        source: "kb_search",
        target: "rank_filter",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["augment_context"] = {
        type: "transform",
        name: "Augment Context",
        config: {
            operation: "build_context",
            template: "Based on the following information:\n\n{{documents}}\n\nAnswer: {{query}}"
        },
        position: { x: 800, y: 0 }
    };

    edges.push({
        id: "rank_filter-augment_context",
        source: "rank_filter",
        target: "augment_context",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["generate_response"] = {
        type: "llm",
        name: "Generate Response",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt:
                "You are a helpful assistant. Answer questions based on the provided context. " +
                "Always cite your sources using [Source: X] format.",
            prompt: "{{augment_context.augmentedPrompt}}"
        },
        position: { x: 1000, y: 0 }
    };

    edges.push({
        id: "augment_context-generate_response",
        source: "augment_context",
        target: "generate_response",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["extract_citations"] = {
        type: "transform",
        name: "Extract Citations",
        config: {
            operation: "extract_citations",
            pattern: "\\[Source: ([^\\]]+)\\]"
        },
        position: { x: 1200, y: 0 }
    };

    edges.push({
        id: "generate_response-extract_citations",
        source: "generate_response",
        target: "extract_citations",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 1400, y: 0 }
    };

    edges.push({
        id: "extract_citations-output",
        source: "extract_citations",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "RAG Pipeline",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a multi-source RAG workflow definition
 * Input -> [KB1 Search, KB2 Search, Web Search] -> Merge -> Dedupe -> LLM -> Output
 */
function createMultiSourceRAGDefinition(sources: string[]): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "User Query",
        config: { inputName: "query" },
        position: { x: 0, y: 100 }
    };

    // Parallel search nodes for each source
    sources.forEach((source, index) => {
        const nodeId = `search_${source}`;
        nodes[nodeId] = {
            type: "knowledgeBaseQuery",
            name: `Search ${source}`,
            config: {
                source,
                topK: 3,
                minScore: 0.6
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

    nodes["merge_results"] = {
        type: "transform",
        name: "Merge Results",
        config: {
            operation: "merge_arrays",
            inputs: sources.map((s) => `{{search_${s}.results}}`)
        },
        position: { x: 400, y: 100 }
    };

    for (const source of sources) {
        edges.push({
            id: `search_${source}-merge_results`,
            source: `search_${source}`,
            target: "merge_results",
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    nodes["deduplicate"] = {
        type: "transform",
        name: "Deduplicate",
        config: {
            operation: "deduplicate",
            keyField: "content",
            keepHighestScore: true
        },
        position: { x: 600, y: 100 }
    };

    edges.push({
        id: "merge_results-deduplicate",
        source: "merge_results",
        target: "deduplicate",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["generate_response"] = {
        type: "llm",
        name: "Generate Response",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Answer based on context: {{deduplicate.documents}}\n\nQuestion: {{input.query}}"
        },
        position: { x: 800, y: 100 }
    };

    edges.push({
        id: "deduplicate-generate_response",
        source: "deduplicate",
        target: "generate_response",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 1000, y: 100 }
    };

    edges.push({
        id: "generate_response-output",
        source: "generate_response",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Multi-Source RAG Pipeline",
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
            metrics: {
                durationMs: 100,
                tokenUsage:
                    params.nodeType === "llm"
                        ? { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
                        : undefined
            },
            success: true,
            output
        };
    });
}

// ============================================================================
// TEST DATA
// ============================================================================

const sampleKnowledgeBase = [
    {
        id: "doc1",
        content: "TypeScript is a strongly typed programming language that builds on JavaScript.",
        score: 0.95,
        metadata: { source: "typescript-docs", title: "TypeScript Overview" }
    },
    {
        id: "doc2",
        content: "React is a JavaScript library for building user interfaces.",
        score: 0.85,
        metadata: { source: "react-docs", title: "React Introduction" }
    },
    {
        id: "doc3",
        content: "Node.js is a JavaScript runtime built on Chrome's V8 engine.",
        score: 0.8,
        metadata: { source: "nodejs-docs", title: "Node.js About" }
    }
];

// ============================================================================
// TESTS
// ============================================================================

describe("RAG Pipeline Integration Tests", () => {
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
            workflowsPath: require.resolve("../../../src/temporal/workflows/workflow-orchestrator"),
            activities: mockActivities
        });
    });

    describe("basic retrieval and generation", () => {
        it("should retrieve relevant documents and generate response", async () => {
            const workflowDef = createRAGWorkflowDefinition({ topK: 3, minRelevanceScore: 0.7 });

            configureMockNodeOutputs({
                input: { query: "What is TypeScript?" },
                embed_query: { embedding: Array(1536).fill(0.1), model: "text-embedding-3-small" },
                kb_search: { results: sampleKnowledgeBase },
                rank_filter: { results: sampleKnowledgeBase.slice(0, 3) },
                augment_context: {
                    augmentedPrompt:
                        "Based on context:\n[1] TypeScript is...\n\nAnswer: What is TypeScript?"
                },
                generate_response: {
                    content: "TypeScript is a strongly typed language. [Source: typescript-docs]"
                },
                extract_citations: {
                    citations: [{ docId: "doc1", source: "typescript-docs" }]
                },
                output: { result: "TypeScript is a strongly typed language." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-rag-basic-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-rag-basic",
                            workflowDefinition: workflowDef,
                            inputs: { query: "What is TypeScript?" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();

            // Verify retrieval nodes were executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("kb_search");
            expect(nodeIds).toContain("generate_response");
        });

        it("should build augmented context from retrieved documents", async () => {
            const workflowDef = createRAGWorkflowDefinition({});

            configureMockNodeOutputs({
                input: { query: "Explain JavaScript tools" },
                embed_query: { embedding: Array(1536).fill(0.1) },
                kb_search: { results: sampleKnowledgeBase },
                rank_filter: { results: sampleKnowledgeBase },
                augment_context: {
                    augmentedPrompt: "Based on the following information:\n\n[1] TypeScript...",
                    documentCount: 3
                },
                generate_response: { content: "JavaScript has many tools..." },
                extract_citations: { citations: [] },
                output: { result: "JavaScript has many tools..." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-rag-context-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-rag-context",
                            workflowDefinition: workflowDef,
                            inputs: { query: "Explain JavaScript tools" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify augment_context was called
            const augmentCall = mockExecuteNode.mock.calls.find(
                (call) =>
                    (call[0] as ExecuteNodeParams).executionContext?.nodeId === "augment_context"
            );
            expect(augmentCall).toBeDefined();
        });
    });

    describe("citation tracking", () => {
        it("should extract citations from generated response", async () => {
            const workflowDef = createRAGWorkflowDefinition({});

            configureMockNodeOutputs({
                input: { query: "What is React?" },
                embed_query: { embedding: Array(1536).fill(0.1) },
                kb_search: { results: sampleKnowledgeBase },
                rank_filter: { results: sampleKnowledgeBase },
                augment_context: { augmentedPrompt: "Based on context..." },
                generate_response: {
                    content: "React is a UI library [Source: react-docs] that uses components."
                },
                extract_citations: {
                    citations: [{ docId: "doc2", source: "react-docs" }],
                    response: "React is a UI library [Source: react-docs] that uses components."
                },
                output: { result: "React is a UI library." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-rag-citations-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-rag-citations",
                            workflowDefinition: workflowDef,
                            inputs: { query: "What is React?" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify citation extraction was executed
            const citationCall = mockExecuteNode.mock.calls.find(
                (call) =>
                    (call[0] as ExecuteNodeParams).executionContext?.nodeId === "extract_citations"
            );
            expect(citationCall).toBeDefined();
        });

        it("should handle multiple different citations", async () => {
            const workflowDef = createRAGWorkflowDefinition({});

            configureMockNodeOutputs({
                input: { query: "Compare technologies" },
                embed_query: { embedding: Array(1536).fill(0.1) },
                kb_search: { results: sampleKnowledgeBase },
                rank_filter: { results: sampleKnowledgeBase },
                augment_context: { augmentedPrompt: "Based on context..." },
                generate_response: {
                    content:
                        "TypeScript [Source: typescript-docs] works with React [Source: react-docs] on Node.js [Source: nodejs-docs]."
                },
                extract_citations: {
                    citations: [
                        { docId: "doc1", source: "typescript-docs" },
                        { docId: "doc2", source: "react-docs" },
                        { docId: "doc3", source: "nodejs-docs" }
                    ]
                },
                output: { result: "Comparison complete." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-rag-multi-citation-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-rag-multi-citation",
                            workflowDefinition: workflowDef,
                            inputs: { query: "Compare technologies" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("multi-source retrieval", () => {
        it("should search multiple knowledge bases in parallel", async () => {
            const workflowDef = createMultiSourceRAGDefinition(["docs", "wiki", "forum"]);

            configureMockNodeOutputs({
                input: { query: "How do I use TypeScript?" },
                search_docs: { results: [{ content: "From docs...", score: 0.9 }] },
                search_wiki: { results: [{ content: "From wiki...", score: 0.85 }] },
                search_forum: { results: [{ content: "From forum...", score: 0.8 }] },
                merge_results: {
                    merged: [
                        { content: "From docs...", score: 0.9 },
                        { content: "From wiki...", score: 0.85 },
                        { content: "From forum...", score: 0.8 }
                    ]
                },
                deduplicate: { documents: [{ content: "From docs..." }] },
                generate_response: { content: "TypeScript usage guide..." },
                output: { result: "TypeScript usage guide..." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-rag-multi-source-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-rag-multi-source",
                            workflowDefinition: workflowDef,
                            inputs: { query: "How do I use TypeScript?" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify all search nodes were executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("search_docs");
            expect(nodeIds).toContain("search_wiki");
            expect(nodeIds).toContain("search_forum");
            expect(nodeIds).toContain("merge_results");
        });

        it("should deduplicate results from multiple sources", async () => {
            const workflowDef = createMultiSourceRAGDefinition(["docs", "wiki"]);

            configureMockNodeOutputs({
                input: { query: "TypeScript types" },
                search_docs: {
                    results: [{ id: "doc1", content: "TypeScript adds types", score: 0.9 }]
                },
                search_wiki: {
                    results: [{ id: "wiki1", content: "TypeScript adds types", score: 0.85 }]
                },
                merge_results: {
                    merged: [
                        { content: "TypeScript adds types", score: 0.9 },
                        { content: "TypeScript adds types", score: 0.85 }
                    ]
                },
                deduplicate: {
                    documents: [{ content: "TypeScript adds types", score: 0.9 }],
                    duplicatesRemoved: 1
                },
                generate_response: { content: "TypeScript provides static typing..." },
                output: { result: "TypeScript provides static typing..." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-rag-dedupe-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-rag-dedupe",
                            workflowDefinition: workflowDef,
                            inputs: { query: "TypeScript types" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const dedupeCall = mockExecuteNode.mock.calls.find(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId === "deduplicate"
            );
            expect(dedupeCall).toBeDefined();
        });
    });

    describe("error handling", () => {
        it("should handle KB search returning no results", async () => {
            const workflowDef = createRAGWorkflowDefinition({ minRelevanceScore: 0.99 });

            configureMockNodeOutputs({
                input: { query: "Obscure topic xyz" },
                embed_query: { embedding: Array(1536).fill(0.1) },
                kb_search: { results: [] },
                rank_filter: { results: [] },
                augment_context: {
                    augmentedPrompt: "No relevant documents found. Question: Obscure topic xyz"
                },
                generate_response: {
                    content: "I don't have information about that topic in my knowledge base."
                },
                extract_citations: { citations: [] },
                output: { result: "I don't have information about that topic." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-rag-no-results-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-rag-no-results",
                            workflowDefinition: workflowDef,
                            inputs: { query: "Obscure topic xyz" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should handle embedding service failure", async () => {
            const workflowDef = createRAGWorkflowDefinition({});

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "embed_query") {
                    throw new Error("Embedding service unavailable");
                }

                return {
                    result: { output: `result-${nodeId}` },
                    signals: {},
                    metrics: {},
                    success: true,
                    output: { output: `result-${nodeId}` }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-rag-embed-fail-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-rag-embed-fail",
                            workflowDefinition: workflowDef,
                            inputs: { query: "Test query" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("failed");
        });
    });

    describe("real-world scenarios", () => {
        it("should answer technical questions with citations", async () => {
            const workflowDef = createRAGWorkflowDefinition({});

            configureMockNodeOutputs({
                input: { query: "What is the difference between interfaces and type aliases?" },
                embed_query: { embedding: Array(1536).fill(0.1) },
                kb_search: {
                    results: [
                        {
                            id: "ts1",
                            content: "TypeScript interfaces define contracts for objects.",
                            score: 0.92,
                            metadata: { source: "ts-handbook", title: "Interfaces" }
                        },
                        {
                            id: "ts2",
                            content: "Type aliases can represent any type, including primitives.",
                            score: 0.88,
                            metadata: { source: "ts-handbook", title: "Type Aliases" }
                        }
                    ]
                },
                rank_filter: { results: [{ id: "ts1" }, { id: "ts2" }] },
                augment_context: { augmentedPrompt: "Based on context..." },
                generate_response: {
                    content:
                        "Interfaces define contracts for objects [Source: ts-handbook], " +
                        "while type aliases can represent any type [Source: ts-handbook]."
                },
                extract_citations: {
                    citations: [
                        { docId: "ts1", source: "ts-handbook" },
                        { docId: "ts2", source: "ts-handbook" }
                    ]
                },
                output: { result: "Interfaces define contracts..." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-rag-technical-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-rag-technical",
                            workflowDefinition: workflowDef,
                            inputs: {
                                query: "What is the difference between interfaces and type aliases?"
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should handle customer support knowledge base", async () => {
            const workflowDef = createRAGWorkflowDefinition({});

            configureMockNodeOutputs({
                input: { query: "How do I reset my password?" },
                embed_query: { embedding: Array(1536).fill(0.1) },
                kb_search: {
                    results: [
                        {
                            id: "faq1",
                            content:
                                "To reset your password, go to Settings > Security > Reset Password.",
                            score: 0.95,
                            metadata: { source: "faq", title: "Password Reset" }
                        }
                    ]
                },
                rank_filter: { results: [{ id: "faq1" }] },
                augment_context: { augmentedPrompt: "Based on FAQ..." },
                generate_response: {
                    content:
                        "To reset your password, navigate to Settings > Security > Reset Password. [Source: faq]"
                },
                extract_citations: { citations: [{ docId: "faq1", source: "faq" }] },
                output: { result: "Password reset instructions..." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-rag-support-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-rag-support",
                            workflowDefinition: workflowDef,
                            inputs: { query: "How do I reset my password?" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });
});
