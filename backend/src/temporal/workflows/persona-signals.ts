/**
 * Persona Workflow Signals
 *
 * This module handles structured output signals that personas use to communicate
 * workflow state changes. Instead of using fake "tools" for workflow control,
 * the LLM outputs JSON blocks with a `workflow-signal` language identifier that
 * are parsed and handled by the workflow.
 *
 * Example signal in LLM response:
 * ```workflow-signal
 * {
 *     "type": "complete",
 *     "summary": "Completed competitive analysis with 3 deliverables"
 * }
 * ```
 */

import type { DeliverableType } from "@flowmaestro/shared";

// =============================================================================
// Signal Type Definitions
// =============================================================================

/**
 * Progress signal - indicates workflow progress update
 */
export interface ProgressSignal {
    type: "progress";
    current_step: string;
    completed_steps?: string[];
    remaining_steps?: string[];
    percentage?: number;
    message?: string;
}

/**
 * Deliverable signal - creates a deliverable file
 */
export interface DeliverableSignal {
    type: "deliverable";
    name: string;
    deliverable_type: DeliverableType;
    content: string;
    description?: string;
    file_extension?: string;
}

/**
 * Complete signal - indicates task completion
 */
export interface CompleteSignal {
    type: "complete";
    summary: string;
    deliverables_created?: string[];
    key_findings?: string[];
    recommendations?: string[];
    notes?: string;
}

/**
 * Clarification complete signal - indicates clarification phase is done
 */
export interface ClarificationCompleteSignal {
    type: "clarification_complete";
    summary: string;
    key_requirements?: string[];
    ready: boolean;
}

/**
 * Union type of all workflow signals
 */
export type PersonaWorkflowSignal =
    | ProgressSignal
    | DeliverableSignal
    | CompleteSignal
    | ClarificationCompleteSignal;

// =============================================================================
// Parser Types
// =============================================================================

/**
 * Result of parsing an LLM response for workflow signals
 */
export interface ParsedResponse {
    /** Response content with signal blocks removed */
    textContent: string;
    /** Extracted workflow signals */
    signals: PersonaWorkflowSignal[];
    /** Non-fatal parse errors (e.g., malformed JSON) */
    parseErrors: string[];
}

// =============================================================================
// Parser Implementation
// =============================================================================

/**
 * Regular expression to match workflow-signal code blocks
 * Matches: ```workflow-signal\n{...}\n```
 */
const SIGNAL_BLOCK_REGEX = /```workflow-signal\s*\n([\s\S]*?)```/g;

/**
 * Parse an LLM response for workflow signals
 *
 * Extracts JSON blocks marked with the `workflow-signal` language identifier
 * and returns them as typed signals along with the cleaned text content.
 *
 * @param content - Raw LLM response content
 * @returns ParsedResponse with signals extracted and text content cleaned
 */
export function parsePersonaResponse(content: string): ParsedResponse {
    const signals: PersonaWorkflowSignal[] = [];
    const parseErrors: string[] = [];

    if (!content) {
        return {
            textContent: "",
            signals: [],
            parseErrors: []
        };
    }

    // Extract all signal blocks
    let match: RegExpExecArray | null;
    const regex = new RegExp(SIGNAL_BLOCK_REGEX.source, "g");

    while ((match = regex.exec(content)) !== null) {
        const jsonContent = match[1].trim();

        try {
            const parsed = JSON.parse(jsonContent);

            // Validate the signal has a type
            if (!parsed.type) {
                parseErrors.push(
                    `Signal block missing 'type' field: ${jsonContent.substring(0, 100)}`
                );
                continue;
            }

            // Validate and type the signal based on its type
            const signal = validateSignal(parsed);
            if (signal) {
                signals.push(signal);
            } else {
                parseErrors.push(
                    `Unknown signal type '${parsed.type}': ${jsonContent.substring(0, 100)}`
                );
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown parse error";
            parseErrors.push(`Failed to parse signal JSON: ${errorMessage}`);
        }
    }

    // Remove signal blocks from text content
    const textContent = content.replace(SIGNAL_BLOCK_REGEX, "").trim();

    return {
        textContent,
        signals,
        parseErrors
    };
}

/**
 * Validate and type a parsed signal object
 *
 * @param parsed - Parsed JSON object
 * @returns Typed signal or null if validation fails
 */
function validateSignal(parsed: Record<string, unknown>): PersonaWorkflowSignal | null {
    switch (parsed.type) {
        case "progress":
            return validateProgressSignal(parsed);
        case "deliverable":
            return validateDeliverableSignal(parsed);
        case "complete":
            return validateCompleteSignal(parsed);
        case "clarification_complete":
            return validateClarificationCompleteSignal(parsed);
        default:
            return null;
    }
}

/**
 * Validate a progress signal
 */
function validateProgressSignal(parsed: Record<string, unknown>): ProgressSignal | null {
    if (typeof parsed.current_step !== "string") {
        return null;
    }

    return {
        type: "progress",
        current_step: parsed.current_step,
        completed_steps: Array.isArray(parsed.completed_steps)
            ? (parsed.completed_steps as string[])
            : undefined,
        remaining_steps: Array.isArray(parsed.remaining_steps)
            ? (parsed.remaining_steps as string[])
            : undefined,
        percentage: typeof parsed.percentage === "number" ? parsed.percentage : undefined,
        message: typeof parsed.message === "string" ? parsed.message : undefined
    };
}

/**
 * Validate a deliverable signal
 */
function validateDeliverableSignal(parsed: Record<string, unknown>): DeliverableSignal | null {
    if (typeof parsed.name !== "string") {
        return null;
    }
    if (typeof parsed.deliverable_type !== "string") {
        return null;
    }
    if (typeof parsed.content !== "string") {
        return null;
    }

    // Validate deliverable_type is a valid DeliverableType
    const validTypes: DeliverableType[] = [
        "markdown",
        "csv",
        "json",
        "code",
        "html",
        "pdf",
        "image"
    ];
    if (!validTypes.includes(parsed.deliverable_type as DeliverableType)) {
        return null;
    }

    return {
        type: "deliverable",
        name: parsed.name,
        deliverable_type: parsed.deliverable_type as DeliverableType,
        content: parsed.content,
        description: typeof parsed.description === "string" ? parsed.description : undefined,
        file_extension:
            typeof parsed.file_extension === "string" ? parsed.file_extension : undefined
    };
}

/**
 * Validate a complete signal
 */
function validateCompleteSignal(parsed: Record<string, unknown>): CompleteSignal | null {
    if (typeof parsed.summary !== "string") {
        return null;
    }

    return {
        type: "complete",
        summary: parsed.summary,
        deliverables_created: Array.isArray(parsed.deliverables_created)
            ? (parsed.deliverables_created as string[])
            : undefined,
        key_findings: Array.isArray(parsed.key_findings)
            ? (parsed.key_findings as string[])
            : undefined,
        recommendations: Array.isArray(parsed.recommendations)
            ? (parsed.recommendations as string[])
            : undefined,
        notes: typeof parsed.notes === "string" ? parsed.notes : undefined
    };
}

/**
 * Validate a clarification complete signal
 */
function validateClarificationCompleteSignal(
    parsed: Record<string, unknown>
): ClarificationCompleteSignal | null {
    if (typeof parsed.summary !== "string") {
        return null;
    }
    if (typeof parsed.ready !== "boolean") {
        return null;
    }

    return {
        type: "clarification_complete",
        summary: parsed.summary,
        key_requirements: Array.isArray(parsed.key_requirements)
            ? (parsed.key_requirements as string[])
            : undefined,
        ready: parsed.ready
    };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if the signals contain a completion signal
 *
 * @param signals - Array of parsed signals
 * @returns The CompleteSignal if found, null otherwise
 */
export function hasCompletionSignal(signals: PersonaWorkflowSignal[]): CompleteSignal | null {
    const completeSignal = signals.find((s): s is CompleteSignal => s.type === "complete");
    return completeSignal || null;
}

/**
 * Get all deliverable signals from the array
 *
 * @param signals - Array of parsed signals
 * @returns Array of DeliverableSignal objects
 */
export function getDeliverableSignals(signals: PersonaWorkflowSignal[]): DeliverableSignal[] {
    return signals.filter((s): s is DeliverableSignal => s.type === "deliverable");
}

/**
 * Get all progress signals from the array
 *
 * @param signals - Array of parsed signals
 * @returns Array of ProgressSignal objects
 */
export function getProgressSignals(signals: PersonaWorkflowSignal[]): ProgressSignal[] {
    return signals.filter((s): s is ProgressSignal => s.type === "progress");
}

/**
 * Check if the signals contain a clarification complete signal with ready=true
 *
 * @param signals - Array of parsed signals
 * @returns The ClarificationCompleteSignal if found and ready, null otherwise
 */
export function hasClarificationCompleteSignal(
    signals: PersonaWorkflowSignal[]
): ClarificationCompleteSignal | null {
    const clarificationSignal = signals.find(
        (s): s is ClarificationCompleteSignal => s.type === "clarification_complete" && s.ready
    );
    return clarificationSignal || null;
}
