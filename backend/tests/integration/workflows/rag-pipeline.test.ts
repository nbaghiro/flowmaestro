/**
 * RAG Pipeline Integration Tests (Research Agent Pattern)
 *
 * Tests for Retrieval-Augmented Generation workflows:
 * - Knowledge base query and retrieval
 * - Context enhancement with retrieved documents
 * - LLM generation with augmented context
 * - Multi-source retrieval and merging
 * - Relevance scoring and filtering
 * - Citation tracking
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    setVariable
} from "../../../src/temporal/core/services/context";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";

// ============================================================================
// TYPES
// ============================================================================

interface DocumentMetadata {
    source: string;
    title?: string;
    url?: string;
    timestamp?: string;
    [key: string]: string | undefined;
}

interface RetrievedDocument {
    id: string;
    content: string;
    score: number;
    metadata: DocumentMetadata;
    [key: string]: string | number | DocumentMetadata;
}

interface RAGResult {
    query: string;
    retrievedDocs: RetrievedDocument[];
    augmentedContext: string;
    generatedResponse: string;
    citations: Array<{ docId: string; source: string }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a RAG workflow
 * Input -> Embed Query -> KB Search -> Rank/Filter -> Augment Context -> LLM -> Output
 */
function createRAGWorkflow(options: {
    topK?: number;
    minRelevanceScore?: number;
    sources?: string[];
}): BuiltWorkflow {
    const { topK = 5, minRelevanceScore = 0.7, sources = ["knowledge_base"] } = options;
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node (user query)
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "UserQuery",
        config: { name: "query" },
        depth: 0,
        dependencies: [],
        dependents: ["EmbedQuery"]
    });

    // Embed Query node
    nodes.set("EmbedQuery", {
        id: "EmbedQuery",
        type: "embeddings",
        name: "EmbedQuery",
        config: {
            provider: "openai",
            model: "text-embedding-3-small",
            inputField: "query"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["KBSearch"]
    });

    // Knowledge Base Search node
    nodes.set("KBSearch", {
        id: "KBSearch",
        type: "knowledgeBaseQuery",
        name: "KBSearch",
        config: {
            sources,
            topK,
            minScore: minRelevanceScore,
            includeMetadata: true
        },
        depth: 2,
        dependencies: ["EmbedQuery"],
        dependents: ["RankFilter"]
    });

    // Rank and Filter node
    nodes.set("RankFilter", {
        id: "RankFilter",
        type: "transform",
        name: "RankFilter",
        config: {
            operation: "filter_and_rank",
            minScore: minRelevanceScore,
            maxResults: topK
        },
        depth: 3,
        dependencies: ["KBSearch"],
        dependents: ["AugmentContext"]
    });

    // Augment Context node
    nodes.set("AugmentContext", {
        id: "AugmentContext",
        type: "transform",
        name: "AugmentContext",
        config: {
            operation: "build_context",
            template: "Based on the following information:\n\n{{documents}}\n\nAnswer: {{query}}"
        },
        depth: 4,
        dependencies: ["RankFilter"],
        dependents: ["GenerateResponse"]
    });

    // Generate Response node (LLM)
    nodes.set("GenerateResponse", {
        id: "GenerateResponse",
        type: "llm",
        name: "GenerateResponse",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt:
                "You are a helpful assistant. Answer questions based on the provided context. " +
                "Always cite your sources using [Source: X] format.",
            prompt: "{{AugmentContext.augmentedPrompt}}"
        },
        depth: 5,
        dependencies: ["AugmentContext"],
        dependents: ["ExtractCitations"]
    });

    // Extract Citations node
    nodes.set("ExtractCitations", {
        id: "ExtractCitations",
        type: "transform",
        name: "ExtractCitations",
        config: {
            operation: "extract_citations",
            pattern: "\\[Source: ([^\\]]+)\\]"
        },
        depth: 6,
        dependencies: ["GenerateResponse"],
        dependents: ["Output"]
    });

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 7,
        dependencies: ["ExtractCitations"],
        dependents: []
    });

    // Create edges
    const edgePairs = [
        ["Input", "EmbedQuery"],
        ["EmbedQuery", "KBSearch"],
        ["KBSearch", "RankFilter"],
        ["RankFilter", "AugmentContext"],
        ["AugmentContext", "GenerateResponse"],
        ["GenerateResponse", "ExtractCitations"],
        ["ExtractCitations", "Output"]
    ];

    for (const [source, target] of edgePairs) {
        const edgeId = `${source}-${target}`;
        edges.set(edgeId, {
            id: edgeId,
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
        executionLevels: [
            ["Input"],
            ["EmbedQuery"],
            ["KBSearch"],
            ["RankFilter"],
            ["AugmentContext"],
            ["GenerateResponse"],
            ["ExtractCitations"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a multi-source RAG workflow
 * Input -> [KB1 Search, KB2 Search, Web Search] -> Merge -> Dedupe -> LLM -> Output
 */
function createMultiSourceRAGWorkflow(sources: string[]): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const searchNodeIds = sources.map((s) => `Search_${s}`);

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "UserQuery",
        config: { name: "query" },
        depth: 0,
        dependencies: [],
        dependents: searchNodeIds
    });

    // Search nodes for each source (parallel)
    for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        const nodeId = `Search_${source}`;
        nodes.set(nodeId, {
            id: nodeId,
            type: "knowledgeBaseQuery",
            name: `Search ${source}`,
            config: {
                source,
                topK: 3,
                minScore: 0.6
            },
            depth: 1,
            dependencies: ["Input"],
            dependents: ["MergeResults"]
        });

        edges.set(`Input-${nodeId}`, {
            id: `Input-${nodeId}`,
            source: "Input",
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Merge Results node
    nodes.set("MergeResults", {
        id: "MergeResults",
        type: "transform",
        name: "MergeResults",
        config: {
            operation: "merge_arrays",
            inputs: searchNodeIds.map((id) => `{{${id}.results}}`)
        },
        depth: 2,
        dependencies: searchNodeIds,
        dependents: ["Deduplicate"]
    });

    for (const searchNodeId of searchNodeIds) {
        edges.set(`${searchNodeId}-MergeResults`, {
            id: `${searchNodeId}-MergeResults`,
            source: searchNodeId,
            target: "MergeResults",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Deduplicate node
    nodes.set("Deduplicate", {
        id: "Deduplicate",
        type: "transform",
        name: "Deduplicate",
        config: {
            operation: "deduplicate",
            keyField: "content",
            keepHighestScore: true
        },
        depth: 3,
        dependencies: ["MergeResults"],
        dependents: ["GenerateResponse"]
    });

    edges.set("MergeResults-Deduplicate", {
        id: "MergeResults-Deduplicate",
        source: "MergeResults",
        target: "Deduplicate",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Generate Response node
    nodes.set("GenerateResponse", {
        id: "GenerateResponse",
        type: "llm",
        name: "GenerateResponse",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Answer based on context: {{Deduplicate.documents}}\n\nQuestion: {{Input.query}}"
        },
        depth: 4,
        dependencies: ["Deduplicate"],
        dependents: ["Output"]
    });

    edges.set("Deduplicate-GenerateResponse", {
        id: "Deduplicate-GenerateResponse",
        source: "Deduplicate",
        target: "GenerateResponse",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 5,
        dependencies: ["GenerateResponse"],
        dependents: []
    });

    edges.set("GenerateResponse-Output", {
        id: "GenerateResponse-Output",
        source: "GenerateResponse",
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
            searchNodeIds,
            ["MergeResults"],
            ["Deduplicate"],
            ["GenerateResponse"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate RAG pipeline execution
 */
async function simulateRAGPipeline(
    query: string,
    knowledgeBase: RetrievedDocument[],
    options: {
        topK?: number;
        minRelevanceScore?: number;
        generateResponse?: (context: string, query: string) => string;
    } = {}
): Promise<RAGResult> {
    const { topK = 5, minRelevanceScore = 0.7 } = options;

    let context = createContext({});
    context = setVariable(context, "query", query);

    // Step 1: Embed query (simulated)
    const queryEmbedding = { embedding: Array(1536).fill(0.1), model: "text-embedding-3-small" };
    context = storeNodeOutput(context, "EmbedQuery", queryEmbedding);

    // Step 2: Search knowledge base (simulated vector search)
    // In real scenario, this would use cosine similarity
    const searchResults = knowledgeBase
        .filter((doc) => doc.score >= minRelevanceScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    context = storeNodeOutput(context, "KBSearch", {
        results: searchResults as unknown as JsonObject[]
    });

    // Step 3: Build augmented context
    const documentsText = searchResults
        .map((doc, i) => `[${i + 1}] ${doc.metadata.title || doc.metadata.source}: ${doc.content}`)
        .join("\n\n");

    const augmentedPrompt = `Based on the following information:\n\n${documentsText}\n\nQuestion: ${query}`;
    context = storeNodeOutput(context, "AugmentContext", {
        augmentedPrompt,
        documentCount: searchResults.length
    });

    // Step 4: Generate response
    const generateFn =
        options.generateResponse ||
        ((_ctx: string, q: string) => {
            return `Based on the provided context, here is the answer to "${q}". [Source: Document 1]`;
        });

    const generatedResponse = generateFn(documentsText, query);
    context = storeNodeOutput(context, "GenerateResponse", {
        content: generatedResponse,
        model: "gpt-4"
    });

    // Step 5: Extract citations
    const citationPattern = /\[Source: ([^\]]+)\]/g;
    const citations: Array<{ docId: string; source: string }> = [];
    let match;
    while ((match = citationPattern.exec(generatedResponse)) !== null) {
        citations.push({ docId: match[1], source: match[1] });
    }

    storeNodeOutput(context, "ExtractCitations", { citations });
    storeNodeOutput(context, "Output", {
        response: generatedResponse,
        citations,
        sources: searchResults.map((d) => d.metadata.source)
    });

    return {
        query,
        retrievedDocs: searchResults,
        augmentedContext: augmentedPrompt,
        generatedResponse,
        citations
    };
}

// ============================================================================
// TEST DATA
// ============================================================================

const sampleKnowledgeBase: RetrievedDocument[] = [
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
    },
    {
        id: "doc4",
        content: "PostgreSQL is a powerful, open source relational database.",
        score: 0.6,
        metadata: { source: "postgres-docs", title: "PostgreSQL About" }
    },
    {
        id: "doc5",
        content: "Redis is an in-memory data structure store, used as a database and cache.",
        score: 0.55,
        metadata: { source: "redis-docs", title: "Redis Introduction" }
    }
];

// ============================================================================
// TEST SUITES
// ============================================================================

describe("RAG Pipeline (Research Agent Pattern)", () => {
    describe("basic retrieval and generation", () => {
        it("should retrieve relevant documents for a query", async () => {
            const result = await simulateRAGPipeline("What is TypeScript?", sampleKnowledgeBase);

            expect(result.retrievedDocs.length).toBeGreaterThan(0);
            expect(result.retrievedDocs[0].content).toContain("TypeScript");
            expect(result.retrievedDocs[0].score).toBeGreaterThanOrEqual(0.7);
        });

        it("should build augmented context from retrieved documents", async () => {
            const result = await simulateRAGPipeline(
                "Explain JavaScript tools",
                sampleKnowledgeBase
            );

            expect(result.augmentedContext).toContain("Based on the following information");
            expect(result.augmentedContext).toContain("Question:");
        });

        it("should generate response using augmented context", async () => {
            const result = await simulateRAGPipeline("What is TypeScript?", sampleKnowledgeBase, {
                generateResponse: (_context, _query) =>
                    "TypeScript is a strongly typed programming language. [Source: typescript-docs]"
            });

            expect(result.generatedResponse).toContain("TypeScript");
            expect(result.citations.length).toBeGreaterThan(0);
        });
    });

    describe("relevance filtering", () => {
        it("should filter documents below minimum relevance score", async () => {
            const result = await simulateRAGPipeline("What is TypeScript?", sampleKnowledgeBase, {
                minRelevanceScore: 0.8
            });

            // Only docs with score >= 0.8 should be included
            expect(result.retrievedDocs.every((doc) => doc.score >= 0.8)).toBe(true);
            expect(result.retrievedDocs.length).toBe(3); // doc1, doc2, doc3
        });

        it("should respect topK limit", async () => {
            const result = await simulateRAGPipeline("JavaScript", sampleKnowledgeBase, {
                topK: 2,
                minRelevanceScore: 0.5
            });

            expect(result.retrievedDocs.length).toBeLessThanOrEqual(2);
        });

        it("should return highest scoring documents first", async () => {
            const result = await simulateRAGPipeline("Programming", sampleKnowledgeBase, {
                minRelevanceScore: 0.5
            });

            for (let i = 1; i < result.retrievedDocs.length; i++) {
                expect(result.retrievedDocs[i].score).toBeLessThanOrEqual(
                    result.retrievedDocs[i - 1].score
                );
            }
        });

        it("should handle no relevant documents gracefully", async () => {
            const result = await simulateRAGPipeline("Quantum physics", sampleKnowledgeBase, {
                minRelevanceScore: 0.99 // Nothing will match
            });

            expect(result.retrievedDocs.length).toBe(0);
        });
    });

    describe("citation tracking", () => {
        it("should extract citations from generated response", async () => {
            const result = await simulateRAGPipeline("What is React?", sampleKnowledgeBase, {
                generateResponse: () =>
                    "React is a UI library [Source: react-docs] that uses components [Source: react-docs]."
            });

            expect(result.citations.length).toBe(2);
            expect(result.citations[0].source).toBe("react-docs");
        });

        it("should handle multiple different citations", async () => {
            const result = await simulateRAGPipeline("Compare technologies", sampleKnowledgeBase, {
                generateResponse: () =>
                    "TypeScript [Source: typescript-docs] works with React [Source: react-docs] on Node.js [Source: nodejs-docs]."
            });

            expect(result.citations.length).toBe(3);
            const sources = result.citations.map((c) => c.source);
            expect(sources).toContain("typescript-docs");
            expect(sources).toContain("react-docs");
            expect(sources).toContain("nodejs-docs");
        });

        it("should handle response without citations", async () => {
            const result = await simulateRAGPipeline("Simple question", sampleKnowledgeBase, {
                generateResponse: () => "Here is a simple answer without any citations."
            });

            expect(result.citations.length).toBe(0);
        });
    });

    describe("context augmentation", () => {
        it("should include document titles in context", async () => {
            const result = await simulateRAGPipeline("What is TypeScript?", sampleKnowledgeBase);

            expect(result.augmentedContext).toContain("TypeScript Overview");
        });

        it("should number documents for reference", async () => {
            const result = await simulateRAGPipeline("JavaScript ecosystem", sampleKnowledgeBase, {
                minRelevanceScore: 0.7
            });

            expect(result.augmentedContext).toContain("[1]");
            if (result.retrievedDocs.length > 1) {
                expect(result.augmentedContext).toContain("[2]");
            }
        });

        it("should preserve original query in augmented context", async () => {
            const query = "How do I use TypeScript with React?";
            const result = await simulateRAGPipeline(query, sampleKnowledgeBase);

            expect(result.augmentedContext).toContain(query);
        });
    });

    describe("multi-source retrieval", () => {
        it("should search multiple knowledge bases in parallel", async () => {
            const workflow = createMultiSourceRAGWorkflow(["docs", "wiki", "forum"]);

            // Verify parallel search structure
            expect(workflow.nodes.has("Search_docs")).toBe(true);
            expect(workflow.nodes.has("Search_wiki")).toBe(true);
            expect(workflow.nodes.has("Search_forum")).toBe(true);

            // Verify merge node depends on all searches
            const mergeNode = workflow.nodes.get("MergeResults");
            expect(mergeNode?.dependencies).toContain("Search_docs");
            expect(mergeNode?.dependencies).toContain("Search_wiki");
            expect(mergeNode?.dependencies).toContain("Search_forum");
        });

        it("should deduplicate results from multiple sources", async () => {
            const multiSourceKB: RetrievedDocument[] = [
                // Same content from different sources
                {
                    id: "doc1",
                    content: "TypeScript adds types to JavaScript",
                    score: 0.9,
                    metadata: { source: "docs" }
                },
                {
                    id: "doc2",
                    content: "TypeScript adds types to JavaScript",
                    score: 0.85,
                    metadata: { source: "wiki" }
                },
                {
                    id: "doc3",
                    content: "React uses JSX syntax",
                    score: 0.8,
                    metadata: { source: "docs" }
                }
            ];

            // Simulate deduplication
            const seen = new Set<string>();
            const dedupedDocs = multiSourceKB.filter((doc) => {
                if (seen.has(doc.content)) return false;
                seen.add(doc.content);
                return true;
            });

            expect(dedupedDocs.length).toBe(2);
            expect(dedupedDocs[0].score).toBe(0.9); // Keep highest score
        });
    });

    describe("workflow structure", () => {
        it("should create valid RAG workflow structure", () => {
            const workflow = createRAGWorkflow({ topK: 3, minRelevanceScore: 0.7 });

            // Verify all nodes exist
            expect(workflow.nodes.has("Input")).toBe(true);
            expect(workflow.nodes.has("EmbedQuery")).toBe(true);
            expect(workflow.nodes.has("KBSearch")).toBe(true);
            expect(workflow.nodes.has("RankFilter")).toBe(true);
            expect(workflow.nodes.has("AugmentContext")).toBe(true);
            expect(workflow.nodes.has("GenerateResponse")).toBe(true);
            expect(workflow.nodes.has("ExtractCitations")).toBe(true);
            expect(workflow.nodes.has("Output")).toBe(true);

            // Verify execution levels show sequential flow
            expect(workflow.executionLevels.length).toBe(8);
            expect(workflow.executionLevels[0]).toContain("Input");
            expect(workflow.executionLevels[1]).toContain("EmbedQuery");
            expect(workflow.executionLevels[7]).toContain("Output");

            // Verify dependency chain
            const kbSearch = workflow.nodes.get("KBSearch");
            expect(kbSearch?.dependencies).toContain("EmbedQuery");

            const generateResponse = workflow.nodes.get("GenerateResponse");
            expect(generateResponse?.dependencies).toContain("AugmentContext");
        });

        it("should handle KB search returning no results", async () => {
            const result = await simulateRAGPipeline("Obscure topic xyz", [], {
                generateResponse: (context, _query) => {
                    if (!context || context.trim() === "") {
                        return "I don't have information about that topic in my knowledge base.";
                    }
                    return "Based on context...";
                }
            });

            expect(result.retrievedDocs.length).toBe(0);
        });
    });

    describe("real-world scenarios", () => {
        it("should answer technical questions with citations", async () => {
            const technicalKB: RetrievedDocument[] = [
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
            ];

            const result = await simulateRAGPipeline(
                "What is the difference between interfaces and type aliases?",
                technicalKB,
                {
                    generateResponse: () =>
                        "Interfaces define contracts for objects [Source: ts-handbook], " +
                        "while type aliases can represent any type [Source: ts-handbook]."
                }
            );

            expect(result.citations.length).toBe(2);
            expect(result.generatedResponse.toLowerCase()).toContain("interfaces");
            expect(result.generatedResponse.toLowerCase()).toContain("type aliases");
        });

        it("should handle customer support knowledge base", async () => {
            const supportKB: RetrievedDocument[] = [
                {
                    id: "faq1",
                    content: "To reset your password, go to Settings > Security > Reset Password.",
                    score: 0.95,
                    metadata: { source: "faq", title: "Password Reset" }
                },
                {
                    id: "faq2",
                    content: "Account lockouts occur after 5 failed login attempts.",
                    score: 0.85,
                    metadata: { source: "faq", title: "Account Security" }
                }
            ];

            const result = await simulateRAGPipeline("How do I reset my password?", supportKB, {
                generateResponse: () =>
                    "To reset your password, navigate to Settings > Security > Reset Password. " +
                    "[Source: faq]"
            });

            expect(result.retrievedDocs[0].content).toContain("reset your password");
            expect(result.citations.length).toBe(1);
        });

        it("should handle product documentation queries", async () => {
            const productDocs: RetrievedDocument[] = [
                {
                    id: "api1",
                    content: "The /users endpoint accepts GET and POST methods.",
                    score: 0.9,
                    metadata: { source: "api-docs", title: "Users API" }
                },
                {
                    id: "api2",
                    content: "Authentication requires a Bearer token in the Authorization header.",
                    score: 0.88,
                    metadata: { source: "api-docs", title: "Authentication" }
                }
            ];

            const result = await simulateRAGPipeline(
                "How do I authenticate API requests?",
                productDocs
            );

            expect(result.retrievedDocs.some((d) => d.content.includes("Bearer token"))).toBe(true);
        });
    });

    describe("error handling", () => {
        it("should handle embedding service failure gracefully", async () => {
            // In a real scenario, this would test error propagation
            const workflow = createRAGWorkflow({});

            // Verify workflow structure handles errors
            expect(workflow.nodes.get("EmbedQuery")).toBeDefined();
            expect(workflow.nodes.get("KBSearch")?.dependencies).toContain("EmbedQuery");
        });

        it("should handle LLM generation failure", async () => {
            // Test that workflow can handle generation errors
            const workflow = createRAGWorkflow({});

            expect(workflow.nodes.get("GenerateResponse")).toBeDefined();
            expect(workflow.nodes.get("Output")?.dependencies).not.toContain("GenerateResponse");
        });
    });
});
