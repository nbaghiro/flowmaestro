/**
 * Knowledge Base Tools Integration Tests
 *
 * Tests knowledge base tool execution for semantic search over documents.
 */

import {
    createCompletionResponse,
    createToolCallResponse,
    createToolSequence
} from "../../helpers/llm-mock-client";
import {
    createAgentTestEnvironment,
    runAgentExecution,
    createTestAgent,
    createTestKBTool
} from "./helpers/agent-test-env";
import { knowledgeBaseToolFixtures } from "./helpers/agent-test-fixtures";
import type { AgentTestEnvironment } from "./helpers/agent-test-env";

// Increase test timeout for Temporal workflows
jest.setTimeout(60000);

describe("Knowledge Base Tools Integration Tests", () => {
    let testEnv: AgentTestEnvironment;

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    // =========================================================================
    // BASIC KB SEARCH
    // =========================================================================

    describe("Basic Knowledge Base Search", () => {
        it("should search KB and return relevant chunks", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "search_knowledge_base",
                    { query: "vacation policy" },
                    "According to our company policies, employees are entitled to 20 days of paid vacation per year. Vacation must be requested at least 2 weeks in advance."
                )
            });

            const kbAgent = createTestAgent({
                id: "agent-kb-search",
                tools: [knowledgeBaseToolFixtures.searchKB]
            });
            testEnv.registerAgent(kbAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: kbAgent.id,
                initialMessage: "What is our vacation policy?"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("vacation");

            // Verify KB tool was called
            const toolEvent = result.events.find((e) => e.type === "agent:tool:call:started");
            expect(toolEvent?.data.toolName).toBe("search_knowledge_base");
        });

        it("should respect topK parameter", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "search_knowledge_base",
                    { query: "security protocols", topK: 3 },
                    "Based on the top 3 results from our security documentation: 1) Always use VPN when remote. 2) Enable 2FA on all accounts. 3) Report suspicious emails immediately."
                )
            });

            const kbAgent = createTestAgent({
                id: "agent-kb-topk",
                tools: [knowledgeBaseToolFixtures.searchKB]
            });
            testEnv.registerAgent(kbAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: kbAgent.id,
                initialMessage: "Give me the top 3 security protocols"
            });

            expect(result.result.success).toBe(true);
        });

        it("should filter by minScore threshold", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "search_knowledge_base",
                    { query: "onboarding process", minScore: 0.8 },
                    "The onboarding process requires completing HR paperwork, attending orientation, and setting up development environment."
                )
            });

            const kbAgent = createTestAgent({
                id: "agent-kb-minscore",
                tools: [knowledgeBaseToolFixtures.searchKB]
            });
            testEnv.registerAgent(kbAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: kbAgent.id,
                initialMessage: "What's the onboarding process? Only show highly relevant results."
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // MULTI-QUERY SCENARIOS
    // =========================================================================

    describe("Multi-Query Scenarios", () => {
        it("should handle follow-up queries with context", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("search_knowledge_base", { query: "expense policy" }),
                    createToolCallResponse("search_knowledge_base", {
                        query: "expense reimbursement timeline"
                    }),
                    createCompletionResponse(
                        "The expense policy allows up to $50 without approval. For larger amounts, manager approval is needed. Reimbursement typically takes 5-7 business days after submission."
                    )
                ]
            });

            const kbAgent = createTestAgent({
                id: "agent-kb-multi",
                tools: [knowledgeBaseToolFixtures.searchKB]
            });
            testEnv.registerAgent(kbAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: kbAgent.id,
                initialMessage: "What's the expense policy and how long does reimbursement take?"
            });

            expect(result.result.success).toBe(true);
            expect(testEnv.llmMock.getCallCount()).toBe(3);
        });

        it("should refine search based on initial results", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("search_knowledge_base", { query: "remote work" }),
                    createToolCallResponse("search_knowledge_base", {
                        query: "remote work equipment allowance"
                    }),
                    createCompletionResponse(
                        "Remote work is allowed 3 days per week. Employees receive a $500 equipment allowance for home office setup."
                    )
                ]
            });

            const kbAgent = createTestAgent({
                id: "agent-kb-refine",
                tools: [knowledgeBaseToolFixtures.searchKB]
            });
            testEnv.registerAgent(kbAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: kbAgent.id,
                initialMessage: "Tell me about remote work and any equipment benefits"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // NO RESULTS HANDLING
    // =========================================================================

    describe("No Results Handling", () => {
        it("should handle no matching documents gracefully", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "search_knowledge_base",
                    { query: "quantum computing policy" },
                    "I couldn't find any information about quantum computing in our knowledge base. This topic might not be documented yet. Would you like me to search for something else?"
                )
            });

            const kbAgent = createTestAgent({
                id: "agent-kb-empty",
                tools: [knowledgeBaseToolFixtures.searchKB]
            });
            testEnv.registerAgent(kbAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: kbAgent.id,
                initialMessage: "What's our quantum computing policy?"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("couldn't find");
        });

        it("should suggest alternatives when no results found", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("search_knowledge_base", { query: "AI ethics" }),
                    createToolCallResponse("search_knowledge_base", { query: "technology policy" }),
                    createCompletionResponse(
                        "While we don't have a specific AI ethics document, our technology policy covers responsible use of emerging technologies."
                    )
                ]
            });

            const kbAgent = createTestAgent({
                id: "agent-kb-fallback",
                tools: [knowledgeBaseToolFixtures.searchKB]
            });
            testEnv.registerAgent(kbAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: kbAgent.id,
                initialMessage: "What are our AI ethics guidelines?"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // MULTIPLE KNOWLEDGE BASES
    // =========================================================================

    describe("Multiple Knowledge Bases", () => {
        it("should search specific knowledge base by ID", async () => {
            const hrKBTool = createTestKBTool({
                knowledgeBaseId: "kb-hr-policies",
                name: "search_hr_kb",
                description: "Search HR policies knowledge base"
            });

            const techKBTool = createTestKBTool({
                knowledgeBaseId: "kb-tech-docs",
                name: "search_tech_kb",
                description: "Search technical documentation"
            });

            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "search_hr_kb",
                    { query: "health benefits" },
                    "Our health benefits include medical, dental, and vision coverage. Premium is covered 80% by the company."
                )
            });

            const multiKBAgent = createTestAgent({
                id: "agent-multi-kb",
                tools: [hrKBTool, techKBTool]
            });
            testEnv.registerAgent(multiKBAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: multiKBAgent.id,
                initialMessage: "What are our health benefits?"
            });

            expect(result.result.success).toBe(true);

            // Verify HR KB was searched
            const toolEvent = result.events.find((e) => e.type === "agent:tool:call:started");
            expect(toolEvent?.data.toolName).toBe("search_hr_kb");
        });

        it("should search multiple KBs for comprehensive answer", async () => {
            const hrKBTool = createTestKBTool({
                knowledgeBaseId: "kb-hr",
                name: "search_hr",
                description: "Search HR docs"
            });

            const itKBTool = createTestKBTool({
                knowledgeBaseId: "kb-it",
                name: "search_it",
                description: "Search IT docs"
            });

            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("search_hr", { query: "new employee setup" }),
                    createToolCallResponse("search_it", { query: "new employee computer setup" }),
                    createCompletionResponse(
                        "For new employees: HR requires completing tax forms and benefits enrollment. IT will set up your laptop, email, and access to company systems on your first day."
                    )
                ]
            });

            const multiKBAgent = createTestAgent({
                id: "agent-cross-kb",
                tools: [hrKBTool, itKBTool]
            });
            testEnv.registerAgent(multiKBAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: multiKBAgent.id,
                initialMessage: "What do I need to know as a new employee?"
            });

            expect(result.result.success).toBe(true);

            // Verify both KBs were searched
            const toolEvents = result.events.filter((e) => e.type === "agent:tool:call:started");
            expect(toolEvents).toHaveLength(2);
        });
    });

    // =========================================================================
    // CITATION AND SOURCES
    // =========================================================================

    describe("Citation and Sources", () => {
        it("should include source references in response", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "search_knowledge_base",
                    { query: "data retention" },
                    "According to our Data Retention Policy (doc-2023-05): Customer data must be retained for 7 years. Employee data is retained for 5 years after departure. [Source: Data Retention Policy v2.1]"
                )
            });

            const kbAgent = createTestAgent({
                id: "agent-kb-cite",
                systemPrompt:
                    "Always cite your sources when providing information from the knowledge base.",
                tools: [knowledgeBaseToolFixtures.searchKB]
            });
            testEnv.registerAgent(kbAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: kbAgent.id,
                initialMessage: "What's our data retention policy?"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("Source");
        });
    });

    // =========================================================================
    // ERROR SCENARIOS
    // =========================================================================

    describe("Error Scenarios", () => {
        it("should handle KB access denied gracefully", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "search_knowledge_base",
                    { query: "confidential data" },
                    "I don't have access to search that knowledge base. You may need additional permissions to view this content."
                )
            });

            const kbAgent = createTestAgent({
                id: "agent-kb-denied",
                tools: [knowledgeBaseToolFixtures.searchKB]
            });
            testEnv.registerAgent(kbAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: kbAgent.id,
                initialMessage: "Show me confidential data"
            });

            expect(result.result.success).toBe(true);
        });

        it("should handle KB service unavailable", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "search_knowledge_base",
                    { query: "company history" },
                    "I'm having trouble accessing the knowledge base right now. Please try again in a few moments."
                )
            });

            const kbAgent = createTestAgent({
                id: "agent-kb-unavailable",
                tools: [knowledgeBaseToolFixtures.searchKB]
            });
            testEnv.registerAgent(kbAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: kbAgent.id,
                initialMessage: "Tell me about company history"
            });

            expect(result.result.success).toBe(true);
        });
    });
});
