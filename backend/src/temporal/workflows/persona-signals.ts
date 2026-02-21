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

import type { DeliverableType, PersonaProgressStep, ProgressStepStatus } from "@flowmaestro/shared";

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

// =============================================================================
// SOP Step Progress Tracking
// =============================================================================

/**
 * Initialize progress steps from SOP step titles
 *
 * @param sopSteps - Array of SOP step titles from the persona definition
 * @returns Array of PersonaProgressStep in pending status
 */
export function initializeProgressSteps(sopSteps: string[]): PersonaProgressStep[] {
    return sopSteps.map((title, index) => ({
        index,
        title,
        status: "pending" as ProgressStepStatus,
        started_at: null,
        completed_at: null
    }));
}

/**
 * Calculate string similarity using Levenshtein distance ratio
 * Returns a value between 0 (no match) and 1 (exact match)
 */
function stringSimilarity(a: string, b: string): number {
    const aLower = a.toLowerCase().trim();
    const bLower = b.toLowerCase().trim();

    if (aLower === bLower) return 1;

    const matrix: number[][] = [];

    for (let i = 0; i <= aLower.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= bLower.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= aLower.length; i++) {
        for (let j = 1; j <= bLower.length; j++) {
            if (aLower[i - 1] === bLower[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j] + 1 // deletion
                );
            }
        }
    }

    const maxLength = Math.max(aLower.length, bLower.length);
    if (maxLength === 0) return 1;

    return 1 - matrix[aLower.length][bLower.length] / maxLength;
}

/**
 * Check if a string contains keywords from another string
 * Returns true if there's significant keyword overlap
 */
function hasKeywordOverlap(signalStep: string, sopStep: string): boolean {
    const signalWords = new Set(
        signalStep
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 2)
    );
    const sopWords = sopStep
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);

    let matches = 0;
    for (const word of sopWords) {
        if (signalWords.has(word)) {
            matches++;
        }
    }

    // At least 50% of meaningful words should match
    return sopWords.length > 0 && matches / sopWords.length >= 0.5;
}

/**
 * Match a progress signal step name to the closest SOP step
 *
 * Uses fuzzy matching to find the best match between the LLM-provided step name
 * and the defined SOP steps.
 *
 * @param signalStep - Current step name from the progress signal
 * @param sopSteps - Array of SOP step titles from the persona definition
 * @returns Index of the best matching SOP step, or -1 if no good match
 */
export function matchProgressToSopStep(signalStep: string, sopSteps: string[]): number {
    if (!signalStep || sopSteps.length === 0) {
        return -1;
    }

    let bestMatch = -1;
    let bestScore = 0.4; // Minimum threshold for a match

    for (let i = 0; i < sopSteps.length; i++) {
        // Try exact substring match first
        if (
            sopSteps[i].toLowerCase().includes(signalStep.toLowerCase()) ||
            signalStep.toLowerCase().includes(sopSteps[i].toLowerCase())
        ) {
            return i;
        }

        // Try fuzzy matching
        const similarity = stringSimilarity(signalStep, sopSteps[i]);
        if (similarity > bestScore) {
            bestScore = similarity;
            bestMatch = i;
        }

        // Try keyword overlap
        if (hasKeywordOverlap(signalStep, sopSteps[i]) && bestMatch !== i) {
            // Keyword overlap is a strong indicator, boost the score
            if (similarity + 0.2 > bestScore) {
                bestScore = similarity + 0.2;
                bestMatch = i;
            }
        }
    }

    return bestMatch;
}

/**
 * Update step statuses based on a progress signal
 *
 * When a progress signal is received:
 * - The current step is marked as in_progress
 * - All previous steps that were pending or in_progress are marked as completed
 * - Completed steps from the signal are also marked as completed
 *
 * @param currentSteps - Current array of PersonaProgressStep
 * @param progressSignal - Progress signal from the LLM
 * @param sopSteps - Array of SOP step titles for matching
 * @returns Updated array of PersonaProgressStep
 */
export function updateStepStatuses(
    currentSteps: PersonaProgressStep[],
    progressSignal: ProgressSignal,
    sopSteps: string[]
): PersonaProgressStep[] {
    const now = new Date().toISOString();
    const steps = currentSteps.map((s) => ({ ...s })); // Deep copy

    // Find the current step index
    const currentStepIndex = matchProgressToSopStep(progressSignal.current_step, sopSteps);

    // Mark completed steps from the signal
    if (progressSignal.completed_steps) {
        for (const completedStep of progressSignal.completed_steps) {
            const index = matchProgressToSopStep(completedStep, sopSteps);
            if (index >= 0 && index < steps.length) {
                if (steps[index].status !== "completed") {
                    steps[index].status = "completed";
                    steps[index].completed_at = steps[index].completed_at || now;
                    if (!steps[index].started_at) {
                        steps[index].started_at = now; // Set start time if not set
                    }
                }
            }
        }
    }

    // If we found a matching current step
    if (currentStepIndex >= 0 && currentStepIndex < steps.length) {
        // Mark all previous steps as completed if they're still pending/in_progress
        for (let i = 0; i < currentStepIndex; i++) {
            if (steps[i].status === "pending" || steps[i].status === "in_progress") {
                steps[i].status = "completed";
                steps[i].completed_at = steps[i].completed_at || now;
                if (!steps[i].started_at) {
                    steps[i].started_at = now;
                }
            }
        }

        // Mark current step as in_progress
        if (steps[currentStepIndex].status === "pending") {
            steps[currentStepIndex].status = "in_progress";
            steps[currentStepIndex].started_at = steps[currentStepIndex].started_at || now;
        }
    }

    return steps;
}

/**
 * Mark all remaining steps as completed when the task finishes
 *
 * @param currentSteps - Current array of PersonaProgressStep
 * @returns Updated array with all steps completed
 */
export function completeAllSteps(currentSteps: PersonaProgressStep[]): PersonaProgressStep[] {
    const now = new Date().toISOString();

    return currentSteps.map((step) => {
        if (step.status === "pending" || step.status === "in_progress") {
            return {
                ...step,
                status: "completed" as ProgressStepStatus,
                started_at: step.started_at || now,
                completed_at: now
            };
        }
        return step;
    });
}

/**
 * Calculate overall progress percentage from step statuses
 *
 * @param steps - Array of PersonaProgressStep
 * @returns Percentage (0-100) of completed steps
 */
export function calculateStepProgress(steps: PersonaProgressStep[]): number {
    if (steps.length === 0) return 0;

    const completedCount = steps.filter((s) => s.status === "completed").length;
    const inProgressCount = steps.filter((s) => s.status === "in_progress").length;

    // Count in_progress steps as half complete
    const effectiveComplete = completedCount + inProgressCount * 0.5;

    return Math.round((effectiveComplete / steps.length) * 100);
}
