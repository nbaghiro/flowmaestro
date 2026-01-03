import type { Tool } from "./api";

/**
 * Extracted tool icon information from an agent's available_tools.
 */
export interface ExtractedToolIcons {
    mcpProviders: string[];
    workflowCount: number;
    knowledgeBaseCount: number;
    functionCount: number;
}

/**
 * Extract and categorize tools from an agent's available_tools array.
 * MCP providers are deduplicated (each provider appears once).
 */
export function extractToolIconsFromAgent(tools: Tool[] | undefined): ExtractedToolIcons {
    if (!tools || tools.length === 0) {
        return {
            mcpProviders: [],
            workflowCount: 0,
            knowledgeBaseCount: 0,
            functionCount: 0
        };
    }

    const mcpProviders = new Set<string>();
    let workflowCount = 0;
    let knowledgeBaseCount = 0;
    let functionCount = 0;

    for (const tool of tools) {
        switch (tool.type) {
            case "mcp":
                if (tool.config.provider) {
                    mcpProviders.add(tool.config.provider);
                }
                break;
            case "workflow":
                workflowCount++;
                break;
            case "knowledge_base":
                knowledgeBaseCount++;
                break;
            case "function":
                functionCount++;
                break;
        }
    }

    return {
        mcpProviders: Array.from(mcpProviders),
        workflowCount,
        knowledgeBaseCount,
        functionCount
    };
}
