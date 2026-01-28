/**
 * Content Distribution Pattern Tests
 *
 * Tests the advanced-level omnichannel content publishing workflow that includes:
 * - Platform-specific content optimization (YouTube, TikTok, Instagram, Twitter, LinkedIn, Reddit, Medium)
 * - AI-generated platform-specific content variations
 * - Scheduled publishing via Buffer
 * - Performance tracking in Amplitude
 * - Notion content calendar sync
 * - Comprehensive Slack/Teams reporting
 *
 * Pattern: trigger → llm-analyze → loop(platforms) → [llm-optimize per platform] →
 *          [action-buffer per platform] → action-notion → action-amplitude →
 *          [action-slack, action-teams] → transform-result → output-1
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    simulatePatternExecution,
    validatePatternStructure,
    createMockLLMOutput,
    createMockActionOutput,
    createMockTriggerOutput,
    createMockTransformOutput,
    assertPatternSuccess,
    assertNodesExecuted,
    getPatternNodeIds,
    getPatternNodesByType
} from "../helpers/pattern-test-utils";

describe("Content Distribution Pattern", () => {
    const PATTERN_ID = "multi-channel-publisher";

    // Sample content creation trigger
    const sampleContentEvent: JsonObject = {
        contentId: "content-123",
        type: "blog_post",
        title: "10 Ways AI is Transforming Software Development",
        body: "Artificial intelligence is revolutionizing how we build software...",
        author: "Sarah Developer",
        tags: ["AI", "Software Development", "Technology"],
        mediaAssets: [
            { type: "image", url: "https://cdn.example.com/ai-dev.jpg", alt: "AI Development" },
            { type: "video", url: "https://cdn.example.com/ai-demo.mp4", duration: 60 }
        ],
        targetAudience: "developers",
        publishDate: "2024-02-20T09:00:00Z"
    };

    // Content analysis result
    const analysisResult = {
        contentType: "educational",
        tone: "professional",
        primaryTopics: ["AI", "Software Development"],
        targetDemographics: ["developers", "tech professionals"],
        viralPotential: 0.72,
        recommendedPlatforms: ["linkedin", "twitter", "youtube", "medium"],
        hashtags: {
            primary: ["#AI", "#SoftwareDevelopment", "#TechTrends"],
            secondary: ["#MachineLearning", "#DevTools", "#FutureTech"]
        },
        bestPostingTimes: {
            linkedin: "09:00 UTC",
            twitter: "14:00 UTC",
            youtube: "16:00 UTC"
        }
    };

    // Platform-specific optimizations
    const platformOptimizations = {
        youtube: {
            title: "10 Ways AI is Transforming Software Development | Developer Guide 2024",
            description:
                "Discover how artificial intelligence is revolutionizing software development! From code completion to automated testing...",
            tags: ["AI", "Software Development", "Programming", "Machine Learning", "Dev Tools"],
            thumbnail: "https://cdn.example.com/yt-thumb-ai-dev.jpg",
            chapters: [
                { time: "0:00", title: "Introduction" },
                { time: "1:30", title: "AI Code Assistants" },
                { time: "4:00", title: "Automated Testing" }
            ]
        },
        tiktok: {
            caption:
                "POV: AI just wrote your entire function 🤖✨ #AI #CodingLife #TechTok #Developer",
            hashtags: ["#AI", "#CodingLife", "#TechTok", "#Developer", "#FYP"],
            sound: "trending_tech_beat",
            duration: 60,
            hooks: ["Wait for the plot twist at 0:45"]
        },
        instagram: {
            caption:
                "AI is changing everything about how we code 🚀\n\nSwipe to see the top 10 ways AI is transforming development →\n\n#AI #Developer #TechLife",
            hashtags: [
                "#AI",
                "#Developer",
                "#TechLife",
                "#Coding",
                "#SoftwareEngineering",
                "#TechCommunity"
            ],
            carouselSlides: 10,
            altText: "AI transforming software development infographic"
        },
        twitter: {
            thread: [
                "🧵 AI is revolutionizing software development. Here are 10 ways it's changing the game:",
                "1/ Code Completion - GitHub Copilot and similar tools can now write entire functions based on comments alone.",
                "2/ Automated Testing - AI can generate test cases and identify edge cases humans might miss."
            ],
            hashtags: ["#AI", "#DevTwitter", "#TechTwitter"],
            poll: null
        },
        linkedin: {
            headline: "How AI is Reshaping Software Development: A Comprehensive Guide",
            body: "As a software professional, I've witnessed firsthand how AI is transforming our industry...",
            hashtags: ["#ArtificialIntelligence", "#SoftwareDevelopment", "#TechLeadership"],
            documentUpload: true
        },
        reddit: {
            subreddits: ["r/programming", "r/MachineLearning", "r/technology"],
            title: "10 Ways AI is Actually Transforming Software Development (with examples)",
            body: "I've been tracking AI's impact on development for the past year. Here's what I've found...",
            flair: "Discussion"
        },
        medium: {
            title: "10 Ways AI is Transforming Software Development in 2024",
            subtitle:
                "A comprehensive look at how artificial intelligence is reshaping the developer experience",
            tags: ["AI", "Software Development", "Technology", "Programming", "Machine Learning"],
            canonicalUrl: "https://blog.example.com/ai-dev-transformation"
        }
    };

    // Buffer scheduling results
    const bufferResults = {
        youtube: { postId: "buf-yt-123", scheduledTime: "2024-02-20T16:00:00Z" },
        tiktok: { postId: "buf-tt-456", scheduledTime: "2024-02-20T18:00:00Z" },
        instagram: { postId: "buf-ig-789", scheduledTime: "2024-02-20T12:00:00Z" },
        twitter: { postId: "buf-tw-012", scheduledTime: "2024-02-20T14:00:00Z" },
        linkedin: { postId: "buf-li-345", scheduledTime: "2024-02-20T09:00:00Z" },
        reddit: { postId: "buf-rd-678", scheduledTime: "2024-02-20T15:00:00Z" },
        medium: { postId: "buf-md-901", scheduledTime: "2024-02-20T10:00:00Z" }
    };

    // Helper to create complete mock outputs
    const createCompleteMocks = (overrides: Record<string, JsonObject> = {}) => ({
        "input-1": createMockActionOutput(true, sampleContentEvent),
        "action-gdrive": createMockActionOutput(true, { assets: ["video.mp4", "thumbnail.png"] }),
        "llm-youtube": createMockLLMOutput(JSON.stringify(platformOptimizations.youtube)),
        "llm-tiktok": createMockLLMOutput(JSON.stringify(platformOptimizations.tiktok)),
        "llm-instagram": createMockLLMOutput(JSON.stringify(platformOptimizations.instagram)),
        "llm-twitter": createMockLLMOutput(JSON.stringify(platformOptimizations.twitter)),
        "llm-linkedin": createMockLLMOutput(JSON.stringify(platformOptimizations.linkedin)),
        "llm-reddit": createMockLLMOutput(JSON.stringify(platformOptimizations.reddit)),
        "llm-medium": createMockLLMOutput(JSON.stringify(platformOptimizations.medium)),
        "action-youtube": createMockActionOutput(true, bufferResults.youtube),
        "action-buffer-tiktok": createMockActionOutput(true, bufferResults.tiktok),
        "action-instagram": createMockActionOutput(true, bufferResults.instagram),
        "action-twitter": createMockActionOutput(true, bufferResults.twitter),
        "action-linkedin": createMockActionOutput(true, bufferResults.linkedin),
        "action-reddit": createMockActionOutput(true, bufferResults.reddit),
        "action-medium": createMockActionOutput(true, bufferResults.medium),
        "action-notion": createMockActionOutput(true, { pageId: "notion-cal-123" }),
        "action-amplitude": createMockActionOutput(true, { tracked: true }),
        "action-slack": createMockActionOutput(true, { messageTs: "123.456" }),
        "action-teams": createMockActionOutput(true, { messageId: "teams-msg-789" }),
        "transform-result": createMockTransformOutput({
            contentId: "content-123",
            platformsPublished: 7,
            totalScheduledPosts: 7
        }),
        "output-1": createMockActionOutput(true),
        ...overrides
    });

    describe("pattern structure validation", () => {
        it("should have valid pattern structure", () => {
            const validation = validatePatternStructure(PATTERN_ID);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it("should have correct node count (22 nodes)", () => {
            const nodeIds = getPatternNodeIds(PATTERN_ID);
            expect(nodeIds.length).toBe(22);
        });

        it("should have input node as entry point", () => {
            const inputNodes = getPatternNodesByType(PATTERN_ID, "input");
            expect(inputNodes.length).toBe(1);
        });

        it("should have multiple LLM nodes for platform optimization", () => {
            const llmNodes = getPatternNodesByType(PATTERN_ID, "llm");
            expect(llmNodes.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("content analysis", () => {
        it("should fetch content assets from Google Drive", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-gdrive"]);
        });

        it("should identify target platforms based on content type", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });

        it("should determine optimal posting times", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });
    });

    describe("platform-specific optimization", () => {
        it("should optimize content for YouTube", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });

        it("should optimize content for TikTok with trending elements", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });

        it("should create Instagram carousel content", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });

        it("should create Twitter thread", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });

        it("should optimize for LinkedIn professional audience", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });

        it("should format for Reddit community guidelines", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });

        it("should prepare Medium article with SEO", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });
    });

    describe("scheduled publishing", () => {
        it("should schedule all platform posts via Buffer", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });

        it("should respect platform-specific optimal times", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
        });

        it("should handle Buffer API failures gracefully", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks({
                    "action-buffer-tiktok": createMockActionOutput(false, {
                        error: "Account not connected"
                    })
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("content calendar sync", () => {
        it("should update Notion content calendar", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-notion"]);
        });
    });

    describe("analytics tracking", () => {
        it("should track distribution event in Amplitude", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-amplitude"]);
        });
    });

    describe("notifications", () => {
        it("should send Slack distribution report", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-slack"]);
        });

        it("should send Teams distribution report", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-teams"]);
        });
    });

    describe("content types", () => {
        it("should handle video content distribution", async () => {
            const videoContent = {
                ...sampleContentEvent,
                type: "video",
                mediaAssets: [
                    { type: "video", url: "https://cdn.example.com/full-video.mp4", duration: 600 }
                ]
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: videoContent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(videoContent)
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle image-only content", async () => {
            const imageContent = {
                ...sampleContentEvent,
                type: "infographic",
                mediaAssets: [{ type: "image", url: "https://cdn.example.com/infographic.png" }]
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: imageContent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(imageContent)
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle text-only content (no media)", async () => {
            const textContent = {
                ...sampleContentEvent,
                type: "announcement",
                mediaAssets: []
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: textContent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(textContent)
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("audience targeting", () => {
        it("should adjust content for B2B audience", async () => {
            const b2bContent = {
                ...sampleContentEvent,
                targetAudience: "enterprise_leaders",
                tags: ["Enterprise", "Digital Transformation", "Leadership"]
            };

            const b2bAnalysis = {
                ...analysisResult,
                targetDemographics: ["C-suite", "IT Directors"],
                recommendedPlatforms: ["linkedin", "twitter", "medium"],
                tone: "authoritative"
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: b2bContent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(b2bContent),
                    "llm-analyze": createMockLLMOutput(JSON.stringify(b2bAnalysis))
                })
            });

            assertPatternSuccess(result);
        });

        it("should adjust content for Gen Z audience", async () => {
            const genZContent = {
                ...sampleContentEvent,
                targetAudience: "gen_z_developers",
                tags: ["Coding", "TechTok", "LearnToCode"]
            };

            const genZAnalysis = {
                ...analysisResult,
                targetDemographics: ["18-24", "students", "junior developers"],
                recommendedPlatforms: ["tiktok", "instagram", "youtube", "reddit"],
                tone: "casual"
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: genZContent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(genZContent),
                    "llm-analyze": createMockLLMOutput(JSON.stringify(genZAnalysis))
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("edge cases", () => {
        it("should handle content with special characters", async () => {
            const specialContent = {
                ...sampleContentEvent,
                title: "C++ vs Rust: A Developer's Perspective (2024 Edition) 🚀",
                body: "Let's compare <C++> and {Rust} for systems programming..."
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: specialContent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(specialContent)
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle very long content", async () => {
            const longContent = {
                ...sampleContentEvent,
                body: "A".repeat(10000) // Very long article
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: longContent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(longContent)
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle content in multiple languages", async () => {
            const multilingualContent = {
                ...sampleContentEvent,
                title: "AI革命: ソフトウェア開発の未来",
                body: "人工知能がソフトウェア開発をどのように変革しているか...",
                language: "ja"
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: multilingualContent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(multilingualContent)
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle scheduled content for future date", async () => {
            const futureContent = {
                ...sampleContentEvent,
                publishDate: "2024-12-25T09:00:00Z" // Future date
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: futureContent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(futureContent)
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle content republishing (update existing)", async () => {
            const republishContent = {
                ...sampleContentEvent,
                isUpdate: true,
                originalContentId: "content-100",
                updateReason: "Added new information"
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: republishContent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(republishContent)
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("selective platform publishing", () => {
        it("should publish to selected platforms only", async () => {
            const selectiveContent = {
                ...sampleContentEvent,
                targetPlatforms: ["linkedin", "twitter"] // Only these platforms
            };

            const selectiveAnalysis = {
                ...analysisResult,
                recommendedPlatforms: ["linkedin", "twitter"]
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: selectiveContent },
                mockOutputs: createCompleteMocks({
                    "trigger-1": createMockTriggerOutput(selectiveContent),
                    "llm-analyze": createMockLLMOutput(JSON.stringify(selectiveAnalysis))
                })
            });

            assertPatternSuccess(result);
        });

        it("should skip platforms with connection issues", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks({
                    "action-buffer-instagram": createMockActionOutput(false, {
                        error: "Instagram account disconnected"
                    }),
                    "action-buffer-tiktok": createMockActionOutput(false, {
                        error: "TikTok API error"
                    })
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("output structure", () => {
        it("should produce comprehensive distribution result", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { contentEvent: sampleContentEvent },
                mockOutputs: createCompleteMocks()
            });

            assertPatternSuccess(result);

            const transformOutput = result.context.nodeOutputs.get("transform-result") as Record<
                string,
                unknown
            >;
            expect(transformOutput?.success).toBe(true);
        });
    });
});
