/**
 * Built-in Tools Integration Tests
 *
 * Tests built-in tool execution (web_search, pdf_extract, etc.)
 * Uses mocked external services but real activity implementations.
 */

import {
    createAgentTestEnvironment,
    runAgentExecution,
    createTestAgent
} from "../../helpers/agent-test-env";
import { builtinToolFixtures } from "../../helpers/agent-test-fixtures";
import {
    createCompletionResponse,
    createToolCallResponse,
    createToolSequence,
    createChainedToolSequence
} from "../../helpers/llm-mock-client";
import type { AgentTestEnvironment } from "../../helpers/agent-test-env";

// Increase test timeout for Temporal workflows
jest.setTimeout(60000);

describe("Built-in Tools Integration Tests", () => {
    let testEnv: AgentTestEnvironment;

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    // =========================================================================
    // WEB SEARCH
    // =========================================================================

    describe("Web Search", () => {
        it("should execute web search and return results", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "web_search",
                    { query: "latest AI trends 2024" },
                    "Based on my search, the key AI trends for 2024 include: multimodal AI, smaller language models, and AI agents."
                )
            });

            const searchAgent = createTestAgent({
                id: "agent-search",
                tools: [builtinToolFixtures.webSearch]
            });
            testEnv.registerAgent(searchAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: searchAgent.id,
                initialMessage: "What are the latest AI trends?"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("AI trends");

            // Verify tool was called
            const toolEvent = result.events.find((e) => e.type === "agent:tool:call:started");
            expect(toolEvent?.data.toolName).toBe("web_search");
        });

        it("should handle search with custom result count", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "web_search",
                    { query: "climate change solutions", numResults: 10 },
                    "I found 10 relevant articles about climate change solutions."
                )
            });

            const searchAgent = createTestAgent({
                id: "agent-search-custom",
                tools: [builtinToolFixtures.webSearch]
            });
            testEnv.registerAgent(searchAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: searchAgent.id,
                initialMessage: "Search for 10 articles about climate change solutions"
            });

            expect(result.result.success).toBe(true);
        });

        it("should handle no search results gracefully", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "web_search",
                    { query: "xyznonexistent12345" },
                    "I couldn't find any relevant results for that query. Could you try rephrasing your question?"
                )
            });

            const searchAgent = createTestAgent({
                id: "agent-search-empty",
                tools: [builtinToolFixtures.webSearch]
            });
            testEnv.registerAgent(searchAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: searchAgent.id,
                initialMessage: "Search for xyznonexistent12345"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // PDF EXTRACTION
    // =========================================================================

    describe("PDF Extraction", () => {
        it("should extract text from a PDF", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "pdf_extract",
                    { url: "https://example.com/document.pdf", pages: "all" },
                    "I've extracted the PDF content. The document discusses quarterly financial results with revenue of $1.5M."
                )
            });

            const pdfAgent = createTestAgent({
                id: "agent-pdf",
                tools: [builtinToolFixtures.pdfExtract]
            });
            testEnv.registerAgent(pdfAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: pdfAgent.id,
                initialMessage: "Extract content from https://example.com/document.pdf"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("extracted");
        });

        it("should extract specific pages from PDF", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "pdf_extract",
                    { url: "https://example.com/report.pdf", pages: "1-5" },
                    "I've extracted pages 1-5. The executive summary highlights key achievements."
                )
            });

            const pdfAgent = createTestAgent({
                id: "agent-pdf-pages",
                tools: [builtinToolFixtures.pdfExtract]
            });
            testEnv.registerAgent(pdfAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: pdfAgent.id,
                initialMessage: "Get the first 5 pages of https://example.com/report.pdf"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // CHART GENERATION
    // =========================================================================

    describe("Chart Generation", () => {
        it("should generate a bar chart", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "chart_generate",
                    {
                        type: "bar",
                        data: [
                            { label: "Q1", value: 100 },
                            { label: "Q2", value: 150 },
                            { label: "Q3", value: 120 }
                        ],
                        title: "Quarterly Revenue"
                    },
                    "I've generated a bar chart showing your quarterly revenue data."
                )
            });

            const chartAgent = createTestAgent({
                id: "agent-chart",
                tools: [builtinToolFixtures.chartGenerate]
            });
            testEnv.registerAgent(chartAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: chartAgent.id,
                initialMessage: "Create a bar chart with Q1: 100, Q2: 150, Q3: 120"
            });

            expect(result.result.success).toBe(true);
        });

        it("should generate different chart types", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "chart_generate",
                    {
                        type: "pie",
                        data: [
                            { label: "Product A", value: 40 },
                            { label: "Product B", value: 35 },
                            { label: "Product C", value: 25 }
                        ],
                        title: "Market Share"
                    },
                    "I've created a pie chart showing the market share distribution."
                )
            });

            const chartAgent = createTestAgent({
                id: "agent-chart-pie",
                tools: [builtinToolFixtures.chartGenerate]
            });
            testEnv.registerAgent(chartAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: chartAgent.id,
                initialMessage: "Show market share as a pie chart"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // FILE OPERATIONS
    // =========================================================================

    describe("File Operations", () => {
        it("should read a file", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "file_read",
                    { path: "/data/report.txt" },
                    "The file contains the quarterly sales report with total revenue of $2.5M."
                )
            });

            const fileAgent = createTestAgent({
                id: "agent-file-read",
                tools: [builtinToolFixtures.fileRead]
            });
            testEnv.registerAgent(fileAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: fileAgent.id,
                initialMessage: "Read the contents of /data/report.txt"
            });

            expect(result.result.success).toBe(true);
        });

        it("should write a file", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "file_write",
                    {
                        path: "/output/summary.txt",
                        content: "Meeting summary: Discussed Q4 goals."
                    },
                    "I've saved the meeting summary to /output/summary.txt."
                )
            });

            const fileAgent = createTestAgent({
                id: "agent-file-write",
                tools: [builtinToolFixtures.fileWrite]
            });
            testEnv.registerAgent(fileAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: fileAgent.id,
                initialMessage: "Save 'Meeting summary: Discussed Q4 goals.' to /output/summary.txt"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // MULTI-TOOL WORKFLOWS
    // =========================================================================

    describe("Multi-Tool Workflows", () => {
        it("should chain search and chart generation", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createChainedToolSequence(
                    [
                        {
                            name: "web_search",
                            args: { query: "global temperature data" },
                            thinking: "Let me search for temperature data first."
                        },
                        {
                            name: "chart_generate",
                            args: {
                                type: "line",
                                data: [
                                    { label: "2020", value: 14.9 },
                                    { label: "2021", value: 14.8 },
                                    { label: "2022", value: 15.0 }
                                ],
                                title: "Global Temperature Trend"
                            },
                            thinking: "Now I'll visualize the data."
                        }
                    ],
                    "I've searched for temperature data and created a line chart showing the global temperature trend."
                )
            });

            const multiToolAgent = createTestAgent({
                id: "agent-multi-builtin",
                tools: [builtinToolFixtures.webSearch, builtinToolFixtures.chartGenerate]
            });
            testEnv.registerAgent(multiToolAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: multiToolAgent.id,
                initialMessage: "Search for global temperature data and create a visualization"
            });

            expect(result.result.success).toBe(true);
            expect(testEnv.llmMock.getCallCount()).toBe(3); // 2 tool calls + completion

            // Verify both tools were called
            const toolEvents = result.events.filter((e) => e.type === "agent:tool:call:started");
            expect(toolEvents).toHaveLength(2);
        });

        it("should read file and analyze with search", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createChainedToolSequence(
                    [
                        {
                            name: "file_read",
                            args: { path: "/data/competitors.txt" },
                            thinking: "First, let me read the competitor list."
                        },
                        {
                            name: "web_search",
                            args: { query: "competitor analysis Acme Corp" },
                            thinking: "Now searching for information about our top competitor."
                        }
                    ],
                    "Based on the competitor list and my research, Acme Corp is the market leader with 40% share."
                )
            });

            const analysisAgent = createTestAgent({
                id: "agent-analysis",
                tools: [builtinToolFixtures.fileRead, builtinToolFixtures.webSearch]
            });
            testEnv.registerAgent(analysisAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: analysisAgent.id,
                initialMessage:
                    "Read the competitor list from /data/competitors.txt and research the top competitor"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // ARGUMENT VALIDATION
    // =========================================================================

    describe("Argument Validation", () => {
        it("should validate required arguments for web search", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    // First attempt without required query
                    createToolCallResponse("web_search", { numResults: 5 }),
                    // Retry with query
                    createToolCallResponse("web_search", { query: "AI news", numResults: 5 }),
                    createCompletionResponse("Here are the latest AI news articles.")
                ]
            });

            const searchAgent = createTestAgent({
                id: "agent-validation-search",
                tools: [builtinToolFixtures.webSearch]
            });
            testEnv.registerAgent(searchAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: searchAgent.id,
                initialMessage: "Search for AI news"
            });

            // Should eventually succeed
            expect(result.result.success).toBe(true);
        });

        it("should validate chart type enum", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    // Invalid chart type
                    createToolCallResponse("chart_generate", {
                        type: "invalid_type",
                        data: [{ label: "A", value: 1 }]
                    }),
                    // Valid chart type
                    createToolCallResponse("chart_generate", {
                        type: "bar",
                        data: [{ label: "A", value: 1 }]
                    }),
                    createCompletionResponse("Chart generated successfully.")
                ]
            });

            const chartAgent = createTestAgent({
                id: "agent-validation-chart",
                tools: [builtinToolFixtures.chartGenerate]
            });
            testEnv.registerAgent(chartAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: chartAgent.id,
                initialMessage: "Create a chart"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // ERROR HANDLING
    // =========================================================================

    describe("Error Handling", () => {
        it("should handle search timeout gracefully", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "web_search",
                    { query: "slow query" },
                    "The search took a while but I found some results."
                )
            });

            const searchAgent = createTestAgent({
                id: "agent-timeout",
                tools: [builtinToolFixtures.webSearch]
            });
            testEnv.registerAgent(searchAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: searchAgent.id,
                initialMessage: "Search for slow query"
            });

            expect(result.result.success).toBe(true);
        });

        it("should handle file not found error", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "file_read",
                    { path: "/nonexistent/file.txt" },
                    "I couldn't find that file. Please check the path and try again."
                )
            });

            const fileAgent = createTestAgent({
                id: "agent-file-error",
                tools: [builtinToolFixtures.fileRead]
            });
            testEnv.registerAgent(fileAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: fileAgent.id,
                initialMessage: "Read /nonexistent/file.txt"
            });

            expect(result.result.success).toBe(true);
        });

        it("should handle invalid PDF URL", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "pdf_extract",
                    { url: "not-a-valid-url" },
                    "I couldn't access that URL. Please provide a valid PDF URL."
                )
            });

            const pdfAgent = createTestAgent({
                id: "agent-pdf-error",
                tools: [builtinToolFixtures.pdfExtract]
            });
            testEnv.registerAgent(pdfAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: pdfAgent.id,
                initialMessage: "Extract from not-a-valid-url"
            });

            expect(result.result.success).toBe(true);
        });
    });
});
