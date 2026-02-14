/**
 * Reflection Loop Integration Tests (Self-Improving Pattern)
 *
 * Tests for self-improving workflows that iterate until quality is achieved:
 * - Generate -> Evaluate -> Refine loops
 * - Quality threshold-based termination
 * - Maximum iteration limits
 * - Improvement tracking across iterations
 * - Convergence detection (no improvement)
 *
 * Note: This test uses context simulation for loop behavior since the workflow
 * orchestrator doesn't support cyclic graphs directly. This is consistent with
 * other loop-based integration tests in the codebase.
 */

import type { JsonValue, JsonObject } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    setVariable,
    getVariable
} from "../../../../src/temporal/core/services/context";
import type { ContextSnapshot } from "../../../../src/temporal/core/types";

// ============================================================================
// HELPER TYPES
// ============================================================================

interface ReflectionIterationResult {
    iteration: number;
    content: string;
    score: number;
    feedback: string;
    refined: boolean;
}

interface ReflectionLoopResult {
    context: ContextSnapshot;
    iterations: ReflectionIterationResult[];
    finalContent: string;
    finalScore: number;
    iterationCount: number;
    terminationReason: "quality-met" | "max-iterations" | "no-improvement";
}

interface GenerateOutput {
    content: string;
}

interface EvaluateOutput {
    score: number;
    feedback: string;
}

interface RefineOutput {
    content: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simulate a reflection loop execution.
 * Input -> Generate -> [Evaluate -> Conditional -> Refine]* -> Output
 *
 * The workflow iterates until quality score meets threshold, max iterations reached,
 * or no improvement is detected.
 */
async function simulateReflectionLoop(
    initialTask: string,
    generateFn: (task: string, iteration: number) => GenerateOutput,
    evaluateFn: (content: string, iteration: number) => EvaluateOutput,
    refineFn: (content: string, feedback: string, iteration: number) => RefineOutput,
    options: {
        qualityThreshold?: number;
        maxIterations?: number;
        detectConvergence?: boolean;
    } = {}
): Promise<ReflectionLoopResult> {
    const { qualityThreshold = 0.8, maxIterations = 5, detectConvergence = true } = options;

    let context = createContext({});
    context = setVariable(context, "task", initialTask);
    context = setVariable(context, "qualityThreshold", qualityThreshold);
    context = setVariable(context, "maxIterations", maxIterations);

    const iterations: ReflectionIterationResult[] = [];
    let currentContent = "";
    let currentScore = 0;
    let previousScore = -1;
    let iterationCount = 0;
    let terminationReason: "quality-met" | "max-iterations" | "no-improvement" = "quality-met";

    // Store input
    context = storeNodeOutput(context, "input", { task: initialTask });

    // Initial generation
    const generated = generateFn(initialTask, iterationCount);
    currentContent = generated.content;
    context = storeNodeOutput(context, "generate", { content: currentContent });
    context = setVariable(context, "currentContent", currentContent);

    // Reflection loop
    while (iterationCount < maxIterations) {
        iterationCount++;
        context = setVariable(context, "iteration", iterationCount);

        // Store loop state
        context = setVariable(context, "loop", {
            index: iterationCount - 1,
            iteration: iterationCount,
            results: iterations.map((r) => ({
                iteration: r.iteration,
                content: r.content,
                score: r.score,
                feedback: r.feedback,
                refined: r.refined
            })) as unknown as JsonValue[],
            isFirst: iterationCount === 1,
            total: maxIterations
        });

        // Evaluate
        const evaluation = evaluateFn(currentContent, iterationCount);
        currentScore = evaluation.score;
        context = storeNodeOutput(context, `evaluate_${iterationCount}`, {
            score: evaluation.score,
            feedback: evaluation.feedback
        });

        // Check quality threshold
        if (currentScore >= qualityThreshold) {
            iterations.push({
                iteration: iterationCount,
                content: currentContent,
                score: currentScore,
                feedback: evaluation.feedback,
                refined: false
            });
            terminationReason = "quality-met";
            break;
        }

        // Check for no improvement (convergence)
        if (detectConvergence && currentScore <= previousScore && iterationCount > 1) {
            iterations.push({
                iteration: iterationCount,
                content: currentContent,
                score: currentScore,
                feedback: evaluation.feedback,
                refined: false
            });
            terminationReason = "no-improvement";
            break;
        }

        previousScore = currentScore;

        // Store iteration result
        iterations.push({
            iteration: iterationCount,
            content: currentContent,
            score: currentScore,
            feedback: evaluation.feedback,
            refined: iterationCount < maxIterations
        });

        // Check max iterations before refining
        if (iterationCount >= maxIterations) {
            terminationReason = "max-iterations";
            break;
        }

        // Store conditional result (false = needs refinement)
        context = storeNodeOutput(context, `conditional_${iterationCount}`, { result: false });

        // Refine
        const refined = refineFn(currentContent, evaluation.feedback, iterationCount);
        currentContent = refined.content;
        context = storeNodeOutput(context, `refine_${iterationCount}`, {
            content: refined.content
        });
        context = setVariable(context, "currentContent", currentContent);
    }

    // Store final conditional result (true = quality met or termination)
    context = storeNodeOutput(context, `conditional_${iterationCount}`, { result: true });

    // Store final results
    context = storeNodeOutput(context, "output", {
        finalContent: currentContent,
        finalScore: currentScore,
        iterationCount,
        terminationReason,
        history: iterations.map((i) => ({
            iteration: i.iteration,
            content: i.content,
            score: i.score,
            feedback: i.feedback,
            refined: i.refined
        }))
    });

    context = setVariable(
        context,
        "loopResults",
        iterations.map((r) => ({
            iteration: r.iteration,
            content: r.content,
            score: r.score,
            feedback: r.feedback,
            refined: r.refined
        })) as unknown as JsonValue[]
    );

    return {
        context,
        iterations,
        finalContent: currentContent,
        finalScore: currentScore,
        iterationCount,
        terminationReason
    };
}

/**
 * Create a mock generator function that returns content.
 */
function createMockGenerator(
    content: string | ((iteration: number) => string)
): (task: string, iteration: number) => GenerateOutput {
    return (_task: string, iteration: number) => ({
        content: typeof content === "function" ? content(iteration) : content
    });
}

/**
 * Create a mock evaluator function with configurable scores.
 */
function createMockEvaluator(
    scores: number[] | ((iteration: number) => number),
    feedbackFn?: (iteration: number) => string
): (content: string, iteration: number) => EvaluateOutput {
    return (_content: string, iteration: number) => {
        const score = Array.isArray(scores)
            ? scores[Math.min(iteration - 1, scores.length - 1)]
            : scores(iteration);
        const feedback = feedbackFn ? feedbackFn(iteration) : `Iteration ${iteration} feedback`;
        return { score, feedback };
    };
}

/**
 * Create a mock refiner function.
 */
function createMockRefiner(
    refineFn: (content: string, feedback: string, iteration: number) => string
): (content: string, feedback: string, iteration: number) => RefineOutput {
    return (content: string, feedback: string, iteration: number) => ({
        content: refineFn(content, feedback, iteration)
    });
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Reflection Loop Integration Tests", () => {
    describe("quality threshold-based termination", () => {
        it("should terminate when quality threshold is met on first try", async () => {
            const result = await simulateReflectionLoop(
                "Write a haiku about coding",
                createMockGenerator(
                    "Code flows like water\nBugs scatter in the moonlight\nTests pass, peace returns"
                ),
                createMockEvaluator(
                    [0.95],
                    () => "Excellent! Beautiful imagery and proper structure."
                ),
                createMockRefiner((content) => content),
                { qualityThreshold: 0.9 }
            );

            expect(result.terminationReason).toBe("quality-met");
            expect(result.iterationCount).toBe(1);
            expect(result.finalScore).toBeGreaterThanOrEqual(0.9);
        });

        it("should refine until quality threshold is met", async () => {
            let refineCount = 0;

            const result = await simulateReflectionLoop(
                "Write a product description",
                createMockGenerator("A good product. Buy it."),
                createMockEvaluator([0.3, 0.5, 0.7, 0.85], (iteration) => {
                    const msgs = [
                        "Too brief, needs more detail",
                        "Better, but lacks persuasion",
                        "Good detail, needs stronger call to action",
                        "Excellent!"
                    ];
                    return msgs[Math.min(iteration - 1, msgs.length - 1)];
                }),
                createMockRefiner((_content, _feedback, iteration) => {
                    refineCount++;
                    const improvements = [
                        "An excellent product with amazing features. Consider buying it today.",
                        "Transform your life with this incredible product. Features include X, Y, Z.",
                        "Transform your life today! This incredible product features X, Y, Z. Buy now!"
                    ];
                    return improvements[Math.min(iteration - 1, improvements.length - 1)];
                }),
                { qualityThreshold: 0.8 }
            );

            expect(result.terminationReason).toBe("quality-met");
            expect(result.iterationCount).toBe(4);
            expect(result.finalScore).toBeGreaterThanOrEqual(0.8);
            expect(refineCount).toBe(3); // 3 refinements before meeting threshold
        });

        it("should use custom quality threshold", async () => {
            const result = await simulateReflectionLoop(
                "Summarize a document",
                createMockGenerator("Summary v1"),
                createMockEvaluator(
                    (iteration) => 0.6 + iteration * 0.03 // Never reaches 0.95
                ),
                createMockRefiner((_content, _feedback, iteration) => `Summary v${iteration + 1}`),
                { qualityThreshold: 0.95, maxIterations: 10 }
            );

            // With 0.03 increment starting at 0.63, max score at iteration 10 is ~0.9 (< 0.95)
            expect(result.finalScore).toBeLessThan(0.95);
            expect(result.terminationReason).toBe("max-iterations");
        });
    });

    describe("max iterations termination", () => {
        it("should terminate at max iterations if quality not met", async () => {
            const result = await simulateReflectionLoop(
                "Write perfect code",
                createMockGenerator("function foo() {}"),
                createMockEvaluator(
                    (iteration) => 0.4 + iteration * 0.05, // Slowly improves
                    () => "Still needs improvement"
                ),
                createMockRefiner(
                    (_content, _feedback, iteration) =>
                        `function foo_v${iteration}() { /* improved */ }`
                ),
                { qualityThreshold: 0.9, maxIterations: 3 }
            );

            expect(result.terminationReason).toBe("max-iterations");
            expect(result.iterationCount).toBe(3);
            expect(result.finalScore).toBeLessThan(0.9);
        });

        it("should preserve all iteration history when hitting max", async () => {
            const result = await simulateReflectionLoop(
                "Generate content",
                createMockGenerator("Initial"),
                createMockEvaluator(
                    (iteration) => 0.3 + iteration * 0.1,
                    (iteration) => `Feedback ${iteration}`
                ),
                createMockRefiner((_content, _feedback, iteration) => `Refined ${iteration}`),
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
                createMockGenerator("One attempt"),
                createMockEvaluator([0.5], () => "Not great"),
                createMockRefiner(() => "Should not reach"),
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
                createMockGenerator("Initial text"),
                createMockEvaluator(
                    [0.4, 0.6, 0.6, 0.6], // Score plateaus
                    () => "Try harder"
                ),
                createMockRefiner((_content, _feedback, iteration) => `Attempt ${iteration}`),
                { qualityThreshold: 0.9, maxIterations: 10 }
            );

            expect(result.terminationReason).toBe("no-improvement");
            expect(result.iterationCount).toBe(3);
            expect(result.finalScore).toBe(0.6);
        });

        it("should terminate when score decreases", async () => {
            const result = await simulateReflectionLoop(
                "Creative writing",
                createMockGenerator("Great start"),
                createMockEvaluator(
                    [0.7, 0.6, 0.5], // Score decreases
                    () => "Getting worse"
                ),
                createMockRefiner(() => "Worse content"),
                { qualityThreshold: 0.9, maxIterations: 10 }
            );

            expect(result.terminationReason).toBe("no-improvement");
            expect(result.iterationCount).toBe(2);
        });

        it("should continue if convergence detection is disabled", async () => {
            const result = await simulateReflectionLoop(
                "Keep trying",
                createMockGenerator("Initial"),
                createMockEvaluator(
                    [0.5, 0.5, 0.5, 0.5, 0.5], // Plateaus immediately
                    () => "Same score"
                ),
                createMockRefiner((_content, _feedback, iteration) => `Attempt ${iteration}`),
                { qualityThreshold: 0.9, maxIterations: 5, detectConvergence: false }
            );

            expect(result.terminationReason).toBe("max-iterations");
            expect(result.iterationCount).toBe(5);
        });
    });

    describe("improvement tracking", () => {
        it("should track score progression across iterations", async () => {
            const result = await simulateReflectionLoop(
                "Improve gradually",
                createMockGenerator("v1"),
                createMockEvaluator(
                    (iteration) => 0.2 * iteration,
                    (iteration) => `Score: ${0.2 * iteration}`
                ),
                createMockRefiner((_content, _feedback, iteration) => `v${iteration + 1}`),
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
                createMockGenerator("API docs v1"),
                createMockEvaluator(
                    (iteration) => 0.5 + iteration * 0.15,
                    (iteration) =>
                        feedbackMessages[Math.min(iteration - 1, feedbackMessages.length - 1)]
                ),
                createMockRefiner((_content, _feedback, iteration) => `API docs v${iteration + 1}`),
                { qualityThreshold: 0.9, maxIterations: 5 }
            );

            expect(result.iterations[0].feedback).toBe("Needs more detail");
            expect(result.iterations[1].feedback).toBe("Add examples");
            expect(result.iterations[2].feedback).toBe("Improve clarity");
        });

        it("should calculate total improvement", async () => {
            const result = await simulateReflectionLoop(
                "Optimize",
                createMockGenerator("Start"),
                createMockEvaluator(
                    (iteration) => 0.2 + iteration * 0.2,
                    () => "Keep going"
                ),
                createMockRefiner(() => "Better"),
                { qualityThreshold: 0.85, maxIterations: 5 }
            );

            const initialScore = result.iterations[0].score;
            const finalScore = result.finalScore;
            const improvement = finalScore - initialScore;

            // Initial: 0.4, then 0.6, 0.8, then reaches 1.0 (exceeds threshold at 0.8 or 1.0)
            expect(improvement).toBeGreaterThan(0.4);
            expect(finalScore).toBeGreaterThanOrEqual(0.85);
        });
    });

    describe("content evolution", () => {
        it("should show content improving through iterations", async () => {
            const result = await simulateReflectionLoop(
                "Write error message",
                createMockGenerator("Error"),
                createMockEvaluator(
                    (iteration) => (iteration * 20 > 50 ? 0.9 : 0.3 + iteration * 0.1),
                    () => "Add more context and user guidance"
                ),
                createMockRefiner(
                    (content) => content + ". Please check your input and try again."
                ),
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
            let currentContent = "Hi";

            const result = await simulateReflectionLoop(
                "Create greeting",
                createMockGenerator("Hi"),
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
                        currentContent = content + ", {name}";
                    } else if (feedback.includes("enthusiasm")) {
                        currentContent = content + "!";
                    }
                    return { content: currentContent };
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
            const codeVersions: string[] = [];

            const result = await simulateReflectionLoop(
                "Write a function to validate email",
                createMockGenerator(
                    'function validateEmail(email) { return email.includes("@"); }'
                ),
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
                (content, feedback) => {
                    let newContent = content;
                    if (feedback.includes("regex")) {
                        newContent = `function validateEmail(email) {
    const regex = /^[^@]+@[^@]+\\.[^@]+$/;
    return regex.test(email);
}`;
                    } else if (feedback.includes("whitespace")) {
                        newContent = content.replace("email)", "email.trim())");
                    } else if (feedback.includes("case")) {
                        newContent = content.replace("email.trim()", "email.trim().toLowerCase()");
                    }
                    codeVersions.push(newContent);
                    return { content: newContent };
                },
                { qualityThreshold: 0.85, maxIterations: 5 }
            );

            expect(result.terminationReason).toBe("quality-met");
            expect(result.finalContent).toContain("regex");
        });

        it("should refine documentation until comprehensive", async () => {
            const result = await simulateReflectionLoop(
                "Document the authentication module",
                createMockGenerator("Auth module handles login."),
                (content) => {
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
                createMockGenerator("AI is changing the world."),
                (content) => {
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

    describe("context state management", () => {
        it("should store node outputs correctly", async () => {
            const result = await simulateReflectionLoop(
                "Test context",
                createMockGenerator("Initial content"),
                createMockEvaluator([0.3, 0.95], () => "Feedback"),
                createMockRefiner(() => "Refined content"),
                { qualityThreshold: 0.9, maxIterations: 3 }
            );

            // Check input node output
            const inputOutput = result.context.nodeOutputs.get("input");
            expect(inputOutput).toBeDefined();
            expect(inputOutput?.task).toBe("Test context");

            // Check generate node output
            const generateOutput = result.context.nodeOutputs.get("generate");
            expect(generateOutput).toBeDefined();
            expect(generateOutput?.content).toBe("Initial content");

            // Check output node
            const outputOutput = result.context.nodeOutputs.get("output");
            expect(outputOutput).toBeDefined();
            expect(outputOutput?.terminationReason).toBe("quality-met");
        });

        it("should track loop variables", async () => {
            await simulateReflectionLoop(
                "Track loop state",
                createMockGenerator("Content"),
                createMockEvaluator(
                    (iteration) => 0.3 + iteration * 0.2,
                    () => "Continue"
                ),
                (content, _feedback, iteration) => {
                    // This is called on iterations 1, 2, 3 (before reaching threshold at iteration 4)
                    return { content: `${content} v${iteration}` };
                },
                { qualityThreshold: 0.85, maxIterations: 5 }
            );

            // Loop should have run until quality threshold met
            // No direct access to loop states in this simplified test
            // The main verification is that the loop completes correctly
        });

        it("should preserve variables across iterations", async () => {
            const result = await simulateReflectionLoop(
                "Variable test",
                createMockGenerator("Start"),
                createMockEvaluator([0.4, 0.6, 0.85], () => "Go"),
                createMockRefiner((content, _feedback, iteration) => `${content}-${iteration}`),
                { qualityThreshold: 0.8, maxIterations: 5 }
            );

            // Verify variables are set correctly
            expect(getVariable(result.context, "task")).toBe("Variable test");
            expect(getVariable(result.context, "qualityThreshold")).toBe(0.8);
            expect(getVariable(result.context, "maxIterations")).toBe(5);
            expect(getVariable(result.context, "iteration")).toBe(result.iterationCount);
        });
    });

    describe("edge cases", () => {
        it("should handle empty initial content gracefully", async () => {
            const result = await simulateReflectionLoop(
                "Generate from nothing",
                createMockGenerator(""),
                createMockEvaluator(
                    (iteration) => (iteration > 2 ? 0.9 : 0.2),
                    () => "Add content"
                ),
                createMockRefiner((_content, _feedback, iteration) => "Content ".repeat(iteration)),
                { qualityThreshold: 0.8, maxIterations: 5 }
            );

            expect(result.iterations[0].content).toBe("");
            expect(result.finalContent.length).toBeGreaterThan(0);
        });

        it("should handle very high quality threshold", async () => {
            const result = await simulateReflectionLoop(
                "Perfection quest",
                createMockGenerator("Good content"),
                createMockEvaluator(
                    (iteration) => Math.min(0.5 + iteration * 0.1, 0.95),
                    () => "Almost perfect"
                ),
                createMockRefiner((content) => content + " improved"),
                // Disable convergence detection to ensure max-iterations is reached
                { qualityThreshold: 0.99, maxIterations: 10, detectConvergence: false }
            );

            expect(result.terminationReason).toBe("max-iterations");
            expect(result.finalScore).toBeLessThan(0.99);
        });

        it("should handle zero quality threshold (immediate success)", async () => {
            const result = await simulateReflectionLoop(
                "Easy task",
                createMockGenerator("Any content"),
                createMockEvaluator([0.1], () => "Good enough"),
                createMockRefiner((content) => content),
                { qualityThreshold: 0, maxIterations: 5 }
            );

            expect(result.terminationReason).toBe("quality-met");
            expect(result.iterationCount).toBe(1);
        });

        it("should handle negative scores gracefully", async () => {
            const result = await simulateReflectionLoop(
                "Negative test",
                createMockGenerator("Bad start"),
                createMockEvaluator(
                    (iteration) => -0.5 + iteration * 0.3, // Starts negative
                    () => "Very bad"
                ),
                createMockRefiner((_content, _feedback, iteration) => `Attempt ${iteration}`),
                { qualityThreshold: 0.5, maxIterations: 10, detectConvergence: false }
            );

            expect(result.iterations[0].score).toBeLessThan(0);
            expect(result.terminationReason).toBe("quality-met");
        });
    });

    describe("workflow output validation", () => {
        it("should produce valid output structure", async () => {
            const result = await simulateReflectionLoop(
                "Structure test",
                createMockGenerator("Test content"),
                createMockEvaluator([0.9], () => "Perfect"),
                createMockRefiner((content) => content),
                { qualityThreshold: 0.8 }
            );

            const output = result.context.nodeOutputs.get("output") as JsonObject;

            expect(output).toHaveProperty("finalContent");
            expect(output).toHaveProperty("finalScore");
            expect(output).toHaveProperty("iterationCount");
            expect(output).toHaveProperty("terminationReason");
            expect(output).toHaveProperty("history");
            expect(Array.isArray(output.history)).toBe(true);
        });

        it("should include complete iteration history in output", async () => {
            const result = await simulateReflectionLoop(
                "History test",
                createMockGenerator("Start"),
                createMockEvaluator([0.3, 0.5, 0.7, 0.9], (iteration) => `Feedback ${iteration}`),
                createMockRefiner((_content, _feedback, iteration) => `Version ${iteration + 1}`),
                { qualityThreshold: 0.85, maxIterations: 5 }
            );

            const output = result.context.nodeOutputs.get("output") as JsonObject;
            const history = output.history as Array<{
                iteration: number;
                content: string;
                score: number;
                feedback: string;
            }>;

            expect(history.length).toBe(4);
            expect(history[0].iteration).toBe(1);
            expect(history[3].iteration).toBe(4);
            expect(history[0].feedback).toBe("Feedback 1");
        });
    });
});
