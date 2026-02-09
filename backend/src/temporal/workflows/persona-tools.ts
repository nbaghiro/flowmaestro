/**
 * Persona Workflow Control Tools
 *
 * These are not general-purpose tools - they're workflow control mechanisms
 * exposed as tools so the LLM can signal workflow state changes.
 *
 * Unlike regular built-in tools (web_search, pdf_extract, etc.), these tools:
 * - Are only injected for persona execution
 * - Are handled directly in the workflow (not via executeToolCall)
 * - Control workflow state rather than performing external operations
 */

import type { Tool } from "../../storage/models/Agent";

/**
 * Tool definitions for persona workflow control.
 * These are injected into persona execution and handled directly by the workflow.
 */
export const personaWorkflowTools: Tool[] = [
    {
        id: "persona-task_complete",
        name: "task_complete",
        description: `Signal that you have completed your task. Call this when:
1. All requested work is finished
2. All deliverables have been created
3. You have verified outputs meet requirements

Do NOT call if you still have pending work or encountered blocking errors.`,
        type: "builtin",
        schema: {
            type: "object",
            properties: {
                summary: {
                    type: "string",
                    description: "Summary of what was accomplished"
                },
                deliverables_created: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of deliverable names created"
                },
                key_findings: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key findings or insights"
                },
                recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Optional recommendations for next steps"
                },
                notes: {
                    type: "string",
                    description: "Any additional notes or caveats"
                }
            },
            required: ["summary"]
        },
        config: { functionName: "task_complete" }
    },
    {
        id: "persona-update_progress",
        name: "update_progress",
        description: `Update your progress on the current task. Call when starting a new phase or completing a milestone.

Use this to:
- Indicate what you're currently working on
- Track completed steps
- Show remaining work
- Estimate overall progress percentage

This helps the user track your progress on long-running tasks.`,
        type: "builtin",
        schema: {
            type: "object",
            properties: {
                current_step: {
                    type: "string",
                    description:
                        "Brief description of what you are currently working on (e.g., 'Analyzing competitor websites')"
                },
                completed_steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of steps that have been completed so far"
                },
                remaining_steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of steps that still need to be done"
                },
                percentage: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                    description: "Estimated overall progress percentage (0-100)"
                },
                message: {
                    type: "string",
                    description: "Optional detailed message about current status"
                }
            },
            required: ["current_step"]
        },
        config: { functionName: "update_progress" }
    },
    {
        id: "persona-deliverable_create",
        name: "deliverable_create",
        description: `Create a deliverable file that will be saved and made available to the user. Use this to produce your final outputs such as reports, data exports, code files, etc.

Supported types:
- markdown: Reports, documentation (extension: .md)
- csv: Data tables, spreadsheets (extension: .csv)
- json: Structured data (extension: .json)
- code: Source code files (specify extension)
- html: Web pages, formatted content (extension: .html)

Always create deliverables for your final outputs. The user expects to receive tangible results from your work.`,
        type: "builtin",
        schema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description:
                        "Name for the deliverable (e.g., 'competitive-analysis', 'quarterly-report'). Use kebab-case without extension."
                },
                type: {
                    type: "string",
                    enum: ["markdown", "csv", "json", "code", "html"],
                    description: "Type of deliverable: markdown, csv, json, code, or html"
                },
                content: {
                    type: "string",
                    description: "The full content of the deliverable"
                },
                description: {
                    type: "string",
                    description: "Brief description of what this deliverable contains"
                },
                file_extension: {
                    type: "string",
                    description:
                        "File extension (required for 'code' type, e.g., 'py', 'ts', 'sql')"
                }
            },
            required: ["name", "type", "content"]
        },
        config: { functionName: "deliverable_create" }
    }
];

/** Names of workflow control tools for detection */
export const PERSONA_WORKFLOW_TOOL_NAMES = new Set([
    "task_complete",
    "update_progress",
    "deliverable_create"
]);

/**
 * Check if a tool call is a workflow control tool
 */
export function isPersonaWorkflowTool(toolName: string): boolean {
    return PERSONA_WORKFLOW_TOOL_NAMES.has(toolName);
}

/**
 * Get file extension for a deliverable type
 */
export function getDeliverableFileExtension(type: string, customExtension?: string): string {
    if (customExtension) {
        return customExtension.startsWith(".") ? customExtension.slice(1) : customExtension;
    }

    const extensions: Record<string, string> = {
        markdown: "md",
        csv: "csv",
        json: "json",
        code: "txt",
        html: "html"
    };
    return extensions[type] || "txt";
}
