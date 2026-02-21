/**
 * Persona Signals Parser Tests
 *
 * Comprehensive tests for the persona workflow signal parsing system:
 * - parsePersonaResponse() - main parser function
 * - hasCompletionSignal() - completion signal detection
 * - getDeliverableSignals() - deliverable signal extraction
 * - getProgressSignals() - progress signal extraction
 */

import {
    parsePersonaResponse,
    hasCompletionSignal,
    getDeliverableSignals,
    getProgressSignals,
    initializeProgressSteps,
    matchProgressToSopStep,
    updateStepStatuses,
    calculateStepProgress,
    type PersonaWorkflowSignal,
    type ProgressSignal,
    type DeliverableSignal,
    type CompleteSignal
} from "../persona-signals";

// ============================================================================
// PARSE PERSONA RESPONSE
// ============================================================================

describe("parsePersonaResponse", () => {
    describe("basic parsing", () => {
        it("should return empty results for empty content", () => {
            const result = parsePersonaResponse("");
            expect(result.textContent).toBe("");
            expect(result.signals).toHaveLength(0);
            expect(result.parseErrors).toHaveLength(0);
        });

        it("should return text unchanged when no signals present", () => {
            const content = "This is just regular text without any signals.";
            const result = parsePersonaResponse(content);
            expect(result.textContent).toBe(content);
            expect(result.signals).toHaveLength(0);
            expect(result.parseErrors).toHaveLength(0);
        });

        it("should extract a single progress signal", () => {
            const content = `Here is my update.

\`\`\`workflow-signal
{
    "type": "progress",
    "current_step": "Analyzing data"
}
\`\`\`

More text here.`;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(1);
            expect(result.signals[0].type).toBe("progress");
            expect((result.signals[0] as ProgressSignal).current_step).toBe("Analyzing data");
            expect(result.textContent).toBe("Here is my update.\n\n\n\nMore text here.");
        });

        it("should extract a single deliverable signal", () => {
            const content = `I've created a report.

\`\`\`workflow-signal
{
    "type": "deliverable",
    "name": "analysis-report",
    "deliverable_type": "markdown",
    "content": "# Report\\n\\nContent here."
}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(1);
            expect(result.signals[0].type).toBe("deliverable");
            const deliverable = result.signals[0] as DeliverableSignal;
            expect(deliverable.name).toBe("analysis-report");
            expect(deliverable.deliverable_type).toBe("markdown");
            expect(deliverable.content).toBe("# Report\n\nContent here.");
        });

        it("should extract a completion signal", () => {
            const content = `All done!

\`\`\`workflow-signal
{
    "type": "complete",
    "summary": "Completed the analysis successfully",
    "deliverables_created": ["report.md", "data.csv"]
}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(1);
            expect(result.signals[0].type).toBe("complete");
            const complete = result.signals[0] as CompleteSignal;
            expect(complete.summary).toBe("Completed the analysis successfully");
            expect(complete.deliverables_created).toEqual(["report.md", "data.csv"]);
        });
    });

    describe("multiple signals", () => {
        it("should extract multiple signals from one response", () => {
            const content = `Starting work...

\`\`\`workflow-signal
{
    "type": "progress",
    "current_step": "Creating report",
    "percentage": 80
}
\`\`\`

Here's the deliverable:

\`\`\`workflow-signal
{
    "type": "deliverable",
    "name": "final-report",
    "deliverable_type": "markdown",
    "content": "# Final Report"
}
\`\`\`

And I'm done:

\`\`\`workflow-signal
{
    "type": "complete",
    "summary": "All work completed"
}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(3);
            expect(result.signals[0].type).toBe("progress");
            expect(result.signals[1].type).toBe("deliverable");
            expect(result.signals[2].type).toBe("complete");
        });

        it("should handle multiple deliverables", () => {
            const content = `\`\`\`workflow-signal
{
    "type": "deliverable",
    "name": "report-1",
    "deliverable_type": "markdown",
    "content": "Report 1"
}
\`\`\`

\`\`\`workflow-signal
{
    "type": "deliverable",
    "name": "report-2",
    "deliverable_type": "csv",
    "content": "a,b,c"
}
\`\`\``;

            const result = parsePersonaResponse(content);
            const deliverables = getDeliverableSignals(result.signals);
            expect(deliverables).toHaveLength(2);
            expect(deliverables[0].name).toBe("report-1");
            expect(deliverables[1].name).toBe("report-2");
        });
    });

    describe("text content extraction", () => {
        it("should remove signal blocks from text content", () => {
            const content = `Before signal.

\`\`\`workflow-signal
{"type": "progress", "current_step": "Working"}
\`\`\`

After signal.`;

            const result = parsePersonaResponse(content);
            expect(result.textContent).toBe("Before signal.\n\n\n\nAfter signal.");
        });

        it("should handle signal at the start of content", () => {
            const content = `\`\`\`workflow-signal
{"type": "progress", "current_step": "Starting"}
\`\`\`

Text after.`;

            const result = parsePersonaResponse(content);
            expect(result.textContent.trim()).toBe("Text after.");
            expect(result.signals).toHaveLength(1);
        });

        it("should handle signal at the end of content", () => {
            const content = `Text before.

\`\`\`workflow-signal
{"type": "complete", "summary": "Done"}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.textContent.trim()).toBe("Text before.");
            expect(result.signals).toHaveLength(1);
        });

        it("should preserve whitespace around signals appropriately", () => {
            const content =
                'Line 1\n\n```workflow-signal\n{"type": "progress", "current_step": "test"}\n```\n\nLine 2';
            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(1);
        });
    });

    describe("progress signal validation", () => {
        it("should parse progress signal with all optional fields", () => {
            const content = `\`\`\`workflow-signal
{
    "type": "progress",
    "current_step": "Analyzing",
    "completed_steps": ["Step 1", "Step 2"],
    "remaining_steps": ["Step 4", "Step 5"],
    "percentage": 60,
    "message": "Making good progress"
}
\`\`\``;

            const result = parsePersonaResponse(content);
            const progress = result.signals[0] as ProgressSignal;
            expect(progress.current_step).toBe("Analyzing");
            expect(progress.completed_steps).toEqual(["Step 1", "Step 2"]);
            expect(progress.remaining_steps).toEqual(["Step 4", "Step 5"]);
            expect(progress.percentage).toBe(60);
            expect(progress.message).toBe("Making good progress");
        });

        it("should parse progress signal with only required fields", () => {
            const content = `\`\`\`workflow-signal
{"type": "progress", "current_step": "Working on task"}
\`\`\``;

            const result = parsePersonaResponse(content);
            const progress = result.signals[0] as ProgressSignal;
            expect(progress.current_step).toBe("Working on task");
            expect(progress.completed_steps).toBeUndefined();
            expect(progress.remaining_steps).toBeUndefined();
            expect(progress.percentage).toBeUndefined();
            expect(progress.message).toBeUndefined();
        });

        it("should reject progress signal without current_step", () => {
            const content = `\`\`\`workflow-signal
{"type": "progress", "percentage": 50}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(0);
            expect(result.parseErrors).toHaveLength(1);
            expect(result.parseErrors[0]).toContain("Unknown signal type");
        });
    });

    describe("deliverable signal validation", () => {
        it("should parse deliverable signal with all optional fields", () => {
            const content = `\`\`\`workflow-signal
{
    "type": "deliverable",
    "name": "analysis",
    "deliverable_type": "code",
    "content": "const x = 1;",
    "description": "JavaScript analysis code",
    "file_extension": "js"
}
\`\`\``;

            const result = parsePersonaResponse(content);
            const deliverable = result.signals[0] as DeliverableSignal;
            expect(deliverable.name).toBe("analysis");
            expect(deliverable.deliverable_type).toBe("code");
            expect(deliverable.content).toBe("const x = 1;");
            expect(deliverable.description).toBe("JavaScript analysis code");
            expect(deliverable.file_extension).toBe("js");
        });

        it("should parse deliverable with only required fields", () => {
            const content = `\`\`\`workflow-signal
{
    "type": "deliverable",
    "name": "report",
    "deliverable_type": "markdown",
    "content": "# Report"
}
\`\`\``;

            const result = parsePersonaResponse(content);
            const deliverable = result.signals[0] as DeliverableSignal;
            expect(deliverable.name).toBe("report");
            expect(deliverable.description).toBeUndefined();
            expect(deliverable.file_extension).toBeUndefined();
        });

        it("should validate deliverable_type enum values", () => {
            const validTypes = ["markdown", "csv", "json", "code", "html", "pdf", "image"];

            for (const type of validTypes) {
                const content = `\`\`\`workflow-signal
{"type": "deliverable", "name": "test", "deliverable_type": "${type}", "content": "test"}
\`\`\``;

                const result = parsePersonaResponse(content);
                expect(result.signals).toHaveLength(1);
                expect((result.signals[0] as DeliverableSignal).deliverable_type).toBe(type);
            }
        });

        it("should reject deliverable with invalid type", () => {
            const content = `\`\`\`workflow-signal
{"type": "deliverable", "name": "test", "deliverable_type": "invalid_type", "content": "test"}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(0);
            expect(result.parseErrors).toHaveLength(1);
        });

        it("should reject deliverable without name", () => {
            const content = `\`\`\`workflow-signal
{"type": "deliverable", "deliverable_type": "markdown", "content": "test"}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(0);
            expect(result.parseErrors).toHaveLength(1);
        });

        it("should reject deliverable without content", () => {
            const content = `\`\`\`workflow-signal
{"type": "deliverable", "name": "test", "deliverable_type": "markdown"}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(0);
            expect(result.parseErrors).toHaveLength(1);
        });
    });

    describe("complete signal validation", () => {
        it("should parse complete signal with all optional fields", () => {
            const content = `\`\`\`workflow-signal
{
    "type": "complete",
    "summary": "Task finished successfully",
    "deliverables_created": ["report.md", "data.csv"],
    "key_findings": ["Finding 1", "Finding 2"],
    "recommendations": ["Rec 1", "Rec 2"],
    "notes": "Additional notes here"
}
\`\`\``;

            const result = parsePersonaResponse(content);
            const complete = result.signals[0] as CompleteSignal;
            expect(complete.summary).toBe("Task finished successfully");
            expect(complete.deliverables_created).toEqual(["report.md", "data.csv"]);
            expect(complete.key_findings).toEqual(["Finding 1", "Finding 2"]);
            expect(complete.recommendations).toEqual(["Rec 1", "Rec 2"]);
            expect(complete.notes).toBe("Additional notes here");
        });

        it("should parse complete signal with only required fields", () => {
            const content = `\`\`\`workflow-signal
{"type": "complete", "summary": "Done"}
\`\`\``;

            const result = parsePersonaResponse(content);
            const complete = result.signals[0] as CompleteSignal;
            expect(complete.summary).toBe("Done");
            expect(complete.deliverables_created).toBeUndefined();
            expect(complete.key_findings).toBeUndefined();
            expect(complete.recommendations).toBeUndefined();
            expect(complete.notes).toBeUndefined();
        });

        it("should reject complete signal without summary", () => {
            const content = `\`\`\`workflow-signal
{"type": "complete", "deliverables_created": ["test.md"]}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(0);
            expect(result.parseErrors).toHaveLength(1);
        });
    });

    describe("error handling", () => {
        it("should handle malformed JSON gracefully", () => {
            const content = `\`\`\`workflow-signal
{invalid json here}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(0);
            expect(result.parseErrors).toHaveLength(1);
            expect(result.parseErrors[0]).toContain("Failed to parse signal JSON");
        });

        it("should handle signal without type field", () => {
            const content = `\`\`\`workflow-signal
{"name": "test", "value": 123}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(0);
            expect(result.parseErrors).toHaveLength(1);
            expect(result.parseErrors[0]).toContain("missing 'type' field");
        });

        it("should handle unknown signal type", () => {
            const content = `\`\`\`workflow-signal
{"type": "unknown_type", "data": "test"}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(0);
            expect(result.parseErrors).toHaveLength(1);
            expect(result.parseErrors[0]).toContain("Unknown signal type");
        });

        it("should continue parsing after encountering an error", () => {
            const content = `\`\`\`workflow-signal
{invalid json}
\`\`\`

\`\`\`workflow-signal
{"type": "progress", "current_step": "Valid signal"}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(1);
            expect(result.parseErrors).toHaveLength(1);
            expect(result.signals[0].type).toBe("progress");
        });

        it("should handle empty signal blocks", () => {
            const content = `\`\`\`workflow-signal

\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(0);
            expect(result.parseErrors).toHaveLength(1);
        });
    });

    describe("edge cases", () => {
        it("should not match regular code blocks", () => {
            const content = `\`\`\`javascript
const x = { type: "progress" };
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(0);
            expect(result.textContent).toContain("javascript");
        });

        it("should not match incomplete signal blocks", () => {
            const content = `\`\`\`workflow-signal
{"type": "progress"`;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(0);
        });

        it("should handle Unicode content in signals", () => {
            const content = `\`\`\`workflow-signal
{
    "type": "deliverable",
    "name": "unicode-test",
    "deliverable_type": "markdown",
    "content": "Hello \u4e16\u754c! Emoji: \ud83d\ude00"
}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(1);
            const deliverable = result.signals[0] as DeliverableSignal;
            expect(deliverable.content).toContain("\u4e16\u754c");
        });

        it("should handle very long content in deliverables", () => {
            const longContent = "x".repeat(100000);
            const content = `\`\`\`workflow-signal
{
    "type": "deliverable",
    "name": "long-file",
    "deliverable_type": "markdown",
    "content": "${longContent}"
}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(1);
            const deliverable = result.signals[0] as DeliverableSignal;
            expect(deliverable.content.length).toBe(100000);
        });

        it("should handle newlines in signal JSON", () => {
            const content = `\`\`\`workflow-signal
{
    "type": "deliverable",
    "name": "test",
    "deliverable_type": "markdown",
    "content": "Line 1\\nLine 2\\nLine 3"
}
\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(1);
            const deliverable = result.signals[0] as DeliverableSignal;
            expect(deliverable.content).toBe("Line 1\nLine 2\nLine 3");
        });

        it("should handle signals with extra whitespace", () => {
            const content = `\`\`\`workflow-signal

    {  "type"  :  "progress"  ,  "current_step"  :  "Test"  }

\`\`\``;

            const result = parsePersonaResponse(content);
            expect(result.signals).toHaveLength(1);
            expect((result.signals[0] as ProgressSignal).current_step).toBe("Test");
        });
    });
});

// ============================================================================
// HAS COMPLETION SIGNAL
// ============================================================================

describe("hasCompletionSignal", () => {
    it("should return null when no signals present", () => {
        const signals: PersonaWorkflowSignal[] = [];
        expect(hasCompletionSignal(signals)).toBeNull();
    });

    it("should return null when no completion signal present", () => {
        const signals: PersonaWorkflowSignal[] = [
            { type: "progress", current_step: "Working" },
            { type: "deliverable", name: "test", deliverable_type: "markdown", content: "test" }
        ];
        expect(hasCompletionSignal(signals)).toBeNull();
    });

    it("should return the completion signal when present", () => {
        const signals: PersonaWorkflowSignal[] = [
            { type: "progress", current_step: "Working" },
            { type: "complete", summary: "All done" }
        ];
        const result = hasCompletionSignal(signals);
        expect(result).not.toBeNull();
        expect(result?.type).toBe("complete");
        expect(result?.summary).toBe("All done");
    });

    it("should return the first completion signal if multiple exist", () => {
        const signals: PersonaWorkflowSignal[] = [
            { type: "complete", summary: "First completion" },
            { type: "complete", summary: "Second completion" }
        ];
        const result = hasCompletionSignal(signals);
        expect(result?.summary).toBe("First completion");
    });
});

// ============================================================================
// GET DELIVERABLE SIGNALS
// ============================================================================

describe("getDeliverableSignals", () => {
    it("should return empty array when no signals present", () => {
        const signals: PersonaWorkflowSignal[] = [];
        expect(getDeliverableSignals(signals)).toEqual([]);
    });

    it("should return empty array when no deliverable signals present", () => {
        const signals: PersonaWorkflowSignal[] = [
            { type: "progress", current_step: "Working" },
            { type: "complete", summary: "Done" }
        ];
        expect(getDeliverableSignals(signals)).toEqual([]);
    });

    it("should return all deliverable signals", () => {
        const signals: PersonaWorkflowSignal[] = [
            { type: "progress", current_step: "Working" },
            {
                type: "deliverable",
                name: "report1",
                deliverable_type: "markdown",
                content: "test1"
            },
            { type: "deliverable", name: "report2", deliverable_type: "csv", content: "test2" },
            { type: "complete", summary: "Done" }
        ];
        const deliverables = getDeliverableSignals(signals);
        expect(deliverables).toHaveLength(2);
        expect(deliverables[0].name).toBe("report1");
        expect(deliverables[1].name).toBe("report2");
    });

    it("should preserve deliverable order", () => {
        const signals: PersonaWorkflowSignal[] = [
            { type: "deliverable", name: "first", deliverable_type: "markdown", content: "1" },
            { type: "deliverable", name: "second", deliverable_type: "markdown", content: "2" },
            { type: "deliverable", name: "third", deliverable_type: "markdown", content: "3" }
        ];
        const deliverables = getDeliverableSignals(signals);
        expect(deliverables.map((d) => d.name)).toEqual(["first", "second", "third"]);
    });
});

// ============================================================================
// GET PROGRESS SIGNALS
// ============================================================================

describe("getProgressSignals", () => {
    it("should return empty array when no signals present", () => {
        const signals: PersonaWorkflowSignal[] = [];
        expect(getProgressSignals(signals)).toEqual([]);
    });

    it("should return empty array when no progress signals present", () => {
        const signals: PersonaWorkflowSignal[] = [
            { type: "deliverable", name: "test", deliverable_type: "markdown", content: "test" },
            { type: "complete", summary: "Done" }
        ];
        expect(getProgressSignals(signals)).toEqual([]);
    });

    it("should return all progress signals", () => {
        const signals: PersonaWorkflowSignal[] = [
            { type: "progress", current_step: "Step 1", percentage: 25 },
            { type: "deliverable", name: "test", deliverable_type: "markdown", content: "test" },
            { type: "progress", current_step: "Step 2", percentage: 50 },
            { type: "complete", summary: "Done" }
        ];
        const progressSignals = getProgressSignals(signals);
        expect(progressSignals).toHaveLength(2);
        expect(progressSignals[0].current_step).toBe("Step 1");
        expect(progressSignals[1].current_step).toBe("Step 2");
    });

    it("should preserve progress signal order", () => {
        const signals: PersonaWorkflowSignal[] = [
            { type: "progress", current_step: "First", percentage: 10 },
            { type: "progress", current_step: "Second", percentage: 50 },
            { type: "progress", current_step: "Third", percentage: 90 }
        ];
        const progressSignals = getProgressSignals(signals);
        expect(progressSignals.map((p) => p.current_step)).toEqual(["First", "Second", "Third"]);
    });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("integration scenarios", () => {
    it("should handle a typical persona response with progress and completion", () => {
        const content = `I'm making progress on your competitive analysis.

\`\`\`workflow-signal
{
    "type": "progress",
    "current_step": "Analyzing competitor websites",
    "completed_steps": ["Identified competitors", "Gathered public data"],
    "remaining_steps": ["Create report", "Add recommendations"],
    "percentage": 50
}
\`\`\`

I've found some interesting insights about the market positioning of your main competitors.

\`\`\`workflow-signal
{
    "type": "deliverable",
    "name": "competitive-analysis",
    "deliverable_type": "markdown",
    "content": "# Competitive Analysis\\n\\n## Executive Summary\\n\\nThis report analyzes...",
    "description": "Comprehensive competitive analysis report"
}
\`\`\`

\`\`\`workflow-signal
{
    "type": "complete",
    "summary": "Completed competitive analysis with comprehensive report",
    "deliverables_created": ["competitive-analysis"],
    "key_findings": [
        "Competitor A has 40% market share",
        "Competitor B focusing on enterprise segment"
    ],
    "recommendations": [
        "Focus on SMB market",
        "Improve pricing transparency"
    ]
}
\`\`\``;

        const result = parsePersonaResponse(content);

        // Check signals were extracted correctly
        expect(result.signals).toHaveLength(3);
        expect(result.parseErrors).toHaveLength(0);

        // Check progress signal
        const progressSignals = getProgressSignals(result.signals);
        expect(progressSignals).toHaveLength(1);
        expect(progressSignals[0].percentage).toBe(50);

        // Check deliverable signal
        const deliverables = getDeliverableSignals(result.signals);
        expect(deliverables).toHaveLength(1);
        expect(deliverables[0].name).toBe("competitive-analysis");

        // Check completion signal
        const completion = hasCompletionSignal(result.signals);
        expect(completion).not.toBeNull();
        expect(completion?.key_findings).toHaveLength(2);

        // Check text content was cleaned
        expect(result.textContent).toContain("I'm making progress");
        expect(result.textContent).toContain("interesting insights");
        expect(result.textContent).not.toContain("workflow-signal");
    });

    it("should handle a response with only deliverables (no progress or completion)", () => {
        const content = `Here are the reports you requested:

\`\`\`workflow-signal
{
    "type": "deliverable",
    "name": "summary-report",
    "deliverable_type": "markdown",
    "content": "# Summary"
}
\`\`\`

\`\`\`workflow-signal
{
    "type": "deliverable",
    "name": "data-export",
    "deliverable_type": "csv",
    "content": "name,value\\nA,1\\nB,2"
}
\`\`\``;

        const result = parsePersonaResponse(content);
        expect(result.signals).toHaveLength(2);
        expect(getDeliverableSignals(result.signals)).toHaveLength(2);
        expect(getProgressSignals(result.signals)).toHaveLength(0);
        expect(hasCompletionSignal(result.signals)).toBeNull();
    });

    it("should handle mixed valid and invalid signals", () => {
        const content = `Working on your request.

\`\`\`workflow-signal
{"type": "progress", "current_step": "Valid progress"}
\`\`\`

\`\`\`workflow-signal
{invalid json here}
\`\`\`

\`\`\`workflow-signal
{"type": "unknown_type"}
\`\`\`

\`\`\`workflow-signal
{"type": "complete", "summary": "Valid completion"}
\`\`\``;

        const result = parsePersonaResponse(content);

        // Should have 2 valid signals
        expect(result.signals).toHaveLength(2);
        expect(result.signals[0].type).toBe("progress");
        expect(result.signals[1].type).toBe("complete");

        // Should have 2 parse errors
        expect(result.parseErrors).toHaveLength(2);
    });
});

// ============================================================================
// SOP STEP TRACKING
// ============================================================================

describe("initializeProgressSteps", () => {
    it("should initialize steps with pending status", () => {
        const sopSteps = ["Research", "Analyze", "Write Report"];
        const steps = initializeProgressSteps(sopSteps);

        expect(steps).toHaveLength(3);
        expect(steps[0]).toEqual({
            index: 0,
            title: "Research",
            status: "pending",
            started_at: null,
            completed_at: null
        });
        expect(steps[1]).toEqual({
            index: 1,
            title: "Analyze",
            status: "pending",
            started_at: null,
            completed_at: null
        });
        expect(steps[2]).toEqual({
            index: 2,
            title: "Write Report",
            status: "pending",
            started_at: null,
            completed_at: null
        });
    });

    it("should return empty array for empty input", () => {
        const steps = initializeProgressSteps([]);
        expect(steps).toEqual([]);
    });

    it("should handle single step", () => {
        const steps = initializeProgressSteps(["Single Task"]);
        expect(steps).toHaveLength(1);
        expect(steps[0].status).toBe("pending");
        expect(steps[0].title).toBe("Single Task");
        expect(steps[0].index).toBe(0);
    });
});

describe("matchProgressToSopStep", () => {
    const sopSteps = [
        "Research competitors",
        "Analyze market trends",
        "Write comprehensive report"
    ];

    it("should match exact step name", () => {
        const index = matchProgressToSopStep("Research competitors", sopSteps);
        expect(index).toBe(0);
    });

    it("should match case-insensitive", () => {
        const index = matchProgressToSopStep("research competitors", sopSteps);
        expect(index).toBe(0);
    });

    it("should match partial step name (substring)", () => {
        const index = matchProgressToSopStep("Analyzing market", sopSteps);
        expect(index).toBe(1);
    });

    it("should match using fuzzy matching for similar text", () => {
        const index = matchProgressToSopStep("Research competitor data", sopSteps);
        expect(index).toBe(0);
    });

    it("should return -1 for no match", () => {
        const index = matchProgressToSopStep("Completely unrelated task", sopSteps);
        expect(index).toBe(-1);
    });

    it("should handle empty SOP steps", () => {
        const index = matchProgressToSopStep("Some step", []);
        expect(index).toBe(-1);
    });

    it("should match step containing signal step", () => {
        const index = matchProgressToSopStep("Write report", sopSteps);
        expect(index).toBe(2);
    });
});

describe("updateStepStatuses", () => {
    const sopSteps = ["Step 1", "Step 2", "Step 3", "Step 4"];

    it("should mark current step as in_progress", () => {
        const currentSteps = initializeProgressSteps(sopSteps);
        const progressSignal: ProgressSignal = {
            type: "progress",
            current_step: "Step 2"
        };

        const updated = updateStepStatuses(currentSteps, progressSignal, sopSteps);

        // Step 1 is before current step, so it's completed
        expect(updated[0].status).toBe("completed");
        expect(updated[1].status).toBe("in_progress");
        expect(updated[2].status).toBe("pending");
        expect(updated[3].status).toBe("pending");
    });

    it("should mark first step as in_progress when starting", () => {
        const currentSteps = initializeProgressSteps(sopSteps);
        const progressSignal: ProgressSignal = {
            type: "progress",
            current_step: "Step 1"
        };

        const updated = updateStepStatuses(currentSteps, progressSignal, sopSteps);

        expect(updated[0].status).toBe("in_progress");
        expect(updated[1].status).toBe("pending");
        expect(updated[2].status).toBe("pending");
        expect(updated[3].status).toBe("pending");
    });

    it("should mark previous steps as completed when current step advances", () => {
        const currentSteps = initializeProgressSteps(sopSteps);
        const progressSignal: ProgressSignal = {
            type: "progress",
            current_step: "Step 3"
        };

        const updated = updateStepStatuses(currentSteps, progressSignal, sopSteps);

        expect(updated[0].status).toBe("completed");
        expect(updated[1].status).toBe("completed");
        expect(updated[2].status).toBe("in_progress");
        expect(updated[3].status).toBe("pending");
    });

    it("should handle completed_steps from signal", () => {
        const currentSteps = initializeProgressSteps(sopSteps);
        const progressSignal: ProgressSignal = {
            type: "progress",
            current_step: "Step 3",
            completed_steps: ["Step 1", "Step 2"]
        };

        const updated = updateStepStatuses(currentSteps, progressSignal, sopSteps);

        expect(updated[0].status).toBe("completed");
        expect(updated[1].status).toBe("completed");
        expect(updated[2].status).toBe("in_progress");
    });

    it("should preserve completed status", () => {
        const currentSteps = [
            {
                index: 0,
                title: "Step 1",
                status: "completed" as const,
                started_at: "2024-01-01",
                completed_at: "2024-01-01"
            },
            {
                index: 1,
                title: "Step 2",
                status: "completed" as const,
                started_at: "2024-01-01",
                completed_at: "2024-01-01"
            },
            {
                index: 2,
                title: "Step 3",
                status: "in_progress" as const,
                started_at: "2024-01-01",
                completed_at: null
            },
            {
                index: 3,
                title: "Step 4",
                status: "pending" as const,
                started_at: null,
                completed_at: null
            }
        ];
        const progressSignal: ProgressSignal = {
            type: "progress",
            current_step: "Step 4"
        };

        const updated = updateStepStatuses(currentSteps, progressSignal, sopSteps);

        expect(updated[0].status).toBe("completed");
        expect(updated[1].status).toBe("completed");
        expect(updated[2].status).toBe("completed");
        expect(updated[3].status).toBe("in_progress");
    });

    it("should not change steps if signal step not matched", () => {
        const currentSteps = initializeProgressSteps(sopSteps);
        const progressSignal: ProgressSignal = {
            type: "progress",
            current_step: "Unknown step"
        };

        const updated = updateStepStatuses(currentSteps, progressSignal, sopSteps);

        // All should remain pending
        expect(updated.every((s) => s.status === "pending")).toBe(true);
    });

    it("should handle empty current steps", () => {
        const progressSignal: ProgressSignal = {
            type: "progress",
            current_step: "Step 1"
        };

        const updated = updateStepStatuses([], progressSignal, sopSteps);
        expect(updated).toEqual([]);
    });
});

describe("calculateStepProgress", () => {
    it("should return 0 for empty steps", () => {
        expect(calculateStepProgress([])).toBe(0);
    });

    it("should return 0 for all pending steps", () => {
        const steps = [
            {
                index: 0,
                title: "Step 1",
                status: "pending" as const,
                started_at: null,
                completed_at: null
            },
            {
                index: 1,
                title: "Step 2",
                status: "pending" as const,
                started_at: null,
                completed_at: null
            },
            {
                index: 2,
                title: "Step 3",
                status: "pending" as const,
                started_at: null,
                completed_at: null
            }
        ];
        expect(calculateStepProgress(steps)).toBe(0);
    });

    it("should calculate progress with completed steps", () => {
        const steps = [
            {
                index: 0,
                title: "Step 1",
                status: "completed" as const,
                started_at: "2024-01-01",
                completed_at: "2024-01-01"
            },
            {
                index: 1,
                title: "Step 2",
                status: "completed" as const,
                started_at: "2024-01-01",
                completed_at: "2024-01-01"
            },
            {
                index: 2,
                title: "Step 3",
                status: "in_progress" as const,
                started_at: "2024-01-01",
                completed_at: null
            },
            {
                index: 3,
                title: "Step 4",
                status: "pending" as const,
                started_at: null,
                completed_at: null
            }
        ];
        // 2 completed + 0.5 for in_progress = 2.5 / 4 = 62.5%
        expect(calculateStepProgress(steps)).toBe(63);
    });

    it("should return 100 for all completed steps", () => {
        const steps = [
            {
                index: 0,
                title: "Step 1",
                status: "completed" as const,
                started_at: "2024-01-01",
                completed_at: "2024-01-01"
            },
            {
                index: 1,
                title: "Step 2",
                status: "completed" as const,
                started_at: "2024-01-01",
                completed_at: "2024-01-01"
            },
            {
                index: 2,
                title: "Step 3",
                status: "completed" as const,
                started_at: "2024-01-01",
                completed_at: "2024-01-01"
            }
        ];
        expect(calculateStepProgress(steps)).toBe(100);
    });

    it("should handle single in_progress step", () => {
        const steps = [
            {
                index: 0,
                title: "Step 1",
                status: "in_progress" as const,
                started_at: "2024-01-01",
                completed_at: null
            }
        ];
        expect(calculateStepProgress(steps)).toBe(50);
    });

    it("should handle multiple in_progress steps", () => {
        const steps = [
            {
                index: 0,
                title: "Step 1",
                status: "in_progress" as const,
                started_at: "2024-01-01",
                completed_at: null
            },
            {
                index: 1,
                title: "Step 2",
                status: "in_progress" as const,
                started_at: "2024-01-01",
                completed_at: null
            }
        ];
        // 0.5 + 0.5 = 1 / 2 = 50%
        expect(calculateStepProgress(steps)).toBe(50);
    });
});
