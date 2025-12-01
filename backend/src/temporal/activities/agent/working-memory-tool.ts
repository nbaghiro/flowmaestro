/**
 * Working Memory Tool - Auto-injected tool for agents with working memory enabled
 * Allows agents to update their persistent memory about users
 */

import type { JsonObject } from "@flowmaestro/shared";
import { getWorkingMemoryService } from "../../../services/conversation/WorkingMemoryService";
import type { Tool } from "../../../storage/models/Agent";

/**
 * Create the updateWorkingMemory tool definition
 */
export function createWorkingMemoryTool(): Tool {
    return {
        id: "built-in-update-working-memory",
        name: "update_working_memory",
        description: `Update your working memory with important information about the user. Use this tool to remember key facts, preferences, or context that will be useful in future conversations. The memory persists across conversations.

Examples of what to remember:
- User's name, role, or company
- User's preferences (e.g., "prefers concise responses")
- Important context (e.g., "working on a machine learning project")
- Key facts mentioned (e.g., "has a deadline next Friday")

The memory is append-only by default. Use searchString to find and replace existing information.`,
        type: "function",
        schema: {
            type: "object",
            properties: {
                newMemory: {
                    type: "string",
                    description:
                        "The new information to add to working memory. Be concise and factual."
                },
                searchString: {
                    type: "string",
                    description:
                        "Optional: A string to find in existing memory and replace with newMemory. Use this to update incorrect or outdated information."
                }
            },
            required: ["newMemory"]
        },
        config: {
            functionName: "update_working_memory"
        }
    };
}

/**
 * Execute the updateWorkingMemory tool
 */
export interface UpdateWorkingMemoryInput {
    agentId: string;
    userId: string;
    newMemory: string;
    searchString?: string;
}

export async function executeUpdateWorkingMemory(
    input: UpdateWorkingMemoryInput
): Promise<JsonObject> {
    const workingMemoryService = getWorkingMemoryService();

    try {
        const result = await workingMemoryService.update({
            agentId: input.agentId,
            userId: input.userId,
            newMemory: input.newMemory,
            searchString: input.searchString
        });

        if (result.success) {
            return {
                success: true,
                action: result.reason,
                message: getSuccessMessage(result.reason),
                currentMemory: result.workingMemory
            };
        } else {
            return {
                success: false,
                action: result.reason,
                message: "This information is already in your working memory."
            };
        }
    } catch (error) {
        console.error("Error updating working memory:", error);
        return {
            success: false,
            error: true,
            message: error instanceof Error ? error.message : "Failed to update working memory"
        };
    }
}

/**
 * Get the current working memory for display to the agent
 */
export async function getWorkingMemoryForAgent(
    agentId: string,
    userId: string
): Promise<string | null> {
    const workingMemoryService = getWorkingMemoryService();
    return await workingMemoryService.get(agentId, userId);
}

/**
 * Helper to get success message based on action
 */
function getSuccessMessage(reason: "created" | "appended" | "replaced" | "duplicate"): string {
    switch (reason) {
        case "created":
            return "Working memory created with this information.";
        case "appended":
            return "Information added to working memory.";
        case "replaced":
            return "Working memory updated with new information.";
        case "duplicate":
            return "This information is already in working memory.";
    }
}

/**
 * Check if an agent has working memory enabled
 * For now, we'll check if the agent's metadata has a workingMemoryEnabled flag
 */
export function isWorkingMemoryEnabled(agentMetadata: JsonObject): boolean {
    return agentMetadata.workingMemoryEnabled === true;
}
