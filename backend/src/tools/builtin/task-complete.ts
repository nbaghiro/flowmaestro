/**
 * Task Complete Tool
 *
 * Allows personas to explicitly signal task completion.
 * This provides a reliable completion signal instead of relying on
 * the absence of tool calls, which can be fragile.
 */

import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

export const taskCompleteTool: BuiltInTool = {
    name: "task_complete",
    displayName: "Complete Task",
    description: `Call this tool when you have finished the task and created all required deliverables. This signals that your work is complete and provides a summary for the user.

IMPORTANT: Only call this tool when you have:
1. Completed all requested work
2. Created all necessary deliverables using the deliverable_create tool
3. Verified your outputs meet the requirements

Do NOT call this tool if:
- You still have pending work
- You encountered errors that prevented completion
- You need to create more deliverables`,

    category: "data",
    riskLevel: "none",
    enabledByDefault: true,
    creditCost: 0,
    tags: ["completion", "status", "workflow"],

    inputSchema: {
        type: "object",
        properties: {
            summary: {
                type: "string",
                description:
                    "Summary of what was accomplished. Include key findings, deliverables created, and any important notes for the user."
            },
            deliverables_created: {
                type: "array",
                items: { type: "string" },
                description: "List of deliverable names that were created during this task"
            },
            key_findings: {
                type: "array",
                items: { type: "string" },
                description: "List of key findings or insights discovered during the task"
            },
            recommendations: {
                type: "array",
                items: { type: "string" },
                description: "Optional recommendations for next steps or follow-up actions"
            },
            notes: {
                type: "string",
                description: "Any additional notes, caveats, or important information for the user"
            }
        },
        required: ["summary"]
    },

    execute: async (
        params: Record<string, unknown>,
        context: ToolExecutionContext
    ): Promise<ToolExecutionResult> => {
        const summary = params.summary as string | undefined;
        const deliverablesCreated = params.deliverables_created as string[] | undefined;
        const keyFindings = params.key_findings as string[] | undefined;
        const recommendations = params.recommendations as string[] | undefined;
        const notes = params.notes as string | undefined;

        // Validate summary
        if (!summary || summary.trim().length === 0) {
            return {
                success: false,
                error: {
                    message: "Summary is required when completing a task",
                    retryable: false
                }
            };
        }

        // Get persona instance ID from context
        const personaInstanceId = context.metadata?.personaInstanceId as string | undefined;
        if (!personaInstanceId) {
            return {
                success: false,
                error: {
                    message: "This tool can only be used within a persona instance execution",
                    retryable: false
                }
            };
        }

        // Return the completion data - the workflow will detect this tool call
        // and handle the actual status update
        return {
            success: true,
            data: {
                task_completed: true,
                summary: summary.trim(),
                deliverables_created: deliverablesCreated || [],
                key_findings: keyFindings || [],
                recommendations: recommendations || [],
                notes: notes?.trim(),
                message:
                    "Task marked as complete. The user will be notified and can review your deliverables."
            }
        };
    }
};
