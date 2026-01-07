/**
 * Evaluator-Optimizer Integration Tests (Quality Reviewer Pattern)
 *
 * Tests for quality review workflows that evaluate and optimize content:
 * - Generate -> Evaluate -> Optimize loops
 * - Multi-criteria evaluation (accuracy, clarity, completeness)
 * - Targeted optimization based on weak areas
 * - A/B comparison and selection
 * - Ensemble generation with voting
 */

import {
    createContext,
    storeNodeOutput,
    setVariable
} from "../../../src/temporal/core/services/context";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";
import type { ContextSnapshot } from "../../../src/temporal/core/types";

// ============================================================================
// TYPES
// ============================================================================

interface EvaluationCriteria {
    name: string;
    weight: number;
    score: number;
    feedback: string;
    [key: string]: string | number;
}

interface EvaluationResult {
    overallScore: number;
    criteria: EvaluationCriteria[];
    passed: boolean;
    weakestArea: string;
    suggestions: string[];
    [key: string]: number | boolean | string | string[] | EvaluationCriteria[];
}

interface GeneratedContent {
    content: string;
    version: number;
    generator: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an evaluator-optimizer workflow
 * Input -> Generate -> Evaluate -> [Optimize -> Re-evaluate]* -> Output
 */
function createEvaluatorOptimizerWorkflow(options: {
    criteria?: string[];
    minScore?: number;
    maxOptimizations?: number;
}): BuiltWorkflow {
    const {
        criteria = ["accuracy", "clarity", "completeness"],
        minScore = 0.8,
        maxOptimizations = 3
    } = options;
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Task",
        config: { name: "task" },
        depth: 0,
        dependencies: [],
        dependents: ["Generate"]
    });

    // Generate node
    nodes.set("Generate", {
        id: "Generate",
        type: "llm",
        name: "Generator",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Generate content for: {{Input.task}}"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Evaluate"]
    });

    // Evaluate node (multi-criteria)
    nodes.set("Evaluate", {
        id: "Evaluate",
        type: "llm",
        name: "Evaluator",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt: `Evaluate the content on these criteria: ${criteria.join(", ")}.
                          Return a JSON with scores (0-1) and feedback for each criterion.`,
            prompt: "Evaluate this content:\n\n{{currentContent}}",
            outputFormat: "json",
            minScore,
            maxOptimizations
        },
        depth: 2,
        dependencies: ["Generate"],
        dependents: ["DecideOptimize"]
    });

    // Decision node
    nodes.set("DecideOptimize", {
        id: "DecideOptimize",
        type: "conditional",
        name: "ShouldOptimize",
        config: {
            condition:
                "{{Evaluate.overallScore}} < {{minScore}} && {{optimizationCount}} < {{maxOptimizations}}",
            minScore,
            maxOptimizations
        },
        depth: 3,
        dependencies: ["Evaluate"],
        dependents: ["Optimize", "Output"]
    });

    // Optimize node
    nodes.set("Optimize", {
        id: "Optimize",
        type: "llm",
        name: "Optimizer",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt:
                "You are an expert content optimizer. Improve the content based on the feedback provided.",
            prompt: "Improve this content:\n{{currentContent}}\n\nWeakest area: {{Evaluate.weakestArea}}\nFeedback: {{Evaluate.suggestions}}"
        },
        depth: 4,
        dependencies: ["DecideOptimize"],
        dependents: ["Evaluate"]
    });

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 5,
        dependencies: ["DecideOptimize"],
        dependents: []
    });

    // Create edges
    const edgeDefs = [
        { source: "Input", target: "Generate" },
        { source: "Generate", target: "Evaluate" },
        { source: "Evaluate", target: "DecideOptimize" },
        {
            source: "DecideOptimize",
            target: "Optimize",
            handleType: "false",
            sourceHandle: "false"
        },
        {
            source: "DecideOptimize",
            target: "Output",
            handleType: "true",
            sourceHandle: "true"
        },
        { source: "Optimize", target: "Evaluate" }
    ];

    for (const def of edgeDefs) {
        const edgeId = `${def.source}-${def.target}`;
        edges.set(edgeId, {
            id: edgeId,
            source: def.source,
            target: def.target,
            sourceHandle: def.sourceHandle || "output",
            targetHandle: "input",
            handleType: (def.handleType as "default" | "true" | "false") || "default"
        });
    }

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [
            ["Input"],
            ["Generate"],
            ["Evaluate"],
            ["DecideOptimize"],
            ["Optimize", "Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create an A/B comparison workflow
 * Input -> [Generator A, Generator B] -> Evaluate Both -> Select Best -> Output
 */
function createABComparisonWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Task",
        config: { name: "task" },
        depth: 0,
        dependencies: [],
        dependents: ["GeneratorA", "GeneratorB"]
    });

    // Generator A
    nodes.set("GeneratorA", {
        id: "GeneratorA",
        type: "llm",
        name: "Generator A",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt: "You are a concise writer. Keep responses brief and to the point.",
            prompt: "{{Input.task}}"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["EvaluateBoth"]
    });

    // Generator B
    nodes.set("GeneratorB", {
        id: "GeneratorB",
        type: "llm",
        name: "Generator B",
        config: {
            provider: "anthropic",
            model: "claude-3-5-sonnet-20241022",
            systemPrompt: "You are a detailed writer. Provide comprehensive responses.",
            prompt: "{{Input.task}}"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["EvaluateBoth"]
    });

    // Evaluate Both
    nodes.set("EvaluateBoth", {
        id: "EvaluateBoth",
        type: "llm",
        name: "Comparative Evaluator",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt:
                "Compare two responses and determine which is better. " +
                "Consider accuracy, helpfulness, and clarity.",
            prompt:
                "Response A:\n{{GeneratorA.content}}\n\nResponse B:\n{{GeneratorB.content}}\n\n" +
                "Which is better and why?",
            outputFormat: "json"
        },
        depth: 2,
        dependencies: ["GeneratorA", "GeneratorB"],
        dependents: ["SelectBest"]
    });

    // Select Best
    nodes.set("SelectBest", {
        id: "SelectBest",
        type: "switch",
        name: "Select Best",
        config: {
            condition: "{{EvaluateBoth.winner}}",
            cases: { A: "GeneratorA", B: "GeneratorB" }
        },
        depth: 3,
        dependencies: ["EvaluateBoth"],
        dependents: ["Output"]
    });

    // Output
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 4,
        dependencies: ["SelectBest"],
        dependents: []
    });

    // Create edges
    edges.set("Input-GeneratorA", {
        id: "Input-GeneratorA",
        source: "Input",
        target: "GeneratorA",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });
    edges.set("Input-GeneratorB", {
        id: "Input-GeneratorB",
        source: "Input",
        target: "GeneratorB",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });
    edges.set("GeneratorA-EvaluateBoth", {
        id: "GeneratorA-EvaluateBoth",
        source: "GeneratorA",
        target: "EvaluateBoth",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });
    edges.set("GeneratorB-EvaluateBoth", {
        id: "GeneratorB-EvaluateBoth",
        source: "GeneratorB",
        target: "EvaluateBoth",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });
    edges.set("EvaluateBoth-SelectBest", {
        id: "EvaluateBoth-SelectBest",
        source: "EvaluateBoth",
        target: "SelectBest",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });
    edges.set("SelectBest-Output", {
        id: "SelectBest-Output",
        source: "SelectBest",
        target: "Output",
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
            ["GeneratorA", "GeneratorB"],
            ["EvaluateBoth"],
            ["SelectBest"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate multi-criteria evaluation
 */
function evaluateContent(
    content: string,
    criteriaConfig: Array<{ name: string; weight: number; evaluator: (content: string) => number }>
): EvaluationResult {
    const criteria: EvaluationCriteria[] = criteriaConfig.map((c) => {
        const score = c.evaluator(content);
        return {
            name: c.name,
            weight: c.weight,
            score,
            feedback: score < 0.7 ? `Needs improvement in ${c.name}` : `Good ${c.name}`
        };
    });

    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    const overallScore = criteria.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;

    const weakest = criteria.reduce((min, c) => (c.score < min.score ? c : min), criteria[0]);

    return {
        overallScore,
        criteria,
        passed: overallScore >= 0.8,
        weakestArea: weakest.name,
        suggestions: criteria.filter((c) => c.score < 0.8).map((c) => c.feedback)
    };
}

/**
 * Simulate evaluator-optimizer loop
 */
async function simulateEvaluatorOptimizer(
    task: string,
    generateFn: (task: string, iteration: number) => string,
    evaluateFn: (content: string) => EvaluationResult,
    optimizeFn: (content: string, weakArea: string, suggestions: string[]) => string,
    options: { minScore?: number; maxOptimizations?: number } = {}
): Promise<{
    context: ContextSnapshot;
    iterations: Array<{
        content: string;
        evaluation: EvaluationResult;
        optimized: boolean;
    }>;
    finalContent: string;
    finalScore: number;
    optimizationCount: number;
}> {
    const { minScore = 0.8, maxOptimizations = 3 } = options;

    let context = createContext({});
    context = setVariable(context, "task", task);
    context = setVariable(context, "minScore", minScore);
    context = setVariable(context, "maxOptimizations", maxOptimizations);

    const iterations: Array<{
        content: string;
        evaluation: EvaluationResult;
        optimized: boolean;
    }> = [];

    // Initial generation
    let currentContent = generateFn(task, 0);
    context = storeNodeOutput(context, "Generate", { content: currentContent });
    context = setVariable(context, "currentContent", currentContent);

    let optimizationCount = 0;

    while (optimizationCount <= maxOptimizations) {
        // Evaluate
        const evaluation = evaluateFn(currentContent);
        context = storeNodeOutput(context, `Evaluate_${optimizationCount}`, evaluation);

        iterations.push({
            content: currentContent,
            evaluation,
            optimized: false
        });

        // Check if passed
        if (evaluation.overallScore >= minScore) {
            break;
        }

        // Check max optimizations
        if (optimizationCount >= maxOptimizations) {
            break;
        }

        // Optimize
        const optimizedContent = optimizeFn(
            currentContent,
            evaluation.weakestArea,
            evaluation.suggestions
        );
        currentContent = optimizedContent;
        context = storeNodeOutput(context, `Optimize_${optimizationCount}`, {
            content: optimizedContent
        });
        context = setVariable(context, "currentContent", currentContent);

        iterations[iterations.length - 1].optimized = true;
        optimizationCount++;
    }

    // Store final result
    const finalEvaluation = evaluateFn(currentContent);
    context = storeNodeOutput(context, "Output", {
        content: currentContent,
        score: finalEvaluation.overallScore,
        optimizations: optimizationCount
    });

    return {
        context,
        iterations,
        finalContent: currentContent,
        finalScore: finalEvaluation.overallScore,
        optimizationCount
    };
}

/**
 * Simulate A/B comparison
 */
async function simulateABComparison(
    task: string,
    generatorA: (task: string) => GeneratedContent,
    generatorB: (task: string) => GeneratedContent,
    comparator: (a: GeneratedContent, b: GeneratedContent) => { winner: "A" | "B"; reason: string }
): Promise<{
    contentA: GeneratedContent;
    contentB: GeneratedContent;
    winner: "A" | "B";
    reason: string;
    selectedContent: GeneratedContent;
}> {
    const contentA = generatorA(task);
    const contentB = generatorB(task);
    const comparison = comparator(contentA, contentB);

    return {
        contentA,
        contentB,
        winner: comparison.winner,
        reason: comparison.reason,
        selectedContent: comparison.winner === "A" ? contentA : contentB
    };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Evaluator-Optimizer (Quality Reviewer Pattern)", () => {
    describe("multi-criteria evaluation", () => {
        it("should evaluate content on multiple criteria", () => {
            const content = "TypeScript is a programming language that adds types to JavaScript.";

            const result = evaluateContent(content, [
                {
                    name: "accuracy",
                    weight: 0.4,
                    evaluator: (c) => (c.includes("programming language") ? 0.9 : 0.5)
                },
                {
                    name: "clarity",
                    weight: 0.3,
                    evaluator: (c) => (c.length < 100 ? 0.8 : 0.6)
                },
                {
                    name: "completeness",
                    weight: 0.3,
                    evaluator: (c) => (c.includes("types") && c.includes("JavaScript") ? 0.85 : 0.5)
                }
            ]);

            expect(result.criteria.length).toBe(3);
            expect(result.overallScore).toBeGreaterThan(0);
            expect(result.overallScore).toBeLessThanOrEqual(1);
        });

        it("should identify weakest area", () => {
            const content = "Brief.";

            const result = evaluateContent(content, [
                { name: "accuracy", weight: 0.4, evaluator: () => 0.9 },
                { name: "clarity", weight: 0.3, evaluator: () => 0.8 },
                { name: "completeness", weight: 0.3, evaluator: () => 0.3 } // Weakest
            ]);

            expect(result.weakestArea).toBe("completeness");
        });

        it("should calculate weighted overall score", () => {
            const result = evaluateContent("test", [
                { name: "A", weight: 0.6, evaluator: () => 1.0 },
                { name: "B", weight: 0.4, evaluator: () => 0.5 }
            ]);

            // Expected: (1.0 * 0.6 + 0.5 * 0.4) / 1.0 = 0.8
            expect(result.overallScore).toBeCloseTo(0.8, 2);
        });

        it("should generate suggestions for low-scoring criteria", () => {
            const result = evaluateContent("incomplete", [
                { name: "accuracy", weight: 0.5, evaluator: () => 0.5 },
                { name: "clarity", weight: 0.5, evaluator: () => 0.9 }
            ]);

            expect(result.suggestions.length).toBe(1);
            expect(result.suggestions[0]).toContain("accuracy");
        });
    });

    describe("optimization loop", () => {
        it("should optimize until quality threshold is met", async () => {
            let iteration = 0;

            const result = await simulateEvaluatorOptimizer(
                "Explain recursion",
                () => "Recursion is when a function calls itself.",
                (_content) => {
                    iteration++;
                    // Score improves with each iteration
                    const baseScore = 0.5 + iteration * 0.15;
                    return {
                        overallScore: Math.min(baseScore, 1),
                        criteria: [{ name: "clarity", weight: 1, score: baseScore, feedback: "" }],
                        passed: baseScore >= 0.8,
                        weakestArea: "clarity",
                        suggestions: baseScore < 0.8 ? ["Add more detail"] : []
                    };
                },
                (content, _weakArea, _suggestions) => content + " It needs a base case.",
                { minScore: 0.8, maxOptimizations: 5 }
            );

            expect(result.finalScore).toBeGreaterThanOrEqual(0.8);
            expect(result.optimizationCount).toBeLessThanOrEqual(5);
        });

        it("should stop at max optimizations even if threshold not met", async () => {
            const result = await simulateEvaluatorOptimizer(
                "Complex topic",
                () => "Simple explanation",
                () => ({
                    overallScore: 0.5, // Never improves
                    criteria: [],
                    passed: false,
                    weakestArea: "depth",
                    suggestions: ["Go deeper"]
                }),
                (content) => content + " More detail.",
                { minScore: 0.9, maxOptimizations: 2 }
            );

            expect(result.optimizationCount).toBe(2);
            expect(result.finalScore).toBeLessThan(0.9);
        });

        it("should track all iterations", async () => {
            const result = await simulateEvaluatorOptimizer(
                "Test task",
                () => "v1",
                (content) => ({
                    overallScore: content.includes("v3") ? 0.85 : 0.5,
                    criteria: [],
                    passed: content.includes("v3"),
                    weakestArea: "quality",
                    suggestions: []
                }),
                (_content, _weak, _sugg) => "v" + (Math.random() * 10).toFixed(0),
                { minScore: 0.8, maxOptimizations: 5 }
            );

            expect(result.iterations.length).toBeGreaterThan(0);
            expect(result.iterations[0].content).toBe("v1");
        });

        it("should target weakest area in optimization", async () => {
            const optimizationTargets: string[] = [];

            await simulateEvaluatorOptimizer(
                "Write docs",
                () => "Initial docs",
                (_content) => {
                    // Rotate weakest area
                    const areas = ["accuracy", "clarity", "completeness"];
                    const weakest = areas[optimizationTargets.length % areas.length];
                    return {
                        overallScore: 0.5 + optimizationTargets.length * 0.15,
                        criteria: [],
                        passed: false,
                        weakestArea: weakest,
                        suggestions: [`Improve ${weakest}`]
                    };
                },
                (content, weakArea) => {
                    optimizationTargets.push(weakArea);
                    return content + ` [improved: ${weakArea}]`;
                },
                { minScore: 0.85, maxOptimizations: 3 }
            );

            expect(optimizationTargets.length).toBeGreaterThan(0);
            expect(optimizationTargets).toContain("accuracy");
        });
    });

    describe("A/B comparison", () => {
        it("should compare two generated responses", async () => {
            const result = await simulateABComparison(
                "Explain async/await",
                () => ({ content: "Async/await simplifies promises.", version: 1, generator: "A" }),
                () => ({
                    content:
                        "Async/await is syntactic sugar for promises that makes code readable.",
                    version: 1,
                    generator: "B"
                }),
                (a, b) => ({
                    winner: b.content.length > a.content.length ? "B" : "A",
                    reason: "More comprehensive explanation"
                })
            );

            expect(result.winner).toBe("B");
            expect(result.selectedContent.generator).toBe("B");
        });

        it("should select based on quality criteria", async () => {
            const result = await simulateABComparison(
                "Summarize article",
                () => ({
                    content: "Long detailed summary with many words...",
                    version: 1,
                    generator: "A"
                }),
                () => ({ content: "Concise summary.", version: 1, generator: "B" }),
                (a, b) => {
                    // Prefer concise summaries
                    const aScore = 1 - a.content.length / 100;
                    const bScore = 1 - b.content.length / 100;
                    return {
                        winner: bScore > aScore ? "B" : "A",
                        reason: "More concise"
                    };
                }
            );

            expect(result.winner).toBe("B");
            expect(result.reason).toContain("concise");
        });

        it("should handle tie-breaking", async () => {
            const result = await simulateABComparison(
                "Equal task",
                () => ({ content: "Response one", version: 1, generator: "A" }),
                () => ({ content: "Response two", version: 1, generator: "B" }),
                (_a, _b) => ({
                    winner: "A", // Default to A on tie
                    reason: "Tie - defaulting to first option"
                })
            );

            expect(result.winner).toBe("A");
        });
    });

    describe("ensemble generation", () => {
        it("should generate multiple versions and vote", async () => {
            const versions = [
                { content: "Version 1: TypeScript adds types", score: 0.7 },
                { content: "Version 2: TypeScript is typed JavaScript", score: 0.85 },
                { content: "Version 3: Types for JS", score: 0.6 }
            ];

            // Simulate voting by selecting highest scored
            const winner = versions.reduce(
                (best, v) => (v.score > best.score ? v : best),
                versions[0]
            );

            expect(winner.content).toBe("Version 2: TypeScript is typed JavaScript");
            expect(winner.score).toBe(0.85);
        });

        it("should combine best parts from multiple versions", async () => {
            const versions = [
                { part: "intro", content: "TypeScript is great.", quality: 0.9 },
                { part: "body", content: "It adds static typing.", quality: 0.95 },
                { part: "conclusion", content: "Use it today!", quality: 0.8 }
            ];

            // Combine all parts
            const combined = versions.map((v) => v.content).join(" ");
            const avgQuality = versions.reduce((sum, v) => sum + v.quality, 0) / versions.length;

            expect(combined).toContain("TypeScript");
            expect(combined).toContain("static typing");
            expect(avgQuality).toBeGreaterThan(0.85);
        });
    });

    describe("workflow structure", () => {
        it("should create valid evaluator-optimizer workflow structure", () => {
            const workflow = createEvaluatorOptimizerWorkflow({
                criteria: ["accuracy", "clarity"],
                minScore: 0.8,
                maxOptimizations: 2
            });

            // Verify all nodes exist
            expect(workflow.nodes.has("Input")).toBe(true);
            expect(workflow.nodes.has("Generate")).toBe(true);
            expect(workflow.nodes.has("Evaluate")).toBe(true);
            expect(workflow.nodes.has("DecideOptimize")).toBe(true);
            expect(workflow.nodes.has("Optimize")).toBe(true);
            expect(workflow.nodes.has("Output")).toBe(true);

            // Verify dependencies
            const generateNode = workflow.nodes.get("Generate");
            expect(generateNode?.dependencies).toContain("Input");

            const evaluateNode = workflow.nodes.get("Evaluate");
            expect(evaluateNode?.dependencies).toContain("Generate");

            const decideNode = workflow.nodes.get("DecideOptimize");
            expect(decideNode?.dependencies).toContain("Evaluate");

            // Verify optimization loop edge
            const optimizeNode = workflow.nodes.get("Optimize");
            expect(optimizeNode?.dependents).toContain("Evaluate");
        });

        it("should execute A/B comparison workflow", async () => {
            const workflow = createABComparisonWorkflow();

            // Verify parallel generation structure
            expect(workflow.nodes.get("GeneratorA")?.dependencies).toContain("Input");
            expect(workflow.nodes.get("GeneratorB")?.dependencies).toContain("Input");
            expect(workflow.nodes.get("EvaluateBoth")?.dependencies).toContain("GeneratorA");
            expect(workflow.nodes.get("EvaluateBoth")?.dependencies).toContain("GeneratorB");

            // Verify execution levels show parallel generation
            expect(workflow.executionLevels[1]).toContain("GeneratorA");
            expect(workflow.executionLevels[1]).toContain("GeneratorB");
        });
    });

    describe("real-world scenarios", () => {
        it("should optimize marketing copy", async () => {
            const result = await simulateEvaluatorOptimizer(
                "Write ad copy for a productivity app",
                () => "Try our app. It's good.",
                (content) => {
                    const hasCallToAction = /download|try|get|start/i.test(content);
                    const hasBenefit = /save time|productive|efficient/i.test(content);
                    const isEngaging = content.length > 50;

                    const score =
                        (hasCallToAction ? 0.3 : 0) +
                        (hasBenefit ? 0.4 : 0) +
                        (isEngaging ? 0.3 : 0);

                    return {
                        overallScore: score,
                        criteria: [
                            {
                                name: "call-to-action",
                                weight: 0.3,
                                score: hasCallToAction ? 1 : 0,
                                feedback: hasCallToAction ? "Good CTA" : "Add call to action"
                            },
                            {
                                name: "benefit",
                                weight: 0.4,
                                score: hasBenefit ? 1 : 0,
                                feedback: hasBenefit ? "Clear benefit" : "Highlight benefits"
                            },
                            {
                                name: "engagement",
                                weight: 0.3,
                                score: isEngaging ? 1 : 0,
                                feedback: isEngaging ? "Engaging" : "Make it more engaging"
                            }
                        ],
                        passed: score >= 0.8,
                        weakestArea: !hasCallToAction
                            ? "call-to-action"
                            : !hasBenefit
                              ? "benefit"
                              : "engagement",
                        suggestions: []
                    };
                },
                (content, weakArea) => {
                    if (weakArea === "call-to-action") {
                        return content + " Download now!";
                    }
                    if (weakArea === "benefit") {
                        return content + " Save time and be more productive.";
                    }
                    return content + " Transform your workflow today.";
                },
                { minScore: 0.8, maxOptimizations: 4 }
            );

            expect(result.finalScore).toBeGreaterThanOrEqual(0.7);
        });

        it("should optimize technical documentation", async () => {
            const result = await simulateEvaluatorOptimizer(
                "Document the login API endpoint",
                () => "POST /login - logs in user",
                (content) => {
                    const hasMethod = /POST|GET|PUT|DELETE/.test(content);
                    const hasParams = /param|body|request/i.test(content);
                    const hasResponse = /return|response|status/i.test(content);
                    const hasExample = /example|sample|```/i.test(content);

                    const scores = [hasMethod, hasParams, hasResponse, hasExample].filter(
                        Boolean
                    ).length;
                    const score = scores / 4;

                    return {
                        overallScore: score,
                        criteria: [],
                        passed: score >= 0.75,
                        weakestArea: !hasParams
                            ? "parameters"
                            : !hasResponse
                              ? "response"
                              : !hasExample
                                ? "examples"
                                : "complete",
                        suggestions: []
                    };
                },
                (content, weakArea) => {
                    if (weakArea === "parameters") {
                        return content + "\nRequest body: { email: string, password: string }";
                    }
                    if (weakArea === "response") {
                        return content + "\nReturns: { token: string, status: 200 }";
                    }
                    if (weakArea === "examples") {
                        return content + "\nExample: ```curl -X POST /login -d {...}```";
                    }
                    return content;
                },
                { minScore: 0.75, maxOptimizations: 4 }
            );

            expect(result.iterations.length).toBeGreaterThan(1);
            expect(result.finalContent).toContain("POST");
        });

        it("should compare writing styles for target audience", async () => {
            const result = await simulateABComparison(
                "Explain cloud computing to beginners",
                () => ({
                    content:
                        "Cloud computing enables distributed resource allocation across networked infrastructure.",
                    version: 1,
                    generator: "Technical"
                }),
                () => ({
                    content:
                        "Cloud computing is like renting a computer over the internet instead of buying one.",
                    version: 1,
                    generator: "Beginner-friendly"
                }),
                (a, b) => {
                    // Check readability (simulated - prefer shorter, simpler sentences)
                    const aComplexity = a.content.split(" ").filter((w) => w.length > 8).length;
                    const bComplexity = b.content.split(" ").filter((w) => w.length > 8).length;

                    return {
                        winner: bComplexity < aComplexity ? "B" : "A",
                        reason: "More accessible language for beginners"
                    };
                }
            );

            expect(result.winner).toBe("B");
            expect(result.selectedContent.generator).toBe("Beginner-friendly");
        });
    });
});
