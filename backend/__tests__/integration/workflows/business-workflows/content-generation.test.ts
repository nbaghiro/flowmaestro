/**
 * Content Generation Workflow Tests
 *
 * Tests a realistic content generation pipeline:
 * Trigger → LLM (outline) → Loop[LLM (section)] → Transform (combine) → Output
 *
 * Simulates a common content automation workflow for blog posts, articles, etc.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createContext, storeNodeOutput } from "../../../../src/temporal/core/services/context";
import type { ContextSnapshot } from "../../../../src/temporal/core/types";

// Simplified types for test workflow building
interface TestNode {
    id: string;
    type: string;
    config: Record<string, unknown>;
    dependencies: string[];
}

interface TestEdge {
    id: string;
    source: string;
    target: string;
    type: string;
    handleType?: string;
}

// Types for content generation workflow
interface ContentRequest {
    topic: string;
    type: "blog-post" | "article" | "whitepaper" | "social-post";
    targetLength: "short" | "medium" | "long";
    tone: "professional" | "casual" | "technical";
    keywords?: string[];
    targetAudience?: string;
}

interface ContentOutline {
    title: string;
    introduction: string;
    sections: {
        heading: string;
        keyPoints: string[];
        targetWords: number;
    }[];
    conclusion: string;
    estimatedReadTime: number;
}

interface GeneratedSection {
    heading: string;
    content: string;
    wordCount: number;
    keywordsUsed: string[];
}

interface FinalContent {
    title: string;
    fullContent: string;
    sections: GeneratedSection[];
    metadata: {
        totalWords: number;
        readTime: number;
        keywordDensity: Record<string, number>;
    };
}

// Workflow builder for content generation
function buildContentGenerationWorkflow(sectionCount: number): {
    nodes: Map<string, TestNode>;
    edges: TestEdge[];
    executionLevels: string[][];
} {
    const nodes = new Map<string, TestNode>();

    nodes.set("Trigger", {
        id: "Trigger",
        type: "trigger",
        config: { triggerType: "api" },
        dependencies: []
    });

    nodes.set("GenerateOutline", {
        id: "GenerateOutline",
        type: "llm",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Create an outline for: {{Trigger.topic}}"
        },
        dependencies: ["Trigger"]
    });

    nodes.set("SectionLoop", {
        id: "SectionLoop",
        type: "loop",
        config: {
            iterateOver: "{{GenerateOutline.sections}}",
            maxIterations: sectionCount
        },
        dependencies: ["GenerateOutline"]
    });

    nodes.set("GenerateSection", {
        id: "GenerateSection",
        type: "llm",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Write section: {{loop.item.heading}} with key points: {{loop.item.keyPoints}}"
        },
        dependencies: ["SectionLoop"]
    });

    nodes.set("CombineContent", {
        id: "CombineContent",
        type: "transform",
        config: {
            operation: "combine",
            template:
                "{{GenerateOutline.introduction}}\n\n{{SectionLoop.results}}\n\n{{GenerateOutline.conclusion}}"
        },
        dependencies: ["SectionLoop"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        config: {},
        dependencies: ["CombineContent"]
    });

    const edges: TestEdge[] = [
        { id: "e1", source: "Trigger", target: "GenerateOutline", type: "default" },
        { id: "e2", source: "GenerateOutline", target: "SectionLoop", type: "default" },
        { id: "e3", source: "SectionLoop", target: "GenerateSection", type: "loop-body" },
        { id: "e4", source: "GenerateSection", target: "SectionLoop", type: "loop-back" },
        { id: "e5", source: "SectionLoop", target: "CombineContent", type: "loop-complete" },
        { id: "e6", source: "CombineContent", target: "Output", type: "default" }
    ];

    const executionLevels = [
        ["Trigger"],
        ["GenerateOutline"],
        ["SectionLoop"],
        ["CombineContent"],
        ["Output"]
    ];

    return { nodes, edges, executionLevels };
}

// Mock outline generator
function createOutline(request: ContentRequest): ContentOutline {
    const sectionCount =
        request.targetLength === "short" ? 2 : request.targetLength === "medium" ? 4 : 6;

    const wordsPerSection =
        request.targetLength === "short" ? 150 : request.targetLength === "medium" ? 300 : 500;

    const sections = Array.from({ length: sectionCount }, (_, i) => ({
        heading: `Section ${i + 1}: ${request.topic} - Part ${i + 1}`,
        keyPoints: [
            `Key point ${i + 1}.1 about ${request.topic}`,
            `Key point ${i + 1}.2 about ${request.topic}`,
            `Key point ${i + 1}.3 about ${request.topic}`
        ],
        targetWords: wordsPerSection
    }));

    return {
        title: `Complete Guide to ${request.topic}`,
        introduction: `This ${request.type} will explore ${request.topic} in detail, covering the most important aspects that ${request.targetAudience || "readers"} need to know.`,
        sections,
        conclusion: `In conclusion, ${request.topic} is a crucial topic that deserves careful consideration.`,
        estimatedReadTime: Math.ceil((sectionCount * wordsPerSection) / 200)
    };
}

// Mock section generator
function createSection(
    sectionDef: ContentOutline["sections"][0],
    tone: ContentRequest["tone"],
    keywords: string[] = []
): GeneratedSection {
    const paragraphs = sectionDef.keyPoints.map(
        (point) =>
            `${point}. This is elaborated content about this key point in a ${tone} tone. ` +
            "The content continues with more details and examples to reach the target word count."
    );

    const content = paragraphs.join("\n\n");
    const keywordsUsed = keywords.filter((kw) => content.toLowerCase().includes(kw.toLowerCase()));

    return {
        heading: sectionDef.heading,
        content,
        wordCount: content.split(/\s+/).length,
        keywordsUsed
    };
}

// Helper to convert interface to JsonObject
function toJsonObject<T extends object>(obj: T): JsonObject {
    return JSON.parse(JSON.stringify(obj)) as JsonObject;
}

// Simulate the content generation workflow
async function simulateContentGeneration(
    request: ContentRequest,
    options: {
        outlineOverride?: ContentOutline;
        sectionOverrides?: Map<number, GeneratedSection>;
        failOnSection?: number;
        tokenLimitOnSection?: number;
    } = {}
): Promise<{
    context: ContextSnapshot;
    outline: ContentOutline;
    sections: GeneratedSection[];
    finalContent: FinalContent | null;
    iterationsCompleted: number;
    error?: string;
}> {
    const outline = options.outlineOverride || createOutline(request);
    // Build workflow for reference (not directly used in mock simulation)
    buildContentGenerationWorkflow(outline.sections.length);
    let context = createContext(toJsonObject(request));
    const generatedSections: GeneratedSection[] = [];

    // Execute Trigger
    context = storeNodeOutput(context, "Trigger", toJsonObject(request));

    // Execute GenerateOutline
    context = storeNodeOutput(context, "GenerateOutline", toJsonObject(outline));

    // Execute SectionLoop
    for (let i = 0; i < outline.sections.length; i++) {
        // Check for failure condition
        if (options.failOnSection === i) {
            return {
                context,
                outline,
                sections: generatedSections,
                finalContent: null,
                iterationsCompleted: i,
                error: `Failed to generate section ${i + 1}: LLM error`
            };
        }

        // Check for token limit
        if (options.tokenLimitOnSection === i) {
            return {
                context,
                outline,
                sections: generatedSections,
                finalContent: null,
                iterationsCompleted: i,
                error: `Token limit exceeded on section ${i + 1}`
            };
        }

        const section =
            options.sectionOverrides?.get(i) ||
            createSection(outline.sections[i], request.tone, request.keywords);

        generatedSections.push(section);

        // Store loop iteration context
        context = storeNodeOutput(context, `GenerateSection_${i}`, toJsonObject(section));
    }

    // Store loop results
    context = storeNodeOutput(context, "SectionLoop", {
        iterations: outline.sections.length,
        results: generatedSections.map((s) => toJsonObject(s)) as JsonValue[]
    });

    // Execute CombineContent
    const totalWords = generatedSections.reduce((sum, s) => sum + s.wordCount, 0);
    const allKeywords = generatedSections.flatMap((s) => s.keywordsUsed);
    const keywordDensity: Record<string, number> = {};
    allKeywords.forEach((kw) => {
        keywordDensity[kw] = (keywordDensity[kw] || 0) + 1;
    });

    const fullContent = [
        outline.introduction,
        ...generatedSections.map((s) => `## ${s.heading}\n\n${s.content}`),
        outline.conclusion
    ].join("\n\n");

    const finalContent: FinalContent = {
        title: outline.title,
        fullContent,
        sections: generatedSections,
        metadata: {
            totalWords,
            readTime: Math.ceil(totalWords / 200),
            keywordDensity
        }
    };

    context = storeNodeOutput(context, "CombineContent", toJsonObject(finalContent));

    // Execute Output
    context = storeNodeOutput(context, "Output", toJsonObject(finalContent));

    return {
        context,
        outline,
        sections: generatedSections,
        finalContent,
        iterationsCompleted: outline.sections.length
    };
}

describe("Content Generation Workflow", () => {
    describe("multi-section generation", () => {
        it("should generate outline with correct number of sections", async () => {
            const request: ContentRequest = {
                topic: "Machine Learning Basics",
                type: "blog-post",
                targetLength: "medium",
                tone: "professional"
            };

            const result = await simulateContentGeneration(request);

            expect(result.outline.sections.length).toBe(4); // medium = 4 sections
            expect(result.iterationsCompleted).toBe(4);
        });

        it("should generate short content with 2 sections", async () => {
            const request: ContentRequest = {
                topic: "Quick Tips",
                type: "social-post",
                targetLength: "short",
                tone: "casual"
            };

            const result = await simulateContentGeneration(request);

            expect(result.outline.sections.length).toBe(2);
            expect(result.sections.length).toBe(2);
        });

        it("should generate long content with 6 sections", async () => {
            const request: ContentRequest = {
                topic: "Enterprise Architecture",
                type: "whitepaper",
                targetLength: "long",
                tone: "technical"
            };

            const result = await simulateContentGeneration(request);

            expect(result.outline.sections.length).toBe(6);
            expect(result.sections.length).toBe(6);
        });

        it("should process each section through the loop", async () => {
            const request: ContentRequest = {
                topic: "API Design",
                type: "article",
                targetLength: "medium",
                tone: "technical"
            };

            const result = await simulateContentGeneration(request);

            // Verify each section was processed
            for (let i = 0; i < result.outline.sections.length; i++) {
                const sectionOutput = result.context.nodeOutputs.get(`GenerateSection_${i}`);
                expect(sectionOutput).toBeDefined();
            }
        });
    });

    describe("variable section count", () => {
        it("should handle single section content", async () => {
            const customOutline: ContentOutline = {
                title: "Single Section",
                introduction: "Intro",
                sections: [
                    {
                        heading: "Main Content",
                        keyPoints: ["Point 1"],
                        targetWords: 100
                    }
                ],
                conclusion: "Conclusion",
                estimatedReadTime: 1
            };

            const result = await simulateContentGeneration(
                { topic: "Test", type: "blog-post", targetLength: "short", tone: "casual" },
                { outlineOverride: customOutline }
            );

            expect(result.sections.length).toBe(1);
            expect(result.finalContent?.sections.length).toBe(1);
        });

        it("should handle many sections (10+)", async () => {
            const customOutline: ContentOutline = {
                title: "Comprehensive Guide",
                introduction: "Intro",
                sections: Array.from({ length: 10 }, (_, i) => ({
                    heading: `Chapter ${i + 1}`,
                    keyPoints: [`Point ${i + 1}`],
                    targetWords: 200
                })),
                conclusion: "Conclusion",
                estimatedReadTime: 10
            };

            const result = await simulateContentGeneration(
                { topic: "Test", type: "whitepaper", targetLength: "long", tone: "professional" },
                { outlineOverride: customOutline }
            );

            expect(result.sections.length).toBe(10);
            expect(result.iterationsCompleted).toBe(10);
        });

        it("should handle zero sections gracefully", async () => {
            const customOutline: ContentOutline = {
                title: "Empty Content",
                introduction: "Intro only",
                sections: [],
                conclusion: "Just conclusion",
                estimatedReadTime: 1
            };

            const result = await simulateContentGeneration(
                { topic: "Test", type: "blog-post", targetLength: "short", tone: "casual" },
                { outlineOverride: customOutline }
            );

            expect(result.sections.length).toBe(0);
            expect(result.iterationsCompleted).toBe(0);
            expect(result.finalContent).toBeDefined();
        });
    });

    describe("consistent style across sections", () => {
        it("should maintain professional tone throughout", async () => {
            const request: ContentRequest = {
                topic: "Business Strategy",
                type: "whitepaper",
                targetLength: "medium",
                tone: "professional"
            };

            const result = await simulateContentGeneration(request);

            // All sections should reflect professional tone
            result.sections.forEach((section) => {
                expect(section.content).toContain("professional");
            });
        });

        it("should maintain casual tone throughout", async () => {
            const request: ContentRequest = {
                topic: "Weekend Hobbies",
                type: "blog-post",
                targetLength: "short",
                tone: "casual"
            };

            const result = await simulateContentGeneration(request);

            result.sections.forEach((section) => {
                expect(section.content).toContain("casual");
            });
        });

        it("should maintain technical tone throughout", async () => {
            const request: ContentRequest = {
                topic: "Kubernetes Architecture",
                type: "article",
                targetLength: "medium",
                tone: "technical"
            };

            const result = await simulateContentGeneration(request);

            result.sections.forEach((section) => {
                expect(section.content).toContain("technical");
            });
        });

        it("should use consistent heading format", async () => {
            const request: ContentRequest = {
                topic: "Design Patterns",
                type: "article",
                targetLength: "medium",
                tone: "professional"
            };

            const result = await simulateContentGeneration(request);

            // All headings should follow the pattern
            result.sections.forEach((section, i) => {
                expect(section.heading).toContain(`Section ${i + 1}`);
            });
        });
    });

    describe("token limit handling", () => {
        it("should stop generation when token limit is reached", async () => {
            const request: ContentRequest = {
                topic: "Long Topic",
                type: "whitepaper",
                targetLength: "long",
                tone: "professional"
            };

            const result = await simulateContentGeneration(request, {
                tokenLimitOnSection: 3
            });

            expect(result.error).toContain("Token limit exceeded");
            expect(result.iterationsCompleted).toBe(3);
            expect(result.sections.length).toBe(3);
        });

        it("should preserve completed sections when limit is hit", async () => {
            const request: ContentRequest = {
                topic: "Partial Content",
                type: "article",
                targetLength: "medium",
                tone: "professional"
            };

            const result = await simulateContentGeneration(request, {
                tokenLimitOnSection: 2
            });

            expect(result.sections.length).toBe(2);
            result.sections.forEach((section) => {
                expect(section.content).toBeDefined();
                expect(section.wordCount).toBeGreaterThan(0);
            });
        });

        it("should indicate incomplete status when limit is hit", async () => {
            const request: ContentRequest = {
                topic: "Incomplete Test",
                type: "blog-post",
                targetLength: "medium",
                tone: "casual"
            };

            const result = await simulateContentGeneration(request, {
                tokenLimitOnSection: 1
            });

            expect(result.finalContent).toBeNull();
            expect(result.error).toBeDefined();
        });

        it("should complete successfully when within token limit", async () => {
            const request: ContentRequest = {
                topic: "Within Limits",
                type: "blog-post",
                targetLength: "short",
                tone: "casual"
            };

            const result = await simulateContentGeneration(request);

            expect(result.error).toBeUndefined();
            expect(result.finalContent).toBeDefined();
        });
    });

    describe("content combination", () => {
        it("should combine all sections into final content", async () => {
            const request: ContentRequest = {
                topic: "Combined Content",
                type: "article",
                targetLength: "medium",
                tone: "professional"
            };

            const result = await simulateContentGeneration(request);

            expect(result.finalContent?.fullContent).toContain(result.outline.introduction);
            expect(result.finalContent?.fullContent).toContain(result.outline.conclusion);

            result.sections.forEach((section) => {
                expect(result.finalContent?.fullContent).toContain(section.heading);
            });
        });

        it("should calculate total word count correctly", async () => {
            const customSections = new Map<number, GeneratedSection>();
            customSections.set(0, {
                heading: "Section 1",
                content: "word ".repeat(100).trim(),
                wordCount: 100,
                keywordsUsed: []
            });
            customSections.set(1, {
                heading: "Section 2",
                content: "word ".repeat(150).trim(),
                wordCount: 150,
                keywordsUsed: []
            });

            const customOutline: ContentOutline = {
                title: "Test",
                introduction: "Intro",
                sections: [
                    { heading: "Section 1", keyPoints: [], targetWords: 100 },
                    { heading: "Section 2", keyPoints: [], targetWords: 150 }
                ],
                conclusion: "End",
                estimatedReadTime: 2
            };

            const result = await simulateContentGeneration(
                { topic: "Test", type: "blog-post", targetLength: "short", tone: "casual" },
                { outlineOverride: customOutline, sectionOverrides: customSections }
            );

            expect(result.finalContent?.metadata.totalWords).toBe(250);
        });

        it("should calculate read time based on word count", async () => {
            const request: ContentRequest = {
                topic: "Read Time Test",
                type: "article",
                targetLength: "long",
                tone: "professional"
            };

            const result = await simulateContentGeneration(request);

            // Read time should be total words / 200 (average reading speed)
            const expectedReadTime = Math.ceil(result.finalContent!.metadata.totalWords / 200);
            expect(result.finalContent?.metadata.readTime).toBe(expectedReadTime);
        });

        it("should preserve section order in final content", async () => {
            const request: ContentRequest = {
                topic: "Order Test",
                type: "article",
                targetLength: "medium",
                tone: "professional"
            };

            const result = await simulateContentGeneration(request);
            const fullContent = result.finalContent!.fullContent;

            // Find positions of each section
            const positions = result.sections.map((s) => fullContent.indexOf(s.heading));

            // Verify ascending order
            for (let i = 1; i < positions.length; i++) {
                expect(positions[i]).toBeGreaterThan(positions[i - 1]);
            }
        });
    });

    describe("keyword integration", () => {
        it("should track keyword usage across sections", async () => {
            const request: ContentRequest = {
                topic: "SEO Content",
                type: "blog-post",
                targetLength: "medium",
                tone: "professional",
                keywords: ["SEO", "content", "optimization"]
            };

            const result = await simulateContentGeneration(request);

            expect(result.finalContent?.metadata.keywordDensity).toBeDefined();
        });

        it("should report keyword density in metadata", async () => {
            const customSections = new Map<number, GeneratedSection>();
            customSections.set(0, {
                heading: "SEO Section",
                content: "SEO is important. SEO helps visibility.",
                wordCount: 6,
                keywordsUsed: ["SEO", "SEO"]
            });
            customSections.set(1, {
                heading: "Content Section",
                content: "Content is king.",
                wordCount: 3,
                keywordsUsed: ["Content"]
            });

            const customOutline: ContentOutline = {
                title: "Test",
                introduction: "Intro",
                sections: [
                    { heading: "SEO Section", keyPoints: [], targetWords: 50 },
                    { heading: "Content Section", keyPoints: [], targetWords: 50 }
                ],
                conclusion: "End",
                estimatedReadTime: 1
            };

            const result = await simulateContentGeneration(
                {
                    topic: "Keywords",
                    type: "blog-post",
                    targetLength: "short",
                    tone: "professional",
                    keywords: ["SEO", "Content"]
                },
                { outlineOverride: customOutline, sectionOverrides: customSections }
            );

            expect(result.finalContent?.metadata.keywordDensity["SEO"]).toBe(2);
            expect(result.finalContent?.metadata.keywordDensity["Content"]).toBe(1);
        });

        it("should handle content with no keyword matches", async () => {
            const request: ContentRequest = {
                topic: "Generic Topic",
                type: "blog-post",
                targetLength: "short",
                tone: "casual",
                keywords: ["xyz123", "nonexistent"]
            };

            const result = await simulateContentGeneration(request);

            expect(result.finalContent?.metadata.keywordDensity).toEqual({});
        });
    });

    describe("error handling during generation", () => {
        it("should handle LLM failure on specific section", async () => {
            const request: ContentRequest = {
                topic: "Failure Test",
                type: "article",
                targetLength: "medium",
                tone: "professional"
            };

            const result = await simulateContentGeneration(request, {
                failOnSection: 2
            });

            expect(result.error).toContain("Failed to generate section 3");
            expect(result.iterationsCompleted).toBe(2);
        });

        it("should fail on first section if specified", async () => {
            const request: ContentRequest = {
                topic: "First Fail",
                type: "blog-post",
                targetLength: "short",
                tone: "casual"
            };

            const result = await simulateContentGeneration(request, {
                failOnSection: 0
            });

            expect(result.error).toContain("Failed to generate section 1");
            expect(result.iterationsCompleted).toBe(0);
            expect(result.sections.length).toBe(0);
        });

        it("should preserve outline even when section generation fails", async () => {
            const request: ContentRequest = {
                topic: "Outline Preserved",
                type: "article",
                targetLength: "medium",
                tone: "professional"
            };

            const result = await simulateContentGeneration(request, {
                failOnSection: 1
            });

            expect(result.outline).toBeDefined();
            expect(result.outline.title).toContain("Outline Preserved");
        });

        it("should not produce final content when generation fails", async () => {
            const request: ContentRequest = {
                topic: "No Final",
                type: "blog-post",
                targetLength: "short",
                tone: "casual"
            };

            const result = await simulateContentGeneration(request, {
                failOnSection: 1
            });

            expect(result.finalContent).toBeNull();
        });
    });

    describe("content type variations", () => {
        it("should generate appropriate title for blog post", async () => {
            const request: ContentRequest = {
                topic: "React Hooks",
                type: "blog-post",
                targetLength: "medium",
                tone: "casual"
            };

            const result = await simulateContentGeneration(request);

            expect(result.outline.title).toContain("React Hooks");
        });

        it("should generate appropriate structure for whitepaper", async () => {
            const request: ContentRequest = {
                topic: "Enterprise Security",
                type: "whitepaper",
                targetLength: "long",
                tone: "technical"
            };

            const result = await simulateContentGeneration(request);

            expect(result.outline.sections.length).toBe(6);
            expect(result.outline.estimatedReadTime).toBeGreaterThan(5);
        });

        it("should generate concise structure for social post", async () => {
            const request: ContentRequest = {
                topic: "Quick Tip",
                type: "social-post",
                targetLength: "short",
                tone: "casual"
            };

            const result = await simulateContentGeneration(request);

            expect(result.outline.sections.length).toBe(2);
            expect(result.outline.estimatedReadTime).toBeLessThanOrEqual(2);
        });
    });

    describe("target audience customization", () => {
        it("should mention target audience in introduction", async () => {
            const request: ContentRequest = {
                topic: "DevOps Best Practices",
                type: "article",
                targetLength: "medium",
                tone: "technical",
                targetAudience: "senior engineers"
            };

            const result = await simulateContentGeneration(request);

            expect(result.outline.introduction).toContain("senior engineers");
        });

        it("should use default audience when not specified", async () => {
            const request: ContentRequest = {
                topic: "General Topic",
                type: "blog-post",
                targetLength: "short",
                tone: "casual"
            };

            const result = await simulateContentGeneration(request);

            expect(result.outline.introduction).toContain("readers");
        });
    });

    describe("workflow completion verification", () => {
        it("should store output in all required nodes", async () => {
            const request: ContentRequest = {
                topic: "Node Verification",
                type: "article",
                targetLength: "short",
                tone: "professional"
            };

            const result = await simulateContentGeneration(request);

            expect(result.context.nodeOutputs.get("Trigger")).toBeDefined();
            expect(result.context.nodeOutputs.get("GenerateOutline")).toBeDefined();
            expect(result.context.nodeOutputs.get("SectionLoop")).toBeDefined();
            expect(result.context.nodeOutputs.get("CombineContent")).toBeDefined();
            expect(result.context.nodeOutputs.get("Output")).toBeDefined();
        });

        it("should have matching section count in loop results", async () => {
            const request: ContentRequest = {
                topic: "Loop Count",
                type: "article",
                targetLength: "medium",
                tone: "professional"
            };

            const result = await simulateContentGeneration(request);

            const loopOutput = result.context.nodeOutputs.get("SectionLoop") as unknown as {
                iterations: number;
                results: GeneratedSection[];
            };

            expect(loopOutput.iterations).toBe(result.outline.sections.length);
            expect(loopOutput.results.length).toBe(result.outline.sections.length);
        });

        it("should have final output matching combined content", async () => {
            const request: ContentRequest = {
                topic: "Final Match",
                type: "blog-post",
                targetLength: "short",
                tone: "casual"
            };

            const result = await simulateContentGeneration(request);

            const outputNode = result.context.nodeOutputs.get("Output") as unknown as FinalContent;
            const combineNode = result.context.nodeOutputs.get(
                "CombineContent"
            ) as unknown as FinalContent;

            expect(outputNode).toEqual(combineNode);
        });
    });

    describe("performance considerations", () => {
        it("should complete generation in reasonable time", async () => {
            const request: ContentRequest = {
                topic: "Performance Test",
                type: "whitepaper",
                targetLength: "long",
                tone: "professional"
            };

            const startTime = Date.now();
            await simulateContentGeneration(request);
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(100); // Mock should be fast
        });

        it("should handle rapid successive generations", async () => {
            const requests: ContentRequest[] = Array.from({ length: 5 }, (_, i) => ({
                topic: `Topic ${i}`,
                type: "blog-post" as const,
                targetLength: "short" as const,
                tone: "casual" as const
            }));

            const results = await Promise.all(requests.map((r) => simulateContentGeneration(r)));

            expect(results.length).toBe(5);
            results.forEach((result, i) => {
                expect(result.outline.title).toContain(`Topic ${i}`);
            });
        });
    });
});
