/**
 * Agent Utils Tests
 *
 * Tests for agent utility functions including tool icon extraction
 * and categorization.
 */

import { describe, it, expect } from "vitest";

import { extractToolIconsFromAgent } from "../agentUtils";

// Mock tool types matching the API types
interface MockTool {
    type: "mcp" | "workflow" | "knowledge_base" | "function";
    config: {
        provider?: string;
        [key: string]: unknown;
    };
}

describe("agentUtils", () => {
    describe("extractToolIconsFromAgent", () => {
        it("returns empty result for undefined tools", () => {
            const result = extractToolIconsFromAgent(undefined);

            expect(result).toEqual({
                mcpProviders: [],
                workflowCount: 0,
                knowledgeBaseCount: 0,
                functionCount: 0
            });
        });

        it("returns empty result for empty tools array", () => {
            const result = extractToolIconsFromAgent([]);

            expect(result).toEqual({
                mcpProviders: [],
                workflowCount: 0,
                knowledgeBaseCount: 0,
                functionCount: 0
            });
        });

        it("extracts MCP provider", () => {
            const tools: MockTool[] = [{ type: "mcp", config: { provider: "slack" } }];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toContain("slack");
            expect(result.mcpProviders).toHaveLength(1);
        });

        it("extracts multiple MCP providers", () => {
            const tools: MockTool[] = [
                { type: "mcp", config: { provider: "slack" } },
                { type: "mcp", config: { provider: "github" } },
                { type: "mcp", config: { provider: "jira" } }
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(3);
            expect(result.mcpProviders).toContain("slack");
            expect(result.mcpProviders).toContain("github");
            expect(result.mcpProviders).toContain("jira");
        });

        it("deduplicates MCP providers", () => {
            const tools: MockTool[] = [
                { type: "mcp", config: { provider: "slack" } },
                { type: "mcp", config: { provider: "slack" } },
                { type: "mcp", config: { provider: "github" } }
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(2);
            expect(result.mcpProviders).toContain("slack");
            expect(result.mcpProviders).toContain("github");
        });

        it("counts workflow tools", () => {
            const tools: MockTool[] = [
                { type: "workflow", config: {} },
                { type: "workflow", config: {} },
                { type: "workflow", config: {} }
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.workflowCount).toBe(3);
        });

        it("counts knowledge base tools", () => {
            const tools: MockTool[] = [
                { type: "knowledge_base", config: {} },
                { type: "knowledge_base", config: {} }
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.knowledgeBaseCount).toBe(2);
        });

        it("counts function tools", () => {
            const tools: MockTool[] = [
                { type: "function", config: {} },
                { type: "function", config: {} },
                { type: "function", config: {} },
                { type: "function", config: {} }
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.functionCount).toBe(4);
        });

        it("handles mixed tool types", () => {
            const tools: MockTool[] = [
                { type: "mcp", config: { provider: "slack" } },
                { type: "mcp", config: { provider: "github" } },
                { type: "workflow", config: {} },
                { type: "workflow", config: {} },
                { type: "knowledge_base", config: {} },
                { type: "function", config: {} },
                { type: "function", config: {} },
                { type: "function", config: {} }
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(2);
            expect(result.workflowCount).toBe(2);
            expect(result.knowledgeBaseCount).toBe(1);
            expect(result.functionCount).toBe(3);
        });

        it("handles MCP tool without provider", () => {
            const tools: MockTool[] = [{ type: "mcp", config: {} }];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(0);
        });

        it("ignores unknown tool types", () => {
            const tools = [
                { type: "unknown", config: {} },
                { type: "custom", config: {} }
            ] as unknown as MockTool[];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(0);
            expect(result.workflowCount).toBe(0);
            expect(result.knowledgeBaseCount).toBe(0);
            expect(result.functionCount).toBe(0);
        });

        // Real-world scenarios
        it("handles typical agent with various tools", () => {
            const tools: MockTool[] = [
                // MCP integrations
                { type: "mcp", config: { provider: "slack" } },
                { type: "mcp", config: { provider: "gmail" } },
                // Workflow tools
                { type: "workflow", config: { workflowId: "wf-1" } },
                // Knowledge bases
                { type: "knowledge_base", config: { kbId: "kb-1" } },
                { type: "knowledge_base", config: { kbId: "kb-2" } },
                // Custom functions
                { type: "function", config: { name: "calculate" } }
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toEqual(["slack", "gmail"]);
            expect(result.workflowCount).toBe(1);
            expect(result.knowledgeBaseCount).toBe(2);
            expect(result.functionCount).toBe(1);
        });

        it("handles agent with only MCP tools", () => {
            const tools: MockTool[] = [
                { type: "mcp", config: { provider: "slack" } },
                { type: "mcp", config: { provider: "notion" } },
                { type: "mcp", config: { provider: "linear" } }
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(3);
            expect(result.workflowCount).toBe(0);
            expect(result.knowledgeBaseCount).toBe(0);
            expect(result.functionCount).toBe(0);
        });

        it("handles agent with only knowledge bases", () => {
            const tools: MockTool[] = [
                { type: "knowledge_base", config: {} },
                { type: "knowledge_base", config: {} },
                { type: "knowledge_base", config: {} }
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(0);
            expect(result.workflowCount).toBe(0);
            expect(result.knowledgeBaseCount).toBe(3);
            expect(result.functionCount).toBe(0);
        });
    });
});
