/**
 * Update Progress Tool
 *
 * Allows personas to provide semantic progress updates during execution.
 * This enables meaningful step tracking instead of just iteration counts.
 */

import type { PersonaInstanceProgress } from "@flowmaestro/shared";
import { PersonaInstanceRepository } from "../../storage/repositories/PersonaInstanceRepository";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

export const updateProgressTool: BuiltInTool = {
    name: "update_progress",
    displayName: "Update Progress",
    description: `Update your progress on the current task. Call this when starting a new phase of work or completing a milestone.

Use this tool to:
- Indicate what you're currently working on
- Track completed steps
- Show remaining work
- Estimate overall progress percentage

This helps the user track your progress on long-running tasks.`,

    category: "data",
    riskLevel: "none",
    enabledByDefault: true,
    creditCost: 0,
    tags: ["progress", "status", "workflow"],

    inputSchema: {
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

    execute: async (
        params: Record<string, unknown>,
        context: ToolExecutionContext
    ): Promise<ToolExecutionResult> => {
        const currentStep = params.current_step as string | undefined;
        const completedSteps = params.completed_steps as string[] | undefined;
        const remainingSteps = params.remaining_steps as string[] | undefined;
        const percentage = params.percentage as number | undefined;
        const message = params.message as string | undefined;

        // Validate current_step
        if (!currentStep || currentStep.trim().length === 0) {
            return {
                success: false,
                error: {
                    message: "current_step is required",
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

        try {
            const instanceRepo = new PersonaInstanceRepository();

            // Calculate step counts
            const completedCount = completedSteps?.length ?? 0;
            const remainingCount = remainingSteps?.length ?? 0;
            const totalSteps = completedCount + remainingCount + 1; // +1 for current step
            const currentStepNumber = completedCount + 1;

            // Calculate percentage if not provided
            let calculatedPercentage = percentage ?? 0;
            if (percentage === undefined && totalSteps > 0) {
                calculatedPercentage = Math.round((completedCount / totalSteps) * 100);
            }

            // Build progress object with all required fields
            const progress: PersonaInstanceProgress = {
                current_step: currentStepNumber,
                total_steps: totalSteps,
                current_step_name: currentStep.trim(),
                percentage: calculatedPercentage,
                message: message?.trim() || `Working on: ${currentStep.trim()}`
            };

            await instanceRepo.update(personaInstanceId, { progress });

            return {
                success: true,
                data: {
                    current_step: currentStep.trim(),
                    percentage: progress.percentage,
                    message: "Progress updated successfully"
                }
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    message: `Failed to update progress: ${error instanceof Error ? error.message : "Unknown error"}`,
                    retryable: true
                }
            };
        }
    }
};
