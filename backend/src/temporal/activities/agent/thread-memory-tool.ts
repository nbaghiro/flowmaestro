/**
 * Thread Memory Tool - Auto-injected tool for agents to search thread history
 * Enables agents to recall relevant past threads using semantic search
 */

import type { Tool } from "../../../storage/models/Agent";

/**
 * Create the searchThreadMemory tool definition
 * This tool is automatically injected into agent configurations
 */
export function createThreadMemoryTool(): Tool {
    return {
        id: "built-in-search-thread-memory",
        name: "search_thread_memory",
        type: "function",
        description: `Search your thread history to find relevant past interactions.

Use this when you need to:
- Recall previous threads with the user
- Find information discussed in earlier messages
- Check what you've told the user before
- Remember context from past interactions

The search uses semantic similarity to find the most relevant threads, and includes surrounding messages for full context.

Returns:
- Relevant thread excerpts with context
- Similarity scores (how relevant each result is)
- Thread context (messages before and after the match)`,
        schema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description:
                        "What you're searching for. Can be a question, topic, or concept. Example: 'user's favorite color', 'project requirements we discussed', 'API key configuration'"
                },
                topK: {
                    type: "number",
                    description:
                        "Number of results to return (default: 5). Use fewer (2-3) for focused searches, more (5-10) for broader exploration.",
                    minimum: 1,
                    maximum: 20
                },
                similarityThreshold: {
                    type: "number",
                    description:
                        "Minimum similarity score (0-1, default: 0.7). Lower values (0.5-0.6) return more results but less relevant. Higher values (0.8-0.9) return only very relevant matches.",
                    minimum: 0,
                    maximum: 1
                },
                contextWindow: {
                    type: "number",
                    description:
                        "Number of messages before/after each match to include (default: 2). Provides thread context around the matched message.",
                    minimum: 0,
                    maximum: 10
                },
                searchPastExecutions: {
                    type: "boolean",
                    description:
                        "Search across all past threads (default: false). If true, searches beyond current thread. If false, only searches current thread."
                },
                messageRoles: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: ["user", "assistant", "system"]
                    },
                    description:
                        "Filter by message role (optional). Example: ['user'] to search only user messages, ['assistant'] to search only your responses."
                }
            },
            required: ["query"]
        },
        config: {
            functionName: "search_thread_memory"
        }
    };
}

/**
 * Merge the thread memory tool into agent's available tools
 */
export function injectThreadMemoryTool(existingTools: Tool[]): Tool[] {
    const threadMemoryTool = createThreadMemoryTool();

    // Check if tool already exists
    const toolExists = existingTools.some((tool) => tool.name === threadMemoryTool.name);

    if (toolExists) {
        return existingTools;
    }

    // Add to the beginning for easy discovery
    return [threadMemoryTool, ...existingTools];
}
