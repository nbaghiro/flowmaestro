/**
 * Safety Activities for Temporal Workflows
 * Handles safety checks and logging within agent execution
 */

import { SafetyPipeline } from "../../../core/safety/safety-pipeline";
import { SafetyLogRepository } from "../../../storage/repositories/SafetyLogRepository";
import type { SafetyContext, SafetyCheckResult, SafetyConfig } from "../../../core/safety/types";

export interface ValidateInputInput {
    content: string;
    context: SafetyContext;
    config: SafetyConfig;
}

export interface ValidateInputResult {
    content: string; // Potentially redacted
    shouldProceed: boolean;
    violations: SafetyCheckResult[];
}

export interface ValidateOutputInput {
    content: string;
    context: SafetyContext;
    config: SafetyConfig;
}

export interface ValidateOutputResult {
    content: string; // Potentially redacted
    shouldProceed: boolean;
    violations: SafetyCheckResult[];
}

export interface LogSafetyEventInput {
    userId: string;
    agentId: string;
    executionId: string;
    threadId?: string;
    result: SafetyCheckResult;
    direction: "input" | "output";
    originalContent?: string;
}

/**
 * Validate user input through safety pipeline
 */
export async function validateInput(input: ValidateInputInput): Promise<ValidateInputResult> {
    console.log(
        `[Safety] Validating input for execution ${input.context.executionId} (direction: ${input.context.direction})`
    );

    // Create safety pipeline with agent's config
    const pipeline = new SafetyPipeline(input.config);

    // Process content
    const { content, shouldProceed, results } = await pipeline.process(
        input.content,
        input.context
    );

    // Filter for violations (anything that's not "allow")
    const violations = results.filter((r) => r.action !== "allow");

    // Log violations
    if (violations.length > 0) {
        console.log(
            `[Safety] Found ${violations.length} violation(s):`,
            violations.map((v) => `${v.type} (${v.action})`)
        );

        // Log each violation to database
        const safetyLogRepo = new SafetyLogRepository();
        for (const violation of violations) {
            await safetyLogRepo.create({
                user_id: input.context.userId,
                agent_id: input.context.agentId,
                execution_id: input.context.executionId,
                thread_id: input.context.threadId,
                check_type: violation.type,
                action: violation.action,
                direction: input.context.direction,
                original_content: violation.action === "block" ? input.content : undefined,
                redacted_content: violation.redactedContent,
                metadata: violation.metadata || {}
            });
        }
    }

    return {
        content,
        shouldProceed,
        violations
    };
}

/**
 * Validate agent output through safety pipeline
 */
export async function validateOutput(input: ValidateOutputInput): Promise<ValidateOutputResult> {
    console.log(
        `[Safety] Validating output for execution ${input.context.executionId} (direction: ${input.context.direction})`
    );

    // Create safety pipeline with agent's config
    const pipeline = new SafetyPipeline(input.config);

    // Process content
    const { content, shouldProceed, results } = await pipeline.process(
        input.content,
        input.context
    );

    // Filter for violations
    const violations = results.filter((r) => r.action !== "allow");

    // Log violations
    if (violations.length > 0) {
        console.log(
            `[Safety] Found ${violations.length} violation(s) in output:`,
            violations.map((v) => `${v.type} (${v.action})`)
        );

        // Log each violation to database
        const safetyLogRepo = new SafetyLogRepository();
        for (const violation of violations) {
            await safetyLogRepo.create({
                user_id: input.context.userId,
                agent_id: input.context.agentId,
                execution_id: input.context.executionId,
                thread_id: input.context.threadId,
                check_type: violation.type,
                action: violation.action,
                direction: input.context.direction,
                redacted_content: violation.redactedContent,
                metadata: violation.metadata || {}
            });
        }
    }

    return {
        content,
        shouldProceed,
        violations
    };
}

/**
 * Log safety event to database
 */
export async function logSafetyEvent(input: LogSafetyEventInput): Promise<void> {
    const safetyLogRepo = new SafetyLogRepository();

    await safetyLogRepo.create({
        user_id: input.userId,
        agent_id: input.agentId,
        execution_id: input.executionId,
        thread_id: input.threadId,
        check_type: input.result.type,
        action: input.result.action,
        direction: input.direction,
        original_content: input.originalContent,
        redacted_content: input.result.redactedContent,
        metadata: input.result.metadata || {}
    });
}
