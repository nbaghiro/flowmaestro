/**
 * Reflection Loop Integration Tests (Self-Improving Pattern)
 *
 * Tests for self-improving workflows that iterate until quality is achieved:
 * - Generate -> Evaluate -> Refine loops
 * - Quality threshold-based termination
 * - Maximum iteration limits
 * - Improvement tracking across iterations
 * - Convergence detection (no improvement)
 */

import { createContext, storeNodeOutput, setVariable } from "../../core/services/context";
import type { BuiltWorkflow, ExecutableNode, TypedEdge } from "../../activities/execution/types";
import type { ContextSnapshot } from "../../core/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a reflection loop workflow
 * Input -> Generate -> Evaluate -> [Refine -> Evaluate]* -> Output
 *
 * The workflow iterates until quality score meets threshold or max iterations reached
 */
function createReflectionWorkflow(options: {
    qualityThreshold?: number;
    maxIterations?: number;
}): BuiltWorkflow {
    const { qualityThreshold = 0.8, maxIterations = 5 } = options;
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "task" },
        depth: 0,
        dependencies: [],
        dependents: ["Generate"]
    });

    // Generate node (initial content generation)
    nodes.set("Generate", {
        id: "Generate",
        type: "llm",
        name: "Generate",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Generate initial content for: {{Input.task}}",
            role: "generator"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Evaluate"]
    });

    // Evaluate node (quality assessment)
    nodes.set("Evaluate", {
        id: "Evaluate",
        type: "llm",
        name: "Evaluate",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Evaluate the quality of this content and provide a score 0-1: {{currentContent}}",
            role: "evaluator",
            outputFormat: "json",
            qualityThreshold,
            maxIterations
        },
        depth: 2,
        dependencies: ["Generate"],
        dependents: ["Conditional"]
    });

    // Conditional node (check if quality meets threshold)
    nodes.set("Conditional", {
        id: "Conditional",
        type: "conditional",
        name: "QualityCheck",
        config: {
            condition:
                "{{Evaluate.score}} >= {{qualityThreshold}} || {{iteration}} >= {{maxIterations}}",
            qualityThreshold,
            maxIterations
        },
        depth: 3,
        dependencies: ["Evaluate"],
        dependents: ["Refine", "Output"]
    });

    // Refine node (improve content based on feedback)
    nodes.set("Refine", {
        id: "Refine",
        type: "llm",
        name: "Refine",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Improve this content based on feedback:\nContent: {{currentContent}}\nFeedback: {{Evaluate.feedback}}",
            role: "refiner"
        },
        depth: 4,
        dependencies: ["Conditional"],
        dependents: ["Evaluate"]
    });

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 5,
        dependencies: ["Conditional"],
        dependents: []
    });

    // Edges
    edges.set("Input-Generate", {
        id: "Input-Generate",
        source: "Input",
        target: "Generate",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Generate-Evaluate", {
        id: "Generate-Evaluate",
        source: "Generate",
        target: "Evaluate",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Evaluate-Conditional", {
        id: "Evaluate-Conditional",
        source: "Evaluate",
        target: "Conditional",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Conditional-Refine", {
        id: "Conditional-Refine",
        source: "Conditional",
        target: "Refine",
        sourceHandle: "false",
        targetHandle: "input",
        handleType: "false"
    });

    edges.set("Conditional-Output", {
        id: "Conditional-Output",
        source: "Conditional",
        target: "Output",
        sourceHandle: "true",
        targetHandle: "input",
        handleType: "true"
    });

    edges.set("Refine-Evaluate", {
        id: "Refine-Evaluate",
        source: "Refine",
        target: "Evaluate",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [
            ["Input"],
            ["Generate"],
            ["Evaluate"],
            ["Conditional"],
            ["Refine", "Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate a reflection loop execution
 */
async function simulateReflectionLoop(
    initialTask: string,
    generateFn: (task: string, iteration: number) => { content: string },
    evaluateFn: (content: string, iteration: number) => { score: number; feedback: string },
    refineFn: (content: string, feedback: string, iteration: number) => { content: string },
    options: { qualityThreshold?: number; maxIterations?: number } = {}
): Promise<{
    context: ContextSnapshot;
    iterations: Array<{
        content: string;
        score: number;
        feedback: string;
    }>;
    finalContent: string;
    finalScore: number;
    iterationCount: number;
    terminationReason: "quality-met" | "max-iterations" | "no-improvement";
}> {
    const { qualityThreshold = 0.8, maxIterations = 5 } = options;

    let context = createContext({});
    context = setVariable(context, "task", initialTask);
    context = setVariable(context, "qualityThreshold", qualityThreshold);
    context = setVariable(context, "maxIterations", maxIterations);

    const iterations: Array<{ content: string; score: number; feedback: string }> = [];
    let currentContent = "";
    let currentScore = 0;
    let previousScore = -1;
    let iterationCount = 0;
    let terminationReason: "quality-met" | "max-iterations" | "no-improvement" = "quality-met";

    // Initial generation
    const generated = generateFn(initialTask, iterationCount);
    currentContent = generated.content;
    context = storeNodeOutput(context, "Generate", { content: currentContent });
    context = setVariable(context, "currentContent", currentContent);

    // Reflection loop
    while (iterationCount < maxIterations) {
        iterationCount++;
        context = setVariable(context, "iteration", iterationCount);

        // Evaluate
        const evaluation = evaluateFn(currentContent, iterationCount);
        currentScore = evaluation.score;
        context = storeNodeOutput(context, `Evaluate_${iterationCount}`, evaluation);

        iterations.push({
            content: currentContent,
            score: currentScore,
            feedback: evaluation.feedback
        });

        // Check quality threshold
        if (currentScore >= qualityThreshold) {
            terminationReason = "quality-met";
            break;
        }

        // Check for no improvement (convergence)
        if (currentScore <= previousScore && iterationCount > 1) {
            terminationReason = "no-improvement";
            break;
        }

        previousScore = currentScore;

        // Check max iterations before refining
        if (iterationCount >= maxIterations) {
            terminationReason = "max-iterations";
            break;
        }

        // Refine
        const refined = refineFn(currentContent, evaluation.feedback, iterationCount);
        currentContent = refined.content;
        context = storeNodeOutput(context, `Refine_${iterationCount}`, refined);
        context = setVariable(context, "currentContent", currentContent);
    }

    // Store final results
    context = storeNodeOutput(context, "Output", {
        finalContent: currentContent,
        finalScore: currentScore,
        iterationCount,
        terminationReason,
        history: iterations
    });

    return {
        context,
        iterations,
        finalContent: currentContent,
        finalScore: currentScore,
        iterationCount,
        terminationReason
    };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Reflection Loop (Self-Improving Pattern)", () => {
    describe("quality threshold termination", () => {
        it("should terminate when quality threshold is met on first try", async () => {
            const result = await simulateReflectionLoop(
                "Write a haiku about coding",
                () => ({
                    content:
                        "Code flows like water\nBugs scatter in the moonlight\nTests pass, peace returns"
                }),
                () => ({
                    score: 0.95,
                    feedback: "Excellent! Beautiful imagery and proper structure."
                }),
                (content) => ({ content }),
                { qualityThreshold: 0.9 }
            );

            expect(result.terminationReason).toBe("quality-met");
            expect(result.iterationCount).toBe(1);
            expect(result.finalScore).toBeGreaterThanOrEqual(0.9);
        });

        it("should refine until quality threshold is met", async () => {
            let callCount = 0;

            const result = await simulateReflectionLoop(
                "Write a product description",
                () => ({ content: "A good product. Buy it." }),
                (_content, iteration) => {
                    // Improve score with each iteration
                    const scores = [0.3, 0.5, 0.7, 0.85];
                    const feedbackMsgs = [
                        "Too brief, needs more detail",
                        "Better, but lacks persuasion",
                        "Good detail, needs stronger call to action",
                        "Excellent!"
                    ];
                    return {
                        score: scores[Math.min(iteration - 1, scores.length - 1)],
                        feedback: feedbackMsgs[Math.min(iteration - 1, feedbackMsgs.length - 1)]
                    };
                },
                (_content, _feedback, iteration) => {
                    callCount++;
                    const improvements = [
                        "An excellent product with amazing features. Consider buying it today.",
                        "Transform your life with this incredible product. Features include X, Y, Z.",
                        "Transform your life today! This incredible product features X, Y, Z. Buy now!"
                    ];
                    return {
                        content: improvements[Math.min(iteration - 1, improvements.length - 1)]
                    };
                },
                { qualityThreshold: 0.8 }
            );

            expect(result.terminationReason).toBe("quality-met");
            expect(result.iterationCount).toBe(4);
            expect(result.finalScore).toBeGreaterThanOrEqual(0.8);
            expect(callCount).toBe(3); // 3 refinements before meeting threshold
        });

        it("should use custom quality threshold", async () => {
            const result = await simulateReflectionLoop(
                "Summarize a document",
                () => ({ content: "Summary v1" }),
                (_content, iteration) => ({
                    score: 0.6 + iteration * 0.03, // 0.63, 0.66, 0.69... never reaches 0.95
                    feedback: `Iteration ${iteration} feedback`
                }),
                (_content, _feedback, iteration) => ({ content: `Summary v${iteration + 1}` }),
                { qualityThreshold: 0.95, maxIterations: 10 }
            );

            // With 0.03 increment, max score at iteration 10 is 0.9 (< 0.95)
            expect(result.finalScore).toBeLessThan(0.95);
            expect(result.terminationReason).toBe("max-iterations");
        });
    });

    describe("max iterations termination", () => {
        it("should terminate at max iterations if quality not met", async () => {
            const result = await simulateReflectionLoop(
                "Write perfect code",
                () => ({ content: "function foo() {}" }),
                (_content, iteration) => ({
                    score: 0.4 + iteration * 0.05, // Slowly improves but never reaches threshold
                    feedback: "Still needs improvement"
                }),
                (_content, _feedback, iteration) => ({
                    content: `function foo_v${iteration}() { /* improved */ }`
                }),
                { qualityThreshold: 0.9, maxIterations: 3 }
            );

            expect(result.terminationReason).toBe("max-iterations");
            expect(result.iterationCount).toBe(3);
            expect(result.finalScore).toBeLessThan(0.9);
        });

        it("should preserve all iteration history when hitting max", async () => {
            const result = await simulateReflectionLoop(
                "Generate content",
                () => ({ content: "Initial" }),
                (_content, iteration) => ({
                    score: 0.3 + iteration * 0.1,
                    feedback: `Feedback ${iteration}`
                }),
                (_content, _feedback, iteration) => ({ content: `Refined ${iteration}` }),
                { qualityThreshold: 0.99, maxIterations: 4 }
            );

            expect(result.iterations.length).toBe(4);
            expect(result.iterations[0].content).toBe("Initial");
            expect(result.iterations[1].content).toBe("Refined 1");
            expect(result.iterations[2].content).toBe("Refined 2");
            expect(result.iterations[3].content).toBe("Refined 3");
        });

        it("should handle single iteration limit", async () => {
            const result = await simulateReflectionLoop(
                "One shot task",
                () => ({ content: "One attempt" }),
                () => ({ score: 0.5, feedback: "Not great" }),
                () => ({ content: "Should not reach" }),
                { qualityThreshold: 0.9, maxIterations: 1 }
            );

            expect(result.terminationReason).toBe("max-iterations");
            expect(result.iterationCount).toBe(1);
            expect(result.finalContent).toBe("One attempt");
        });
    });

    describe("convergence detection (no improvement)", () => {
        it("should terminate when score stops improving", async () => {
            const result = await simulateReflectionLoop(
                "Optimize text",
                () => ({ content: "Initial text" }),
                (_content, iteration) => {
                    // Score plateaus after iteration 2
                    const scores = [0.4, 0.6, 0.6, 0.6];
                    return {
                        score: scores[Math.min(iteration - 1, scores.length - 1)],
                        feedback: "Try harder"
                    };
                },
                (_content, _feedback, iteration) => ({ content: `Attempt ${iteration}` }),
                { qualityThreshold: 0.9, maxIterations: 10 }
            );

            expect(result.terminationReason).toBe("no-improvement");
            expect(result.iterationCount).toBe(3);
            expect(result.finalScore).toBe(0.6);
        });

        it("should terminate when score decreases", async () => {
            const result = await simulateReflectionLoop(
                "Creative writing",
                () => ({ content: "Great start" }),
                (_content, iteration) => {
                    // Score decreases after good start
                    const scores = [0.7, 0.6, 0.5];
                    return {
                        score: scores[Math.min(iteration - 1, scores.length - 1)],
                        feedback: "Getting worse"
                    };
                },
                () => ({ content: "Worse content" }),
                { qualityThreshold: 0.9, maxIterations: 10 }
            );

            expect(result.terminationReason).toBe("no-improvement");
            expect(result.iterationCount).toBe(2);
        });
    });

    describe("improvement tracking", () => {
        it("should track score progression across iterations", async () => {
            const result = await simulateReflectionLoop(
                "Improve gradually",
                () => ({ content: "v1" }),
                (_content, iteration) => ({
                    score: 0.2 * iteration,
                    feedback: `Score: ${0.2 * iteration}`
                }),
                (_content, _feedback, iteration) => ({ content: `v${iteration + 1}` }),
                { qualityThreshold: 0.8, maxIterations: 5 }
            );

            const scores = result.iterations.map((i) => i.score);
            expect(scores.length).toBe(4);
            expect(scores[0]).toBeCloseTo(0.2, 5);
            expect(scores[1]).toBeCloseTo(0.4, 5);
            expect(scores[2]).toBeCloseTo(0.6, 5);
            expect(scores[3]).toBeCloseTo(0.8, 5);
            expect(result.terminationReason).toBe("quality-met");
        });

        it("should preserve feedback history", async () => {
            const feedbackMessages = [
                "Needs more detail",
                "Add examples",
                "Improve clarity",
                "Perfect!"
            ];

            const result = await simulateReflectionLoop(
                "Document API",
                () => ({ content: "API docs v1" }),
                (_content, iteration) => ({
                    score: 0.5 + iteration * 0.15,
                    feedback: feedbackMessages[Math.min(iteration - 1, feedbackMessages.length - 1)]
                }),
                (_content, _feedback, iteration) => ({ content: `API docs v${iteration + 1}` }),
                { qualityThreshold: 0.9, maxIterations: 5 }
            );

            expect(result.iterations[0].feedback).toBe("Needs more detail");
            expect(result.iterations[1].feedback).toBe("Add examples");
            expect(result.iterations[2].feedback).toBe("Improve clarity");
        });

        it("should calculate total improvement", async () => {
            const result = await simulateReflectionLoop(
                "Optimize",
                () => ({ content: "Start" }),
                (_content, iteration) => ({
                    score: 0.2 + iteration * 0.2,
                    feedback: "Keep going"
                }),
                () => ({ content: "Better" }),
                { qualityThreshold: 0.85, maxIterations: 5 }
            );

            const initialScore = result.iterations[0].score;
            const finalScore = result.finalScore;
            const improvement = finalScore - initialScore;

            // Initial: 0.4, then 0.6, then 0.8, then reaches 0.85+ at iteration 4 (1.0)
            expect(improvement).toBeGreaterThan(0.4);
            expect(finalScore).toBeGreaterThanOrEqual(0.85);
        });
    });

    describe("content evolution", () => {
        it("should show content improving through iterations", async () => {
            const result = await simulateReflectionLoop(
                "Write error message",
                () => ({ content: "Error" }),
                (content, iteration) => ({
                    score: content.length > 50 ? 0.9 : 0.3 + iteration * 0.1,
                    feedback: "Add more context and user guidance"
                }),
                (content, _feedback) => ({
                    content: content + ". Please check your input and try again."
                }),
                { qualityThreshold: 0.85, maxIterations: 5 }
            );

            // Content should grow with each iteration
            for (let i = 1; i < result.iterations.length; i++) {
                expect(result.iterations[i].content.length).toBeGreaterThanOrEqual(
                    result.iterations[i - 1].content.length
                );
            }
        });

        it("should incorporate feedback into refinements", async () => {
            const result = await simulateReflectionLoop(
                "Create greeting",
                () => ({ content: "Hi" }),
                (content) => {
                    if (!content.includes("name")) {
                        return { score: 0.4, feedback: "Include user's name" };
                    }
                    if (!content.includes("!")) {
                        return { score: 0.7, feedback: "Add enthusiasm" };
                    }
                    return { score: 0.95, feedback: "Great!" };
                },
                (content, feedback) => {
                    if (feedback.includes("name")) {
                        return { content: content + ", {name}" };
                    }
                    if (feedback.includes("enthusiasm")) {
                        return { content: content + "!" };
                    }
                    return { content };
                },
                { qualityThreshold: 0.9, maxIterations: 5 }
            );

            expect(result.finalContent).toContain("name");
            expect(result.finalContent).toContain("!");
            expect(result.finalScore).toBeGreaterThanOrEqual(0.9);
        });
    });

    describe("real-world scenarios", () => {
        it("should refine code until it passes review", async () => {
            const result = await simulateReflectionLoop(
                "Write a function to validate email",
                () => ({
                    content: 'function validateEmail(email) { return email.includes("@"); }'
                }),
                (content, iteration) => {
                    // Simulated code review
                    if (!content.includes("regex") && iteration === 1) {
                        return { score: 0.4, feedback: "Use regex for proper validation" };
                    }
                    if (!content.includes("trim") && iteration === 2) {
                        return { score: 0.6, feedback: "Handle whitespace" };
                    }
                    if (!content.includes("toLowerCase") && iteration === 3) {
                        return { score: 0.75, feedback: "Handle case sensitivity" };
                    }
                    return { score: 0.9, feedback: "Looks good!" };
                },
                (content, feedback, _iteration) => {
                    if (feedback.includes("regex")) {
                        return {
                            content: `function validateEmail(email) {
                                const regex = /^[^@]+@[^@]+\\.[^@]+$/;
                                return regex.test(email);
                            }`
                        };
                    }
                    if (feedback.includes("whitespace")) {
                        return { content: content.replace("email)", "email.trim())") };
                    }
                    if (feedback.includes("case")) {
                        return {
                            content: content.replace("email.trim()", "email.trim().toLowerCase()")
                        };
                    }
                    return { content };
                },
                { qualityThreshold: 0.85, maxIterations: 5 }
            );

            expect(result.terminationReason).toBe("quality-met");
            expect(result.finalContent).toContain("regex");
        });

        it("should refine documentation until comprehensive", async () => {
            const result = await simulateReflectionLoop(
                "Document the authentication module",
                () => ({ content: "Auth module handles login." }),
                (content, _iteration) => {
                    const lowerContent = content.toLowerCase();
                    let score = 0.3;
                    const feedback: string[] = [];

                    if (lowerContent.includes("parameter")) score += 0.15;
                    else feedback.push("Add parameter descriptions");

                    if (lowerContent.includes("return")) score += 0.15;
                    else feedback.push("Document return values");

                    if (lowerContent.includes("example")) score += 0.2;
                    else feedback.push("Include usage examples");

                    if (lowerContent.includes("error")) score += 0.15;
                    else feedback.push("Document error handling");

                    return {
                        score,
                        feedback: feedback.length > 0 ? feedback.join(". ") : "Complete!"
                    };
                },
                (content, feedback) => {
                    let newContent = content;
                    if (feedback.includes("parameter")) {
                        newContent += " Parameters: username (string), password (string).";
                    }
                    if (feedback.includes("return")) {
                        newContent += " Returns: JWT token on success.";
                    }
                    if (feedback.includes("example")) {
                        newContent += " Example: auth.login('user', 'pass').";
                    }
                    if (feedback.includes("error")) {
                        newContent += " Throws error on invalid credentials.";
                    }
                    return { content: newContent };
                },
                { qualityThreshold: 0.85, maxIterations: 6 }
            );

            expect(result.finalScore).toBeGreaterThanOrEqual(0.85);
            expect(result.finalContent.toLowerCase()).toContain("parameter");
            expect(result.finalContent.toLowerCase()).toContain("return");
        });

        it("should handle essay improvement workflow", async () => {
            const result = await simulateReflectionLoop(
                "Write an essay about AI",
                () => ({ content: "AI is changing the world." }),
                (content, _iteration) => {
                    const wordCount = content.split(" ").length;
                    let score = Math.min(wordCount / 100, 0.5); // Up to 0.5 for length

                    if (content.includes("however") || content.includes("therefore")) {
                        score += 0.2; // Transition words
                    }
                    if (content.includes("conclusion")) {
                        score += 0.15; // Has conclusion
                    }
                    if (content.includes("example")) {
                        score += 0.15; // Has examples
                    }

                    const feedback =
                        score < 0.9
                            ? "Expand with more analysis, transitions, and examples"
                            : "Well structured essay";

                    return { score: Math.min(score, 1), feedback };
                },
                (content, _feedback, iteration) => {
                    const additions = [
                        " However, there are challenges to consider.",
                        " For example, automation may displace workers.",
                        " Therefore, we must adapt our education systems.",
                        " In conclusion, AI presents both opportunities and risks."
                    ];
                    return {
                        content: content + (additions[iteration - 1] || " More analysis needed.")
                    };
                },
                { qualityThreshold: 0.85, maxIterations: 6 }
            );

            expect(result.iterations.length).toBeGreaterThan(1);
            expect(result.finalContent.length).toBeGreaterThan(50);
        });
    });

    describe("workflow structure validation", () => {
        it("should create valid reflection workflow structure", () => {
            const workflow = createReflectionWorkflow({
                qualityThreshold: 0.8,
                maxIterations: 3
            });

            // Verify workflow has correct nodes
            expect(workflow.nodes.has("Input")).toBe(true);
            expect(workflow.nodes.has("Generate")).toBe(true);
            expect(workflow.nodes.has("Evaluate")).toBe(true);
            expect(workflow.nodes.has("Conditional")).toBe(true);
            expect(workflow.nodes.has("Refine")).toBe(true);
            expect(workflow.nodes.has("Output")).toBe(true);

            // Verify dependencies
            const generateNode = workflow.nodes.get("Generate");
            expect(generateNode?.dependencies).toContain("Input");

            const evaluateNode = workflow.nodes.get("Evaluate");
            expect(evaluateNode?.dependencies).toContain("Generate");

            const refineNode = workflow.nodes.get("Refine");
            expect(refineNode?.dependencies).toContain("Conditional");

            // Verify edges for reflection loop
            expect(workflow.edges.has("Refine-Evaluate")).toBe(true);
        });

        it("should configure quality threshold and max iterations", () => {
            const workflow = createReflectionWorkflow({
                qualityThreshold: 0.9,
                maxIterations: 5
            });

            const evaluateNode = workflow.nodes.get("Evaluate");
            expect(evaluateNode?.config.qualityThreshold).toBe(0.9);
            expect(evaluateNode?.config.maxIterations).toBe(5);
        });
    });
});
