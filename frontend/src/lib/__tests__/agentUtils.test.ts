/**
 * Agent Utils Tests
 *
 * Tests for agent utility functions including tool icon extraction
 * and categorization.
 */

import { describe, it, expect } from "vitest";

import { extractToolIconsFromAgent } from "../agentUtils";
import type { Tool } from "../api";

/**
 * Helper to create a mock Tool with required properties.
 * Only type and config need to be specified; other properties get defaults.
 */
function createMockTool(
    type: Tool["type"],
    config: Tool["config"] = {},
    overrides: Partial<Tool> = {}
): Tool {
    return {
        id: `tool-${Math.random().toString(36).substring(7)}`,
        name: `Mock ${type} tool`,
        description: `A mock ${type} tool for testing`,
        type,
        schema: {},
        config,
        ...overrides
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
            const tools: Tool[] = [createMockTool("mcp", { provider: "slack" })];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toContain("slack");
            expect(result.mcpProviders).toHaveLength(1);
        });

        it("extracts multiple MCP providers", () => {
            const tools: Tool[] = [
                createMockTool("mcp", { provider: "slack" }),
                createMockTool("mcp", { provider: "github" }),
                createMockTool("mcp", { provider: "jira" })
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(3);
            expect(result.mcpProviders).toContain("slack");
            expect(result.mcpProviders).toContain("github");
            expect(result.mcpProviders).toContain("jira");
        });

        it("deduplicates MCP providers", () => {
            const tools: Tool[] = [
                createMockTool("mcp", { provider: "slack" }),
                createMockTool("mcp", { provider: "slack" }),
                createMockTool("mcp", { provider: "github" })
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(2);
            expect(result.mcpProviders).toContain("slack");
            expect(result.mcpProviders).toContain("github");
        });

        it("counts workflow tools", () => {
            const tools: Tool[] = [
                createMockTool("workflow"),
                createMockTool("workflow"),
                createMockTool("workflow")
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.workflowCount).toBe(3);
        });

        it("counts knowledge base tools", () => {
            const tools: Tool[] = [
                createMockTool("knowledge_base"),
                createMockTool("knowledge_base")
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.knowledgeBaseCount).toBe(2);
        });

        it("counts function tools", () => {
            const tools: Tool[] = [
                createMockTool("function"),
                createMockTool("function"),
                createMockTool("function"),
                createMockTool("function")
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.functionCount).toBe(4);
        });

        it("handles mixed tool types", () => {
            const tools: Tool[] = [
                createMockTool("mcp", { provider: "slack" }),
                createMockTool("mcp", { provider: "github" }),
                createMockTool("workflow"),
                createMockTool("workflow"),
                createMockTool("knowledge_base"),
                createMockTool("function"),
                createMockTool("function"),
                createMockTool("function")
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(2);
            expect(result.workflowCount).toBe(2);
            expect(result.knowledgeBaseCount).toBe(1);
            expect(result.functionCount).toBe(3);
        });

        it("handles MCP tool without provider", () => {
            const tools: Tool[] = [createMockTool("mcp")];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(0);
        });

        it("ignores unknown tool types", () => {
            // Use type assertion to simulate unknown tool types coming from API
            const tools = [
                { ...createMockTool("mcp"), type: "unknown" },
                { ...createMockTool("mcp"), type: "custom" }
            ] as unknown as Tool[];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(0);
            expect(result.workflowCount).toBe(0);
            expect(result.knowledgeBaseCount).toBe(0);
            expect(result.functionCount).toBe(0);
        });

        // Real-world scenarios
        it("handles typical agent with various tools", () => {
            const tools: Tool[] = [
                // MCP integrations
                createMockTool("mcp", { provider: "slack" }),
                createMockTool("mcp", { provider: "gmail" }),
                // Workflow tools
                createMockTool("workflow", { workflowId: "wf-1" }),
                // Knowledge bases
                createMockTool("knowledge_base", { knowledgeBaseId: "kb-1" }),
                createMockTool("knowledge_base", { knowledgeBaseId: "kb-2" }),
                // Custom functions
                createMockTool("function", { functionName: "calculate" })
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toEqual(["slack", "gmail"]);
            expect(result.workflowCount).toBe(1);
            expect(result.knowledgeBaseCount).toBe(2);
            expect(result.functionCount).toBe(1);
        });

        it("handles agent with only MCP tools", () => {
            const tools: Tool[] = [
                createMockTool("mcp", { provider: "slack" }),
                createMockTool("mcp", { provider: "notion" }),
                createMockTool("mcp", { provider: "linear" })
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(3);
            expect(result.workflowCount).toBe(0);
            expect(result.knowledgeBaseCount).toBe(0);
            expect(result.functionCount).toBe(0);
        });

        it("handles agent with only knowledge bases", () => {
            const tools: Tool[] = [
                createMockTool("knowledge_base"),
                createMockTool("knowledge_base"),
                createMockTool("knowledge_base")
            ];

            const result = extractToolIconsFromAgent(tools);

            expect(result.mcpProviders).toHaveLength(0);
            expect(result.workflowCount).toBe(0);
            expect(result.knowledgeBaseCount).toBe(3);
            expect(result.functionCount).toBe(0);
        });
    });
});
