/**
 * Seed Script for Workflow Templates
 *
 * Populates the workflow_templates table with 80 comprehensive templates
 * across 8 categories: marketing, sales, operations, engineering, support,
 * ecommerce, saas, healthcare
 *
 * Templates feature varying complexity levels:
 * - Advanced (15-20 nodes): parallel paths, routers, conditionals
 * - Intermediate (8-12 nodes): branching, multiple integrations
 * - Simple (5-7 nodes): straightforward flows, quick wins
 *
 * Uses the autoLayoutWorkflow algorithm from @flowmaestro/shared to ensure
 * consistent, visually appealing node positioning across all templates.
 *
 * Run with: npx tsx backend/scripts/seed-templates.ts
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { Pool } from "pg";
import { autoLayoutWorkflow } from "@flowmaestro/shared";

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Template-specific node type (React Flow compatible)
interface TemplateNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
}

/**
 * Apply auto-layout to template nodes using the shared layout algorithm.
 * Wraps the shared autoLayoutWorkflow function to mutate nodes in place
 * (which is the expected behavior for the seeding script).
 */
function applyAutoLayout(nodes: TemplateNode[], edges: TemplateEdge[]): void {
    // Use the shared layout algorithm
    const positions = autoLayoutWorkflow(nodes, edges);

    // Apply positions back to nodes (shared function returns a Map, doesn't mutate)
    for (const node of nodes) {
        const newPosition = positions.get(node.id);
        if (newPosition) {
            node.position = newPosition;
        }
    }
}

// Template-specific edge type
interface TemplateEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

// Template definition (stored as JSON, compatible with React Flow)
interface TemplateDefinition {
    name: string;
    nodes: TemplateNode[];
    edges: TemplateEdge[];
}

interface TemplateData {
    name: string;
    description: string;
    definition: TemplateDefinition;
    category: string;
    tags: string[];
    required_integrations: string[];
    featured?: boolean;
}

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

const templates: TemplateData[] = [
    // ========================================================================
    // MARKETING (6 templates)
    // ========================================================================

    // Marketing Advanced 1: Multi-Channel Campaign Orchestrator (18 nodes)
    {
        name: "Multi-Channel Campaign Orchestrator",
        description:
            "Orchestrate content creation across Twitter, LinkedIn, Instagram, and TikTok. AI generates platform-optimized content in parallel, routes through human review, schedules posts, and tracks analytics.",
        category: "marketing",
        tags: ["multi-channel", "social media", "content", "parallel", "automation"],
        required_integrations: ["twitter", "linkedin", "instagram", "tiktok", "hubspot", "slack"],
        featured: true,
        definition: {
            name: "Multi-Channel Campaign Orchestrator",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 400 },
                    data: {
                        label: "Campaign Brief",
                        inputName: "campaignBrief",
                        inputVariable: "campaignBrief",
                        inputType: "text",
                        description: "Campaign topic, goals, target audience, and key messages"
                    }
                },
                {
                    id: "llm-strategy",
                    type: "llm",
                    position: { x: 480, y: 400 },
                    data: {
                        label: "Create Content Strategy",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this campaign brief and create a content strategy:\n\n{{campaignBrief}}\n\nDefine: key themes, hashtags, posting schedule, and platform-specific angles for Twitter, LinkedIn, Instagram, and TikTok.",
                        outputVariable: "strategy"
                    }
                },
                {
                    id: "llm-twitter",
                    type: "llm",
                    position: { x: 860, y: 100 },
                    data: {
                        label: "Generate Twitter Content",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on this strategy:\n{{strategy.text}}\n\nCreate 5 engaging Twitter posts (max 280 chars each). Include relevant hashtags, make them conversational and shareable.",
                        outputVariable: "twitterContent"
                    }
                },
                {
                    id: "llm-linkedin",
                    type: "llm",
                    position: { x: 860, y: 300 },
                    data: {
                        label: "Generate LinkedIn Content",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on this strategy:\n{{strategy.text}}\n\nCreate 3 professional LinkedIn posts (300-500 words each). Include hooks, value-driven content, and calls to action.",
                        outputVariable: "linkedinContent"
                    }
                },
                {
                    id: "llm-instagram",
                    type: "llm",
                    position: { x: 860, y: 500 },
                    data: {
                        label: "Generate Instagram Content",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on this strategy:\n{{strategy.text}}\n\nCreate 3 Instagram captions with emoji usage, storytelling hooks, and hashtag sets (up to 30 relevant hashtags per post).",
                        outputVariable: "instagramContent"
                    }
                },
                {
                    id: "llm-tiktok",
                    type: "llm",
                    position: { x: 860, y: 700 },
                    data: {
                        label: "Generate TikTok Scripts",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on this strategy:\n{{strategy.text}}\n\nCreate 3 TikTok video scripts (15-60 seconds each). Include hook, main content, and CTA. Add trending sound suggestions.",
                        outputVariable: "tiktokContent"
                    }
                },
                {
                    id: "transform-compile",
                    type: "transform",
                    position: { x: 1240, y: 400 },
                    data: {
                        label: "Compile Content Package",
                        transformType: "template",
                        template:
                            '{"twitter": "{{twitterContent.text}}", "linkedin": "{{linkedinContent.text}}", "instagram": "{{instagramContent.text}}", "tiktok": "{{tiktokContent.text}}"}',
                        outputVariable: "contentPackage"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 1620, y: 400 },
                    data: {
                        label: "Review & Approve Content",
                        reviewPrompt:
                            "Review all generated content for brand alignment, accuracy, and quality before scheduling",
                        outputVariable: "approvedContent"
                    }
                },
                {
                    id: "router-quality",
                    type: "router",
                    position: { x: 2000, y: 400 },
                    data: {
                        label: "Quality Check Router",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on the review feedback, determine if the content is ready to publish or needs revision:\n\n{{approvedContent}}",
                        routes: [
                            {
                                value: "publish",
                                label: "Ready to Publish",
                                description: "Content approved for scheduling"
                            },
                            {
                                value: "revise",
                                label: "Needs Revision",
                                description: "Content requires changes"
                            }
                        ],
                        defaultRoute: "publish",
                        outputVariable: "qualityDecision"
                    }
                },
                {
                    id: "integration-twitter",
                    type: "integration",
                    position: { x: 2380, y: 100 },
                    data: {
                        label: "Schedule Twitter Posts",
                        provider: "twitter",
                        operation: "createTweet"
                    }
                },
                {
                    id: "integration-linkedin",
                    type: "integration",
                    position: { x: 2380, y: 300 },
                    data: {
                        label: "Schedule LinkedIn Posts",
                        provider: "linkedin",
                        operation: "createPost"
                    }
                },
                {
                    id: "integration-instagram",
                    type: "integration",
                    position: { x: 2380, y: 500 },
                    data: {
                        label: "Schedule Instagram Posts",
                        provider: "instagram",
                        operation: "createMedia"
                    }
                },
                {
                    id: "integration-tiktok",
                    type: "integration",
                    position: { x: 2380, y: 700 },
                    data: {
                        label: "Queue TikTok Content",
                        provider: "tiktok",
                        operation: "createVideo"
                    }
                },
                {
                    id: "transform-summary",
                    type: "transform",
                    position: { x: 2760, y: 400 },
                    data: {
                        label: "Create Campaign Summary",
                        transformType: "template",
                        template:
                            "Campaign scheduled across 4 platforms:\n- Twitter: {{twitterContent.text | truncate: 50}}\n- LinkedIn: {{linkedinContent.text | truncate: 50}}\n- Instagram: {{instagramContent.text | truncate: 50}}\n- TikTok: {{tiktokContent.text | truncate: 50}}",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 3140, y: 400 },
                    data: {
                        label: "Log to HubSpot",
                        provider: "hubspot",
                        operation: "createEngagement"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 3520, y: 400 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#marketing-campaigns"
                    }
                },
                {
                    id: "llm-revise",
                    type: "llm",
                    position: { x: 2380, y: 900 },
                    data: {
                        label: "Revise Content",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Revise this content based on the feedback provided:\n\nOriginal: {{contentPackage}}\nFeedback: {{approvedContent}}",
                        outputVariable: "revisedContent"
                    }
                },
                {
                    id: "integration-slack-revision",
                    type: "integration",
                    position: { x: 2760, y: 900 },
                    data: {
                        label: "Notify Revision Needed",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#marketing-campaigns"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 3900, y: 400 },
                    data: {
                        label: "Campaign Results",
                        outputName: "results",
                        value: "{{summary}}"
                    }
                },
                {
                    id: "output-revision",
                    type: "output",
                    position: { x: 3140, y: 900 },
                    data: {
                        label: "Revision Required",
                        outputName: "revision",
                        value: "{{revisedContent}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-strategy" },
                { id: "e2", source: "llm-strategy", target: "llm-twitter" },
                { id: "e3", source: "llm-strategy", target: "llm-linkedin" },
                { id: "e4", source: "llm-strategy", target: "llm-instagram" },
                { id: "e5", source: "llm-strategy", target: "llm-tiktok" },
                { id: "e6", source: "llm-twitter", target: "transform-compile" },
                { id: "e7", source: "llm-linkedin", target: "transform-compile" },
                { id: "e8", source: "llm-instagram", target: "transform-compile" },
                { id: "e9", source: "llm-tiktok", target: "transform-compile" },
                { id: "e10", source: "transform-compile", target: "humanReview-1" },
                { id: "e11", source: "humanReview-1", target: "router-quality" },
                {
                    id: "e12",
                    source: "router-quality",
                    target: "integration-twitter",
                    sourceHandle: "publish"
                },
                {
                    id: "e13",
                    source: "router-quality",
                    target: "integration-linkedin",
                    sourceHandle: "publish"
                },
                {
                    id: "e14",
                    source: "router-quality",
                    target: "integration-instagram",
                    sourceHandle: "publish"
                },
                {
                    id: "e15",
                    source: "router-quality",
                    target: "integration-tiktok",
                    sourceHandle: "publish"
                },
                {
                    id: "e16",
                    source: "router-quality",
                    target: "llm-revise",
                    sourceHandle: "revise"
                },
                { id: "e17", source: "integration-twitter", target: "transform-summary" },
                { id: "e18", source: "integration-linkedin", target: "transform-summary" },
                { id: "e19", source: "integration-instagram", target: "transform-summary" },
                { id: "e20", source: "integration-tiktok", target: "transform-summary" },
                { id: "e21", source: "transform-summary", target: "integration-hubspot" },
                { id: "e22", source: "integration-hubspot", target: "integration-slack" },
                { id: "e23", source: "integration-slack", target: "output-1" },
                { id: "e24", source: "llm-revise", target: "integration-slack-revision" },
                { id: "e25", source: "integration-slack-revision", target: "output-revision" }
            ]
        }
    },

    // Marketing Advanced 2: Podcast Episode Pipeline (16 nodes)
    {
        name: "Podcast Episode Pipeline",
        description:
            "Complete podcast production workflow: transcribe episodes, generate show notes, timestamps, social clips, audiograms, and publish across multiple platforms with coordinated social announcements.",
        category: "marketing",
        tags: ["podcast", "content repurposing", "transcription", "social media"],
        required_integrations: ["youtube", "notion", "twitter", "linkedin", "buffer", "slack"],
        featured: true,
        definition: {
            name: "Podcast Episode Pipeline",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 400 },
                    data: {
                        label: "Episode Details",
                        inputName: "episodeDetails",
                        inputVariable: "episodeDetails",
                        inputType: "json",
                        description:
                            '{"title": "", "description": "", "audioUrl": "", "guestName": "", "topics": []}'
                    }
                },
                {
                    id: "url-1",
                    type: "url",
                    position: { x: 480, y: 400 },
                    data: {
                        label: "Fetch Audio/Video",
                        urlVariable: "episodeDetails.audioUrl",
                        outputVariable: "mediaContent"
                    }
                },
                {
                    id: "llm-transcribe",
                    type: "llm",
                    position: { x: 860, y: 400 },
                    data: {
                        label: "Transcribe & Process",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Process this podcast episode:\nTitle: {{episodeDetails.title}}\nGuest: {{episodeDetails.guestName}}\n\nGenerate a detailed transcript with speaker labels and timestamps.",
                        outputVariable: "transcript"
                    }
                },
                {
                    id: "llm-shownotes",
                    type: "llm",
                    position: { x: 1240, y: 100 },
                    data: {
                        label: "Generate Show Notes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create comprehensive show notes from this transcript:\n\n{{transcript.text}}\n\nInclude: episode summary, key takeaways, guest bio, resources mentioned, and clickable timestamps.",
                        outputVariable: "showNotes"
                    }
                },
                {
                    id: "llm-timestamps",
                    type: "llm",
                    position: { x: 1240, y: 300 },
                    data: {
                        label: "Create Timestamps",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create YouTube-style chapter timestamps from this transcript:\n\n{{transcript.text}}\n\nFormat: [MM:SS] Topic Title",
                        outputVariable: "timestamps"
                    }
                },
                {
                    id: "llm-clips",
                    type: "llm",
                    position: { x: 1240, y: 500 },
                    data: {
                        label: "Identify Clip Moments",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Identify 5 best moments for social media clips from this transcript:\n\n{{transcript.text}}\n\nFor each: timestamp, duration (15-60s), hook quote, and suggested caption.",
                        outputVariable: "clipMoments"
                    }
                },
                {
                    id: "llm-quotes",
                    type: "llm",
                    position: { x: 1240, y: 700 },
                    data: {
                        label: "Extract Quotable Moments",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract 10 shareable quotes from this transcript:\n\n{{transcript.text}}\n\nMake them punchy, insightful, and formatted for social media graphics.",
                        outputVariable: "quotes"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 1620, y: 400 },
                    data: {
                        label: "Save to Notion",
                        provider: "notion",
                        operation: "createPage",
                        database: "Episodes"
                    }
                },
                {
                    id: "llm-twitter-thread",
                    type: "llm",
                    position: { x: 2000, y: 300 },
                    data: {
                        label: "Create Twitter Thread",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a Twitter thread (8-10 tweets) announcing this episode:\n\nTitle: {{episodeDetails.title}}\nGuest: {{episodeDetails.guestName}}\nKey points: {{showNotes.text}}\n\nStart with a hook, include key insights, end with CTA.",
                        outputVariable: "twitterThread"
                    }
                },
                {
                    id: "llm-linkedin",
                    type: "llm",
                    position: { x: 2000, y: 500 },
                    data: {
                        label: "Create LinkedIn Post",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a LinkedIn post announcing this episode:\n\nTitle: {{episodeDetails.title}}\nGuest: {{episodeDetails.guestName}}\nKey points: {{showNotes.text}}\n\nProfessional tone, value-focused, with clear CTA.",
                        outputVariable: "linkedinPost"
                    }
                },
                {
                    id: "integration-twitter",
                    type: "integration",
                    position: { x: 2380, y: 300 },
                    data: {
                        label: "Post Twitter Thread",
                        provider: "twitter",
                        operation: "createThread"
                    }
                },
                {
                    id: "integration-linkedin",
                    type: "integration",
                    position: { x: 2380, y: 500 },
                    data: {
                        label: "Post to LinkedIn",
                        provider: "linkedin",
                        operation: "createPost"
                    }
                },
                {
                    id: "integration-buffer",
                    type: "integration",
                    position: { x: 2760, y: 400 },
                    data: {
                        label: "Schedule Follow-up Posts",
                        provider: "buffer",
                        operation: "createPost"
                    }
                },
                {
                    id: "transform-summary",
                    type: "transform",
                    position: { x: 3140, y: 400 },
                    data: {
                        label: "Compile Results",
                        transformType: "template",
                        template:
                            "Episode {{episodeDetails.title}} processed:\n- Show notes: Created\n- Timestamps: {{timestamps.text | truncate: 100}}\n- Clips identified: 5\n- Social posts scheduled",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 3520, y: 400 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#podcast"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 3900, y: 400 },
                    data: {
                        label: "Pipeline Results",
                        outputName: "results",
                        value: "{{summary}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "url-1" },
                { id: "e2", source: "url-1", target: "llm-transcribe" },
                { id: "e3", source: "llm-transcribe", target: "llm-shownotes" },
                { id: "e4", source: "llm-transcribe", target: "llm-timestamps" },
                { id: "e5", source: "llm-transcribe", target: "llm-clips" },
                { id: "e6", source: "llm-transcribe", target: "llm-quotes" },
                { id: "e7", source: "llm-shownotes", target: "integration-notion" },
                { id: "e8", source: "llm-timestamps", target: "integration-notion" },
                { id: "e9", source: "llm-clips", target: "integration-notion" },
                { id: "e10", source: "llm-quotes", target: "integration-notion" },
                { id: "e11", source: "integration-notion", target: "llm-twitter-thread" },
                { id: "e12", source: "integration-notion", target: "llm-linkedin" },
                { id: "e13", source: "llm-twitter-thread", target: "integration-twitter" },
                { id: "e14", source: "llm-linkedin", target: "integration-linkedin" },
                { id: "e15", source: "integration-twitter", target: "integration-buffer" },
                { id: "e16", source: "integration-linkedin", target: "integration-buffer" },
                { id: "e17", source: "integration-buffer", target: "transform-summary" },
                { id: "e18", source: "transform-summary", target: "integration-slack" },
                { id: "e19", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Marketing Advanced 3: Competitive Intelligence Dashboard (15 nodes)
    {
        name: "Competitive Intelligence Dashboard",
        description:
            "Monitor competitors across multiple channels, gather market intelligence, analyze trends with AI, and generate executive briefings with conditional alerts for significant developments.",
        category: "marketing",
        tags: ["competitive intelligence", "monitoring", "analysis", "alerts"],
        required_integrations: ["twitter", "linkedin", "notion", "slack", "google-sheets", "gmail"],
        featured: true,
        definition: {
            name: "Competitive Intelligence Dashboard",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Schedule",
                        triggerType: "schedule",
                        schedule: "0 8 * * *",
                        description: "Runs daily at 8am"
                    }
                },
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Competitor List",
                        inputName: "competitors",
                        inputVariable: "competitors",
                        inputType: "json",
                        description: '["competitor1", "competitor2", "competitor3"]'
                    }
                },
                {
                    id: "integration-twitter",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Twitter Activity",
                        provider: "twitter",
                        operation: "searchTweets"
                    }
                },
                {
                    id: "integration-linkedin",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch LinkedIn Updates",
                        provider: "linkedin",
                        operation: "getCompanyUpdates"
                    }
                },
                {
                    id: "url-1",
                    type: "url",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Scrape News Sources",
                        urlVariable: "newsUrls",
                        outputVariable: "newsContent"
                    }
                },
                {
                    id: "transform-aggregate",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Aggregate Data",
                        transformType: "template",
                        template:
                            '{"twitter": "{{integration-twitter.data}}", "linkedin": "{{integration-linkedin.data}}", "news": "{{newsContent.text}}"}',
                        outputVariable: "aggregatedData"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Intelligence",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this competitive intelligence data:\n\n{{aggregatedData}}\n\nIdentify:\n1. Key announcements or launches\n2. Messaging changes or pivots\n3. Market positioning shifts\n4. Potential threats or opportunities\n5. Sentiment trends",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-score",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Score Significance",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: 'Rate the significance of these findings on a scale of 1-10:\n\n{{analysis.text}}\n\nReturn JSON: {"score": N, "reason": "brief explanation"}',
                        outputVariable: "significance"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Significance",
                        condition: "significance.score >= 7",
                        outputVariable: "isSignificant"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Tracker",
                        provider: "google-sheets",
                        operation: "appendRow",
                        spreadsheetId: "",
                        sheetName: "Competitive Intel"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Dashboard",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "llm-briefing",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Executive Briefing",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an executive briefing from this analysis:\n\n{{analysis.text}}\n\nFormat: 1-page summary with key findings, strategic implications, and recommended actions.",
                        outputVariable: "briefing"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Executive Briefing",
                        provider: "gmail",
                        operation: "sendEmail",
                        to: "executives@company.com"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#competitive-intel"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Intelligence Report",
                        outputName: "report",
                        value: "{{analysis.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "input-1" },
                { id: "e2", source: "input-1", target: "integration-twitter" },
                { id: "e3", source: "input-1", target: "integration-linkedin" },
                { id: "e4", source: "input-1", target: "url-1" },
                { id: "e5", source: "integration-twitter", target: "transform-aggregate" },
                { id: "e6", source: "integration-linkedin", target: "transform-aggregate" },
                { id: "e7", source: "url-1", target: "transform-aggregate" },
                { id: "e8", source: "transform-aggregate", target: "llm-analyze" },
                { id: "e9", source: "llm-analyze", target: "llm-score" },
                { id: "e10", source: "llm-score", target: "conditional-1" },
                {
                    id: "e11",
                    source: "conditional-1",
                    target: "llm-briefing",
                    sourceHandle: "true"
                },
                {
                    id: "e12",
                    source: "conditional-1",
                    target: "integration-sheets",
                    sourceHandle: "false"
                },
                { id: "e13", source: "llm-briefing", target: "integration-gmail" },
                { id: "e14", source: "llm-briefing", target: "integration-slack" },
                { id: "e15", source: "integration-gmail", target: "integration-notion" },
                { id: "e16", source: "integration-slack", target: "integration-notion" },
                { id: "e17", source: "integration-sheets", target: "integration-notion" },
                { id: "e18", source: "integration-notion", target: "output-1" }
            ]
        }
    },

    // Marketing Intermediate 4: Blog Post Amplifier (10 nodes)
    {
        name: "Blog Post Amplifier",
        description:
            "Transform published blog posts into multi-platform social content. Automatically repurposes articles for Twitter threads, LinkedIn posts, and Medium cross-posts.",
        category: "marketing",
        tags: ["content repurposing", "blog", "social media", "amplification"],
        required_integrations: ["notion", "twitter", "linkedin", "medium", "slack"],
        featured: false,
        definition: {
            name: "Blog Post Amplifier",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Blog Published",
                        triggerType: "webhook",
                        description: "Triggered when new blog post is published"
                    }
                },
                {
                    id: "url-1",
                    type: "url",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Blog Content",
                        urlVariable: "trigger.blogUrl",
                        outputVariable: "blogContent"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Key Points",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this blog post and extract:\n1. Main thesis\n2. Key arguments (3-5)\n3. Best quotes\n4. Target audience\n5. Optimal hashtags\n\nContent:\n{{blogContent.text}}",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-twitter",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Twitter Thread",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a compelling Twitter thread (8-12 tweets) from:\n\n{{analysis.text}}\n\nStart with a hook, break down key insights, end with CTA to read the full post.",
                        outputVariable: "twitterThread"
                    }
                },
                {
                    id: "llm-linkedin",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create LinkedIn Post",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a LinkedIn post (400-600 words) summarizing:\n\n{{analysis.text}}\n\nProfessional tone, include personal perspective, clear CTA.",
                        outputVariable: "linkedinPost"
                    }
                },
                {
                    id: "integration-twitter",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Thread",
                        provider: "twitter",
                        operation: "createThread"
                    }
                },
                {
                    id: "integration-linkedin",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to LinkedIn",
                        provider: "linkedin",
                        operation: "createPost"
                    }
                },
                {
                    id: "integration-medium",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Cross-post to Medium",
                        provider: "medium",
                        operation: "createPost"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#content"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Amplification Results",
                        outputName: "results",
                        value: "Blog amplified across Twitter, LinkedIn, and Medium"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "url-1" },
                { id: "e2", source: "url-1", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "llm-twitter" },
                { id: "e4", source: "llm-analyze", target: "llm-linkedin" },
                { id: "e5", source: "llm-twitter", target: "integration-twitter" },
                { id: "e6", source: "llm-linkedin", target: "integration-linkedin" },
                { id: "e7", source: "llm-analyze", target: "integration-medium" },
                { id: "e8", source: "integration-twitter", target: "integration-slack" },
                { id: "e9", source: "integration-linkedin", target: "integration-slack" },
                { id: "e10", source: "integration-medium", target: "integration-slack" },
                { id: "e11", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Marketing Intermediate 5: Newsletter Automation (14 nodes)
    {
        name: "Newsletter Automation",
        description:
            "Automated weekly newsletter: curates content from multiple sources, generates engaging copy with AI, routes through review, and sends via Mailchimp with engagement tracking.",
        category: "marketing",
        tags: ["newsletter", "email marketing", "automation", "content curation"],
        required_integrations: ["mailchimp", "notion", "slack", "google-sheets"],
        featured: false,
        definition: {
            name: "Newsletter Automation",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Weekly Schedule",
                        triggerType: "schedule",
                        schedule: "0 9 * * 2",
                        description: "Every Tuesday at 9am"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Curated Content",
                        provider: "notion",
                        operation: "queryDatabase",
                        database: "Newsletter Queue"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Subscriber Metrics",
                        provider: "google-sheets",
                        operation: "getValues",
                        spreadsheetId: "subscriber_analytics"
                    }
                },
                {
                    id: "transform-merge",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Merge Content Sources",
                        transformType: "template",
                        template:
                            '{"content": {{integration-notion.data}}, "metrics": {{integration-sheets.data}}}',
                        outputVariable: "mergedData"
                    }
                },
                {
                    id: "llm-body",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Newsletter Body",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create newsletter body from:\n\n{{mergedData}}\n\nStructure: intro hook, 3-5 highlights, quick tips, CTA.",
                        outputVariable: "newsletterBody"
                    }
                },
                {
                    id: "llm-subject",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Subject Lines",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Generate 3 A/B test subject lines for newsletter about:\n\n{{mergedData}}\n\nOptimize for open rates.",
                        outputVariable: "subjectLines"
                    }
                },
                {
                    id: "transform-compile",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Newsletter",
                        transformType: "template",
                        template:
                            '{"body": "{{newsletterBody.text}}", "subjects": "{{subjectLines.text}}"}',
                        outputVariable: "newsletter"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Newsletter",
                        reviewPrompt: "Review the newsletter content before sending to subscribers",
                        outputVariable: "approved"
                    }
                },
                {
                    id: "integration-mailchimp-active",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send to Active Subscribers",
                        provider: "mailchimp",
                        operation: "sendCampaign",
                        segment: "active"
                    }
                },
                {
                    id: "integration-mailchimp-dormant",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Re-engagement",
                        provider: "mailchimp",
                        operation: "sendCampaign",
                        segment: "dormant"
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait for Analytics",
                        duration: 86400000,
                        description: "Wait 24 hours for engagement data"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Report Results",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#marketing"
                    }
                },
                {
                    id: "integration-notion-archive",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Archive Newsletter",
                        provider: "notion",
                        operation: "createPage",
                        database: "Newsletter Archive"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Newsletter Sent",
                        outputName: "status",
                        value: "Newsletter sent successfully"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-notion" },
                { id: "e2", source: "trigger-1", target: "integration-sheets" },
                { id: "e3", source: "integration-notion", target: "transform-merge" },
                { id: "e4", source: "integration-sheets", target: "transform-merge" },
                { id: "e5", source: "transform-merge", target: "llm-body" },
                { id: "e6", source: "transform-merge", target: "llm-subject" },
                { id: "e7", source: "llm-body", target: "transform-compile" },
                { id: "e8", source: "llm-subject", target: "transform-compile" },
                { id: "e9", source: "transform-compile", target: "humanReview-1" },
                { id: "e10", source: "humanReview-1", target: "integration-mailchimp-active" },
                { id: "e11", source: "humanReview-1", target: "integration-mailchimp-dormant" },
                { id: "e12", source: "integration-mailchimp-active", target: "wait-1" },
                { id: "e13", source: "integration-mailchimp-dormant", target: "wait-1" },
                { id: "e14", source: "wait-1", target: "integration-slack" },
                { id: "e15", source: "wait-1", target: "integration-notion-archive" },
                { id: "e16", source: "integration-slack", target: "output-1" },
                { id: "e17", source: "integration-notion-archive", target: "output-1" }
            ]
        }
    },

    // Marketing Simple 6: Social Media Scheduler (6 nodes)
    {
        name: "Social Media Scheduler",
        description:
            "Quick social media post generator. Input a topic brief, get AI-optimized posts for Twitter and LinkedIn, and schedule them via Buffer.",
        category: "marketing",
        tags: ["social media", "scheduling", "quick", "simple"],
        required_integrations: ["twitter", "linkedin", "buffer"],
        featured: false,
        definition: {
            name: "Social Media Scheduler",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Topic Brief",
                        inputName: "brief",
                        inputVariable: "brief",
                        inputType: "text",
                        description: "What do you want to post about?"
                    }
                },
                {
                    id: "llm-twitter",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Twitter Post",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an engaging Twitter post (max 280 chars) about:\n\n{{brief}}\n\nUse relevant hashtags, make it conversational.",
                        outputVariable: "twitterPost"
                    }
                },
                {
                    id: "llm-linkedin",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate LinkedIn Post",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a professional LinkedIn post (200-400 words) about:\n\n{{brief}}\n\nInclude a hook, insights, and CTA.",
                        outputVariable: "linkedinPost"
                    }
                },
                {
                    id: "integration-buffer",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Posts",
                        provider: "buffer",
                        operation: "createPost"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Scheduled Posts",
                        outputName: "posts",
                        value: '{"twitter": "{{twitterPost.text}}", "linkedin": "{{linkedinPost.text}}"}'
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-twitter" },
                { id: "e2", source: "input-1", target: "llm-linkedin" },
                { id: "e3", source: "llm-twitter", target: "integration-buffer" },
                { id: "e4", source: "llm-linkedin", target: "integration-buffer" },
                { id: "e5", source: "integration-buffer", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // SALES (6 templates)
    // ========================================================================

    // Sales Advanced 1: Enterprise Account Planning System (17 nodes)
    {
        name: "Enterprise Account Planning System",
        description:
            "Comprehensive enterprise deal management: enrich prospect data from multiple sources, build AI-powered stakeholder maps, route by deal size, create engagement calendars, and coordinate outreach.",
        category: "sales",
        tags: ["enterprise", "account planning", "stakeholder mapping", "deal management"],
        required_integrations: [
            "salesforce",
            "linkedin",
            "apollo",
            "notion",
            "slack",
            "gmail",
            "calendly"
        ],
        featured: true,
        definition: {
            name: "Enterprise Account Planning System",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Enterprise Opportunity",
                        triggerType: "webhook",
                        webhookProvider: "salesforce",
                        description: "Triggered when new opportunity >$100k is created"
                    }
                },
                {
                    id: "integration-salesforce-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Opportunity Details",
                        provider: "salesforce",
                        operation: "getOpportunity"
                    }
                },
                {
                    id: "integration-apollo",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Enrich Company Data",
                        provider: "apollo",
                        operation: "enrichCompany"
                    }
                },
                {
                    id: "integration-linkedin",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Find Key Stakeholders",
                        provider: "linkedin",
                        operation: "searchPeople"
                    }
                },
                {
                    id: "url-1",
                    type: "url",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Research Company News",
                        urlVariable: "companyWebsite",
                        outputVariable: "companyNews"
                    }
                },
                {
                    id: "transform-aggregate",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Aggregate Intel",
                        transformType: "template",
                        template:
                            '{"opportunity": "{{integration-salesforce-get.data}}", "company": "{{integration-apollo.data}}", "stakeholders": "{{integration-linkedin.data}}", "news": "{{companyNews.text}}"}',
                        outputVariable: "aggregatedIntel"
                    }
                },
                {
                    id: "llm-stakeholder-map",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Build Stakeholder Map",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a stakeholder analysis from this data:\n\n{{aggregatedIntel}}\n\nIdentify:\n1. Decision makers (economic buyer)\n2. Champions (internal advocates)\n3. Technical evaluators\n4. Potential blockers\n5. Recommended engagement strategy for each",
                        outputVariable: "stakeholderMap"
                    }
                },
                {
                    id: "llm-account-plan",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Account Plan",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a comprehensive account plan:\n\nStakeholders: {{stakeholderMap.text}}\nOpportunity: {{integration-salesforce-get.data}}\n\nInclude:\n1. Executive summary\n2. Value proposition alignment\n3. Competitive positioning\n4. Risk assessment\n5. 90-day action plan",
                        outputVariable: "accountPlan"
                    }
                },
                {
                    id: "router-dealsize",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Deal Size",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Classify this deal by size:\n\nAmount: {{integration-salesforce-get.data.amount}}\n\nCategories: strategic (>$500k), enterprise ($100k-$500k), mid-market (<$100k)",
                        routes: [
                            {
                                value: "strategic",
                                label: "Strategic",
                                description: ">$500k deals requiring executive engagement"
                            },
                            {
                                value: "enterprise",
                                label: "Enterprise",
                                description: "$100k-$500k standard enterprise process"
                            },
                            {
                                value: "midmarket",
                                label: "Mid-Market",
                                description: "<$100k accelerated process"
                            }
                        ],
                        defaultRoute: "enterprise",
                        outputVariable: "dealTier"
                    }
                },
                {
                    id: "llm-exec-brief",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Exec Brief",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an executive briefing for leadership engagement:\n\n{{accountPlan.text}}\n\nFormat for C-level review with clear asks.",
                        outputVariable: "execBrief"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save to Account Hub",
                        provider: "notion",
                        operation: "createPage",
                        database: "Account Plans"
                    }
                },
                {
                    id: "integration-salesforce-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Salesforce",
                        provider: "salesforce",
                        operation: "updateOpportunity"
                    }
                },
                {
                    id: "llm-emails",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Draft Outreach Emails",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Draft personalized outreach emails for key stakeholders:\n\n{{stakeholderMap.text}}\n\nCreate 3 emails: champion, economic buyer, technical evaluator.",
                        outputVariable: "draftEmails"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Email Drafts",
                        provider: "gmail",
                        operation: "createDraft"
                    }
                },
                {
                    id: "integration-calendly",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Meeting Links",
                        provider: "calendly",
                        operation: "createEventType"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Sales Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#enterprise-deals"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Account Plan Ready",
                        outputName: "accountPlan",
                        value: "{{accountPlan.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-salesforce-get" },
                { id: "e2", source: "integration-salesforce-get", target: "integration-apollo" },
                { id: "e3", source: "integration-salesforce-get", target: "integration-linkedin" },
                { id: "e4", source: "integration-salesforce-get", target: "url-1" },
                { id: "e5", source: "integration-apollo", target: "transform-aggregate" },
                { id: "e6", source: "integration-linkedin", target: "transform-aggregate" },
                { id: "e7", source: "url-1", target: "transform-aggregate" },
                { id: "e8", source: "transform-aggregate", target: "llm-stakeholder-map" },
                { id: "e9", source: "llm-stakeholder-map", target: "llm-account-plan" },
                { id: "e10", source: "llm-account-plan", target: "router-dealsize" },
                {
                    id: "e11",
                    source: "router-dealsize",
                    target: "llm-exec-brief",
                    sourceHandle: "strategic"
                },
                {
                    id: "e12",
                    source: "router-dealsize",
                    target: "integration-notion",
                    sourceHandle: "enterprise"
                },
                {
                    id: "e13",
                    source: "router-dealsize",
                    target: "llm-emails",
                    sourceHandle: "midmarket"
                },
                { id: "e14", source: "llm-exec-brief", target: "integration-notion" },
                {
                    id: "e15",
                    source: "integration-notion",
                    target: "integration-salesforce-update"
                },
                { id: "e16", source: "llm-emails", target: "integration-gmail" },
                { id: "e17", source: "integration-gmail", target: "integration-calendly" },
                { id: "e18", source: "integration-salesforce-update", target: "integration-slack" },
                { id: "e19", source: "integration-calendly", target: "integration-slack" },
                { id: "e20", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Sales Advanced 2: Revenue Intelligence Hub (18 nodes)
    {
        name: "Revenue Intelligence Hub",
        description:
            "AI-powered revenue intelligence: analyze deal health, predict risks, score opportunities, route alerts by severity, provide coaching recommendations, and generate accurate forecasts.",
        category: "sales",
        tags: ["revenue intelligence", "forecasting", "deal health", "risk assessment"],
        required_integrations: [
            "hubspot",
            "slack",
            "notion",
            "google-sheets",
            "gmail",
            "amplitude"
        ],
        featured: true,
        definition: {
            name: "Revenue Intelligence Hub",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Deal Stage Changed",
                        triggerType: "webhook",
                        webhookProvider: "hubspot",
                        description: "Triggered on deal stage changes"
                    }
                },
                {
                    id: "integration-hubspot-deal",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Deal Details",
                        provider: "hubspot",
                        operation: "getDeal"
                    }
                },
                {
                    id: "integration-hubspot-activities",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Activities",
                        provider: "hubspot",
                        operation: "getEngagements"
                    }
                },
                {
                    id: "integration-hubspot-contacts",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Contacts",
                        provider: "hubspot",
                        operation: "getAssociatedContacts"
                    }
                },
                {
                    id: "integration-amplitude",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Product Usage",
                        provider: "amplitude",
                        operation: "getUserActivity"
                    }
                },
                {
                    id: "transform-aggregate",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Aggregate Deal Data",
                        transformType: "template",
                        template:
                            '{"deal": "{{integration-hubspot-deal.data}}", "activities": "{{integration-hubspot-activities.data}}", "contacts": "{{integration-hubspot-contacts.data}}", "usage": "{{integration-amplitude.data}}"}',
                        outputVariable: "dealData"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Deal Health",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this deal's health:\n\n{{dealData}}\n\nEvaluate:\n1. Engagement level (meeting frequency, response times)\n2. Multi-threading (stakeholder coverage)\n3. Product usage signals\n4. Timeline alignment\n5. Competitive indicators",
                        outputVariable: "healthAnalysis"
                    }
                },
                {
                    id: "llm-risk-score",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Calculate Risk Score",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Based on this analysis:\n\n{{healthAnalysis.text}}\n\nReturn JSON: {"riskScore": 1-100, "riskFactors": [], "confidenceLevel": "high/medium/low", "predictedClose": "YYYY-MM-DD"}',
                        outputVariable: "riskScore"
                    }
                },
                {
                    id: "router-risk",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Risk Level",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Classify risk level:\n\nRisk score: {{riskScore.text}}\n\nCategories: critical (>70), warning (40-70), healthy (<40)",
                        routes: [
                            {
                                value: "critical",
                                label: "Critical",
                                description: "High risk, immediate attention needed"
                            },
                            {
                                value: "warning",
                                label: "Warning",
                                description: "Moderate risk, monitor closely"
                            },
                            {
                                value: "healthy",
                                label: "Healthy",
                                description: "On track, standard process"
                            }
                        ],
                        defaultRoute: "warning",
                        outputVariable: "riskLevel"
                    }
                },
                {
                    id: "llm-coaching",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Coaching",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate specific coaching recommendations:\n\nAnalysis: {{healthAnalysis.text}}\nRisk: {{riskScore.text}}\n\nProvide 3-5 actionable next steps with talk tracks.",
                        outputVariable: "coaching"
                    }
                },
                {
                    id: "integration-slack-alert",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Deal Desk",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#deal-desk-alerts"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Sales Leader",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Forecast",
                        provider: "google-sheets",
                        operation: "updateRow",
                        spreadsheetId: "",
                        sheetName: "Pipeline Forecast"
                    }
                },
                {
                    id: "integration-hubspot-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Deal Score",
                        provider: "hubspot",
                        operation: "updateDeal"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Analysis",
                        provider: "notion",
                        operation: "createPage"
                    }
                },
                {
                    id: "integration-slack-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Rep",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Intelligence Report",
                        outputName: "report",
                        value: "{{healthAnalysis.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot-deal" },
                {
                    id: "e2",
                    source: "integration-hubspot-deal",
                    target: "integration-hubspot-activities"
                },
                {
                    id: "e3",
                    source: "integration-hubspot-deal",
                    target: "integration-hubspot-contacts"
                },
                { id: "e4", source: "integration-hubspot-deal", target: "integration-amplitude" },
                {
                    id: "e5",
                    source: "integration-hubspot-activities",
                    target: "transform-aggregate"
                },
                { id: "e6", source: "integration-hubspot-contacts", target: "transform-aggregate" },
                { id: "e7", source: "integration-amplitude", target: "transform-aggregate" },
                { id: "e8", source: "transform-aggregate", target: "llm-analyze" },
                { id: "e9", source: "llm-analyze", target: "llm-risk-score" },
                { id: "e10", source: "llm-risk-score", target: "router-risk" },
                {
                    id: "e11",
                    source: "router-risk",
                    target: "integration-slack-alert",
                    sourceHandle: "critical"
                },
                {
                    id: "e12",
                    source: "router-risk",
                    target: "llm-coaching",
                    sourceHandle: "warning"
                },
                {
                    id: "e13",
                    source: "router-risk",
                    target: "integration-sheets",
                    sourceHandle: "healthy"
                },
                { id: "e14", source: "integration-slack-alert", target: "integration-gmail" },
                { id: "e15", source: "integration-gmail", target: "llm-coaching" },
                { id: "e16", source: "llm-coaching", target: "integration-hubspot-update" },
                { id: "e17", source: "integration-hubspot-update", target: "integration-notion" },
                { id: "e18", source: "integration-sheets", target: "integration-notion" },
                { id: "e19", source: "integration-notion", target: "integration-slack-update" },
                { id: "e20", source: "integration-slack-update", target: "output-1" }
            ]
        }
    },

    // Sales Advanced 3: Quote-to-Cash Accelerator (16 nodes)
    {
        name: "Quote-to-Cash Accelerator",
        description:
            "Streamline the quote-to-cash process: generate quotes, route through approval workflows based on deal terms, collect signatures via DocuSign, and track through to revenue recognition.",
        category: "sales",
        tags: ["quote-to-cash", "cpq", "approvals", "contracts"],
        required_integrations: ["salesforce", "docusign", "quickbooks", "slack", "gmail"],
        featured: true,
        definition: {
            name: "Quote-to-Cash Accelerator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Quote Requested",
                        triggerType: "webhook",
                        webhookProvider: "salesforce",
                        description: "Triggered when quote is requested"
                    }
                },
                {
                    id: "integration-salesforce-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Opportunity Data",
                        provider: "salesforce",
                        operation: "getOpportunity"
                    }
                },
                {
                    id: "llm-quote",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Quote",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a professional quote document:\n\nOpportunity: {{integration-salesforce-get.data}}\n\nInclude: itemized pricing, terms, validity period, and payment terms.",
                        outputVariable: "quote"
                    }
                },
                {
                    id: "llm-review",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Quote",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Review this quote for errors and policy compliance:\n\n{{quote.text}}\n\nCheck: pricing accuracy, discount limits, term compliance.",
                        outputVariable: "quoteReview"
                    }
                },
                {
                    id: "router-approval",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route for Approval",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Determine approval path:\n\nDeal value: {{integration-salesforce-get.data.amount}}\nDiscount: {{integration-salesforce-get.data.discount}}\n\nPaths: auto_approve (<$50k, <10% discount), manager ($50k-$200k or >10%), vp (>$200k or >20%), legal (custom terms)",
                        routes: [
                            {
                                value: "auto_approve",
                                label: "Auto Approve",
                                description: "Standard terms, auto-approved"
                            },
                            {
                                value: "manager",
                                label: "Manager",
                                description: "Manager approval required"
                            },
                            { value: "vp", label: "VP", description: "VP approval required" },
                            { value: "legal", label: "Legal", description: "Legal review required" }
                        ],
                        defaultRoute: "manager",
                        outputVariable: "approvalPath"
                    }
                },
                {
                    id: "humanReview-manager",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Manager Review",
                        reviewPrompt: "Review and approve this quote",
                        outputVariable: "managerApproval"
                    }
                },
                {
                    id: "humanReview-vp",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "VP Review",
                        reviewPrompt: "Executive approval required for this deal",
                        outputVariable: "vpApproval"
                    }
                },
                {
                    id: "humanReview-legal",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Legal Review",
                        reviewPrompt: "Legal review of non-standard terms",
                        outputVariable: "legalApproval"
                    }
                },
                {
                    id: "transform-finalize",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Finalize Quote",
                        transformType: "template",
                        template: "{{quote.text}}",
                        outputVariable: "finalQuote"
                    }
                },
                {
                    id: "integration-docusign",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send for Signature",
                        provider: "docusign",
                        operation: "createEnvelope"
                    }
                },
                {
                    id: "wait-signature",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Await Signature",
                        duration: 604800000,
                        description: "Wait up to 7 days for signature"
                    }
                },
                {
                    id: "conditional-signed",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Signature",
                        condition: "docusignStatus === 'completed'",
                        outputVariable: "isSigned"
                    }
                },
                {
                    id: "integration-salesforce-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update to Closed Won",
                        provider: "salesforce",
                        operation: "updateOpportunity"
                    }
                },
                {
                    id: "integration-quickbooks",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Invoice",
                        provider: "quickbooks",
                        operation: "createInvoice"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Celebrate Win",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#wins"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Deal Complete",
                        outputName: "status",
                        value: "Quote-to-cash process complete"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-salesforce-get" },
                { id: "e2", source: "integration-salesforce-get", target: "llm-quote" },
                { id: "e3", source: "llm-quote", target: "llm-review" },
                { id: "e4", source: "llm-review", target: "router-approval" },
                {
                    id: "e5",
                    source: "router-approval",
                    target: "transform-finalize",
                    sourceHandle: "auto_approve"
                },
                {
                    id: "e6",
                    source: "router-approval",
                    target: "humanReview-manager",
                    sourceHandle: "manager"
                },
                {
                    id: "e7",
                    source: "router-approval",
                    target: "humanReview-vp",
                    sourceHandle: "vp"
                },
                {
                    id: "e8",
                    source: "router-approval",
                    target: "humanReview-legal",
                    sourceHandle: "legal"
                },
                { id: "e9", source: "humanReview-manager", target: "transform-finalize" },
                { id: "e10", source: "humanReview-vp", target: "transform-finalize" },
                { id: "e11", source: "humanReview-legal", target: "transform-finalize" },
                { id: "e12", source: "transform-finalize", target: "integration-docusign" },
                { id: "e13", source: "integration-docusign", target: "wait-signature" },
                { id: "e14", source: "wait-signature", target: "conditional-signed" },
                {
                    id: "e15",
                    source: "conditional-signed",
                    target: "integration-salesforce-update",
                    sourceHandle: "true"
                },
                {
                    id: "e16",
                    source: "integration-salesforce-update",
                    target: "integration-quickbooks"
                },
                { id: "e17", source: "integration-quickbooks", target: "integration-slack" },
                { id: "e18", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Sales Intermediate 4: Lead Scoring & Routing (11 nodes)
    {
        name: "Lead Scoring & Routing",
        description:
            "Intelligent lead qualification: enrich leads with company data, score based on firmographics and behavior, route to appropriate sales rep based on territory and tier.",
        category: "sales",
        tags: ["lead scoring", "routing", "qualification", "assignment"],
        required_integrations: ["hubspot", "apollo", "slack", "gmail"],
        featured: false,
        definition: {
            name: "Lead Scoring & Routing",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Lead Created",
                        triggerType: "webhook",
                        webhookProvider: "hubspot"
                    }
                },
                {
                    id: "integration-hubspot-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Lead Details",
                        provider: "hubspot",
                        operation: "getContact"
                    }
                },
                {
                    id: "integration-apollo",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Enrich Lead Data",
                        provider: "apollo",
                        operation: "enrichPerson"
                    }
                },
                {
                    id: "llm-score",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Score Lead",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Score this lead (0-100) based on:\n\nLead data: {{integration-hubspot-get.data}}\nEnriched data: {{integration-apollo.data}}\n\nFactors: company size, industry fit, title seniority, engagement signals.\n\nReturn JSON: {"score": N, "tier": "hot/warm/cold", "reasoning": "..."}',
                        outputVariable: "leadScore"
                    }
                },
                {
                    id: "router-tier",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Tier",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route this lead:\n\n{{leadScore.text}}",
                        routes: [
                            {
                                value: "hot",
                                label: "Hot Lead",
                                description: "High priority, immediate follow-up"
                            },
                            {
                                value: "warm",
                                label: "Warm Lead",
                                description: "Standard qualification process"
                            },
                            { value: "cold", label: "Cold Lead", description: "Nurture sequence" }
                        ],
                        defaultRoute: "warm",
                        outputVariable: "routeDecision"
                    }
                },
                {
                    id: "integration-hubspot-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Lead Score",
                        provider: "hubspot",
                        operation: "updateContact"
                    }
                },
                {
                    id: "llm-assignment",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Determine Assignment",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Assign this lead to a rep based on:\n\nTerritory: {{integration-apollo.data.location}}\nCompany size: {{integration-apollo.data.employeeCount}}\nIndustry: {{integration-apollo.data.industry}}",
                        outputVariable: "assignment"
                    }
                },
                {
                    id: "integration-hubspot-assign",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Assign to Rep",
                        provider: "hubspot",
                        operation: "updateContactOwner"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Rep",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Intro Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Lead Routed",
                        outputName: "result",
                        value: "{{leadScore.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot-get" },
                { id: "e2", source: "integration-hubspot-get", target: "integration-apollo" },
                { id: "e3", source: "integration-apollo", target: "llm-score" },
                { id: "e4", source: "llm-score", target: "router-tier" },
                {
                    id: "e5",
                    source: "router-tier",
                    target: "integration-hubspot-update",
                    sourceHandle: "hot"
                },
                {
                    id: "e6",
                    source: "router-tier",
                    target: "integration-hubspot-update",
                    sourceHandle: "warm"
                },
                {
                    id: "e7",
                    source: "router-tier",
                    target: "integration-hubspot-update",
                    sourceHandle: "cold"
                },
                { id: "e8", source: "integration-hubspot-update", target: "llm-assignment" },
                { id: "e9", source: "llm-assignment", target: "integration-hubspot-assign" },
                { id: "e10", source: "integration-hubspot-assign", target: "integration-slack" },
                { id: "e11", source: "integration-slack", target: "integration-gmail" },
                { id: "e12", source: "integration-gmail", target: "output-1" }
            ]
        }
    },

    // Sales Intermediate 5: Meeting Follow-up Automation (9 nodes)
    {
        name: "Meeting Follow-up Automation",
        description:
            "Automate post-meeting workflows: generate AI summaries from meeting notes, send personalized follow-up emails, update CRM records, and schedule next steps.",
        category: "sales",
        tags: ["meetings", "follow-up", "automation", "crm"],
        required_integrations: ["calendly", "gmail", "hubspot", "slack"],
        featured: false,
        definition: {
            name: "Meeting Follow-up Automation",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Meeting Ended",
                        triggerType: "webhook",
                        webhookProvider: "calendly",
                        description: "Triggered when scheduled meeting ends"
                    }
                },
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Meeting Notes",
                        inputName: "notes",
                        inputVariable: "notes",
                        inputType: "text",
                        description: "Notes from the meeting"
                    }
                },
                {
                    id: "llm-summary",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Summary",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a meeting summary:\n\nMeeting: {{trigger-1.data}}\nNotes: {{notes}}\n\nInclude:\n1. Key discussion points\n2. Decisions made\n3. Action items with owners\n4. Next steps",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "llm-followup",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Draft Follow-up Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write a professional follow-up email:\n\n{{summary.text}}\n\nThank them, recap key points, list action items, propose next meeting.",
                        outputVariable: "followupEmail"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Follow-up",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to CRM",
                        provider: "hubspot",
                        operation: "createEngagement"
                    }
                },
                {
                    id: "integration-calendly",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Next Meeting",
                        provider: "calendly",
                        operation: "createInvite"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#sales-activity"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Follow-up Complete",
                        outputName: "summary",
                        value: "{{summary.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "input-1" },
                { id: "e2", source: "input-1", target: "llm-summary" },
                { id: "e3", source: "llm-summary", target: "llm-followup" },
                { id: "e4", source: "llm-followup", target: "integration-gmail" },
                { id: "e5", source: "llm-summary", target: "integration-hubspot" },
                { id: "e6", source: "integration-gmail", target: "integration-calendly" },
                { id: "e7", source: "integration-hubspot", target: "integration-slack" },
                { id: "e8", source: "integration-calendly", target: "integration-slack" },
                { id: "e9", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Sales Intermediate 6: Deal Stage Notifier (12 nodes)
    {
        name: "Deal Stage Notifier",
        description:
            "Intelligent deal tracking: when a deal changes stage in Salesforce, enrich with context, route by stage type (won/lost/progressed), and notify appropriate channels with AI-formatted summaries.",
        category: "sales",
        tags: ["notifications", "deal tracking", "routing", "alerts"],
        required_integrations: ["salesforce", "slack", "hubspot"],
        featured: false,
        definition: {
            name: "Deal Stage Notifier",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Deal Stage Changed",
                        triggerType: "webhook",
                        webhookProvider: "salesforce"
                    }
                },
                {
                    id: "integration-deal",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Deal Details",
                        provider: "salesforce",
                        operation: "getOpportunity"
                    }
                },
                {
                    id: "integration-account",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Account Info",
                        provider: "salesforce",
                        operation: "getAccount"
                    }
                },
                {
                    id: "transform-merge",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Merge Deal Context",
                        transformType: "template",
                        template:
                            '{"deal": {{integration-deal.data}}, "account": {{integration-account.data}}}',
                        outputVariable: "dealContext"
                    }
                },
                {
                    id: "router-stage",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Stage",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Classify this deal stage change",
                        routes: [
                            { value: "won", label: "Closed Won" },
                            { value: "lost", label: "Closed Lost" },
                            { value: "progressed", label: "Progressed" }
                        ]
                    }
                },
                {
                    id: "llm-won",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Win Announcement",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Create celebratory win announcement:\n\n{{dealContext}}\n\nInclude confetti emoji, deal value, account name, and team kudos!",
                        outputVariable: "winMessage"
                    }
                },
                {
                    id: "llm-lost",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Loss Analysis",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Create loss summary:\n\n{{dealContext}}\n\nInclude lessons learned prompt, follow-up timing suggestion.",
                        outputVariable: "lostMessage"
                    }
                },
                {
                    id: "llm-progress",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Progress Update",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format deal progress update:\n\n{{dealContext}}\n\nInclude stage, next steps, timeline.",
                        outputVariable: "progressMessage"
                    }
                },
                {
                    id: "integration-slack-wins",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to #wins",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#wins"
                    }
                },
                {
                    id: "integration-slack-pipeline",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to #pipeline",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#sales-pipeline"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Activity",
                        provider: "hubspot",
                        operation: "createEngagement"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notification Sent",
                        outputName: "status",
                        value: "Deal update processed"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-deal" },
                { id: "e2", source: "trigger-1", target: "integration-account" },
                { id: "e3", source: "integration-deal", target: "transform-merge" },
                { id: "e4", source: "integration-account", target: "transform-merge" },
                { id: "e5", source: "transform-merge", target: "router-stage" },
                { id: "e6", source: "router-stage", target: "llm-won", sourceHandle: "won" },
                { id: "e7", source: "router-stage", target: "llm-lost", sourceHandle: "lost" },
                {
                    id: "e8",
                    source: "router-stage",
                    target: "llm-progress",
                    sourceHandle: "progressed"
                },
                { id: "e9", source: "llm-won", target: "integration-slack-wins" },
                { id: "e10", source: "llm-lost", target: "integration-slack-pipeline" },
                { id: "e11", source: "llm-progress", target: "integration-slack-pipeline" },
                { id: "e12", source: "integration-slack-wins", target: "integration-hubspot" },
                { id: "e13", source: "integration-slack-pipeline", target: "integration-hubspot" },
                { id: "e14", source: "integration-hubspot", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // OPERATIONS (5 templates)
    // ========================================================================

    // Operations Advanced 1: Intelligent Vendor Management (15 nodes)
    {
        name: "Intelligent Vendor Management",
        description:
            "Comprehensive vendor lifecycle management: onboard vendors with compliance checks, assess risks with AI, route by risk level, manage contracts, and schedule renewal reviews.",
        category: "operations",
        tags: ["vendor management", "compliance", "risk assessment", "contracts"],
        required_integrations: ["docusign", "google-drive", "notion", "slack", "gmail", "airtable"],
        featured: true,
        definition: {
            name: "Intelligent Vendor Management",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Vendor Request",
                        triggerType: "webhook",
                        description: "Triggered when new vendor onboarding is requested"
                    }
                },
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Vendor Information",
                        inputName: "vendorInfo",
                        inputVariable: "vendorInfo",
                        inputType: "json",
                        description:
                            '{"name": "", "services": "", "annualSpend": 0, "dataAccess": true}'
                    }
                },
                {
                    id: "url-1",
                    type: "url",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Company Info",
                        urlVariable: "vendorInfo.website",
                        outputVariable: "companyInfo"
                    }
                },
                {
                    id: "llm-compliance",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Compliance",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Evaluate this vendor for compliance:\n\nVendor: {{vendorInfo}}\nCompany info: {{companyInfo.text}}\n\nCheck: SOC2, GDPR, security certifications, insurance requirements.",
                        outputVariable: "complianceCheck"
                    }
                },
                {
                    id: "llm-risk",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Assess Risk",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Perform risk assessment:\n\n{{complianceCheck.text}}\n\nEvaluate: financial stability, operational risk, data security risk, concentration risk.\n\nReturn JSON: {"riskScore": 1-100, "riskLevel": "low/medium/high/critical", "factors": []}',
                        outputVariable: "riskAssessment"
                    }
                },
                {
                    id: "router-risk",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Risk",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route based on risk level: {{riskAssessment.text}}",
                        routes: [
                            { value: "low", label: "Low Risk", description: "Standard onboarding" },
                            {
                                value: "medium",
                                label: "Medium Risk",
                                description: "Enhanced review"
                            },
                            { value: "high", label: "High Risk", description: "Executive approval" }
                        ],
                        defaultRoute: "medium",
                        outputVariable: "riskRoute"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Executive Review",
                        reviewPrompt: "High-risk vendor requires executive approval",
                        outputVariable: "execApproval"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add to Vendor Registry",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Vendors"
                    }
                },
                {
                    id: "integration-drive",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Vendor Folder",
                        provider: "google-drive",
                        operation: "createFolder"
                    }
                },
                {
                    id: "llm-contract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Contract",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate vendor agreement terms based on:\n\nVendor: {{vendorInfo}}\nRisk: {{riskAssessment.text}}\n\nInclude appropriate SLAs, liability caps, and termination clauses.",
                        outputVariable: "contractTerms"
                    }
                },
                {
                    id: "integration-docusign",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send for Signature",
                        provider: "docusign",
                        operation: "createEnvelope"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Vendor Page",
                        provider: "notion",
                        operation: "createPage"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Welcome Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Procurement",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#procurement"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Vendor Onboarded",
                        outputName: "status",
                        value: "Vendor onboarding complete"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "input-1" },
                { id: "e2", source: "input-1", target: "url-1" },
                { id: "e3", source: "url-1", target: "llm-compliance" },
                { id: "e4", source: "llm-compliance", target: "llm-risk" },
                { id: "e5", source: "llm-risk", target: "router-risk" },
                {
                    id: "e6",
                    source: "router-risk",
                    target: "integration-airtable",
                    sourceHandle: "low"
                },
                {
                    id: "e7",
                    source: "router-risk",
                    target: "integration-airtable",
                    sourceHandle: "medium"
                },
                { id: "e8", source: "router-risk", target: "humanReview-1", sourceHandle: "high" },
                { id: "e9", source: "humanReview-1", target: "integration-airtable" },
                { id: "e10", source: "integration-airtable", target: "integration-drive" },
                { id: "e11", source: "integration-drive", target: "llm-contract" },
                { id: "e12", source: "llm-contract", target: "integration-docusign" },
                { id: "e13", source: "integration-docusign", target: "integration-notion" },
                { id: "e14", source: "integration-notion", target: "integration-gmail" },
                { id: "e15", source: "integration-gmail", target: "integration-slack" },
                { id: "e16", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Operations Advanced 2: Global Event Coordinator (18 nodes)
    {
        name: "Global Event Coordinator",
        description:
            "End-to-end event management: handle registrations, coordinate speakers, manage materials, send reminders, and execute post-event follow-ups with attendee engagement tracking.",
        category: "operations",
        tags: ["events", "coordination", "registration", "multi-step"],
        required_integrations: [
            "google-calendar",
            "calendly",
            "mailchimp",
            "notion",
            "slack",
            "airtable"
        ],
        featured: true,
        definition: {
            name: "Global Event Coordinator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Event Created",
                        triggerType: "webhook",
                        description: "New event added to calendar"
                    }
                },
                {
                    id: "integration-calendar-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Event Details",
                        provider: "google-calendar",
                        operation: "getEvent"
                    }
                },
                {
                    id: "llm-plan",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Event Plan",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an event execution plan:\n\n{{integration-calendar-get.data}}\n\nInclude: timeline, roles, materials needed, communication plan.",
                        outputVariable: "eventPlan"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Registration",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Event Registrations"
                    }
                },
                {
                    id: "integration-calendly-speaker1",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Speaker 1",
                        provider: "calendly",
                        operation: "createEventType"
                    }
                },
                {
                    id: "integration-calendly-speaker2",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Speaker 2",
                        provider: "calendly",
                        operation: "createEventType"
                    }
                },
                {
                    id: "integration-calendly-speaker3",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Speaker 3",
                        provider: "calendly",
                        operation: "createEventType"
                    }
                },
                {
                    id: "transform-speakers",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Speaker Schedule",
                        transformType: "template",
                        template:
                            '{"speakers": [{{integration-calendly-speaker1.data}}, {{integration-calendly-speaker2.data}}, {{integration-calendly-speaker3.data}}]}',
                        outputVariable: "speakerSchedule"
                    }
                },
                {
                    id: "llm-materials",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Materials List",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create materials checklist for:\n\n{{eventPlan.text}}\n{{speakerSchedule}}\n\nInclude: presentations, handouts, setup requirements.",
                        outputVariable: "materials"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Event Hub",
                        provider: "notion",
                        operation: "createPage"
                    }
                },
                {
                    id: "llm-invite",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Invitation",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write an engaging event invitation email:\n\n{{integration-calendar-get.data}}\n\nInclude: value prop, agenda highlights, registration CTA.",
                        outputVariable: "invitation"
                    }
                },
                {
                    id: "integration-mailchimp",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Invitations",
                        provider: "mailchimp",
                        operation: "sendCampaign"
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait Until Event Day",
                        duration: 86400000,
                        description: "Wait until event start"
                    }
                },
                {
                    id: "llm-reminder",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Reminder",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Write a reminder email for tomorrow's event:\n\n{{integration-calendar-get.data}}",
                        outputVariable: "reminder"
                    }
                },
                {
                    id: "integration-mailchimp-reminder",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Reminders",
                        provider: "mailchimp",
                        operation: "sendCampaign"
                    }
                },
                {
                    id: "llm-followup",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Follow-up",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write post-event follow-up email:\n\n{{integration-calendar-get.data}}\n\nInclude: thank you, recording link, resources, feedback survey.",
                        outputVariable: "followup"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#events"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Event Complete",
                        outputName: "status",
                        value: "Event coordination complete"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-calendar-get" },
                { id: "e2", source: "integration-calendar-get", target: "llm-plan" },
                { id: "e3", source: "llm-plan", target: "integration-airtable" },
                { id: "e4", source: "llm-plan", target: "integration-calendly-speaker1" },
                { id: "e5", source: "llm-plan", target: "integration-calendly-speaker2" },
                { id: "e6", source: "llm-plan", target: "integration-calendly-speaker3" },
                { id: "e7", source: "integration-calendly-speaker1", target: "transform-speakers" },
                { id: "e8", source: "integration-calendly-speaker2", target: "transform-speakers" },
                { id: "e9", source: "integration-calendly-speaker3", target: "transform-speakers" },
                { id: "e10", source: "transform-speakers", target: "llm-materials" },
                { id: "e11", source: "llm-materials", target: "integration-notion" },
                { id: "e12", source: "integration-airtable", target: "llm-invite" },
                { id: "e13", source: "llm-invite", target: "integration-mailchimp" },
                { id: "e14", source: "integration-mailchimp", target: "wait-1" },
                { id: "e15", source: "wait-1", target: "llm-reminder" },
                { id: "e16", source: "llm-reminder", target: "integration-mailchimp-reminder" },
                { id: "e17", source: "integration-mailchimp-reminder", target: "llm-followup" },
                { id: "e18", source: "llm-followup", target: "integration-slack" },
                { id: "e19", source: "integration-notion", target: "integration-slack" },
                { id: "e20", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Operations Intermediate 3: Expense Approval Workflow (10 nodes)
    {
        name: "Expense Approval Workflow",
        description:
            "Automated expense processing: categorize expenses with AI, route approvals based on amount, track in accounting, and notify stakeholders.",
        category: "operations",
        tags: ["expenses", "approvals", "finance", "automation"],
        required_integrations: ["slack", "google-sheets", "gmail", "quickbooks"],
        featured: false,
        definition: {
            name: "Expense Approval Workflow",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Expense Submitted",
                        triggerType: "webhook",
                        description: "New expense report submitted"
                    }
                },
                {
                    id: "llm-categorize",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Categorize Expense",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: 'Categorize this expense:\n\n{{trigger-1.data}}\n\nCategories: travel, meals, software, equipment, office, marketing, other.\n\nReturn JSON: {"category": "", "taxDeductible": true/false, "requiresReceipt": true/false}',
                        outputVariable: "category"
                    }
                },
                {
                    id: "router-amount",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Amount",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route expense approval:\nAmount: {{trigger-1.data.amount}}\n\nPaths: auto (<$100), manager ($100-$1000), director (>$1000)",
                        routes: [
                            { value: "auto", label: "Auto Approve", description: "Under $100" },
                            { value: "manager", label: "Manager", description: "$100-$1000" },
                            { value: "director", label: "Director", description: "Over $1000" }
                        ],
                        defaultRoute: "manager",
                        outputVariable: "approvalRoute"
                    }
                },
                {
                    id: "humanReview-manager",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Manager Approval",
                        reviewPrompt: "Approve this expense?",
                        outputVariable: "managerApproval"
                    }
                },
                {
                    id: "humanReview-director",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Director Approval",
                        reviewPrompt: "Large expense requires director approval",
                        outputVariable: "directorApproval"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Tracker",
                        provider: "google-sheets",
                        operation: "appendRow",
                        spreadsheetId: "",
                        sheetName: "Expenses"
                    }
                },
                {
                    id: "integration-quickbooks",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Record in QuickBooks",
                        provider: "quickbooks",
                        operation: "createExpense"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Submitter",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to Finance",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#finance"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Expense Processed",
                        outputName: "status",
                        value: "Expense approved and recorded"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-categorize" },
                { id: "e2", source: "llm-categorize", target: "router-amount" },
                {
                    id: "e3",
                    source: "router-amount",
                    target: "integration-sheets",
                    sourceHandle: "auto"
                },
                {
                    id: "e4",
                    source: "router-amount",
                    target: "humanReview-manager",
                    sourceHandle: "manager"
                },
                {
                    id: "e5",
                    source: "router-amount",
                    target: "humanReview-director",
                    sourceHandle: "director"
                },
                { id: "e6", source: "humanReview-manager", target: "integration-sheets" },
                { id: "e7", source: "humanReview-director", target: "integration-sheets" },
                { id: "e8", source: "integration-sheets", target: "integration-quickbooks" },
                { id: "e9", source: "integration-quickbooks", target: "integration-gmail" },
                { id: "e10", source: "integration-gmail", target: "integration-slack" },
                { id: "e11", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Operations Intermediate 4: Employee Onboarding Orchestrator (12 nodes)
    {
        name: "Employee Onboarding Orchestrator",
        description:
            "Streamlined new hire onboarding: set up accounts, schedule orientation, assign buddy, create onboarding checklist, and track 30-60-90 day progress.",
        category: "operations",
        tags: ["onboarding", "HR", "new hire", "automation"],
        required_integrations: ["notion", "slack", "google-calendar", "gmail"],
        featured: false,
        definition: {
            name: "Employee Onboarding Orchestrator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Hire Added",
                        triggerType: "webhook",
                        description: "Triggered when new employee is added to HRIS"
                    }
                },
                {
                    id: "llm-plan",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Onboarding Plan",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create personalized onboarding plan:\n\nNew hire: {{trigger-1.data}}\n\nInclude: first day checklist, first week goals, 30-60-90 day milestones.",
                        outputVariable: "onboardingPlan"
                    }
                },
                {
                    id: "integration-notion-checklist",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Checklist",
                        provider: "notion",
                        operation: "createPage",
                        database: "Onboarding"
                    }
                },
                {
                    id: "integration-slack-channel",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Welcome Channel",
                        provider: "slack",
                        operation: "createChannel"
                    }
                },
                {
                    id: "integration-calendar-orientation",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Orientation",
                        provider: "google-calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "integration-calendar-meetings",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Key Meetings",
                        provider: "google-calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "llm-buddy",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Assign Buddy",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Suggest an onboarding buddy based on:\n\nNew hire role: {{trigger-1.data.role}}\nDepartment: {{trigger-1.data.department}}\n\nConsider: similar role, tenure, availability.",
                        outputVariable: "buddyAssignment"
                    }
                },
                {
                    id: "integration-slack-buddy",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Buddy",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                },
                {
                    id: "llm-welcome",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Welcome Message",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write a warm welcome email:\n\nNew hire: {{trigger-1.data}}\nStart date: {{trigger-1.data.startDate}}\n\nInclude: excitement, first day info, key contacts, what to expect.",
                        outputVariable: "welcomeEmail"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Welcome Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack-announce",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Announce New Hire",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#general"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Onboarding Initiated",
                        outputName: "status",
                        value: "{{onboardingPlan.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-plan" },
                { id: "e2", source: "llm-plan", target: "integration-notion-checklist" },
                { id: "e3", source: "llm-plan", target: "integration-slack-channel" },
                { id: "e4", source: "llm-plan", target: "integration-calendar-orientation" },
                { id: "e5", source: "llm-plan", target: "integration-calendar-meetings" },
                { id: "e6", source: "llm-plan", target: "llm-buddy" },
                { id: "e7", source: "llm-buddy", target: "integration-slack-buddy" },
                { id: "e8", source: "integration-notion-checklist", target: "llm-welcome" },
                { id: "e9", source: "integration-slack-channel", target: "llm-welcome" },
                { id: "e10", source: "llm-welcome", target: "integration-gmail" },
                { id: "e11", source: "integration-gmail", target: "integration-slack-announce" },
                {
                    id: "e12",
                    source: "integration-slack-buddy",
                    target: "integration-slack-announce"
                },
                { id: "e13", source: "integration-slack-announce", target: "output-1" }
            ]
        }
    },

    // Operations Intermediate 5: Document Approval Flow (13 nodes)
    {
        name: "Document Approval Flow",
        description:
            "Intelligent document approval: classify document type, route to appropriate reviewer, handle approval/rejection paths, and update archives.",
        category: "operations",
        tags: ["documents", "approval", "routing", "workflow"],
        required_integrations: ["google-drive", "slack", "gmail", "notion"],
        featured: false,
        definition: {
            name: "Document Approval Flow",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Document Uploaded",
                        triggerType: "webhook",
                        webhookProvider: "google-drive"
                    }
                },
                {
                    id: "integration-drive",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Document",
                        provider: "google-drive",
                        operation: "getFile"
                    }
                },
                {
                    id: "llm-classify",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Classify Document",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Classify this document type: contract, financial, policy, or general:\n\n{{integration-drive.data}}",
                        outputVariable: "docType"
                    }
                },
                {
                    id: "transform-context",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Build Review Context",
                        transformType: "template",
                        template: '{"doc": {{integration-drive.data}}, "type": "{{docType.text}}"}',
                        outputVariable: "reviewContext"
                    }
                },
                {
                    id: "router-type",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Type",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route based on document type",
                        routes: [
                            { value: "legal", label: "Legal Review" },
                            { value: "finance", label: "Finance Review" },
                            { value: "general", label: "General Review" }
                        ]
                    }
                },
                {
                    id: "slack-legal",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Legal",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#legal-review"
                    }
                },
                {
                    id: "slack-finance",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Finance",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#finance-review"
                    }
                },
                {
                    id: "slack-general",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Manager",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#document-review"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Document",
                        reviewPrompt: "Please review and approve this document",
                        outputVariable: "approval"
                    }
                },
                {
                    id: "integration-drive-approved",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Move to Approved",
                        provider: "google-drive",
                        operation: "moveFile",
                        folder: "Approved Documents"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Archive",
                        provider: "notion",
                        operation: "createPage",
                        database: "Document Archive"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Submitter",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Complete",
                        outputName: "status",
                        value: "Document review complete"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-drive" },
                { id: "e2", source: "trigger-1", target: "llm-classify" },
                { id: "e3", source: "integration-drive", target: "transform-context" },
                { id: "e4", source: "llm-classify", target: "transform-context" },
                { id: "e5", source: "transform-context", target: "router-type" },
                { id: "e6", source: "router-type", target: "slack-legal", sourceHandle: "legal" },
                {
                    id: "e7",
                    source: "router-type",
                    target: "slack-finance",
                    sourceHandle: "finance"
                },
                {
                    id: "e8",
                    source: "router-type",
                    target: "slack-general",
                    sourceHandle: "general"
                },
                { id: "e9", source: "slack-legal", target: "humanReview-1" },
                { id: "e10", source: "slack-finance", target: "humanReview-1" },
                { id: "e11", source: "slack-general", target: "humanReview-1" },
                { id: "e12", source: "humanReview-1", target: "integration-drive-approved" },
                { id: "e13", source: "humanReview-1", target: "integration-notion" },
                { id: "e14", source: "integration-drive-approved", target: "integration-gmail" },
                { id: "e15", source: "integration-notion", target: "integration-gmail" },
                { id: "e16", source: "integration-gmail", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // ENGINEERING (6 templates)
    // ========================================================================

    // Engineering Advanced 1: Release Orchestration Platform (19 nodes)
    {
        name: "Release Orchestration Platform",
        description:
            "Complete release management: generate changelogs, route by release type, get approvals, deploy with monitoring, handle rollbacks automatically, and notify stakeholders across channels.",
        category: "engineering",
        tags: ["release", "deployment", "CI/CD", "monitoring", "rollback"],
        required_integrations: [
            "github",
            "linear",
            "datadog",
            "slack",
            "microsoft-teams",
            "notion",
            "pagerduty"
        ],
        featured: true,
        definition: {
            name: "Release Orchestration Platform",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Release Branch Created",
                        triggerType: "webhook",
                        webhookProvider: "github",
                        description: "Triggered when release/* branch is created"
                    }
                },
                {
                    id: "integration-github-commits",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Commits",
                        provider: "github",
                        operation: "listCommits"
                    }
                },
                {
                    id: "integration-linear",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Linked Issues",
                        provider: "linear",
                        operation: "getIssues"
                    }
                },
                {
                    id: "llm-changelog",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Changelog",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a changelog from:\n\nCommits: {{integration-github-commits.data}}\nIssues: {{integration-linear.data}}\n\nFormat: conventional changelog with categories (Features, Fixes, Breaking Changes).",
                        outputVariable: "changelog"
                    }
                },
                {
                    id: "router-type",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Release Type",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Classify release type:\n\n{{changelog.text}}\n\nTypes: major (breaking changes), minor (features), patch (fixes), hotfix (critical)",
                        routes: [
                            {
                                value: "major",
                                label: "Major",
                                description: "Breaking changes, requires full approval"
                            },
                            {
                                value: "minor",
                                label: "Minor",
                                description: "New features, standard approval"
                            },
                            {
                                value: "patch",
                                label: "Patch",
                                description: "Bug fixes, quick approval"
                            },
                            {
                                value: "hotfix",
                                label: "Hotfix",
                                description: "Critical fix, expedited"
                            }
                        ],
                        defaultRoute: "minor",
                        outputVariable: "releaseType"
                    }
                },
                {
                    id: "humanReview-major",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Major Release Approval",
                        reviewPrompt: "Major release with breaking changes requires VP approval",
                        outputVariable: "majorApproval"
                    }
                },
                {
                    id: "humanReview-minor",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Release Approval",
                        reviewPrompt: "Approve this release for deployment?",
                        outputVariable: "releaseApproval"
                    }
                },
                {
                    id: "integration-github-release",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create GitHub Release",
                        provider: "github",
                        operation: "createRelease"
                    }
                },
                {
                    id: "integration-github-deploy",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Trigger Deployment",
                        provider: "github",
                        operation: "createDeployment"
                    }
                },
                {
                    id: "wait-deploy",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait for Deploy",
                        duration: 300000,
                        description: "Wait 5 minutes for deployment"
                    }
                },
                {
                    id: "integration-datadog",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Health Metrics",
                        provider: "datadog",
                        operation: "queryMetrics"
                    }
                },
                {
                    id: "llm-health",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Health",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze deployment health:\n\n{{integration-datadog.data}}\n\nCheck: error rates, latency, memory, CPU. Return JSON: {"healthy": true/false, "issues": []}',
                        outputVariable: "healthCheck"
                    }
                },
                {
                    id: "conditional-health",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Health Check",
                        condition: "healthCheck.healthy === true",
                        outputVariable: "isHealthy"
                    }
                },
                {
                    id: "integration-github-rollback",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Trigger Rollback",
                        provider: "github",
                        operation: "createDeployment"
                    }
                },
                {
                    id: "integration-pagerduty",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Incident",
                        provider: "pagerduty",
                        operation: "createIncident"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Release Notes",
                        provider: "notion",
                        operation: "createPage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Engineering",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#engineering"
                    }
                },
                {
                    id: "integration-teams",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Stakeholders",
                        provider: "microsoft-teams",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Release Complete",
                        outputName: "status",
                        value: "{{changelog.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-github-commits" },
                { id: "e2", source: "trigger-1", target: "integration-linear" },
                { id: "e3", source: "integration-github-commits", target: "llm-changelog" },
                { id: "e4", source: "integration-linear", target: "llm-changelog" },
                { id: "e5", source: "llm-changelog", target: "router-type" },
                {
                    id: "e6",
                    source: "router-type",
                    target: "humanReview-major",
                    sourceHandle: "major"
                },
                {
                    id: "e7",
                    source: "router-type",
                    target: "humanReview-minor",
                    sourceHandle: "minor"
                },
                {
                    id: "e8",
                    source: "router-type",
                    target: "integration-github-release",
                    sourceHandle: "patch"
                },
                {
                    id: "e9",
                    source: "router-type",
                    target: "integration-github-release",
                    sourceHandle: "hotfix"
                },
                { id: "e10", source: "humanReview-major", target: "integration-github-release" },
                { id: "e11", source: "humanReview-minor", target: "integration-github-release" },
                {
                    id: "e12",
                    source: "integration-github-release",
                    target: "integration-github-deploy"
                },
                { id: "e13", source: "integration-github-deploy", target: "wait-deploy" },
                { id: "e14", source: "wait-deploy", target: "integration-datadog" },
                { id: "e15", source: "integration-datadog", target: "llm-health" },
                { id: "e16", source: "llm-health", target: "conditional-health" },
                {
                    id: "e17",
                    source: "conditional-health",
                    target: "integration-notion",
                    sourceHandle: "true"
                },
                {
                    id: "e18",
                    source: "conditional-health",
                    target: "integration-github-rollback",
                    sourceHandle: "false"
                },
                {
                    id: "e19",
                    source: "integration-github-rollback",
                    target: "integration-pagerduty"
                },
                { id: "e20", source: "integration-pagerduty", target: "integration-slack" },
                { id: "e21", source: "integration-notion", target: "integration-slack" },
                { id: "e22", source: "integration-slack", target: "integration-teams" },
                { id: "e23", source: "integration-teams", target: "output-1" }
            ]
        }
    },

    // Engineering Advanced 2: Infrastructure Cost Optimizer (16 nodes)
    {
        name: "Infrastructure Cost Optimizer",
        description:
            "Automated cloud cost optimization: analyze usage across services, identify savings opportunities with AI, route recommendations by impact, create tickets for implementation, and track results.",
        category: "engineering",
        tags: ["cost optimization", "cloud", "infrastructure", "automation"],
        required_integrations: ["datadog", "slack", "notion", "jira", "google-sheets"],
        featured: true,
        definition: {
            name: "Infrastructure Cost Optimizer",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Weekly Schedule",
                        triggerType: "schedule",
                        schedule: "0 9 * * 1",
                        description: "Every Monday at 9am"
                    }
                },
                {
                    id: "integration-datadog-compute",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Compute Metrics",
                        provider: "datadog",
                        operation: "queryMetrics",
                        query: "compute costs"
                    }
                },
                {
                    id: "integration-datadog-storage",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Storage Metrics",
                        provider: "datadog",
                        operation: "queryMetrics",
                        query: "storage costs"
                    }
                },
                {
                    id: "integration-datadog-network",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Network Metrics",
                        provider: "datadog",
                        operation: "queryMetrics",
                        query: "network costs"
                    }
                },
                {
                    id: "transform-aggregate",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Aggregate Costs",
                        transformType: "template",
                        template:
                            '{"compute": "{{integration-datadog-compute.data}}", "storage": "{{integration-datadog-storage.data}}", "network": "{{integration-datadog-network.data}}"}',
                        outputVariable: "costData"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Costs",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze cloud infrastructure costs:\n\n{{costData}}\n\nIdentify:\n1. Underutilized resources\n2. Reserved instance opportunities\n3. Right-sizing recommendations\n4. Waste elimination\n5. Architecture optimizations",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-recommend",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Recommendations",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate actionable recommendations:\n\n{{analysis.text}}\n\nFor each: estimated savings, effort level, risk assessment, implementation steps.",
                        outputVariable: "recommendations"
                    }
                },
                {
                    id: "router-savings",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Savings",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Classify total savings potential:\n\n{{recommendations.text}}\n\nCategories: high (>$10k/mo), medium ($1k-$10k), low (<$1k)",
                        routes: [
                            {
                                value: "high",
                                label: "High Impact",
                                description: ">$10k monthly savings"
                            },
                            {
                                value: "medium",
                                label: "Medium Impact",
                                description: "$1k-$10k monthly"
                            },
                            { value: "low", label: "Low Impact", description: "<$1k monthly" }
                        ],
                        defaultRoute: "medium",
                        outputVariable: "savingsLevel"
                    }
                },
                {
                    id: "integration-jira-high",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Priority Epic",
                        provider: "jira",
                        operation: "createIssue",
                        issueType: "Epic"
                    }
                },
                {
                    id: "integration-jira-medium",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Stories",
                        provider: "jira",
                        operation: "createIssue",
                        issueType: "Story"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Tracker",
                        provider: "google-sheets",
                        operation: "appendRow"
                    }
                },
                {
                    id: "llm-report",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Report",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create executive cost report:\n\n{{analysis.text}}\n{{recommendations.text}}\n\nFormat: key metrics, trend analysis, top recommendations, projected savings.",
                        outputVariable: "report"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Dashboard",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "integration-slack-alert",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Leadership",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#engineering-leadership"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Summary",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#infrastructure"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Cost Analysis Complete",
                        outputName: "report",
                        value: "{{report.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-datadog-compute" },
                { id: "e2", source: "trigger-1", target: "integration-datadog-storage" },
                { id: "e3", source: "trigger-1", target: "integration-datadog-network" },
                { id: "e4", source: "integration-datadog-compute", target: "transform-aggregate" },
                { id: "e5", source: "integration-datadog-storage", target: "transform-aggregate" },
                { id: "e6", source: "integration-datadog-network", target: "transform-aggregate" },
                { id: "e7", source: "transform-aggregate", target: "llm-analyze" },
                { id: "e8", source: "llm-analyze", target: "llm-recommend" },
                { id: "e9", source: "llm-recommend", target: "router-savings" },
                {
                    id: "e10",
                    source: "router-savings",
                    target: "integration-jira-high",
                    sourceHandle: "high"
                },
                {
                    id: "e11",
                    source: "router-savings",
                    target: "integration-jira-medium",
                    sourceHandle: "medium"
                },
                {
                    id: "e12",
                    source: "router-savings",
                    target: "integration-sheets",
                    sourceHandle: "low"
                },
                { id: "e13", source: "integration-jira-high", target: "integration-slack-alert" },
                { id: "e14", source: "integration-jira-medium", target: "llm-report" },
                { id: "e15", source: "integration-sheets", target: "llm-report" },
                { id: "e16", source: "integration-slack-alert", target: "llm-report" },
                { id: "e17", source: "llm-report", target: "integration-notion" },
                { id: "e18", source: "integration-notion", target: "integration-slack" },
                { id: "e19", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Engineering Advanced 3: API Health & Documentation Sync (15 nodes)
    {
        name: "API Health & Documentation Sync",
        description:
            "Maintain API quality: monitor spec changes, detect breaking changes with AI, generate migration guides, update documentation, create tickets for issues, and notify affected teams.",
        category: "engineering",
        tags: ["API", "documentation", "monitoring", "breaking changes"],
        required_integrations: ["github", "datadog", "slack", "notion", "linear"],
        featured: true,
        definition: {
            name: "API Health & Documentation Sync",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "API Spec Updated",
                        triggerType: "webhook",
                        webhookProvider: "github",
                        description: "OpenAPI spec file changed"
                    }
                },
                {
                    id: "integration-github-old",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Previous Spec",
                        provider: "github",
                        operation: "getContent"
                    }
                },
                {
                    id: "integration-github-new",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get New Spec",
                        provider: "github",
                        operation: "getContent"
                    }
                },
                {
                    id: "llm-diff",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Changes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Compare these API specs and identify changes:\n\nOld: {{integration-github-old.data}}\nNew: {{integration-github-new.data}}\n\nIdentify: new endpoints, removed endpoints, parameter changes, response changes, breaking changes.",
                        outputVariable: "diffAnalysis"
                    }
                },
                {
                    id: "llm-breaking",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Detect Breaking Changes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze for breaking changes:\n\n{{diffAnalysis.text}}\n\nReturn JSON: {"hasBreakingChanges": true/false, "breakingChanges": [], "severity": "critical/major/minor/none"}',
                        outputVariable: "breakingCheck"
                    }
                },
                {
                    id: "conditional-breaking",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Has Breaking Changes?",
                        condition: "breakingCheck.hasBreakingChanges === true",
                        outputVariable: "isBreaking"
                    }
                },
                {
                    id: "llm-migration",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Migration Guide",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a migration guide for these breaking changes:\n\n{{breakingCheck.text}}\n\nInclude: affected endpoints, required changes, code examples, timeline recommendations.",
                        outputVariable: "migrationGuide"
                    }
                },
                {
                    id: "integration-linear",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Migration Ticket",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "llm-docs",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Documentation",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate updated API documentation:\n\nChanges: {{diffAnalysis.text}}\n\nFormat for developer portal: endpoint descriptions, parameters, examples, response schemas.",
                        outputVariable: "updatedDocs"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update API Docs",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "integration-github-pr",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Docs PR",
                        provider: "github",
                        operation: "createPullRequest"
                    }
                },
                {
                    id: "integration-datadog",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Monitors",
                        provider: "datadog",
                        operation: "createMonitor"
                    }
                },
                {
                    id: "integration-slack-alert",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert API Consumers",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#api-announcements"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#engineering"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "API Sync Complete",
                        outputName: "status",
                        value: "{{diffAnalysis.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-github-old" },
                { id: "e2", source: "trigger-1", target: "integration-github-new" },
                { id: "e3", source: "integration-github-old", target: "llm-diff" },
                { id: "e4", source: "integration-github-new", target: "llm-diff" },
                { id: "e5", source: "llm-diff", target: "llm-breaking" },
                { id: "e6", source: "llm-breaking", target: "conditional-breaking" },
                {
                    id: "e7",
                    source: "conditional-breaking",
                    target: "llm-migration",
                    sourceHandle: "true"
                },
                {
                    id: "e8",
                    source: "conditional-breaking",
                    target: "llm-docs",
                    sourceHandle: "false"
                },
                { id: "e9", source: "llm-migration", target: "integration-linear" },
                { id: "e10", source: "llm-migration", target: "integration-slack-alert" },
                { id: "e11", source: "integration-linear", target: "llm-docs" },
                { id: "e12", source: "llm-docs", target: "integration-notion" },
                { id: "e13", source: "integration-notion", target: "integration-github-pr" },
                { id: "e14", source: "integration-github-pr", target: "integration-datadog" },
                { id: "e15", source: "integration-datadog", target: "integration-slack" },
                { id: "e16", source: "integration-slack-alert", target: "integration-slack" },
                { id: "e17", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Engineering Intermediate 4: CI/CD Pipeline Monitor (11 nodes)
    {
        name: "CI/CD Pipeline Monitor",
        description:
            "Monitor build pipelines: analyze failures with AI, route alerts by severity, create tickets for recurring issues, and provide fix suggestions to developers.",
        category: "engineering",
        tags: ["CI/CD", "monitoring", "build failures", "automation"],
        required_integrations: ["github", "datadog", "slack", "pagerduty"],
        featured: false,
        definition: {
            name: "CI/CD Pipeline Monitor",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Build Failed",
                        triggerType: "webhook",
                        webhookProvider: "github",
                        description: "CI build failure detected"
                    }
                },
                {
                    id: "integration-github",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Build Logs",
                        provider: "github",
                        operation: "getWorkflowRunLogs"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Failure",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this build failure:\n\n{{integration-github.data}}\n\nIdentify: root cause, failure category (test/lint/build/deploy), affected files, fix suggestions.",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-severity",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Assess Severity",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: 'Assess failure severity:\n\n{{analysis.text}}\n\nReturn JSON: {"severity": "critical/high/medium/low", "blocksProduction": true/false, "recurring": true/false}',
                        outputVariable: "severity"
                    }
                },
                {
                    id: "router-severity",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Severity",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route based on: {{severity.text}}",
                        routes: [
                            {
                                value: "critical",
                                label: "Critical",
                                description: "Page on-call immediately"
                            },
                            { value: "high", label: "High", description: "Alert team lead" },
                            { value: "medium", label: "Medium", description: "Notify channel" }
                        ],
                        defaultRoute: "medium",
                        outputVariable: "severityRoute"
                    }
                },
                {
                    id: "integration-pagerduty",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Page On-Call",
                        provider: "pagerduty",
                        operation: "createIncident"
                    }
                },
                {
                    id: "integration-slack-alert",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Team Lead",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                },
                {
                    id: "llm-fix",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Fix Suggestions",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Provide fix suggestions for:\n\n{{analysis.text}}\n\nInclude: specific code changes, commands to run, links to relevant docs.",
                        outputVariable: "fixSuggestions"
                    }
                },
                {
                    id: "integration-github-comment",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Comment on PR",
                        provider: "github",
                        operation: "createComment"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to Channel",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#builds"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Failure Handled",
                        outputName: "analysis",
                        value: "{{analysis.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-github" },
                { id: "e2", source: "integration-github", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "llm-severity" },
                { id: "e4", source: "llm-severity", target: "router-severity" },
                {
                    id: "e5",
                    source: "router-severity",
                    target: "integration-pagerduty",
                    sourceHandle: "critical"
                },
                {
                    id: "e6",
                    source: "router-severity",
                    target: "integration-slack-alert",
                    sourceHandle: "high"
                },
                { id: "e7", source: "router-severity", target: "llm-fix", sourceHandle: "medium" },
                { id: "e8", source: "integration-pagerduty", target: "llm-fix" },
                { id: "e9", source: "integration-slack-alert", target: "llm-fix" },
                { id: "e10", source: "llm-fix", target: "integration-github-comment" },
                { id: "e11", source: "integration-github-comment", target: "integration-slack" },
                { id: "e12", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Engineering Intermediate 5: PR Review Automation (12 nodes)
    {
        name: "PR Review Automation",
        description:
            "Automated pull request reviews: analyze code changes with AI, post review comments, flag potential issues, create follow-up tickets, and track review metrics.",
        category: "engineering",
        tags: ["code review", "pull requests", "automation", "quality"],
        required_integrations: ["github", "slack", "linear"],
        featured: false,
        definition: {
            name: "PR Review Automation",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "PR Opened",
                        triggerType: "webhook",
                        webhookProvider: "github"
                    }
                },
                {
                    id: "integration-github-diff",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get PR Diff",
                        provider: "github",
                        operation: "getPullRequestDiff"
                    }
                },
                {
                    id: "integration-github-files",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Changed Files",
                        provider: "github",
                        operation: "listPullRequestFiles"
                    }
                },
                {
                    id: "llm-review",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "AI Code Review",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Review this pull request:\n\nDiff: {{integration-github-diff.data}}\nFiles: {{integration-github-files.data}}\n\nCheck: bugs, security issues, performance problems, code style, best practices. Provide specific line comments.",
                        outputVariable: "review"
                    }
                },
                {
                    id: "llm-summary",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Summary",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create PR review summary:\n\n{{review.text}}\n\nInclude: overview of changes, risk assessment, recommended reviewers, approval recommendation.",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "conditional-issues",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Has Critical Issues?",
                        condition: "review.hasCriticalIssues === true",
                        outputVariable: "hasCritical"
                    }
                },
                {
                    id: "integration-github-comment",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Review Comments",
                        provider: "github",
                        operation: "createPullRequestReview"
                    }
                },
                {
                    id: "integration-linear",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Follow-up Ticket",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "integration-github-label",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add Labels",
                        provider: "github",
                        operation: "addLabels"
                    }
                },
                {
                    id: "integration-slack-alert",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Author",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to Review Channel",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#code-reviews"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Complete",
                        outputName: "summary",
                        value: "{{summary.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-github-diff" },
                { id: "e2", source: "trigger-1", target: "integration-github-files" },
                { id: "e3", source: "integration-github-diff", target: "llm-review" },
                { id: "e4", source: "integration-github-files", target: "llm-review" },
                { id: "e5", source: "llm-review", target: "llm-summary" },
                { id: "e6", source: "llm-summary", target: "conditional-issues" },
                {
                    id: "e7",
                    source: "conditional-issues",
                    target: "integration-linear",
                    sourceHandle: "true"
                },
                {
                    id: "e8",
                    source: "conditional-issues",
                    target: "integration-github-comment",
                    sourceHandle: "false"
                },
                { id: "e9", source: "integration-linear", target: "integration-slack-alert" },
                {
                    id: "e10",
                    source: "integration-slack-alert",
                    target: "integration-github-comment"
                },
                {
                    id: "e11",
                    source: "integration-github-comment",
                    target: "integration-github-label"
                },
                { id: "e12", source: "integration-github-label", target: "integration-slack" },
                { id: "e13", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Engineering Intermediate 6: Deployment Notifier (12 nodes)
    {
        name: "Deployment Notifier",
        description:
            "Intelligent deployment notifications: classify release type, route to appropriate channels, notify stakeholders, and update changelog.",
        category: "engineering",
        tags: ["deployment", "notifications", "routing", "releases"],
        required_integrations: ["github", "slack", "notion", "linear"],
        featured: false,
        definition: {
            name: "Deployment Notifier",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Deployment Complete",
                        triggerType: "webhook",
                        webhookProvider: "github"
                    }
                },
                {
                    id: "integration-release",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Release Info",
                        provider: "github",
                        operation: "getRelease"
                    }
                },
                {
                    id: "integration-commits",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Commit History",
                        provider: "github",
                        operation: "listCommits"
                    }
                },
                {
                    id: "transform-merge",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Merge Release Context",
                        transformType: "template",
                        template:
                            '{"release": {{integration-release.data}}, "commits": {{integration-commits.data}}}',
                        outputVariable: "releaseContext"
                    }
                },
                {
                    id: "router-type",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Release Type",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Classify release type from version",
                        routes: [
                            { value: "major", label: "Major Release" },
                            { value: "minor", label: "Minor Release" },
                            { value: "patch", label: "Patch/Hotfix" }
                        ]
                    }
                },
                {
                    id: "llm-major",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Major Release",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create comprehensive release notes for major release:\n\n{{releaseContext}}\n\nInclude: breaking changes, migration guide, feature highlights.",
                        outputVariable: "majorNotes"
                    }
                },
                {
                    id: "llm-minor",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Minor Release",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format minor release notes:\n\n{{releaseContext}}\n\nHighlight new features and improvements.",
                        outputVariable: "minorNotes"
                    }
                },
                {
                    id: "llm-patch",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Patch Notes",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format quick patch notes:\n\n{{releaseContext}}\n\nFocus on bug fixes.",
                        outputVariable: "patchNotes"
                    }
                },
                {
                    id: "integration-slack-eng",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Engineering",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#engineering"
                    }
                },
                {
                    id: "integration-slack-announce",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Company Announcement",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#announcements"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Changelog",
                        provider: "notion",
                        operation: "createPage",
                        database: "Changelog"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notification Complete",
                        outputName: "status",
                        value: "Deployment notifications sent"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-release" },
                { id: "e2", source: "trigger-1", target: "integration-commits" },
                { id: "e3", source: "integration-release", target: "transform-merge" },
                { id: "e4", source: "integration-commits", target: "transform-merge" },
                { id: "e5", source: "transform-merge", target: "router-type" },
                { id: "e6", source: "router-type", target: "llm-major", sourceHandle: "major" },
                { id: "e7", source: "router-type", target: "llm-minor", sourceHandle: "minor" },
                { id: "e8", source: "router-type", target: "llm-patch", sourceHandle: "patch" },
                { id: "e9", source: "llm-major", target: "integration-slack-eng" },
                { id: "e10", source: "llm-major", target: "integration-slack-announce" },
                { id: "e11", source: "llm-minor", target: "integration-slack-eng" },
                { id: "e12", source: "llm-patch", target: "integration-slack-eng" },
                { id: "e13", source: "integration-slack-eng", target: "integration-notion" },
                { id: "e14", source: "integration-slack-announce", target: "integration-notion" },
                { id: "e15", source: "integration-notion", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // SUPPORT (6 templates)
    // ========================================================================

    // Support Advanced 1: Customer Health Command Center (20 nodes)
    {
        name: "Customer Health Command Center",
        description:
            "Comprehensive customer health monitoring: aggregate data from multiple sources, calculate AI health scores, route by risk level, trigger appropriate playbooks, and coordinate CSM outreach.",
        category: "support",
        tags: ["customer success", "health scoring", "churn prevention", "automation"],
        required_integrations: [
            "hubspot",
            "intercom",
            "amplitude",
            "notion",
            "slack",
            "gmail",
            "calendly"
        ],
        featured: true,
        definition: {
            name: "Customer Health Command Center",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Health Check Trigger",
                        triggerType: "schedule",
                        schedule: "0 8 * * *",
                        description: "Daily customer health check"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Customer Data",
                        provider: "hubspot",
                        operation: "getCompany"
                    }
                },
                {
                    id: "integration-intercom-conv",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Support History",
                        provider: "intercom",
                        operation: "listConversations"
                    }
                },
                {
                    id: "integration-intercom-nps",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get NPS Scores",
                        provider: "intercom",
                        operation: "getSurveyResponses"
                    }
                },
                {
                    id: "integration-amplitude",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Product Usage",
                        provider: "amplitude",
                        operation: "getUserActivity"
                    }
                },
                {
                    id: "transform-aggregate",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Aggregate Data",
                        transformType: "template",
                        template:
                            '{"crm": "{{integration-hubspot.data}}", "support": "{{integration-intercom-conv.data}}", "nps": "{{integration-intercom-nps.data}}", "usage": "{{integration-amplitude.data}}"}',
                        outputVariable: "customerData"
                    }
                },
                {
                    id: "llm-health",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Calculate Health Score",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Calculate customer health score:\n\n{{customerData}}\n\nFactors: product usage trends, support ticket volume/sentiment, NPS, contract value, engagement.\n\nReturn JSON: {"score": 0-100, "trend": "improving/stable/declining", "risks": [], "opportunities": []}',
                        outputVariable: "healthScore"
                    }
                },
                {
                    id: "router-health",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Health",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route based on health: {{healthScore.text}}\n\nCategories: critical (<40), at_risk (40-60), healthy (60-80), champion (>80)",
                        routes: [
                            {
                                value: "critical",
                                label: "Critical",
                                description: "Immediate intervention needed"
                            },
                            {
                                value: "at_risk",
                                label: "At Risk",
                                description: "Proactive outreach required"
                            },
                            { value: "healthy", label: "Healthy", description: "Standard nurture" },
                            {
                                value: "champion",
                                label: "Champion",
                                description: "Advocacy opportunity"
                            }
                        ],
                        defaultRoute: "healthy",
                        outputVariable: "healthRoute"
                    }
                },
                {
                    id: "llm-playbook-critical",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Critical Playbook",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create urgent intervention plan:\n\n{{healthScore.text}}\n\nInclude: immediate actions, escalation path, executive involvement, retention offers.",
                        outputVariable: "criticalPlaybook"
                    }
                },
                {
                    id: "llm-playbook-risk",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "At-Risk Playbook",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create proactive engagement plan:\n\n{{healthScore.text}}\n\nInclude: check-in cadence, value reinforcement, training offers, success milestones.",
                        outputVariable: "riskPlaybook"
                    }
                },
                {
                    id: "llm-playbook-champion",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Champion Playbook",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create advocacy engagement plan:\n\n{{healthScore.text}}\n\nInclude: case study opportunity, referral program, beta access, speaking opportunities.",
                        outputVariable: "championPlaybook"
                    }
                },
                {
                    id: "integration-hubspot-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Health Score",
                        provider: "hubspot",
                        operation: "updateCompany"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Customer Hub",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "llm-email",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Draft Outreach Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Draft personalized outreach email based on:\n\nHealth: {{healthScore.text}}\n\nMake it personal, value-focused, with clear next steps.",
                        outputVariable: "outreachEmail"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-calendly",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Check-in",
                        provider: "calendly",
                        operation: "createInvite"
                    }
                },
                {
                    id: "integration-slack-csm",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify CSM",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                },
                {
                    id: "integration-slack-alert",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Leadership",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#customer-alerts"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Summary",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#customer-success"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Health Check Complete",
                        outputName: "healthScore",
                        value: "{{healthScore.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot" },
                { id: "e2", source: "trigger-1", target: "integration-intercom-conv" },
                { id: "e3", source: "trigger-1", target: "integration-intercom-nps" },
                { id: "e4", source: "trigger-1", target: "integration-amplitude" },
                { id: "e5", source: "integration-hubspot", target: "transform-aggregate" },
                { id: "e6", source: "integration-intercom-conv", target: "transform-aggregate" },
                { id: "e7", source: "integration-intercom-nps", target: "transform-aggregate" },
                { id: "e8", source: "integration-amplitude", target: "transform-aggregate" },
                { id: "e9", source: "transform-aggregate", target: "llm-health" },
                { id: "e10", source: "llm-health", target: "router-health" },
                {
                    id: "e11",
                    source: "router-health",
                    target: "llm-playbook-critical",
                    sourceHandle: "critical"
                },
                {
                    id: "e12",
                    source: "router-health",
                    target: "llm-playbook-risk",
                    sourceHandle: "at_risk"
                },
                {
                    id: "e13",
                    source: "router-health",
                    target: "integration-hubspot-update",
                    sourceHandle: "healthy"
                },
                {
                    id: "e14",
                    source: "router-health",
                    target: "llm-playbook-champion",
                    sourceHandle: "champion"
                },
                { id: "e15", source: "llm-playbook-critical", target: "integration-slack-alert" },
                {
                    id: "e16",
                    source: "integration-slack-alert",
                    target: "integration-hubspot-update"
                },
                { id: "e17", source: "llm-playbook-risk", target: "llm-email" },
                { id: "e18", source: "llm-playbook-champion", target: "llm-email" },
                { id: "e19", source: "llm-email", target: "integration-gmail" },
                { id: "e20", source: "integration-gmail", target: "integration-calendly" },
                { id: "e21", source: "integration-hubspot-update", target: "integration-notion" },
                { id: "e22", source: "integration-calendly", target: "integration-slack-csm" },
                { id: "e23", source: "integration-notion", target: "integration-slack" },
                { id: "e24", source: "integration-slack-csm", target: "integration-slack" },
                { id: "e25", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Support Intermediate 2: Support Ticket Triage (13 nodes)
    {
        name: "Support Ticket Triage",
        description:
            "Intelligent ticket management: classify incoming tickets with AI, route to appropriate team channel, set priority and SLA, and track resolution metrics.",
        category: "support",
        tags: ["ticketing", "triage", "classification", "automation"],
        required_integrations: ["zendesk", "slack", "notion"],
        featured: false,
        definition: {
            name: "Support Ticket Triage",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Ticket",
                        triggerType: "webhook",
                        webhookProvider: "zendesk"
                    }
                },
                {
                    id: "llm-classify",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Classify Ticket",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Classify this support ticket:\n\n{{trigger-1.data}}\n\nReturn JSON: {"category": "technical/billing/general/bug", "priority": "urgent/high/medium/low", "sentiment": "positive/neutral/negative/frustrated", "suggestedTeam": ""}',
                        outputVariable: "classification"
                    }
                },
                {
                    id: "router-category",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Category",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route ticket based on category: {{classification.text}}",
                        routes: [
                            {
                                value: "technical",
                                label: "Technical",
                                description: "Technical support team"
                            },
                            { value: "billing", label: "Billing", description: "Billing team" },
                            { value: "bug", label: "Bug", description: "Engineering team" },
                            { value: "general", label: "General", description: "General support" }
                        ],
                        defaultRoute: "general",
                        outputVariable: "categoryRoute"
                    }
                },
                {
                    id: "slack-tech",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Tech Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#tech-support"
                    }
                },
                {
                    id: "slack-billing",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Billing Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#billing"
                    }
                },
                {
                    id: "slack-engineering",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Engineering",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#engineering-bugs"
                    }
                },
                {
                    id: "slack-general",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify General Support",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#support-general"
                    }
                },
                {
                    id: "integration-zendesk-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Ticket",
                        provider: "zendesk",
                        operation: "updateTicket"
                    }
                },
                {
                    id: "llm-response",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Draft Response",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Draft initial response for:\n\nTicket: {{trigger-1.data}}\nClassification: {{classification.text}}\n\nBe empathetic, acknowledge the issue, set expectations.",
                        outputVariable: "draftResponse"
                    }
                },
                {
                    id: "integration-zendesk-comment",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add Internal Note",
                        provider: "zendesk",
                        operation: "createComment"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Tracker",
                        provider: "notion",
                        operation: "createPage"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Ticket Triaged",
                        outputName: "classification",
                        value: "{{classification.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-classify" },
                { id: "e2", source: "llm-classify", target: "router-category" },
                // Fan-out: Route to different team channels
                {
                    id: "e3",
                    source: "router-category",
                    target: "slack-tech",
                    sourceHandle: "technical"
                },
                {
                    id: "e4",
                    source: "router-category",
                    target: "slack-billing",
                    sourceHandle: "billing"
                },
                {
                    id: "e5",
                    source: "router-category",
                    target: "slack-engineering",
                    sourceHandle: "bug"
                },
                {
                    id: "e6",
                    source: "router-category",
                    target: "slack-general",
                    sourceHandle: "general"
                },
                // Fan-in: All paths converge to update ticket
                { id: "e7", source: "slack-tech", target: "integration-zendesk-update" },
                { id: "e8", source: "slack-billing", target: "integration-zendesk-update" },
                { id: "e9", source: "slack-engineering", target: "integration-zendesk-update" },
                { id: "e10", source: "slack-general", target: "integration-zendesk-update" },
                // Continue linear flow
                { id: "e11", source: "integration-zendesk-update", target: "llm-response" },
                { id: "e12", source: "llm-response", target: "integration-zendesk-comment" },
                { id: "e13", source: "integration-zendesk-comment", target: "integration-notion" },
                { id: "e14", source: "integration-notion", target: "output-1" }
            ]
        }
    },

    // Support Intermediate 3: CSAT Follow-up Workflow (9 nodes)
    {
        name: "CSAT Follow-up Workflow",
        description:
            "Handle customer satisfaction feedback: when low scores are received, fetch context, draft personalized recovery responses, and coordinate manager review.",
        category: "support",
        tags: ["CSAT", "feedback", "recovery", "customer satisfaction"],
        required_integrations: ["typeform", "hubspot", "slack", "gmail"],
        featured: false,
        definition: {
            name: "CSAT Follow-up Workflow",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Survey Response",
                        triggerType: "webhook",
                        webhookProvider: "typeform"
                    }
                },
                {
                    id: "conditional-low",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Is Low Score?",
                        condition: "trigger.score <= 3",
                        outputVariable: "isLowScore"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Customer Context",
                        provider: "hubspot",
                        operation: "getContact"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Feedback",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this negative feedback:\n\nScore: {{trigger-1.data.score}}\nFeedback: {{trigger-1.data.feedback}}\nCustomer: {{integration-hubspot.data}}\n\nIdentify: root cause, emotional state, service recovery needs.",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-response",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Draft Recovery Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Draft a service recovery email:\n\nAnalysis: {{analysis.text}}\n\nBe genuine, acknowledge their frustration, offer concrete resolution steps.",
                        outputVariable: "recoveryEmail"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Manager Review",
                        reviewPrompt: "Review and approve this recovery response",
                        outputVariable: "approval"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Recovery Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Recovery",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#customer-feedback"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Follow-up Complete",
                        outputName: "status",
                        value: "Recovery process initiated"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "conditional-low" },
                {
                    id: "e2",
                    source: "conditional-low",
                    target: "integration-hubspot",
                    sourceHandle: "true"
                },
                { id: "e3", source: "conditional-low", target: "output-1", sourceHandle: "false" },
                { id: "e4", source: "integration-hubspot", target: "llm-analyze" },
                { id: "e5", source: "llm-analyze", target: "llm-response" },
                { id: "e6", source: "llm-response", target: "humanReview-1" },
                { id: "e7", source: "humanReview-1", target: "integration-gmail" },
                { id: "e8", source: "integration-gmail", target: "integration-slack" },
                { id: "e9", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Support Intermediate 4: Ticket Status Notifier (12 nodes)
    {
        name: "Ticket Status Notifier",
        description:
            "Intelligent ticket routing: classify ticket priority, route to appropriate team channels, update CRM, and notify stakeholders.",
        category: "support",
        tags: ["tickets", "notifications", "routing", "status"],
        required_integrations: ["zendesk", "slack", "hubspot"],
        featured: false,
        definition: {
            name: "Ticket Status Notifier",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Ticket Updated",
                        triggerType: "webhook",
                        webhookProvider: "zendesk"
                    }
                },
                {
                    id: "integration-ticket",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Ticket Details",
                        provider: "zendesk",
                        operation: "getTicket"
                    }
                },
                {
                    id: "integration-customer",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Customer Info",
                        provider: "hubspot",
                        operation: "getContact"
                    }
                },
                {
                    id: "transform-context",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Build Context",
                        transformType: "template",
                        template:
                            '{"ticket": {{integration-ticket.data}}, "customer": {{integration-customer.data}}}',
                        outputVariable: "ticketContext"
                    }
                },
                {
                    id: "router-priority",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Priority",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Classify ticket priority",
                        routes: [
                            { value: "urgent", label: "Urgent/Escalated" },
                            { value: "high", label: "High Priority" },
                            { value: "normal", label: "Normal" }
                        ]
                    }
                },
                {
                    id: "llm-urgent",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Urgent Alert",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format urgent ticket alert:\n\n{{ticketContext}}\n\nHighlight: severity, customer tier, SLA breach risk.",
                        outputVariable: "urgentMessage"
                    }
                },
                {
                    id: "llm-standard",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Standard Update",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format ticket update:\n\n{{ticketContext}}\n\nInclude: ID, customer, status, assignee.",
                        outputVariable: "standardMessage"
                    }
                },
                {
                    id: "slack-escalations",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Escalations",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#support-escalations"
                    }
                },
                {
                    id: "slack-general",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to Support",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#support-tickets"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Activity",
                        provider: "hubspot",
                        operation: "createNote"
                    }
                },
                {
                    id: "integration-zendesk-tag",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Tags",
                        provider: "zendesk",
                        operation: "updateTicket"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notification Complete",
                        outputName: "status",
                        value: "Ticket notifications sent"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-ticket" },
                { id: "e2", source: "trigger-1", target: "integration-customer" },
                { id: "e3", source: "integration-ticket", target: "transform-context" },
                { id: "e4", source: "integration-customer", target: "transform-context" },
                { id: "e5", source: "transform-context", target: "router-priority" },
                {
                    id: "e6",
                    source: "router-priority",
                    target: "llm-urgent",
                    sourceHandle: "urgent"
                },
                {
                    id: "e7",
                    source: "router-priority",
                    target: "llm-standard",
                    sourceHandle: "high"
                },
                {
                    id: "e8",
                    source: "router-priority",
                    target: "llm-standard",
                    sourceHandle: "normal"
                },
                { id: "e9", source: "llm-urgent", target: "slack-escalations" },
                { id: "e10", source: "llm-standard", target: "slack-general" },
                { id: "e11", source: "slack-escalations", target: "integration-hubspot" },
                { id: "e12", source: "slack-general", target: "integration-hubspot" },
                { id: "e13", source: "integration-hubspot", target: "integration-zendesk-tag" },
                { id: "e14", source: "integration-zendesk-tag", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // E-COMMERCE (5 templates)
    // ========================================================================

    // E-commerce Advanced 1: Order Fulfillment Orchestrator (16 nodes)
    {
        name: "Order Fulfillment Orchestrator",
        description:
            "Complete order management: process new orders, check inventory, route by availability, handle payments, coordinate fulfillment, track shipping, and notify customers throughout.",
        category: "ecommerce",
        tags: ["orders", "fulfillment", "inventory", "shipping"],
        required_integrations: ["shopify", "slack", "gmail", "airtable", "google-sheets"],
        featured: true,
        definition: {
            name: "Order Fulfillment Orchestrator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Order",
                        triggerType: "webhook",
                        webhookProvider: "shopify"
                    }
                },
                {
                    id: "integration-shopify-order",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Order Details",
                        provider: "shopify",
                        operation: "getOrder"
                    }
                },
                {
                    id: "integration-shopify-inventory",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Inventory",
                        provider: "shopify",
                        operation: "getInventoryLevels"
                    }
                },
                {
                    id: "llm-validate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Validate Order",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: 'Validate this order:\n\nOrder: {{integration-shopify-order.data}}\nInventory: {{integration-shopify-inventory.data}}\n\nReturn JSON: {"valid": true/false, "issues": [], "fulfillmentType": "standard/express/backorder"}',
                        outputVariable: "validation"
                    }
                },
                {
                    id: "router-fulfillment",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route Fulfillment",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route based on: {{validation.text}}",
                        routes: [
                            {
                                value: "standard",
                                label: "Standard",
                                description: "Normal fulfillment"
                            },
                            {
                                value: "express",
                                label: "Express",
                                description: "Priority processing"
                            },
                            {
                                value: "backorder",
                                label: "Backorder",
                                description: "Items not in stock"
                            }
                        ],
                        defaultRoute: "standard",
                        outputVariable: "fulfillmentRoute"
                    }
                },
                {
                    id: "integration-shopify-fulfill",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Fulfillment",
                        provider: "shopify",
                        operation: "createFulfillment"
                    }
                },
                {
                    id: "llm-customer-email",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Draft Confirmation",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Draft order confirmation email:\n\nOrder: {{integration-shopify-order.data}}\nFulfillment: {{validation.fulfillmentType}}\n\nBe friendly, include order details, expected delivery.",
                        outputVariable: "confirmationEmail"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Confirmation",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Orders",
                        provider: "airtable",
                        operation: "createRecord"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Inventory Log",
                        provider: "google-sheets",
                        operation: "appendRow"
                    }
                },
                {
                    id: "llm-backorder-email",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Draft Backorder Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Draft backorder notification:\n\nOrder: {{integration-shopify-order.data}}\n\nBe apologetic, provide ETA, offer alternatives.",
                        outputVariable: "backorderEmail"
                    }
                },
                {
                    id: "integration-gmail-backorder",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Backorder Notice",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack-alert",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Operations",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#operations"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Order Summary",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#orders"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Order Processed",
                        outputName: "status",
                        value: "Order fulfillment complete"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-shopify-order" },
                {
                    id: "e2",
                    source: "integration-shopify-order",
                    target: "integration-shopify-inventory"
                },
                { id: "e3", source: "integration-shopify-inventory", target: "llm-validate" },
                { id: "e4", source: "llm-validate", target: "router-fulfillment" },
                {
                    id: "e5",
                    source: "router-fulfillment",
                    target: "integration-shopify-fulfill",
                    sourceHandle: "standard"
                },
                {
                    id: "e6",
                    source: "router-fulfillment",
                    target: "integration-shopify-fulfill",
                    sourceHandle: "express"
                },
                {
                    id: "e7",
                    source: "router-fulfillment",
                    target: "llm-backorder-email",
                    sourceHandle: "backorder"
                },
                { id: "e8", source: "integration-shopify-fulfill", target: "llm-customer-email" },
                { id: "e9", source: "llm-customer-email", target: "integration-gmail" },
                { id: "e10", source: "integration-gmail", target: "integration-airtable" },
                { id: "e11", source: "integration-airtable", target: "integration-sheets" },
                { id: "e12", source: "llm-backorder-email", target: "integration-gmail-backorder" },
                {
                    id: "e13",
                    source: "integration-gmail-backorder",
                    target: "integration-slack-alert"
                },
                { id: "e14", source: "integration-slack-alert", target: "integration-airtable" },
                { id: "e15", source: "integration-sheets", target: "integration-slack" },
                { id: "e16", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // E-commerce Intermediate 2: Abandoned Cart Recovery (10 nodes)
    {
        name: "Abandoned Cart Recovery",
        description:
            "Win back abandoned carts: detect abandoned checkouts, wait appropriate time, verify not purchased, generate personalized recovery emails, and track conversion.",
        category: "ecommerce",
        tags: ["abandoned cart", "recovery", "email", "conversion"],
        required_integrations: ["shopify", "mailchimp", "slack"],
        featured: false,
        definition: {
            name: "Abandoned Cart Recovery",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Cart Abandoned",
                        triggerType: "webhook",
                        webhookProvider: "shopify"
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait 1 Hour",
                        duration: 3600000,
                        description: "Allow time for natural completion"
                    }
                },
                {
                    id: "integration-shopify-check",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Order Status",
                        provider: "shopify",
                        operation: "getCheckout"
                    }
                },
                {
                    id: "conditional-purchased",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Already Purchased?",
                        condition: "checkout.completedAt !== null",
                        outputVariable: "isPurchased"
                    }
                },
                {
                    id: "llm-email",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Recovery Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a cart recovery email:\n\nCart: {{trigger-1.data}}\n\nBe friendly, remind them what they left, offer help, include direct checkout link.",
                        outputVariable: "recoveryEmail"
                    }
                },
                {
                    id: "integration-shopify-discount",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Discount Code",
                        provider: "shopify",
                        operation: "createDiscount"
                    }
                },
                {
                    id: "integration-mailchimp",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Recovery Email",
                        provider: "mailchimp",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Recovery Attempt",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#abandoned-carts"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Recovery Initiated",
                        outputName: "status",
                        value: "Cart recovery email sent"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "wait-1" },
                { id: "e2", source: "wait-1", target: "integration-shopify-check" },
                { id: "e3", source: "integration-shopify-check", target: "conditional-purchased" },
                {
                    id: "e4",
                    source: "conditional-purchased",
                    target: "output-1",
                    sourceHandle: "true"
                },
                {
                    id: "e5",
                    source: "conditional-purchased",
                    target: "llm-email",
                    sourceHandle: "false"
                },
                { id: "e6", source: "llm-email", target: "integration-shopify-discount" },
                {
                    id: "e7",
                    source: "integration-shopify-discount",
                    target: "integration-mailchimp"
                },
                { id: "e8", source: "integration-mailchimp", target: "integration-slack" },
                { id: "e9", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // E-commerce Intermediate 3: Inventory Alert System (13 nodes)
    {
        name: "Inventory Alert System",
        description:
            "Intelligent inventory management: monitor stock, classify urgency, route critical alerts, generate reorder recommendations, and create purchase orders.",
        category: "ecommerce",
        tags: ["inventory", "alerts", "reordering", "stock"],
        required_integrations: ["shopify", "slack", "airtable", "gmail"],
        featured: false,
        definition: {
            name: "Inventory Alert System",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Low Stock Alert",
                        triggerType: "webhook",
                        webhookProvider: "shopify"
                    }
                },
                {
                    id: "integration-product",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Product Details",
                        provider: "shopify",
                        operation: "getProduct"
                    }
                },
                {
                    id: "integration-sales",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Sales Velocity",
                        provider: "shopify",
                        operation: "getAnalytics"
                    }
                },
                {
                    id: "transform-context",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Build Inventory Context",
                        transformType: "template",
                        template:
                            '{"product": {{integration-product.data}}, "sales": {{integration-sales.data}}}',
                        outputVariable: "inventoryContext"
                    }
                },
                {
                    id: "router-urgency",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Urgency",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Classify inventory urgency based on stock vs sales velocity",
                        routes: [
                            { value: "critical", label: "Critical (out soon)" },
                            { value: "low", label: "Low Stock" },
                            { value: "monitor", label: "Monitor" }
                        ]
                    }
                },
                {
                    id: "llm-critical",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Critical Alert",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate critical inventory alert:\n\n{{inventoryContext}}\n\nHighlight: days until stockout, revenue at risk.",
                        outputVariable: "criticalAlert"
                    }
                },
                {
                    id: "llm-reorder",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Reorder Analysis",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze reorder needs:\n\n{{inventoryContext}}\n\nRecommend: quantity, timing, supplier.",
                        outputVariable: "reorderAnalysis"
                    }
                },
                {
                    id: "slack-critical",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Ops Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#ops-critical"
                    }
                },
                {
                    id: "slack-purchasing",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Purchasing",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#purchasing"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create PO Draft",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Purchase Orders"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Draft Supplier Email",
                        provider: "gmail",
                        operation: "createDraft"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Inventory Report",
                        provider: "google-sheets",
                        operation: "appendRow"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Processed",
                        outputName: "status",
                        value: "Inventory alert processed"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-product" },
                { id: "e2", source: "trigger-1", target: "integration-sales" },
                { id: "e3", source: "integration-product", target: "transform-context" },
                { id: "e4", source: "integration-sales", target: "transform-context" },
                { id: "e5", source: "transform-context", target: "router-urgency" },
                {
                    id: "e6",
                    source: "router-urgency",
                    target: "llm-critical",
                    sourceHandle: "critical"
                },
                { id: "e7", source: "router-urgency", target: "llm-reorder", sourceHandle: "low" },
                {
                    id: "e8",
                    source: "router-urgency",
                    target: "llm-reorder",
                    sourceHandle: "monitor"
                },
                { id: "e9", source: "llm-critical", target: "slack-critical" },
                { id: "e10", source: "llm-reorder", target: "slack-purchasing" },
                { id: "e11", source: "slack-critical", target: "integration-airtable" },
                { id: "e12", source: "slack-purchasing", target: "integration-airtable" },
                { id: "e13", source: "integration-airtable", target: "integration-gmail" },
                { id: "e14", source: "integration-airtable", target: "integration-sheets" },
                { id: "e15", source: "integration-gmail", target: "output-1" },
                { id: "e16", source: "integration-sheets", target: "output-1" }
            ]
        }
    },

    // E-commerce Intermediate 4: Order Confirmation Sender (11 nodes)
    {
        name: "Order Confirmation Sender",
        description:
            "Multi-channel order confirmation: process new orders, classify by value, send personalized confirmations via email and SMS, and update CRM.",
        category: "ecommerce",
        tags: ["orders", "confirmation", "email", "sms", "routing"],
        required_integrations: ["shopify", "gmail", "twilio", "hubspot"],
        featured: false,
        definition: {
            name: "Order Confirmation Sender",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Order",
                        triggerType: "webhook",
                        webhookProvider: "shopify"
                    }
                },
                {
                    id: "integration-order",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Order Details",
                        provider: "shopify",
                        operation: "getOrder"
                    }
                },
                {
                    id: "integration-customer",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Customer History",
                        provider: "shopify",
                        operation: "getCustomer"
                    }
                },
                {
                    id: "transform-context",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Build Order Context",
                        transformType: "template",
                        template:
                            '{"order": {{integration-order.data}}, "customer": {{integration-customer.data}}}',
                        outputVariable: "orderContext"
                    }
                },
                {
                    id: "router-value",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Order Value",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Classify order value tier",
                        routes: [
                            { value: "vip", label: "VIP Order ($500+)" },
                            { value: "standard", label: "Standard Order" }
                        ]
                    }
                },
                {
                    id: "llm-vip",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "VIP Confirmation",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create premium VIP order confirmation:\n\n{{orderContext}}\n\nHighlight: exclusive thanks, priority shipping, personal touch.",
                        outputVariable: "vipConfirmation"
                    }
                },
                {
                    id: "llm-standard",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Standard Confirmation",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Create friendly order confirmation:\n\n{{orderContext}}\n\nInclude: thank you, order summary, delivery estimate.",
                        outputVariable: "standardConfirmation"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-sms",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send SMS",
                        provider: "twilio",
                        operation: "sendSMS"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to CRM",
                        provider: "hubspot",
                        operation: "createDeal"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Confirmation Sent",
                        outputName: "status",
                        value: "Order confirmation sent"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-order" },
                { id: "e2", source: "trigger-1", target: "integration-customer" },
                { id: "e3", source: "integration-order", target: "transform-context" },
                { id: "e4", source: "integration-customer", target: "transform-context" },
                { id: "e5", source: "transform-context", target: "router-value" },
                { id: "e6", source: "router-value", target: "llm-vip", sourceHandle: "vip" },
                {
                    id: "e7",
                    source: "router-value",
                    target: "llm-standard",
                    sourceHandle: "standard"
                },
                { id: "e8", source: "llm-vip", target: "integration-gmail" },
                { id: "e9", source: "llm-vip", target: "integration-sms" },
                { id: "e10", source: "llm-standard", target: "integration-gmail" },
                { id: "e11", source: "integration-gmail", target: "integration-hubspot" },
                { id: "e12", source: "integration-sms", target: "integration-hubspot" },
                { id: "e13", source: "integration-hubspot", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // SAAS (5 templates)
    // ========================================================================

    // SaaS Advanced 1: User Onboarding Flow (17 nodes)
    {
        name: "User Onboarding Flow",
        description:
            "Guide new users to success: welcome emails, track activation milestones, route by engagement level, trigger automated nurture or CSM outreach, and celebrate achievements.",
        category: "saas",
        tags: ["onboarding", "activation", "engagement", "retention"],
        required_integrations: [
            "hubspot",
            "intercom",
            "mixpanel",
            "slack",
            "gmail",
            "notion",
            "calendly"
        ],
        featured: true,
        definition: {
            name: "User Onboarding Flow",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Signup",
                        triggerType: "webhook",
                        description: "New user registration"
                    }
                },
                {
                    id: "integration-hubspot-create",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Contact",
                        provider: "hubspot",
                        operation: "createContact"
                    }
                },
                {
                    id: "llm-welcome",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Welcome Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a warm welcome email for:\n\n{{trigger-1.data}}\n\nInclude: personal greeting, getting started steps, key resources, support contact.",
                        outputVariable: "welcomeEmail"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Welcome",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-intercom",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Start In-App Tour",
                        provider: "intercom",
                        operation: "createMessage"
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait 3 Days",
                        duration: 259200000,
                        description: "Allow time for initial activation"
                    }
                },
                {
                    id: "integration-mixpanel",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Activation",
                        provider: "mixpanel",
                        operation: "getProfile"
                    }
                },
                {
                    id: "llm-score",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Score Engagement",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: 'Score this user\'s engagement:\n\n{{integration-mixpanel.data}}\n\nReturn JSON: {"score": 0-100, "level": "high/medium/low", "completedMilestones": [], "nextMilestone": ""}',
                        outputVariable: "engagementScore"
                    }
                },
                {
                    id: "router-engagement",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Engagement",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route based on: {{engagementScore.text}}",
                        routes: [
                            {
                                value: "high",
                                label: "High",
                                description: "Engaged user, celebrate"
                            },
                            { value: "medium", label: "Medium", description: "Needs nudge" },
                            { value: "low", label: "Low", description: "At risk, CSM outreach" }
                        ],
                        defaultRoute: "medium",
                        outputVariable: "engagementRoute"
                    }
                },
                {
                    id: "llm-celebrate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Celebration",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a celebration message for milestone completion:\n\n{{engagementScore.text}}\n\nBe enthusiastic, highlight their progress, suggest next steps.",
                        outputVariable: "celebrationMsg"
                    }
                },
                {
                    id: "llm-nudge",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Nudge",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a helpful nudge email:\n\n{{engagementScore.text}}\n\nOffer tips, resources, or help to complete next milestone.",
                        outputVariable: "nudgeEmail"
                    }
                },
                {
                    id: "integration-intercom-msg",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send In-App Message",
                        provider: "intercom",
                        operation: "createMessage"
                    }
                },
                {
                    id: "integration-hubspot-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Contact",
                        provider: "hubspot",
                        operation: "updateContact"
                    }
                },
                {
                    id: "integration-calendly",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule CSM Call",
                        provider: "calendly",
                        operation: "createInvite"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Progress",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#onboarding"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Onboarding Step Complete",
                        outputName: "status",
                        value: "{{engagementScore.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot-create" },
                { id: "e2", source: "integration-hubspot-create", target: "llm-welcome" },
                { id: "e3", source: "llm-welcome", target: "integration-gmail" },
                { id: "e4", source: "integration-gmail", target: "integration-intercom" },
                { id: "e5", source: "integration-intercom", target: "wait-1" },
                { id: "e6", source: "wait-1", target: "integration-mixpanel" },
                { id: "e7", source: "integration-mixpanel", target: "llm-score" },
                { id: "e8", source: "llm-score", target: "router-engagement" },
                {
                    id: "e9",
                    source: "router-engagement",
                    target: "llm-celebrate",
                    sourceHandle: "high"
                },
                {
                    id: "e10",
                    source: "router-engagement",
                    target: "llm-nudge",
                    sourceHandle: "medium"
                },
                {
                    id: "e11",
                    source: "router-engagement",
                    target: "integration-calendly",
                    sourceHandle: "low"
                },
                { id: "e12", source: "llm-celebrate", target: "integration-intercom-msg" },
                { id: "e13", source: "llm-nudge", target: "integration-intercom-msg" },
                {
                    id: "e14",
                    source: "integration-intercom-msg",
                    target: "integration-hubspot-update"
                },
                { id: "e15", source: "integration-calendly", target: "integration-hubspot-update" },
                { id: "e16", source: "integration-hubspot-update", target: "integration-notion" },
                { id: "e17", source: "integration-notion", target: "integration-slack" },
                { id: "e18", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // SaaS Intermediate 2: Feature Adoption Tracker (11 nodes)
    {
        name: "Feature Adoption Tracker",
        description:
            "Drive feature adoption: track when users hit feature milestones, generate personalized tips with AI, send in-app guidance, and measure engagement improvements.",
        category: "saas",
        tags: ["feature adoption", "engagement", "in-app", "tracking"],
        required_integrations: ["amplitude", "intercom", "slack", "notion"],
        featured: false,
        definition: {
            name: "Feature Adoption Tracker",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Feature Used",
                        triggerType: "webhook",
                        webhookProvider: "amplitude"
                    }
                },
                {
                    id: "integration-amplitude",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get User Activity",
                        provider: "amplitude",
                        operation: "getUserActivity"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Usage Pattern",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this user's feature usage:\n\n{{integration-amplitude.data}}\n\nIdentify: adoption stage, next logical feature, potential friction points.",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "conditional-milestone",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Hit Milestone?",
                        condition: "analysis.milestone === true",
                        outputVariable: "isMilestone"
                    }
                },
                {
                    id: "llm-tip",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Pro Tip",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a personalized pro tip for:\n\n{{analysis.text}}\n\nMake it specific, actionable, and exciting.",
                        outputVariable: "proTip"
                    }
                },
                {
                    id: "llm-celebrate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Celebration",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Create a milestone celebration message:\n\n{{analysis.text}}\n\nBe enthusiastic and encouraging!",
                        outputVariable: "celebration"
                    }
                },
                {
                    id: "integration-intercom-tip",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Pro Tip",
                        provider: "intercom",
                        operation: "createMessage"
                    }
                },
                {
                    id: "integration-intercom-celebrate",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Celebration",
                        provider: "intercom",
                        operation: "createMessage"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Adoption",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Share Win",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#product-wins"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Tracking Complete",
                        outputName: "status",
                        value: "{{analysis.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-amplitude" },
                { id: "e2", source: "integration-amplitude", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "conditional-milestone" },
                {
                    id: "e4",
                    source: "conditional-milestone",
                    target: "llm-celebrate",
                    sourceHandle: "true"
                },
                {
                    id: "e5",
                    source: "conditional-milestone",
                    target: "llm-tip",
                    sourceHandle: "false"
                },
                { id: "e6", source: "llm-celebrate", target: "integration-intercom-celebrate" },
                { id: "e7", source: "llm-tip", target: "integration-intercom-tip" },
                { id: "e8", source: "integration-intercom-celebrate", target: "integration-slack" },
                { id: "e9", source: "integration-intercom-tip", target: "integration-notion" },
                { id: "e10", source: "integration-slack", target: "integration-notion" },
                { id: "e11", source: "integration-notion", target: "output-1" }
            ]
        }
    },

    // SaaS Intermediate 3: Trial Conversion Workflow (10 nodes)
    {
        name: "Trial Conversion Workflow",
        description:
            "Maximize trial conversions: monitor trial usage, segment by engagement level, deliver personalized outreach, and route to sales for high-value prospects.",
        category: "saas",
        tags: ["trial", "conversion", "sales", "engagement"],
        required_integrations: ["hubspot", "intercom", "slack", "gmail", "calendly"],
        featured: false,
        definition: {
            name: "Trial Conversion Workflow",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Trial Ending Soon",
                        triggerType: "schedule",
                        schedule: "0 9 * * *",
                        description: "Check trials ending in 3 days"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Trial Users",
                        provider: "hubspot",
                        operation: "searchContacts"
                    }
                },
                {
                    id: "integration-intercom",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Usage Data",
                        provider: "intercom",
                        operation: "getUser"
                    }
                },
                {
                    id: "llm-segment",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Segment User",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Segment this trial user:\n\n{{integration-hubspot.data}}\n{{integration-intercom.data}}\n\nReturn JSON: {"segment": "hot/warm/cold", "likelihood": 0-100, "objections": [], "approach": ""}',
                        outputVariable: "segment"
                    }
                },
                {
                    id: "router-segment",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Segment",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route: {{segment.text}}",
                        routes: [
                            { value: "hot", label: "Hot", description: "Sales call" },
                            { value: "warm", label: "Warm", description: "Personal email" },
                            { value: "cold", label: "Cold", description: "Automated nurture" }
                        ],
                        defaultRoute: "warm",
                        outputVariable: "segmentRoute"
                    }
                },
                {
                    id: "integration-calendly",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Sales Call",
                        provider: "calendly",
                        operation: "createInvite"
                    }
                },
                {
                    id: "llm-email",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Draft Personal Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write a personal trial conversion email:\n\n{{segment.text}}\n\nAddress likely objections, highlight value seen, offer help.",
                        outputVariable: "personalEmail"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Sales",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#sales-trials"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Outreach Complete",
                        outputName: "segment",
                        value: "{{segment.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot" },
                { id: "e2", source: "integration-hubspot", target: "integration-intercom" },
                { id: "e3", source: "integration-intercom", target: "llm-segment" },
                { id: "e4", source: "llm-segment", target: "router-segment" },
                {
                    id: "e5",
                    source: "router-segment",
                    target: "integration-calendly",
                    sourceHandle: "hot"
                },
                { id: "e6", source: "router-segment", target: "llm-email", sourceHandle: "warm" },
                {
                    id: "e7",
                    source: "router-segment",
                    target: "integration-slack",
                    sourceHandle: "cold"
                },
                { id: "e8", source: "integration-calendly", target: "integration-slack" },
                { id: "e9", source: "llm-email", target: "integration-gmail" },
                { id: "e10", source: "integration-gmail", target: "integration-slack" },
                { id: "e11", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // SaaS Intermediate 4: Usage Milestone Celebrator (12 nodes)
    {
        name: "Usage Milestone Celebrator",
        description:
            "Intelligent milestone celebration: classify achievement type, route to appropriate celebration path, send multi-channel notifications, and track engagement.",
        category: "saas",
        tags: ["milestones", "celebration", "engagement", "routing"],
        required_integrations: ["mixpanel", "intercom", "slack", "gmail", "hubspot"],
        featured: false,
        definition: {
            name: "Usage Milestone Celebrator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Milestone Reached",
                        triggerType: "webhook",
                        webhookProvider: "mixpanel"
                    }
                },
                {
                    id: "integration-user",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get User Profile",
                        provider: "hubspot",
                        operation: "getContact"
                    }
                },
                {
                    id: "integration-analytics",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get User Journey",
                        provider: "mixpanel",
                        operation: "getUserProfile"
                    }
                },
                {
                    id: "transform-context",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Build Context",
                        transformType: "template",
                        template:
                            '{"milestone": {{trigger-1.data}}, "user": {{integration-user.data}}, "journey": {{integration-analytics.data}}}',
                        outputVariable: "milestoneContext"
                    }
                },
                {
                    id: "router-type",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Milestone",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Classify milestone significance",
                        routes: [
                            { value: "major", label: "Major Achievement" },
                            { value: "feature", label: "Feature Milestone" },
                            { value: "streak", label: "Usage Streak" }
                        ]
                    }
                },
                {
                    id: "llm-major",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Major Celebration",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create premium achievement celebration:\n\n{{milestoneContext}}\n\nBe enthusiastic, personalized, suggest exclusive rewards.",
                        outputVariable: "majorCelebration"
                    }
                },
                {
                    id: "llm-standard",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Standard Celebration",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Create fun milestone celebration:\n\n{{milestoneContext}}\n\nEncourage continued engagement.",
                        outputVariable: "standardCelebration"
                    }
                },
                {
                    id: "integration-intercom",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send In-App",
                        provider: "intercom",
                        operation: "createMessage"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Share in #wins",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#customer-wins"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Achievement",
                        provider: "hubspot",
                        operation: "createNote"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Celebration Complete",
                        outputName: "status",
                        value: "Milestone celebrated"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-user" },
                { id: "e2", source: "trigger-1", target: "integration-analytics" },
                { id: "e3", source: "integration-user", target: "transform-context" },
                { id: "e4", source: "integration-analytics", target: "transform-context" },
                { id: "e5", source: "transform-context", target: "router-type" },
                { id: "e6", source: "router-type", target: "llm-major", sourceHandle: "major" },
                {
                    id: "e7",
                    source: "router-type",
                    target: "llm-standard",
                    sourceHandle: "feature"
                },
                { id: "e8", source: "router-type", target: "llm-standard", sourceHandle: "streak" },
                { id: "e9", source: "llm-major", target: "integration-intercom" },
                { id: "e10", source: "llm-major", target: "integration-gmail" },
                { id: "e11", source: "llm-standard", target: "integration-intercom" },
                { id: "e12", source: "integration-intercom", target: "integration-slack" },
                { id: "e13", source: "integration-gmail", target: "integration-slack" },
                { id: "e14", source: "integration-slack", target: "integration-hubspot" },
                { id: "e15", source: "integration-hubspot", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // HEALTHCARE (3 templates)
    // ========================================================================

    // Healthcare Intermediate 1: Patient Appointment Reminder (9 nodes)
    {
        name: "Patient Appointment Reminder",
        description:
            "Reduce no-shows with automated reminders: send SMS and email reminders before appointments, confirm attendance, and update records accordingly.",
        category: "healthcare",
        tags: ["appointments", "reminders", "patient communication", "healthcare"],
        required_integrations: ["google-calendar", "gmail", "airtable"],
        featured: true,
        definition: {
            name: "Patient Appointment Reminder",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Appointment Tomorrow",
                        triggerType: "schedule",
                        schedule: "0 18 * * *",
                        description: "Check appointments for next day"
                    }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Appointments",
                        provider: "google-calendar",
                        operation: "listEvents"
                    }
                },
                {
                    id: "llm-reminder-email",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Email Reminder",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a friendly appointment reminder email:\n\n{{integration-calendar.data}}\n\nInclude: date/time, location, what to bring, how to reschedule. Keep it HIPAA compliant.",
                        outputVariable: "emailReminder"
                    }
                },
                {
                    id: "llm-reminder-sms",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create SMS Reminder",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Create a brief SMS appointment reminder (max 160 chars):\n\n{{integration-calendar.data}}\n\nInclude: time and confirm/reschedule options.",
                        outputVariable: "smsReminder"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Reminder Sent",
                        provider: "airtable",
                        operation: "updateRecord"
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait for Response",
                        duration: 43200000,
                        description: "12 hours for confirmation"
                    }
                },
                {
                    id: "integration-airtable-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Status",
                        provider: "airtable",
                        operation: "updateRecord"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Reminders Sent",
                        outputName: "status",
                        value: "Appointment reminders delivered"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-calendar" },
                { id: "e2", source: "integration-calendar", target: "llm-reminder-email" },
                { id: "e3", source: "integration-calendar", target: "llm-reminder-sms" },
                { id: "e4", source: "llm-reminder-email", target: "integration-gmail" },
                { id: "e5", source: "integration-gmail", target: "integration-airtable" },
                { id: "e6", source: "llm-reminder-sms", target: "integration-airtable" },
                { id: "e7", source: "integration-airtable", target: "wait-1" },
                { id: "e8", source: "wait-1", target: "integration-airtable-update" },
                { id: "e9", source: "integration-airtable-update", target: "output-1" }
            ]
        }
    },

    // Healthcare Intermediate 2: Medical Records Request Handler (10 nodes)
    {
        name: "Medical Records Request Handler",
        description:
            "Securely process medical records requests: verify identity, locate records, route through compliance approval, and deliver securely with full audit logging.",
        category: "healthcare",
        tags: ["medical records", "compliance", "HIPAA", "secure"],
        required_integrations: ["typeform", "google-drive", "gmail", "slack", "airtable"],
        featured: false,
        definition: {
            name: "Medical Records Request Handler",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Records Request",
                        triggerType: "webhook",
                        webhookProvider: "typeform"
                    }
                },
                {
                    id: "llm-verify",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Verify Identity",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Verify this records request:\n\n{{trigger-1.data}}\n\nCheck: required fields present, ID matches, authorized requester type.\n\nReturn JSON: {"verified": true/false, "issues": [], "riskLevel": "low/medium/high"}',
                        outputVariable: "verification"
                    }
                },
                {
                    id: "conditional-verified",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Identity Verified?",
                        condition: "verification.verified === true",
                        outputVariable: "isVerified"
                    }
                },
                {
                    id: "integration-drive",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Locate Records",
                        provider: "google-drive",
                        operation: "searchFiles"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compliance Review",
                        reviewPrompt:
                            "Review and approve this records release for HIPAA compliance",
                        outputVariable: "complianceApproval"
                    }
                },
                {
                    id: "llm-prepare",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Prepare Delivery",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Prepare secure delivery instructions:\n\nRequest: {{trigger-1.data}}\nRecords: {{integration-drive.data}}\n\nInclude: secure link generation, access expiration, delivery confirmation.",
                        outputVariable: "deliveryInstructions"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Securely",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Request",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Records Requests Audit"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Compliance",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#compliance"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Request Processed",
                        outputName: "status",
                        value: "Records request processed securely"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-verify" },
                { id: "e2", source: "llm-verify", target: "conditional-verified" },
                {
                    id: "e3",
                    source: "conditional-verified",
                    target: "integration-drive",
                    sourceHandle: "true"
                },
                {
                    id: "e4",
                    source: "conditional-verified",
                    target: "integration-slack",
                    sourceHandle: "false"
                },
                { id: "e5", source: "integration-drive", target: "humanReview-1" },
                { id: "e6", source: "humanReview-1", target: "llm-prepare" },
                { id: "e7", source: "llm-prepare", target: "integration-gmail" },
                { id: "e8", source: "integration-gmail", target: "integration-airtable" },
                { id: "e9", source: "integration-airtable", target: "integration-slack" },
                { id: "e10", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Healthcare Intermediate 3: Lab Results Notifier (12 nodes)
    {
        name: "Lab Results Notifier",
        description:
            "Intelligent lab results notification: classify urgency, route to appropriate notification path, and coordinate care team follow-up.",
        category: "healthcare",
        tags: ["lab results", "notifications", "patient communication", "routing"],
        required_integrations: ["gmail", "slack", "twilio", "airtable"],
        featured: false,
        definition: {
            name: "Lab Results Notifier",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Results Ready",
                        triggerType: "webhook",
                        description: "Lab results uploaded to system"
                    }
                },
                {
                    id: "integration-patient",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Patient Info",
                        provider: "airtable",
                        operation: "getRecord",
                        table: "Patients"
                    }
                },
                {
                    id: "llm-classify",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Classify Urgency",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Classify lab result urgency (DO NOT include PHI in output):\n\n{{trigger-1.data}}\n\nClassify: critical (needs immediate attention), abnormal (needs follow-up), normal (routine notification).",
                        outputVariable: "urgency"
                    }
                },
                {
                    id: "transform-context",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Build Context",
                        transformType: "template",
                        template:
                            '{"patient": {{integration-patient.data}}, "urgency": "{{urgency.text}}"}',
                        outputVariable: "notificationContext"
                    }
                },
                {
                    id: "router-urgency",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Urgency",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route based on urgency classification",
                        routes: [
                            { value: "critical", label: "Critical - Immediate" },
                            { value: "abnormal", label: "Abnormal - Follow-up" },
                            { value: "normal", label: "Normal - Routine" }
                        ]
                    }
                },
                {
                    id: "llm-critical",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Critical Alert",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create urgent patient notification (HIPAA compliant - no results):\n\n{{notificationContext}}\n\nUrgently request patient contact office immediately.",
                        outputVariable: "criticalMessage"
                    }
                },
                {
                    id: "llm-routine",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Routine Notice",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Create friendly results-ready notification (HIPAA compliant):\n\n{{notificationContext}}\n\nProvide portal login instructions.",
                        outputVariable: "routineMessage"
                    }
                },
                {
                    id: "integration-sms",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send SMS Alert",
                        provider: "twilio",
                        operation: "sendSMS"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "slack-care-team",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Care Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#care-team-alerts"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Notification",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Notification Log"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notification Complete",
                        outputName: "status",
                        value: "Patient notified"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-patient" },
                { id: "e2", source: "trigger-1", target: "llm-classify" },
                { id: "e3", source: "integration-patient", target: "transform-context" },
                { id: "e4", source: "llm-classify", target: "transform-context" },
                { id: "e5", source: "transform-context", target: "router-urgency" },
                {
                    id: "e6",
                    source: "router-urgency",
                    target: "llm-critical",
                    sourceHandle: "critical"
                },
                {
                    id: "e7",
                    source: "router-urgency",
                    target: "llm-critical",
                    sourceHandle: "abnormal"
                },
                {
                    id: "e8",
                    source: "router-urgency",
                    target: "llm-routine",
                    sourceHandle: "normal"
                },
                { id: "e9", source: "llm-critical", target: "integration-sms" },
                { id: "e10", source: "llm-critical", target: "slack-care-team" },
                { id: "e11", source: "llm-routine", target: "integration-gmail" },
                { id: "e12", source: "integration-sms", target: "integration-airtable" },
                { id: "e13", source: "slack-care-team", target: "integration-airtable" },
                { id: "e14", source: "integration-gmail", target: "integration-airtable" },
                { id: "e15", source: "integration-airtable", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // PRODUCT MANAGEMENT (3 templates)
    // ========================================================================

    // Product Management 1: Feature Request Triage & Roadmap Sync (14 nodes)
    {
        name: "Feature Request Triage & Roadmap Sync",
        description:
            "Automatically classify and prioritize incoming feature requests using AI, detect duplicates, route to appropriate teams, and sync with your product roadmap.",
        category: "engineering",
        tags: ["product", "triage", "ai-classification", "roadmap", "prioritization"],
        required_integrations: ["intercom", "linear", "notion", "slack"],
        featured: true,
        definition: {
            name: "Feature Request Triage & Roadmap Sync",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Feature Request",
                        triggerType: "webhook",
                        webhookProvider: "intercom",
                        description: "Triggered when new feature request is submitted"
                    }
                },
                {
                    id: "integration-intercom",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Request Details",
                        provider: "intercom",
                        operation: "getConversation"
                    }
                },
                {
                    id: "llm-classify",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Classify Request Type",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this feature request and classify it:\n\n{{intercomConversation}}\n\nClassify as: bug, feature, improvement, or question. Also identify the product area (e.g., dashboard, api, integrations, billing).",
                        outputVariable: "classification"
                    }
                },
                {
                    id: "llm-priority",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Assess Priority",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on this classified request:\n\n{{classification.text}}\n\nAssess priority (P0-Critical, P1-High, P2-Medium, P3-Low) considering: user impact, frequency of request, alignment with product strategy, implementation complexity.",
                        outputVariable: "priority"
                    }
                },
                {
                    id: "integration-linear-search",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check for Duplicates",
                        provider: "linear",
                        operation: "searchIssues"
                    }
                },
                {
                    id: "llm-dedupe",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Duplicates",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Compare this new request:\n{{classification.text}}\n\nWith existing issues:\n{{linearIssues}}\n\nIs this a duplicate? If yes, which issue ID? If no, explain why it's unique.",
                        outputVariable: "dupeCheck"
                    }
                },
                {
                    id: "router-priority",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Priority",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on the priority assessment:\n{{priority.text}}\n\nRoute to appropriate handling.",
                        routes: [
                            {
                                value: "critical",
                                label: "P0 Critical",
                                description: "Immediate attention required"
                            },
                            {
                                value: "high",
                                label: "P1 High",
                                description: "Schedule for next sprint"
                            },
                            {
                                value: "normal",
                                label: "P2/P3 Normal",
                                description: "Add to backlog"
                            }
                        ],
                        defaultRoute: "normal",
                        outputVariable: "routeDecision"
                    }
                },
                {
                    id: "integration-linear-create",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Linear Issue",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Roadmap",
                        provider: "notion",
                        operation: "createPage",
                        database: "Product Roadmap"
                    }
                },
                {
                    id: "llm-response",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Acknowledgment",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a friendly acknowledgment message for this feature request. Include:\n- Thank the user\n- Confirm we received their request\n- Explain next steps based on priority: {{priority.text}}\n- Provide the tracking ID: {{linearIssue.id}}",
                        outputVariable: "acknowledgment"
                    }
                },
                {
                    id: "integration-intercom-reply",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Acknowledgment",
                        provider: "intercom",
                        operation: "replyToConversation"
                    }
                },
                {
                    id: "integration-slack-critical",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Team (Critical)",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#product-alerts"
                    }
                },
                {
                    id: "integration-slack-notify",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify PM",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#product-requests"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Triage Complete",
                        outputName: "result",
                        value: "{{linearIssue}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-intercom" },
                { id: "e2", source: "integration-intercom", target: "llm-classify" },
                { id: "e3", source: "llm-classify", target: "llm-priority" },
                { id: "e4", source: "llm-priority", target: "integration-linear-search" },
                { id: "e5", source: "integration-linear-search", target: "llm-dedupe" },
                { id: "e6", source: "llm-dedupe", target: "router-priority" },
                {
                    id: "e7",
                    source: "router-priority",
                    target: "integration-slack-critical",
                    sourceHandle: "critical"
                },
                {
                    id: "e8",
                    source: "router-priority",
                    target: "integration-linear-create",
                    sourceHandle: "high"
                },
                {
                    id: "e9",
                    source: "router-priority",
                    target: "integration-linear-create",
                    sourceHandle: "normal"
                },
                {
                    id: "e10",
                    source: "integration-slack-critical",
                    target: "integration-linear-create"
                },
                { id: "e11", source: "integration-linear-create", target: "integration-notion" },
                { id: "e12", source: "integration-notion", target: "llm-response" },
                { id: "e13", source: "llm-response", target: "integration-intercom-reply" },
                {
                    id: "e14",
                    source: "integration-intercom-reply",
                    target: "integration-slack-notify"
                },
                { id: "e15", source: "integration-slack-notify", target: "output-1" }
            ]
        }
    },

    // Product Management 2: Release Notes Generator (15 nodes)
    {
        name: "Release Notes Generator",
        description:
            "Automatically generate user-friendly release notes from merged PRs and issues, create multi-channel announcements for GitHub, Notion, email newsletters, and social media.",
        category: "engineering",
        tags: ["release", "changelog", "automation", "multi-channel", "documentation"],
        required_integrations: ["github", "notion", "mailchimp", "slack"],
        featured: false,
        definition: {
            name: "Release Notes Generator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Release Tagged",
                        triggerType: "webhook",
                        webhookProvider: "github",
                        description: "Triggered when new release is created"
                    }
                },
                {
                    id: "integration-github-prs",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Merged PRs",
                        provider: "github",
                        operation: "listPullRequests"
                    }
                },
                {
                    id: "integration-github-issues",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Linked Issues",
                        provider: "github",
                        operation: "listIssues"
                    }
                },
                {
                    id: "llm-categorize",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Categorize Changes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze these PRs and issues:\n\nPRs: {{githubPRs}}\nIssues: {{githubIssues}}\n\nCategorize each change as: New Features, Improvements, Bug Fixes, Breaking Changes, or Documentation. Group by category.",
                        outputVariable: "categorizedChanges"
                    }
                },
                {
                    id: "llm-release-notes",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Write Release Notes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create user-friendly release notes from:\n\n{{categorizedChanges.text}}\n\nWrite in a clear, engaging style. Focus on user benefits, not implementation details. Include emojis for visual appeal.",
                        outputVariable: "releaseNotes"
                    }
                },
                {
                    id: "llm-tweet-thread",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Tweet Thread",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a Twitter thread (5-7 tweets) announcing this release:\n\n{{releaseNotes.text}}\n\nMake it engaging, highlight top features, include relevant hashtags.",
                        outputVariable: "tweetThread"
                    }
                },
                {
                    id: "llm-email-snippet",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Email Snippet",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an email newsletter section for this release:\n\n{{releaseNotes.text}}\n\nKeep it concise (150-200 words), focus on key highlights.",
                        outputVariable: "emailSnippet"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Content",
                        reviewPrompt:
                            "Review release notes and announcements for accuracy and tone before publishing",
                        outputVariable: "approvedContent"
                    }
                },
                {
                    id: "integration-github-release",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update GitHub Release",
                        provider: "github",
                        operation: "updateRelease"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add to Changelog",
                        provider: "notion",
                        operation: "createPage",
                        database: "Changelog"
                    }
                },
                {
                    id: "integration-mailchimp",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Queue Newsletter",
                        provider: "mailchimp",
                        operation: "createCampaign"
                    }
                },
                {
                    id: "integration-buffer",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Social Posts",
                        provider: "buffer",
                        operation: "createUpdate"
                    }
                },
                {
                    id: "transform-summary",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Summary",
                        transformType: "template",
                        template:
                            "Release {{trigger.tag}} published to: GitHub, Notion, Email, Social",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#releases"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Release Published",
                        outputName: "result",
                        value: "{{summary}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-github-prs" },
                { id: "e2", source: "trigger-1", target: "integration-github-issues" },
                { id: "e3", source: "integration-github-prs", target: "llm-categorize" },
                { id: "e4", source: "integration-github-issues", target: "llm-categorize" },
                { id: "e5", source: "llm-categorize", target: "llm-release-notes" },
                { id: "e6", source: "llm-release-notes", target: "llm-tweet-thread" },
                { id: "e7", source: "llm-release-notes", target: "llm-email-snippet" },
                { id: "e8", source: "llm-tweet-thread", target: "humanReview-1" },
                { id: "e9", source: "llm-email-snippet", target: "humanReview-1" },
                { id: "e10", source: "humanReview-1", target: "integration-github-release" },
                { id: "e11", source: "humanReview-1", target: "integration-notion" },
                { id: "e12", source: "humanReview-1", target: "integration-mailchimp" },
                { id: "e13", source: "humanReview-1", target: "integration-buffer" },
                { id: "e14", source: "integration-github-release", target: "transform-summary" },
                { id: "e15", source: "integration-notion", target: "transform-summary" },
                { id: "e16", source: "integration-mailchimp", target: "transform-summary" },
                { id: "e17", source: "integration-buffer", target: "transform-summary" },
                { id: "e18", source: "transform-summary", target: "integration-slack" },
                { id: "e19", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Product Management 3: User Feedback Aggregator (18 nodes)
    {
        name: "User Feedback Aggregator",
        description:
            "Collect feedback from multiple sources (support tickets, NPS, reviews, social), analyze sentiment and themes with AI, identify actionable insights, and generate weekly product intelligence reports.",
        category: "engineering",
        tags: ["feedback", "sentiment", "aggregation", "insights", "product-intelligence"],
        required_integrations: ["intercom", "typeform", "zendesk", "notion", "slack"],
        featured: true,
        definition: {
            name: "User Feedback Aggregator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Weekly Schedule",
                        triggerType: "schedule",
                        schedule: "0 9 * * 1",
                        description: "Every Monday at 9am"
                    }
                },
                {
                    id: "integration-intercom",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Intercom Conversations",
                        provider: "intercom",
                        operation: "listConversations"
                    }
                },
                {
                    id: "integration-typeform",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch NPS Responses",
                        provider: "typeform",
                        operation: "getResponses"
                    }
                },
                {
                    id: "integration-zendesk",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Support Tickets",
                        provider: "zendesk",
                        operation: "listTickets"
                    }
                },
                {
                    id: "integration-twitter",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Twitter Mentions",
                        provider: "twitter",
                        operation: "searchTweets"
                    }
                },
                {
                    id: "transform-normalize",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Normalize Feedback",
                        transformType: "template",
                        template:
                            '{"intercom": {{intercomConversations}}, "nps": {{typeformResponses}}, "support": {{zendeskTickets}}, "social": {{twitterMentions}}}',
                        outputVariable: "allFeedback"
                    }
                },
                {
                    id: "llm-sentiment",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Sentiment",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze sentiment across all feedback sources:\n\n{{allFeedback}}\n\nFor each piece of feedback, classify as: positive, neutral, negative. Calculate overall sentiment score (-1 to 1).",
                        outputVariable: "sentiment"
                    }
                },
                {
                    id: "llm-themes",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Themes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Identify recurring themes from this feedback:\n\n{{allFeedback}}\n\nGroup into: Feature Requests, Pain Points, Praise, Questions. Count frequency of each theme.",
                        outputVariable: "themes"
                    }
                },
                {
                    id: "llm-issues",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Identify Top Issues",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on themes and sentiment:\n\nThemes: {{themes.text}}\nSentiment: {{sentiment.text}}\n\nIdentify the top 5 issues requiring immediate attention. Rank by impact and frequency.",
                        outputVariable: "topIssues"
                    }
                },
                {
                    id: "llm-insights",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Insights",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create actionable product insights from:\n\nTop Issues: {{topIssues.text}}\nThemes: {{themes.text}}\nSentiment: {{sentiment.text}}\n\nProvide specific recommendations with expected impact.",
                        outputVariable: "insights"
                    }
                },
                {
                    id: "router-urgency",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Urgency",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on the top issues:\n{{topIssues.text}}\n\nAre there any critical issues requiring immediate action?",
                        routes: [
                            {
                                value: "urgent",
                                label: "Urgent Issues",
                                description: "Critical issues found"
                            },
                            { value: "normal", label: "Normal", description: "No critical issues" }
                        ],
                        defaultRoute: "normal",
                        outputVariable: "urgencyDecision"
                    }
                },
                {
                    id: "integration-linear",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Action Items",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "llm-report",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Report",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a weekly product intelligence report:\n\nSentiment: {{sentiment.text}}\nThemes: {{themes.text}}\nTop Issues: {{topIssues.text}}\nInsights: {{insights.text}}\n\nFormat as executive summary with key metrics and recommendations.",
                        outputVariable: "report"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save Report",
                        provider: "notion",
                        operation: "createPage",
                        database: "Product Insights"
                    }
                },
                {
                    id: "integration-slack-urgent",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Team (Urgent)",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#product-alerts"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Report",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Weekly Digest",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#product"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analysis Complete",
                        outputName: "report",
                        value: "{{report}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-intercom" },
                { id: "e2", source: "trigger-1", target: "integration-typeform" },
                { id: "e3", source: "trigger-1", target: "integration-zendesk" },
                { id: "e4", source: "trigger-1", target: "integration-twitter" },
                { id: "e5", source: "integration-intercom", target: "transform-normalize" },
                { id: "e6", source: "integration-typeform", target: "transform-normalize" },
                { id: "e7", source: "integration-zendesk", target: "transform-normalize" },
                { id: "e8", source: "integration-twitter", target: "transform-normalize" },
                { id: "e9", source: "transform-normalize", target: "llm-sentiment" },
                { id: "e10", source: "transform-normalize", target: "llm-themes" },
                { id: "e11", source: "llm-sentiment", target: "llm-issues" },
                { id: "e12", source: "llm-themes", target: "llm-issues" },
                { id: "e13", source: "llm-issues", target: "llm-insights" },
                { id: "e14", source: "llm-insights", target: "router-urgency" },
                {
                    id: "e15",
                    source: "router-urgency",
                    target: "integration-slack-urgent",
                    sourceHandle: "urgent"
                },
                {
                    id: "e16",
                    source: "router-urgency",
                    target: "llm-report",
                    sourceHandle: "normal"
                },
                { id: "e17", source: "integration-slack-urgent", target: "integration-linear" },
                { id: "e18", source: "integration-linear", target: "llm-report" },
                { id: "e19", source: "llm-report", target: "integration-notion" },
                { id: "e20", source: "integration-notion", target: "integration-gmail" },
                { id: "e21", source: "integration-gmail", target: "integration-slack" },
                { id: "e22", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // ADDITIONAL MARKETING TEMPLATES (3 templates)
    // ========================================================================

    // Marketing: Email Drip Campaign Orchestrator (12 nodes)
    {
        name: "Email Drip Campaign Orchestrator",
        description:
            "Design and execute multi-stage email nurture sequences with behavioral triggers. Track opens, clicks, and conversions to automatically adjust send timing and content.",
        category: "marketing",
        tags: ["email", "drip-campaign", "nurture", "automation", "behavioral"],
        required_integrations: ["mailchimp", "hubspot", "slack"],
        featured: true,
        definition: {
            name: "Email Drip Campaign Orchestrator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Subscriber",
                        triggerType: "webhook",
                        webhookProvider: "mailchimp",
                        description: "Triggered when new subscriber joins list"
                    }
                },
                {
                    id: "integration-hubspot-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Enrich Contact",
                        provider: "hubspot",
                        operation: "getContact"
                    }
                },
                {
                    id: "llm-segment",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Segment Subscriber",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on this subscriber data:\n\n{{hubspotContact}}\n\nClassify into segment: enterprise, smb, startup, or individual. Consider company size, industry, and role.",
                        outputVariable: "segment"
                    }
                },
                {
                    id: "router-1",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Segment",
                        routerType: "llm",
                        routes: ["enterprise", "smb", "startup", "individual"],
                        outputVariable: "selectedRoute"
                    }
                },
                {
                    id: "llm-email-1",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Welcome Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write a personalized welcome email for a {{segment.text}} subscriber. Include their name, acknowledge their industry, and provide relevant value proposition.",
                        outputVariable: "welcomeEmail"
                    }
                },
                {
                    id: "integration-mailchimp-1",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Welcome Email",
                        provider: "mailchimp",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait 3 Days",
                        waitType: "duration",
                        duration: 259200,
                        outputVariable: "waitComplete"
                    }
                },
                {
                    id: "integration-mailchimp-check",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Engagement",
                        provider: "mailchimp",
                        operation: "getCampaignReport"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Opened Email?",
                        condition: "engagement.opened === true",
                        outputVariable: "engagementCheck"
                    }
                },
                {
                    id: "llm-email-2",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Follow-up",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write a follow-up email for an engaged subscriber. Reference the welcome email, provide a case study or success story, include a soft CTA.",
                        outputVariable: "followupEmail"
                    }
                },
                {
                    id: "integration-mailchimp-2",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Follow-up",
                        provider: "mailchimp",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Campaign Progress",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#marketing-automation"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot-get" },
                { id: "e2", source: "integration-hubspot-get", target: "llm-segment" },
                { id: "e3", source: "llm-segment", target: "router-1" },
                { id: "e4", source: "router-1", target: "llm-email-1", sourceHandle: "enterprise" },
                { id: "e5", source: "router-1", target: "llm-email-1", sourceHandle: "smb" },
                { id: "e6", source: "router-1", target: "llm-email-1", sourceHandle: "startup" },
                { id: "e7", source: "router-1", target: "llm-email-1", sourceHandle: "individual" },
                { id: "e8", source: "llm-email-1", target: "integration-mailchimp-1" },
                { id: "e9", source: "integration-mailchimp-1", target: "wait-1" },
                { id: "e10", source: "wait-1", target: "integration-mailchimp-check" },
                { id: "e11", source: "integration-mailchimp-check", target: "conditional-1" },
                { id: "e12", source: "conditional-1", target: "llm-email-2", sourceHandle: "true" },
                {
                    id: "e13",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "false"
                },
                { id: "e14", source: "llm-email-2", target: "integration-mailchimp-2" },
                { id: "e15", source: "integration-mailchimp-2", target: "integration-slack" }
            ]
        }
    },

    // Marketing: Webinar Promotion Pipeline (11 nodes)
    {
        name: "Webinar Promotion Pipeline",
        description:
            "Automate webinar promotion from announcement to follow-up. Create event pages, schedule promotional emails, social posts, and reminder sequences with registration tracking.",
        category: "marketing",
        tags: ["webinar", "events", "promotion", "registration", "automation"],
        required_integrations: ["hubspot", "zoom", "mailchimp", "slack"],
        featured: false,
        definition: {
            name: "Webinar Promotion Pipeline",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Webinar Details",
                        inputName: "webinarDetails",
                        inputVariable: "webinarDetails",
                        inputType: "text",
                        description: "Topic, date, speakers, and key takeaways"
                    }
                },
                {
                    id: "integration-zoom",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Zoom Webinar",
                        provider: "zoom",
                        operation: "createMeeting"
                    }
                },
                {
                    id: "llm-promo",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Promo Content",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create promotional content for this webinar:\n\n{{webinarDetails}}\n\nGenerate: email invitation, 3 social posts (LinkedIn, Twitter, Facebook), and landing page copy.",
                        outputVariable: "promoContent"
                    }
                },
                {
                    id: "integration-hubspot-page",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Landing Page",
                        provider: "hubspot",
                        operation: "createLandingPage"
                    }
                },
                {
                    id: "integration-mailchimp-announce",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Announcement",
                        provider: "mailchimp",
                        operation: "createCampaign"
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait Until 1 Day Before",
                        waitType: "duration",
                        duration: 518400,
                        outputVariable: "reminderTime"
                    }
                },
                {
                    id: "integration-hubspot-registrants",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Registrants",
                        provider: "hubspot",
                        operation: "listContacts"
                    }
                },
                {
                    id: "llm-reminder",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Reminder",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Write a webinar reminder email for tomorrow. Include: what they'll learn, speaker bio snippet, calendar add link, and dial-in details.",
                        outputVariable: "reminderEmail"
                    }
                },
                {
                    id: "integration-mailchimp-remind",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Reminders",
                        provider: "mailchimp",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#marketing"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Promotion Complete",
                        outputName: "result",
                        value: "Webinar promotion pipeline executed"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "integration-zoom" },
                { id: "e2", source: "integration-zoom", target: "llm-promo" },
                { id: "e3", source: "llm-promo", target: "integration-hubspot-page" },
                { id: "e4", source: "llm-promo", target: "integration-mailchimp-announce" },
                { id: "e5", source: "integration-hubspot-page", target: "wait-1" },
                { id: "e6", source: "integration-mailchimp-announce", target: "wait-1" },
                { id: "e7", source: "wait-1", target: "integration-hubspot-registrants" },
                { id: "e8", source: "integration-hubspot-registrants", target: "llm-reminder" },
                { id: "e9", source: "llm-reminder", target: "integration-mailchimp-remind" },
                { id: "e10", source: "integration-mailchimp-remind", target: "integration-slack" },
                { id: "e11", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Marketing 3: SEO Content Optimizer (15 nodes)
    {
        name: "SEO Content Optimizer",
        description:
            "Analyze existing blog posts for SEO performance, compare against competitors, generate optimization suggestions, and track improvements over time.",
        category: "marketing",
        tags: ["seo", "content-optimization", "analytics", "competitive-analysis"],
        required_integrations: ["wordpress", "google-sheets", "slack"],
        featured: false,
        definition: {
            name: "SEO Content Optimizer",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Blog Post URL",
                        inputName: "postUrl",
                        inputVariable: "postUrl",
                        inputType: "text",
                        description: "URL of the blog post to optimize"
                    }
                },
                {
                    id: "url-content",
                    type: "url",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Current Content",
                        urlVariable: "postUrl",
                        outputVariable: "currentContent"
                    }
                },
                {
                    id: "integration-sheets-rankings",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Search Rankings",
                        provider: "google-sheets",
                        operation: "getValues"
                    }
                },
                {
                    id: "llm-extract-keywords",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Target Keywords",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this content and identify:\n\n{{currentContent}}\n\n1. Primary keyword\n2. Secondary keywords (3-5)\n3. Long-tail keyword opportunities\n4. Current keyword density",
                        outputVariable: "keywords"
                    }
                },
                {
                    id: "url-competitor",
                    type: "url",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Competitor Content",
                        urlVariable: "competitorUrls",
                        outputVariable: "competitorContent"
                    }
                },
                {
                    id: "llm-gap-analysis",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Content Gap Analysis",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Compare our content:\n{{currentContent}}\n\nWith competitor content:\n{{competitorContent}}\n\nIdentify: content gaps, missing topics, unique angles competitors have, opportunities to differentiate.",
                        outputVariable: "gapAnalysis"
                    }
                },
                {
                    id: "llm-title-meta",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Optimize Title & Meta",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on keywords and gap analysis:\n\nKeywords: {{keywords.text}}\nGaps: {{gapAnalysis.text}}\n\nGenerate 3 optimized title options (max 60 chars) and 3 meta descriptions (max 155 chars) that improve CTR.",
                        outputVariable: "titleMeta"
                    }
                },
                {
                    id: "llm-content-suggestions",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Content Additions",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on gap analysis:\n{{gapAnalysis.text}}\n\nSuggest specific content additions:\n1. New sections to add\n2. Questions to answer\n3. Examples to include\n4. Internal/external linking opportunities",
                        outputVariable: "contentSuggestions"
                    }
                },
                {
                    id: "llm-impact",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Calculate Impact Score",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Estimate the potential ranking improvement from implementing these changes:\n\nTitle/Meta: {{titleMeta.text}}\nContent: {{contentSuggestions.text}}\n\nProvide: impact score (1-10), estimated ranking improvement, effort required.",
                        outputVariable: "impactScore"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Suggestions",
                        reviewPrompt: "Review SEO optimization suggestions before implementing",
                        outputVariable: "approvedChanges"
                    }
                },
                {
                    id: "conditional-approved",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Changes Approved?",
                        condition: "approvedChanges.approved === true",
                        outputVariable: "isApproved"
                    }
                },
                {
                    id: "integration-wordpress",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update WordPress",
                        provider: "wordpress",
                        operation: "updatePost"
                    }
                },
                {
                    id: "integration-sheets-log",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Optimization",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#content"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Optimization Report",
                        outputName: "result",
                        value: "{{impactScore}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "url-content" },
                { id: "e2", source: "input-1", target: "integration-sheets-rankings" },
                { id: "e3", source: "url-content", target: "llm-extract-keywords" },
                { id: "e4", source: "llm-extract-keywords", target: "url-competitor" },
                { id: "e5", source: "url-competitor", target: "llm-gap-analysis" },
                { id: "e6", source: "llm-gap-analysis", target: "llm-title-meta" },
                { id: "e7", source: "llm-gap-analysis", target: "llm-content-suggestions" },
                { id: "e8", source: "llm-title-meta", target: "llm-impact" },
                { id: "e9", source: "llm-content-suggestions", target: "llm-impact" },
                { id: "e10", source: "llm-impact", target: "humanReview-1" },
                { id: "e11", source: "humanReview-1", target: "conditional-approved" },
                {
                    id: "e12",
                    source: "conditional-approved",
                    target: "integration-wordpress",
                    sourceHandle: "true"
                },
                {
                    id: "e13",
                    source: "conditional-approved",
                    target: "integration-sheets-log",
                    sourceHandle: "false"
                },
                { id: "e14", source: "integration-wordpress", target: "integration-sheets-log" },
                { id: "e15", source: "integration-sheets-log", target: "integration-slack" },
                { id: "e16", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // ADDITIONAL E-COMMERCE TEMPLATES (3 templates)
    // ========================================================================

    // E-commerce: Returns & Refunds Processor (14 nodes)
    {
        name: "Returns & Refunds Processor",
        description:
            "Automate return requests from submission to resolution. AI assesses return eligibility, routes to appropriate handling, processes refunds, and updates inventory.",
        category: "ecommerce",
        tags: ["returns", "refunds", "customer-service", "automation", "inventory"],
        required_integrations: ["shopify", "stripe", "zendesk", "slack"],
        featured: true,
        definition: {
            name: "Returns & Refunds Processor",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Return Request",
                        triggerType: "webhook",
                        webhookProvider: "shopify",
                        description: "Triggered when customer submits return request"
                    }
                },
                {
                    id: "integration-shopify-order",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Order Details",
                        provider: "shopify",
                        operation: "getOrder"
                    }
                },
                {
                    id: "llm-assess",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Assess Return Eligibility",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Assess this return request:\n\nOrder: {{orderDetails}}\nReturn reason: {{trigger.reason}}\nDays since delivery: {{trigger.daysSinceDelivery}}\n\nDetermine: eligible (within policy), review_needed (edge case), or denied (outside policy).",
                        outputVariable: "assessment"
                    }
                },
                {
                    id: "router-1",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Eligibility",
                        routerType: "llm",
                        routes: ["eligible", "review_needed", "denied"],
                        outputVariable: "returnRoute"
                    }
                },
                {
                    id: "integration-stripe-refund",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Process Refund",
                        provider: "stripe",
                        operation: "createRefund"
                    }
                },
                {
                    id: "integration-shopify-inventory",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Inventory",
                        provider: "shopify",
                        operation: "updateInventory"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Manager Review",
                        reviewPrompt:
                            "Review this edge case return request and decide: approve or deny",
                        outputVariable: "managerDecision"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Approved?",
                        condition: "managerDecision.approved === true",
                        outputVariable: "approvalCheck"
                    }
                },
                {
                    id: "llm-denial",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Denial Email",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Write a polite denial email explaining why this return was not approved. Reference the return policy and offer alternatives like store credit.",
                        outputVariable: "denialEmail"
                    }
                },
                {
                    id: "llm-approval",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Approval Email",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Write a return approval email with: confirmation of refund, return shipping instructions, and timeline for refund processing.",
                        outputVariable: "approvalEmail"
                    }
                },
                {
                    id: "integration-zendesk-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Support Ticket",
                        provider: "zendesk",
                        operation: "updateTicket"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Returns Channel",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#returns"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Return Processed",
                        outputName: "result",
                        value: "Return request handled"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-shopify-order" },
                { id: "e2", source: "integration-shopify-order", target: "llm-assess" },
                { id: "e3", source: "llm-assess", target: "router-1" },
                {
                    id: "e4",
                    source: "router-1",
                    target: "integration-stripe-refund",
                    sourceHandle: "eligible"
                },
                {
                    id: "e5",
                    source: "router-1",
                    target: "humanReview-1",
                    sourceHandle: "review_needed"
                },
                { id: "e6", source: "router-1", target: "llm-denial", sourceHandle: "denied" },
                {
                    id: "e7",
                    source: "integration-stripe-refund",
                    target: "integration-shopify-inventory"
                },
                { id: "e8", source: "integration-shopify-inventory", target: "llm-approval" },
                { id: "e9", source: "humanReview-1", target: "conditional-1" },
                {
                    id: "e10",
                    source: "conditional-1",
                    target: "integration-stripe-refund",
                    sourceHandle: "true"
                },
                { id: "e11", source: "conditional-1", target: "llm-denial", sourceHandle: "false" },
                { id: "e12", source: "llm-approval", target: "integration-zendesk-update" },
                { id: "e13", source: "llm-denial", target: "integration-zendesk-update" },
                { id: "e14", source: "integration-zendesk-update", target: "integration-slack" },
                { id: "e15", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // E-commerce: Product Launch Coordinator (13 nodes)
    {
        name: "Product Launch Coordinator",
        description:
            "Orchestrate new product launches across all channels. Coordinate inventory setup, marketing assets, email announcements, social media campaigns, and sales team enablement.",
        category: "ecommerce",
        tags: ["product-launch", "coordination", "marketing", "multi-channel"],
        required_integrations: ["shopify", "mailchimp", "slack", "airtable"],
        featured: false,
        definition: {
            name: "Product Launch Coordinator",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Product Launch Brief",
                        inputName: "launchBrief",
                        inputVariable: "launchBrief",
                        inputType: "text",
                        description: "Product name, launch date, key features, target audience"
                    }
                },
                {
                    id: "integration-shopify-product",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Product Listing",
                        provider: "shopify",
                        operation: "createProduct"
                    }
                },
                {
                    id: "llm-marketing",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Marketing Copy",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create launch marketing materials for:\n\n{{launchBrief}}\n\nGenerate: product description, email announcement, 5 social posts, and press release outline.",
                        outputVariable: "marketingCopy"
                    }
                },
                {
                    id: "integration-airtable-checklist",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Launch Checklist",
                        provider: "airtable",
                        operation: "createRecord"
                    }
                },
                {
                    id: "integration-mailchimp-teaser",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Teaser Email",
                        provider: "mailchimp",
                        operation: "createCampaign"
                    }
                },
                {
                    id: "integration-slack-sales",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Brief Sales Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#sales"
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait for Launch Date",
                        waitType: "until",
                        outputVariable: "launchTime"
                    }
                },
                {
                    id: "integration-shopify-publish",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Publish Product",
                        provider: "shopify",
                        operation: "updateProduct"
                    }
                },
                {
                    id: "integration-mailchimp-launch",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Launch Email",
                        provider: "mailchimp",
                        operation: "sendCampaign"
                    }
                },
                {
                    id: "integration-slack-announce",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Announce Internally",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#general"
                    }
                },
                {
                    id: "integration-airtable-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Launch Status",
                        provider: "airtable",
                        operation: "updateRecord"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Launch Complete",
                        outputName: "result",
                        value: "Product launch executed successfully"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "integration-shopify-product" },
                { id: "e2", source: "integration-shopify-product", target: "llm-marketing" },
                { id: "e3", source: "llm-marketing", target: "integration-airtable-checklist" },
                { id: "e4", source: "llm-marketing", target: "integration-mailchimp-teaser" },
                { id: "e5", source: "llm-marketing", target: "integration-slack-sales" },
                { id: "e6", source: "integration-airtable-checklist", target: "wait-1" },
                { id: "e7", source: "integration-mailchimp-teaser", target: "wait-1" },
                { id: "e8", source: "integration-slack-sales", target: "wait-1" },
                { id: "e9", source: "wait-1", target: "integration-shopify-publish" },
                {
                    id: "e10",
                    source: "integration-shopify-publish",
                    target: "integration-mailchimp-launch"
                },
                {
                    id: "e11",
                    source: "integration-shopify-publish",
                    target: "integration-slack-announce"
                },
                {
                    id: "e12",
                    source: "integration-mailchimp-launch",
                    target: "integration-airtable-update"
                },
                {
                    id: "e13",
                    source: "integration-slack-announce",
                    target: "integration-airtable-update"
                },
                { id: "e14", source: "integration-airtable-update", target: "output-1" }
            ]
        }
    },

    // E-commerce: Supplier Order Automation (15 nodes - with parallel data, order size routing, parallel actions)
    {
        name: "Supplier Order Automation",
        description:
            "Automate purchase orders to suppliers based on inventory levels. Generate POs, send to suppliers, track confirmations, and update expected delivery dates.",
        category: "ecommerce",
        tags: ["supplier", "purchase-orders", "inventory", "automation", "procurement"],
        required_integrations: ["shopify", "airtable", "gmail", "slack"],
        featured: false,
        definition: {
            name: "Supplier Order Automation",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Low Inventory Alert",
                        triggerType: "webhook",
                        webhookProvider: "shopify",
                        description: "Triggered when inventory falls below threshold"
                    }
                },
                // Parallel data fetching
                {
                    id: "integration-shopify-product",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Product Details",
                        provider: "shopify",
                        operation: "getProduct"
                    }
                },
                {
                    id: "integration-airtable-supplier",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Lookup Supplier",
                        provider: "airtable",
                        operation: "getRecord"
                    }
                },
                {
                    id: "integration-airtable-pricing",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Pricing Tiers",
                        provider: "airtable",
                        operation: "listRecords"
                    }
                },
                {
                    id: "transform-merge",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Merge Order Data",
                        transformType: "merge",
                        outputVariable: "orderContext"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Order",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze reorder requirements:\n\n{{orderContext}}\n\nCalculate optimal quantity, determine order size (standard/bulk/expedited), apply volume discounts.",
                        outputVariable: "orderAnalysis"
                    }
                },
                {
                    id: "router-size",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Order Size",
                        routerType: "llm",
                        routes: ["standard", "bulk", "expedited"],
                        prompt: "Based on {{orderAnalysis.text}}, select the appropriate order type."
                    }
                },
                // Standard order path
                {
                    id: "llm-standard",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Standard PO",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Generate standard purchase order:\n\n{{orderAnalysis.text}}\n\nInclude: standard terms, regular lead time, normal pricing.",
                        outputVariable: "standardPO"
                    }
                },
                // Bulk order path
                {
                    id: "llm-bulk",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Bulk PO",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Generate bulk purchase order:\n\n{{orderAnalysis.text}}\n\nInclude: volume discount, extended lead time acceptable, bulk pricing tier.",
                        outputVariable: "bulkPO"
                    }
                },
                // Expedited order path
                {
                    id: "llm-expedited",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Expedited PO",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Generate expedited purchase order:\n\n{{orderAnalysis.text}}\n\nInclude: rush processing, express shipping, expedite fees.",
                        outputVariable: "expeditedPO"
                    }
                },
                {
                    id: "transform-compile",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile PO",
                        transformType: "merge",
                        outputVariable: "finalPO"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Approve PO",
                        reviewPrompt:
                            "Review and approve this purchase order before sending to supplier",
                        outputVariable: "poApproval"
                    }
                },
                // Parallel actions after approval
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send to Supplier",
                        provider: "gmail",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "integration-airtable-create",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create PO Record",
                        provider: "airtable",
                        operation: "createRecord"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Procurement",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#procurement"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "PO Submitted",
                        outputName: "result",
                        value: "{{finalPO}}"
                    }
                }
            ],
            edges: [
                // Parallel data fetching
                { id: "e1", source: "trigger-1", target: "integration-shopify-product" },
                { id: "e2", source: "trigger-1", target: "integration-airtable-supplier" },
                { id: "e3", source: "trigger-1", target: "integration-airtable-pricing" },
                // Fan-in to merge
                { id: "e4", source: "integration-shopify-product", target: "transform-merge" },
                { id: "e5", source: "integration-airtable-supplier", target: "transform-merge" },
                { id: "e6", source: "integration-airtable-pricing", target: "transform-merge" },
                // Analysis and routing
                { id: "e7", source: "transform-merge", target: "llm-analyze" },
                { id: "e8", source: "llm-analyze", target: "router-size" },
                // Fan-out by order size
                {
                    id: "e9",
                    source: "router-size",
                    target: "llm-standard",
                    sourceHandle: "standard"
                },
                { id: "e10", source: "router-size", target: "llm-bulk", sourceHandle: "bulk" },
                {
                    id: "e11",
                    source: "router-size",
                    target: "llm-expedited",
                    sourceHandle: "expedited"
                },
                // Fan-in to compile
                { id: "e12", source: "llm-standard", target: "transform-compile" },
                { id: "e13", source: "llm-bulk", target: "transform-compile" },
                { id: "e14", source: "llm-expedited", target: "transform-compile" },
                // Human review
                { id: "e15", source: "transform-compile", target: "humanReview-1" },
                // Parallel actions after approval
                { id: "e16", source: "humanReview-1", target: "integration-gmail" },
                { id: "e17", source: "humanReview-1", target: "integration-airtable-create" },
                { id: "e18", source: "humanReview-1", target: "integration-slack" },
                // Fan-in to output
                { id: "e19", source: "integration-gmail", target: "output-1" },
                { id: "e20", source: "integration-airtable-create", target: "output-1" },
                { id: "e21", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // SCHEDULED WORKFLOWS (3 templates)
    // ========================================================================

    // Scheduled 1: Weekly Performance Digest (14 nodes)
    {
        name: "Weekly Performance Digest",
        description:
            "Every Monday, automatically aggregate metrics from analytics, revenue, support, and engineering. Generate an executive summary with AI narrative and distribute to leadership.",
        category: "operations",
        tags: ["reporting", "metrics", "automation", "executive-summary", "scheduled"],
        required_integrations: ["mixpanel", "stripe", "zendesk", "github", "gmail", "google-drive"],
        featured: true,
        definition: {
            name: "Weekly Performance Digest",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Monday 9am",
                        triggerType: "schedule",
                        schedule: "0 9 * * 1",
                        description: "Runs every Monday at 9am"
                    }
                },
                {
                    id: "integration-mixpanel",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Usage Metrics",
                        provider: "mixpanel",
                        operation: "queryEvents"
                    }
                },
                {
                    id: "integration-stripe",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Revenue Data",
                        provider: "stripe",
                        operation: "listBalanceTransactions"
                    }
                },
                {
                    id: "integration-zendesk",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Support Metrics",
                        provider: "zendesk",
                        operation: "getTicketMetrics"
                    }
                },
                {
                    id: "integration-github",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Engineering Stats",
                        provider: "github",
                        operation: "listCommits"
                    }
                },
                {
                    id: "transform-aggregate",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Aggregate Metrics",
                        transformType: "template",
                        template:
                            '{"usage": {{mixpanelData}}, "revenue": {{stripeData}}, "support": {{zendeskData}}, "engineering": {{githubData}}}',
                        outputVariable: "allMetrics"
                    }
                },
                {
                    id: "llm-summarize",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Summary",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an executive summary for weekly metrics:\n\n{{allMetrics}}\n\nInclude: week-over-week comparisons, key highlights, areas of concern, recommended actions.",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "llm-narrative",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Narrative",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write a compelling narrative for leadership based on:\n\n{{summary.text}}\n\nTone: professional, insight-driven. Highlight trends and strategic implications.",
                        outputVariable: "narrative"
                    }
                },
                {
                    id: "transform-report",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Report",
                        transformType: "template",
                        template:
                            "# Weekly Performance Report\n\n{{narrative.text}}\n\n## Key Metrics\n{{summary.text}}",
                        outputVariable: "report"
                    }
                },
                {
                    id: "integration-drive",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save to Drive",
                        provider: "google-drive",
                        operation: "createFile"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Leadership",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to Slack",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#leadership"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Archive Metrics",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Digest Sent",
                        outputName: "result",
                        value: "{{report}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-mixpanel" },
                { id: "e2", source: "trigger-1", target: "integration-stripe" },
                { id: "e3", source: "trigger-1", target: "integration-zendesk" },
                { id: "e4", source: "trigger-1", target: "integration-github" },
                { id: "e5", source: "integration-mixpanel", target: "transform-aggregate" },
                { id: "e6", source: "integration-stripe", target: "transform-aggregate" },
                { id: "e7", source: "integration-zendesk", target: "transform-aggregate" },
                { id: "e8", source: "integration-github", target: "transform-aggregate" },
                { id: "e9", source: "transform-aggregate", target: "llm-summarize" },
                { id: "e10", source: "llm-summarize", target: "llm-narrative" },
                { id: "e11", source: "llm-narrative", target: "transform-report" },
                { id: "e12", source: "transform-report", target: "integration-drive" },
                { id: "e13", source: "integration-drive", target: "integration-gmail" },
                { id: "e14", source: "integration-gmail", target: "integration-slack" },
                { id: "e15", source: "integration-slack", target: "integration-sheets" },
                { id: "e16", source: "integration-sheets", target: "output-1" }
            ]
        }
    },

    // Scheduled 2: Daily Data Sync & Cleanup (12 nodes)
    {
        name: "Daily Data Sync & Cleanup",
        description:
            "Nightly synchronization between CRM and database with duplicate detection, data validation, and cleanup. Generates summary reports of sync status.",
        category: "engineering",
        tags: ["sync", "data-cleanup", "automation", "etl", "scheduled"],
        required_integrations: ["airtable", "hubspot", "slack", "datadog"],
        featured: false,
        definition: {
            name: "Daily Data Sync & Cleanup",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Nightly 2am",
                        triggerType: "schedule",
                        schedule: "0 2 * * *",
                        description: "Runs nightly at 2am"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Source Data",
                        provider: "airtable",
                        operation: "listRecords"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Target Data",
                        provider: "hubspot",
                        operation: "listContacts"
                    }
                },
                {
                    id: "llm-compare",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compare & Detect",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Compare source and target datasets:\n\nSource: {{airtableRecords}}\nTarget: {{hubspotContacts}}\n\nIdentify: new records, updates needed, duplicates to merge, orphaned records.",
                        outputVariable: "comparison"
                    }
                },
                {
                    id: "router-action",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Action",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on comparison:\n{{comparison.text}}\n\nWhat actions are needed?",
                        routes: [
                            {
                                value: "create",
                                label: "Create New",
                                description: "New records to add"
                            },
                            { value: "update", label: "Update", description: "Records to update" },
                            { value: "none", label: "No Changes", description: "Already in sync" }
                        ],
                        defaultRoute: "none",
                        outputVariable: "actionType"
                    }
                },
                {
                    id: "integration-hubspot-create",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create New Records",
                        provider: "hubspot",
                        operation: "createContact"
                    }
                },
                {
                    id: "integration-hubspot-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Records",
                        provider: "hubspot",
                        operation: "updateContact"
                    }
                },
                {
                    id: "transform-results",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Aggregate Results",
                        transformType: "template",
                        template:
                            '{"created": {{createdCount}}, "updated": {{updatedCount}}, "skipped": {{skippedCount}}}',
                        outputVariable: "syncResults"
                    }
                },
                {
                    id: "integration-datadog",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Metrics",
                        provider: "datadog",
                        operation: "submitMetrics"
                    }
                },
                {
                    id: "llm-summary",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Summary",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Create a sync summary for:\n\n{{syncResults}}\n\nFormat as brief status report with any issues flagged.",
                        outputVariable: "syncSummary"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Summary",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#data-ops"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Sync Complete",
                        outputName: "result",
                        value: "{{syncSummary}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-airtable" },
                { id: "e2", source: "trigger-1", target: "integration-hubspot" },
                { id: "e3", source: "integration-airtable", target: "llm-compare" },
                { id: "e4", source: "integration-hubspot", target: "llm-compare" },
                { id: "e5", source: "llm-compare", target: "router-action" },
                {
                    id: "e6",
                    source: "router-action",
                    target: "integration-hubspot-create",
                    sourceHandle: "create"
                },
                {
                    id: "e7",
                    source: "router-action",
                    target: "integration-hubspot-update",
                    sourceHandle: "update"
                },
                {
                    id: "e8",
                    source: "router-action",
                    target: "transform-results",
                    sourceHandle: "none"
                },
                { id: "e9", source: "integration-hubspot-create", target: "transform-results" },
                { id: "e10", source: "integration-hubspot-update", target: "transform-results" },
                { id: "e11", source: "transform-results", target: "integration-datadog" },
                { id: "e12", source: "integration-datadog", target: "llm-summary" },
                { id: "e13", source: "llm-summary", target: "integration-slack" },
                { id: "e14", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Scheduled 3: Monthly Invoice Generator (18 nodes)
    {
        name: "Monthly Invoice Generator",
        description:
            "End-of-month automated invoicing: calculate usage-based charges, apply discounts, generate professional invoices, route large invoices for review, and sync with accounting.",
        category: "operations",
        tags: ["invoicing", "billing", "automation", "accounting", "scheduled"],
        required_integrations: ["stripe", "quickbooks", "gmail", "google-docs", "slack"],
        featured: true,
        definition: {
            name: "Monthly Invoice Generator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "1st of Month",
                        triggerType: "schedule",
                        schedule: "0 6 1 * *",
                        description: "Runs 1st of every month at 6am"
                    }
                },
                {
                    id: "integration-stripe-customers",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Active Customers",
                        provider: "stripe",
                        operation: "listCustomers"
                    }
                },
                {
                    id: "integration-stripe-usage",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Usage Data",
                        provider: "stripe",
                        operation: "listUsageRecords"
                    }
                },
                {
                    id: "llm-calculate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Calculate Charges",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Calculate invoice amounts for each customer:\n\nCustomers: {{stripeCustomers}}\nUsage: {{stripeUsage}}\n\nApply: volume discounts, promotional credits, prorated adjustments.",
                        outputVariable: "charges"
                    }
                },
                {
                    id: "integration-stripe-discounts",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Apply Discounts",
                        provider: "stripe",
                        operation: "listPromotionCodes"
                    }
                },
                {
                    id: "transform-invoices",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Prepare Invoice Data",
                        transformType: "template",
                        template:
                            '{"charges": {{charges}}, "discounts": {{discounts}}, "period": "{{trigger.month}}"}',
                        outputVariable: "invoiceData"
                    }
                },
                {
                    id: "router-amount",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Amount",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "For each invoice, determine if it needs review:\n{{invoiceData}}\n\nReview if: >$10,000, first invoice, significant variance from last month.",
                        routes: [
                            {
                                value: "review",
                                label: "Needs Review",
                                description: "Large or unusual invoice"
                            },
                            { value: "auto", label: "Auto-Send", description: "Standard invoice" }
                        ],
                        defaultRoute: "auto",
                        outputVariable: "reviewRoute"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Finance Review",
                        reviewPrompt: "Review large invoice before sending",
                        outputVariable: "reviewApproval"
                    }
                },
                {
                    id: "integration-docs",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Invoice PDF",
                        provider: "google-docs",
                        operation: "createDocument"
                    }
                },
                {
                    id: "integration-stripe-invoice",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Stripe Invoice",
                        provider: "stripe",
                        operation: "createInvoice"
                    }
                },
                {
                    id: "integration-stripe-send",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Invoice",
                        provider: "stripe",
                        operation: "sendInvoice"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Customer",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-quickbooks",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Sync to QuickBooks",
                        provider: "quickbooks",
                        operation: "createInvoice"
                    }
                },
                {
                    id: "transform-summary",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Summary",
                        transformType: "template",
                        template:
                            "Monthly invoices generated: {{invoiceCount}}, Total: ${{totalAmount}}",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update AR Report",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Finance",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#finance"
                    }
                },
                {
                    id: "integration-slack-summary",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Summary",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#billing"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Invoicing Complete",
                        outputName: "result",
                        value: "{{summary}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-stripe-customers" },
                {
                    id: "e2",
                    source: "integration-stripe-customers",
                    target: "integration-stripe-usage"
                },
                { id: "e3", source: "integration-stripe-usage", target: "llm-calculate" },
                { id: "e4", source: "llm-calculate", target: "integration-stripe-discounts" },
                { id: "e5", source: "integration-stripe-discounts", target: "transform-invoices" },
                { id: "e6", source: "transform-invoices", target: "router-amount" },
                {
                    id: "e7",
                    source: "router-amount",
                    target: "humanReview-1",
                    sourceHandle: "review"
                },
                {
                    id: "e8",
                    source: "router-amount",
                    target: "integration-docs",
                    sourceHandle: "auto"
                },
                { id: "e9", source: "humanReview-1", target: "integration-docs" },
                { id: "e10", source: "integration-docs", target: "integration-stripe-invoice" },
                {
                    id: "e11",
                    source: "integration-stripe-invoice",
                    target: "integration-stripe-send"
                },
                { id: "e12", source: "integration-stripe-send", target: "integration-gmail" },
                { id: "e13", source: "integration-gmail", target: "integration-quickbooks" },
                { id: "e14", source: "integration-quickbooks", target: "transform-summary" },
                { id: "e15", source: "transform-summary", target: "integration-sheets" },
                { id: "e16", source: "integration-sheets", target: "integration-slack" },
                { id: "e17", source: "integration-slack", target: "integration-slack-summary" },
                { id: "e18", source: "integration-slack-summary", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // DOCUMENT PROCESSING (3 templates)
    // ========================================================================

    // Document 1: Smart Document Router (14 nodes)
    {
        name: "Smart Document Router",
        description:
            "AI-powered document classification that routes uploaded files to appropriate processing pipelines based on content type (invoices, contracts, resumes, receipts).",
        category: "support",
        tags: ["document-processing", "ai-classification", "routing", "automation"],
        required_integrations: ["google-drive", "airtable", "slack"],
        featured: true,
        definition: {
            name: "Smart Document Router",
            nodes: [
                {
                    id: "files-1",
                    type: "files",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Upload Document",
                        inputName: "document",
                        inputVariable: "document",
                        description: "Upload any document for classification"
                    }
                },
                {
                    id: "llm-extract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Text",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract and summarize the text content from this document:\n\n{{document}}\n\nInclude: document structure, key fields, identifiable patterns.",
                        outputVariable: "extractedText"
                    }
                },
                {
                    id: "llm-classify",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Classify Document",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Classify this document:\n\n{{extractedText.text}}\n\nCategories: invoice, contract, resume, receipt, report, correspondence, other. Provide confidence score.",
                        outputVariable: "classification"
                    }
                },
                {
                    id: "router-type",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Type",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on classification:\n{{classification.text}}\n\nRoute to appropriate handler.",
                        routes: [
                            {
                                value: "invoice",
                                label: "Invoice",
                                description: "Process as invoice"
                            },
                            {
                                value: "contract",
                                label: "Contract",
                                description: "Process as contract"
                            },
                            { value: "resume", label: "Resume", description: "Process as resume" },
                            {
                                value: "receipt",
                                label: "Receipt",
                                description: "Process as receipt"
                            },
                            { value: "other", label: "Other", description: "General document" }
                        ],
                        defaultRoute: "other",
                        outputVariable: "routeType"
                    }
                },
                {
                    id: "llm-invoice",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Invoice Fields",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract invoice fields:\n\n{{extractedText.text}}\n\nFields: vendor, invoice number, date, due date, line items, subtotal, tax, total, payment terms.",
                        outputVariable: "invoiceData"
                    }
                },
                {
                    id: "llm-contract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Contract Terms",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract contract terms:\n\n{{extractedText.text}}\n\nFields: parties, effective date, term length, key obligations, termination clauses, payment terms.",
                        outputVariable: "contractData"
                    }
                },
                {
                    id: "llm-resume",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Resume Info",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract resume information:\n\n{{extractedText.text}}\n\nFields: name, contact, summary, experience, education, skills, certifications.",
                        outputVariable: "resumeData"
                    }
                },
                {
                    id: "llm-receipt",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Receipt Items",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract receipt details:\n\n{{extractedText.text}}\n\nFields: merchant, date, items with prices, subtotal, tax, tip, total, payment method.",
                        outputVariable: "receiptData"
                    }
                },
                {
                    id: "integration-airtable-invoice",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save to Invoices",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Invoices"
                    }
                },
                {
                    id: "integration-airtable-contract",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save to Contracts",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Contracts"
                    }
                },
                {
                    id: "integration-airtable-resume",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save to Candidates",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Candidates"
                    }
                },
                {
                    id: "integration-drive",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Archive Original",
                        provider: "google-drive",
                        operation: "uploadFile"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#documents"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Processing Complete",
                        outputName: "result",
                        value: "{{classification}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "files-1", target: "llm-extract" },
                { id: "e2", source: "llm-extract", target: "llm-classify" },
                { id: "e3", source: "llm-classify", target: "router-type" },
                { id: "e4", source: "router-type", target: "llm-invoice", sourceHandle: "invoice" },
                {
                    id: "e5",
                    source: "router-type",
                    target: "llm-contract",
                    sourceHandle: "contract"
                },
                { id: "e6", source: "router-type", target: "llm-resume", sourceHandle: "resume" },
                { id: "e7", source: "router-type", target: "llm-receipt", sourceHandle: "receipt" },
                {
                    id: "e8",
                    source: "router-type",
                    target: "integration-drive",
                    sourceHandle: "other"
                },
                { id: "e9", source: "llm-invoice", target: "integration-airtable-invoice" },
                { id: "e10", source: "llm-contract", target: "integration-airtable-contract" },
                { id: "e11", source: "llm-resume", target: "integration-airtable-resume" },
                { id: "e12", source: "llm-receipt", target: "integration-drive" },
                { id: "e13", source: "integration-airtable-invoice", target: "integration-drive" },
                { id: "e14", source: "integration-airtable-contract", target: "integration-drive" },
                { id: "e15", source: "integration-airtable-resume", target: "integration-drive" },
                { id: "e16", source: "integration-drive", target: "integration-slack" },
                { id: "e17", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Document 2: Contract Review Assistant (18 nodes)
    {
        name: "Contract Review Assistant",
        description:
            "AI-powered contract analysis that extracts key terms, identifies risky clauses, compares against templates, and routes high-risk contracts for legal review before DocuSign.",
        category: "operations",
        tags: ["contracts", "legal", "risk-analysis", "ai-review", "docusign"],
        required_integrations: ["google-drive", "docusign", "notion", "slack"],
        featured: true,
        definition: {
            name: "Contract Review Assistant",
            nodes: [
                {
                    id: "files-1",
                    type: "files",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Upload Contract",
                        inputName: "contract",
                        inputVariable: "contract",
                        description: "Upload contract for review"
                    }
                },
                {
                    id: "llm-extract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Contract Text",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract all text from this contract document:\n\n{{contract}}\n\nPreserve structure: sections, clauses, definitions, signatures.",
                        outputVariable: "contractText"
                    }
                },
                {
                    id: "llm-parties",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Parties & Dates",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract key contract metadata:\n\n{{contractText.text}}\n\nIdentify: parties involved, effective date, term length, renewal terms, governing law.",
                        outputVariable: "metadata"
                    }
                },
                {
                    id: "llm-terms",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Key Terms",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract key contractual terms:\n\n{{contractText.text}}\n\nIdentify: payment terms, deliverables, SLAs, warranties, indemnification, liability limits.",
                        outputVariable: "keyTerms"
                    }
                },
                {
                    id: "llm-risk",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Identify Risky Clauses",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze contract for risky clauses:\n\n{{contractText.text}}\n\nFlag: unlimited liability, one-sided indemnification, auto-renewal traps, non-compete issues, IP assignment concerns, unusual termination terms. Rate risk: High/Medium/Low.",
                        outputVariable: "riskAnalysis"
                    }
                },
                {
                    id: "llm-compare",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compare to Template",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Compare this contract to standard template:\n\nContract: {{contractText.text}}\n\nIdentify deviations from standard terms. Flag: missing clauses, modified language, non-standard provisions.",
                        outputVariable: "templateComparison"
                    }
                },
                {
                    id: "router-risk",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Risk",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on risk analysis:\n{{riskAnalysis.text}}\n\nDetermine approval path.",
                        routes: [
                            {
                                value: "high-risk",
                                label: "High Risk",
                                description: "Legal review required"
                            },
                            {
                                value: "needs-review",
                                label: "Needs Review",
                                description: "Manager review"
                            },
                            { value: "standard", label: "Standard", description: "Auto-approve" }
                        ],
                        defaultRoute: "needs-review",
                        outputVariable: "riskRoute"
                    }
                },
                {
                    id: "llm-redlines",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Redlines",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on risk analysis, generate suggested redlines:\n\nRisks: {{riskAnalysis.text}}\nTemplate Comparison: {{templateComparison.text}}\n\nProvide specific language changes to mitigate risks.",
                        outputVariable: "redlines"
                    }
                },
                {
                    id: "humanReview-legal",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Legal Review",
                        reviewPrompt:
                            "High-risk contract requires legal team review before proceeding",
                        outputVariable: "legalApproval"
                    }
                },
                {
                    id: "humanReview-manager",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Manager Review",
                        reviewPrompt: "Contract requires manager approval",
                        outputVariable: "managerApproval"
                    }
                },
                {
                    id: "conditional-approved",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Approved?",
                        condition: "approval.approved === true",
                        outputVariable: "isApproved"
                    }
                },
                {
                    id: "integration-docusign",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send to DocuSign",
                        provider: "docusign",
                        operation: "createEnvelope"
                    }
                },
                {
                    id: "llm-rejection",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Rejection Response",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a professional response for contract revision:\n\nRedlines: {{redlines.text}}\n\nExplain required changes politely and professionally.",
                        outputVariable: "rejectionResponse"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Contract DB",
                        provider: "notion",
                        operation: "createPage",
                        database: "Contracts"
                    }
                },
                {
                    id: "integration-slack-legal",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Legal",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#legal"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Response",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#contracts"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Complete",
                        outputName: "result",
                        value: "{{riskAnalysis}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "files-1", target: "llm-extract" },
                { id: "e2", source: "llm-extract", target: "llm-parties" },
                { id: "e3", source: "llm-extract", target: "llm-terms" },
                { id: "e4", source: "llm-terms", target: "llm-risk" },
                { id: "e5", source: "llm-risk", target: "llm-compare" },
                { id: "e6", source: "llm-compare", target: "router-risk" },
                {
                    id: "e7",
                    source: "router-risk",
                    target: "llm-redlines",
                    sourceHandle: "high-risk"
                },
                { id: "e8", source: "llm-redlines", target: "humanReview-legal" },
                {
                    id: "e9",
                    source: "router-risk",
                    target: "humanReview-manager",
                    sourceHandle: "needs-review"
                },
                {
                    id: "e10",
                    source: "router-risk",
                    target: "integration-docusign",
                    sourceHandle: "standard"
                },
                { id: "e11", source: "humanReview-legal", target: "conditional-approved" },
                { id: "e12", source: "humanReview-manager", target: "conditional-approved" },
                {
                    id: "e13",
                    source: "conditional-approved",
                    target: "integration-docusign",
                    sourceHandle: "true"
                },
                {
                    id: "e14",
                    source: "conditional-approved",
                    target: "llm-rejection",
                    sourceHandle: "false"
                },
                { id: "e15", source: "llm-rejection", target: "integration-gmail" },
                { id: "e16", source: "integration-docusign", target: "integration-notion" },
                { id: "e17", source: "integration-notion", target: "integration-slack" },
                { id: "e18", source: "integration-gmail", target: "integration-slack-legal" },
                { id: "e19", source: "integration-slack", target: "output-1" },
                { id: "e20", source: "integration-slack-legal", target: "output-1" }
            ]
        }
    },

    // Document 3: Resume Screening Pipeline (15 nodes)
    {
        name: "Resume Screening Pipeline",
        description:
            "Bulk resume processing with AI-powered skill extraction, job requirement matching, candidate scoring, and automatic filtering to identify top candidates.",
        category: "saas",
        tags: ["recruiting", "resume-screening", "ai-scoring", "automation", "hr"],
        required_integrations: ["google-drive", "airtable", "gmail", "slack"],
        featured: false,
        definition: {
            name: "Resume Screening Pipeline",
            nodes: [
                {
                    id: "files-1",
                    type: "files",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Upload Resumes",
                        inputName: "resumes",
                        inputVariable: "resumes",
                        description: "Upload batch of resumes"
                    }
                },
                {
                    id: "input-requirements",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Job Requirements",
                        inputName: "requirements",
                        inputVariable: "requirements",
                        inputType: "text",
                        description: "Job requirements and must-have skills"
                    }
                },
                {
                    id: "llm-extract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Resume Data",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract structured data from this resume:\n\n{{resume}}\n\nFields: name, email, phone, summary, years of experience, skills (list), education, certifications, work history.",
                        outputVariable: "resumeData"
                    }
                },
                {
                    id: "llm-skills",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Skills Match",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Compare candidate skills to job requirements:\n\nCandidate: {{resumeData.text}}\nRequirements: {{requirements}}\n\nIdentify: matching skills, missing skills, bonus skills, skill proficiency level.",
                        outputVariable: "skillsMatch"
                    }
                },
                {
                    id: "llm-score",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Calculate Fit Score",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Score this candidate (0-100) for the role:\n\nSkills Match: {{skillsMatch.text}}\nExperience: {{resumeData.text}}\n\nWeight: skills match (40%), experience (30%), education (15%), certifications (15%). Provide detailed scoring breakdown.",
                        outputVariable: "fitScore"
                    }
                },
                {
                    id: "conditional-threshold",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Meets Minimum?",
                        condition: "fitScore.score >= 60",
                        outputVariable: "meetsMinimum"
                    }
                },
                {
                    id: "integration-airtable-qualified",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add to Qualified",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Qualified Candidates"
                    }
                },
                {
                    id: "llm-rejection-email",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Rejection Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a polite rejection email for:\n\nCandidate: {{resumeData.text}}\n\nBe encouraging, mention we'll keep them in mind for future opportunities.",
                        outputVariable: "rejectionEmail"
                    }
                },
                {
                    id: "integration-gmail-reject",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Rejection",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "transform-aggregate",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Aggregate Results",
                        transformType: "template",
                        template:
                            '{"totalProcessed": {{count}}, "qualified": {{qualifiedCount}}, "rejected": {{rejectedCount}}}',
                        outputVariable: "results"
                    }
                },
                {
                    id: "llm-rank",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Rank Top Candidates",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Rank the qualified candidates:\n\n{{qualifiedCandidates}}\n\nProvide top 10 with reasoning for each ranking.",
                        outputVariable: "rankedCandidates"
                    }
                },
                {
                    id: "integration-drive",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Archive Resumes",
                        provider: "google-drive",
                        operation: "uploadFile"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Recruiting",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#recruiting"
                    }
                },
                {
                    id: "integration-gmail-summary",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Hiring Manager",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Screening Complete",
                        outputName: "result",
                        value: "{{rankedCandidates}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "files-1", target: "llm-extract" },
                { id: "e2", source: "input-requirements", target: "llm-skills" },
                { id: "e3", source: "llm-extract", target: "llm-skills" },
                { id: "e4", source: "llm-skills", target: "llm-score" },
                { id: "e5", source: "llm-score", target: "conditional-threshold" },
                {
                    id: "e6",
                    source: "conditional-threshold",
                    target: "integration-airtable-qualified",
                    sourceHandle: "true"
                },
                {
                    id: "e7",
                    source: "conditional-threshold",
                    target: "llm-rejection-email",
                    sourceHandle: "false"
                },
                { id: "e8", source: "llm-rejection-email", target: "integration-gmail-reject" },
                {
                    id: "e9",
                    source: "integration-airtable-qualified",
                    target: "transform-aggregate"
                },
                { id: "e10", source: "integration-gmail-reject", target: "transform-aggregate" },
                { id: "e11", source: "transform-aggregate", target: "llm-rank" },
                { id: "e12", source: "llm-rank", target: "integration-drive" },
                { id: "e13", source: "integration-drive", target: "integration-slack" },
                { id: "e14", source: "integration-slack", target: "integration-gmail-summary" },
                { id: "e15", source: "integration-gmail-summary", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // MULTI-STEP APPROVALS (3 templates)
    // ========================================================================

    // Operations: Compliance Audit Trail Generator (14 nodes)
    {
        name: "Compliance Audit Trail Generator",
        description:
            "Automatically generate and maintain audit trails for compliance requirements. Track document access, policy acknowledgments, and generate compliance reports on demand.",
        category: "operations",
        tags: ["compliance", "audit", "documentation", "reporting", "governance"],
        required_integrations: ["google-drive", "airtable", "gmail", "slack"],
        featured: true,
        definition: {
            name: "Compliance Audit Trail Generator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Audit Request",
                        triggerType: "webhook",
                        description: "Triggered when audit report is requested"
                    }
                },
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Audit Parameters",
                        inputName: "auditParams",
                        inputVariable: "auditParams",
                        inputType: "text",
                        description: "Audit type, date range, and scope"
                    }
                },
                {
                    id: "integration-airtable-policies",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Policy Records",
                        provider: "airtable",
                        operation: "listRecords"
                    }
                },
                {
                    id: "integration-gdrive-access",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Access Logs",
                        provider: "google-drive",
                        operation: "listFiles"
                    }
                },
                {
                    id: "integration-airtable-training",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Training Records",
                        provider: "airtable",
                        operation: "listRecords"
                    }
                },
                {
                    id: "transform-aggregate",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Aggregate Compliance Data",
                        transformType: "merge",
                        outputVariable: "complianceData"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Compliance Gaps",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this compliance data:\n\n{{complianceData}}\n\nIdentify: gaps in policy acknowledgments, overdue training, access anomalies, and risk areas.",
                        outputVariable: "complianceAnalysis"
                    }
                },
                {
                    id: "router-1",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Risk Level",
                        routerType: "llm",
                        routes: ["high_risk", "medium_risk", "compliant"],
                        outputVariable: "riskLevel"
                    }
                },
                {
                    id: "llm-report",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Audit Report",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a formal compliance audit report including:\n- Executive summary\n- Findings\n- Risk assessment\n- Recommendations\n- Action items with deadlines",
                        outputVariable: "auditReport"
                    }
                },
                {
                    id: "integration-gdrive-save",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save Audit Report",
                        provider: "google-drive",
                        operation: "uploadFile"
                    }
                },
                {
                    id: "integration-gmail-urgent",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Compliance Team",
                        provider: "gmail",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "integration-airtable-log",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Audit Record",
                        provider: "airtable",
                        operation: "createRecord"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Stakeholders",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#compliance"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Audit Complete",
                        outputName: "result",
                        value: "Compliance audit report generated"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "input-1" },
                { id: "e2", source: "input-1", target: "integration-airtable-policies" },
                { id: "e3", source: "input-1", target: "integration-gdrive-access" },
                { id: "e4", source: "input-1", target: "integration-airtable-training" },
                {
                    id: "e5",
                    source: "integration-airtable-policies",
                    target: "transform-aggregate"
                },
                { id: "e6", source: "integration-gdrive-access", target: "transform-aggregate" },
                {
                    id: "e7",
                    source: "integration-airtable-training",
                    target: "transform-aggregate"
                },
                { id: "e8", source: "transform-aggregate", target: "llm-analyze" },
                { id: "e9", source: "llm-analyze", target: "router-1" },
                {
                    id: "e10",
                    source: "router-1",
                    target: "integration-gmail-urgent",
                    sourceHandle: "high_risk"
                },
                {
                    id: "e11",
                    source: "router-1",
                    target: "llm-report",
                    sourceHandle: "medium_risk"
                },
                { id: "e12", source: "router-1", target: "llm-report", sourceHandle: "compliant" },
                { id: "e13", source: "integration-gmail-urgent", target: "llm-report" },
                { id: "e14", source: "llm-report", target: "integration-gdrive-save" },
                {
                    id: "e15",
                    source: "integration-gdrive-save",
                    target: "integration-airtable-log"
                },
                { id: "e16", source: "integration-airtable-log", target: "integration-slack" },
                { id: "e17", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Approvals 2: Purchase Order Workflow (20 nodes)
    {
        name: "Purchase Order Workflow",
        description:
            "Complete purchase order lifecycle: requisition validation, budget checking, multi-level approval chain, PO generation, vendor notification, and delivery tracking.",
        category: "operations",
        tags: ["procurement", "purchase-order", "approval", "budget", "vendor"],
        required_integrations: ["quickbooks", "docusign", "gmail", "airtable", "slack"],
        featured: false,
        definition: {
            name: "Purchase Order Workflow",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Requisition Details",
                        inputName: "requisition",
                        inputVariable: "requisition",
                        inputType: "json",
                        description:
                            '{"items": [], "vendor": "", "totalAmount": 0, "justification": ""}'
                    }
                },
                {
                    id: "llm-validate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Validate Requisition",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Validate this purchase requisition:\n\n{{requisition}}\n\nCheck: complete item details, valid vendor, reasonable pricing, proper justification.",
                        outputVariable: "validation"
                    }
                },
                {
                    id: "integration-quickbooks-budget",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Budget",
                        provider: "quickbooks",
                        operation: "getBudget"
                    }
                },
                {
                    id: "conditional-budget",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Within Budget?",
                        condition: "budget.available >= requisition.totalAmount",
                        outputVariable: "withinBudget"
                    }
                },
                {
                    id: "router-category",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Category",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Determine approval path for:\n{{requisition}}\n\nConsider: amount, category (capital vs operational), vendor status.",
                        routes: [
                            {
                                value: "dept",
                                label: "Department",
                                description: "Department head only"
                            },
                            {
                                value: "procurement",
                                label: "Procurement",
                                description: "Procurement review required"
                            },
                            {
                                value: "cfo",
                                label: "CFO",
                                description: "CFO approval for capital expense"
                            }
                        ],
                        defaultRoute: "procurement",
                        outputVariable: "approvalPath"
                    }
                },
                {
                    id: "humanReview-dept",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Department Head Approval",
                        reviewPrompt: "Review and approve department purchase request",
                        outputVariable: "deptApproval"
                    }
                },
                {
                    id: "humanReview-procurement",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Procurement Review",
                        reviewPrompt: "Review vendor terms, pricing, and alternatives",
                        outputVariable: "procurementApproval"
                    }
                },
                {
                    id: "humanReview-cfo",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "CFO Approval",
                        reviewPrompt: "Capital expense requires CFO approval",
                        outputVariable: "cfoApproval"
                    }
                },
                {
                    id: "llm-generate-po",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate PO Document",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a formal Purchase Order document:\n\n{{requisition}}\n\nInclude: PO number, date, vendor details, line items, terms, authorized signatures block.",
                        outputVariable: "poDocument"
                    }
                },
                {
                    id: "integration-docs",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create PO PDF",
                        provider: "google-docs",
                        operation: "createDocument"
                    }
                },
                {
                    id: "integration-docusign",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send for Signature",
                        provider: "docusign",
                        operation: "createEnvelope"
                    }
                },
                {
                    id: "integration-gmail-vendor",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Vendor",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-quickbooks-po",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create in Accounting",
                        provider: "quickbooks",
                        operation: "createPurchaseOrder"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Track Delivery",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Purchase Orders"
                    }
                },
                {
                    id: "integration-gmail-rejected",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Rejection",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-gmail-budget",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Budget Alert",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Procurement",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#procurement"
                    }
                },
                {
                    id: "transform-summary",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Summary",
                        transformType: "template",
                        template: "PO {{poNumber}} created for {{vendor}} - ${{totalAmount}}",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "integration-slack-complete",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Completion",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#finance"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "PO Complete",
                        outputName: "result",
                        value: "{{poDocument}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-validate" },
                { id: "e2", source: "llm-validate", target: "integration-quickbooks-budget" },
                { id: "e3", source: "integration-quickbooks-budget", target: "conditional-budget" },
                {
                    id: "e4",
                    source: "conditional-budget",
                    target: "router-category",
                    sourceHandle: "true"
                },
                {
                    id: "e5",
                    source: "conditional-budget",
                    target: "integration-gmail-budget",
                    sourceHandle: "false"
                },
                {
                    id: "e6",
                    source: "router-category",
                    target: "humanReview-dept",
                    sourceHandle: "dept"
                },
                {
                    id: "e7",
                    source: "router-category",
                    target: "humanReview-procurement",
                    sourceHandle: "procurement"
                },
                {
                    id: "e8",
                    source: "router-category",
                    target: "humanReview-cfo",
                    sourceHandle: "cfo"
                },
                { id: "e9", source: "humanReview-dept", target: "llm-generate-po" },
                { id: "e10", source: "humanReview-procurement", target: "llm-generate-po" },
                { id: "e11", source: "humanReview-cfo", target: "llm-generate-po" },
                { id: "e12", source: "llm-generate-po", target: "integration-docs" },
                { id: "e13", source: "integration-docs", target: "integration-docusign" },
                { id: "e14", source: "integration-docusign", target: "integration-gmail-vendor" },
                {
                    id: "e15",
                    source: "integration-gmail-vendor",
                    target: "integration-quickbooks-po"
                },
                { id: "e16", source: "integration-quickbooks-po", target: "integration-airtable" },
                { id: "e17", source: "integration-airtable", target: "transform-summary" },
                { id: "e18", source: "transform-summary", target: "integration-slack-complete" },
                { id: "e19", source: "integration-gmail-budget", target: "integration-slack" },
                { id: "e20", source: "integration-slack", target: "output-1" },
                { id: "e21", source: "integration-slack-complete", target: "output-1" }
            ]
        }
    },

    // Approvals 3: Content Publishing Approval (14 nodes)
    {
        name: "Content Publishing Approval",
        description:
            "Content review workflow with automatic sensitive content detection, editor review, conditional legal review, and multi-channel publishing with analytics tracking.",
        category: "marketing",
        tags: ["content", "publishing", "approval", "editorial", "compliance"],
        required_integrations: ["notion", "wordpress", "twitter", "linkedin", "slack"],
        featured: false,
        definition: {
            name: "Content Publishing Approval",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Content Draft",
                        inputName: "content",
                        inputVariable: "content",
                        inputType: "text",
                        description: "Content draft for review and publishing"
                    }
                },
                {
                    id: "llm-check-sensitive",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Sensitive Content",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this content for sensitive topics:\n\n{{content}}\n\nCheck for: legal claims, competitor mentions, financial projections, personal data, regulatory issues. Flag if legal review needed.",
                        outputVariable: "sensitivityCheck"
                    }
                },
                {
                    id: "router-sensitivity",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Sensitivity",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on sensitivity check:\n{{sensitivityCheck.text}}\n\nDoes this require legal review?",
                        routes: [
                            {
                                value: "legal",
                                label: "Needs Legal",
                                description: "Legal review required"
                            },
                            {
                                value: "standard",
                                label: "Standard",
                                description: "Normal editorial flow"
                            }
                        ],
                        defaultRoute: "standard",
                        outputVariable: "sensitivityRoute"
                    }
                },
                {
                    id: "humanReview-editor",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Editor Review",
                        reviewPrompt: "Review content for quality, accuracy, and brand voice",
                        outputVariable: "editorApproval"
                    }
                },
                {
                    id: "humanReview-legal",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Legal Review",
                        reviewPrompt: "Review content for legal and compliance issues",
                        outputVariable: "legalApproval"
                    }
                },
                {
                    id: "conditional-approved",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Approved?",
                        condition: "approval.approved === true",
                        outputVariable: "isApproved"
                    }
                },
                {
                    id: "input-schedule",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Publication Date",
                        inputName: "publishDate",
                        inputVariable: "publishDate",
                        inputType: "text",
                        description: "Scheduled publication date"
                    }
                },
                {
                    id: "integration-wordpress",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Publish to CMS",
                        provider: "wordpress",
                        operation: "createPost"
                    }
                },
                {
                    id: "integration-twitter",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to Twitter",
                        provider: "twitter",
                        operation: "createTweet"
                    }
                },
                {
                    id: "integration-linkedin",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to LinkedIn",
                        provider: "linkedin",
                        operation: "createPost"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Content Calendar",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Author",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#content"
                    }
                },
                {
                    id: "integration-slack-rejected",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Rejection",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#content"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Publishing Complete",
                        outputName: "result",
                        value: "Content published successfully"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-check-sensitive" },
                { id: "e2", source: "llm-check-sensitive", target: "router-sensitivity" },
                {
                    id: "e3",
                    source: "router-sensitivity",
                    target: "humanReview-legal",
                    sourceHandle: "legal"
                },
                {
                    id: "e4",
                    source: "router-sensitivity",
                    target: "humanReview-editor",
                    sourceHandle: "standard"
                },
                { id: "e5", source: "humanReview-legal", target: "humanReview-editor" },
                { id: "e6", source: "humanReview-editor", target: "conditional-approved" },
                {
                    id: "e7",
                    source: "conditional-approved",
                    target: "input-schedule",
                    sourceHandle: "true"
                },
                {
                    id: "e8",
                    source: "conditional-approved",
                    target: "integration-slack-rejected",
                    sourceHandle: "false"
                },
                { id: "e9", source: "input-schedule", target: "integration-wordpress" },
                { id: "e10", source: "integration-wordpress", target: "integration-twitter" },
                { id: "e11", source: "integration-wordpress", target: "integration-linkedin" },
                { id: "e12", source: "integration-twitter", target: "integration-notion" },
                { id: "e13", source: "integration-linkedin", target: "integration-notion" },
                { id: "e14", source: "integration-notion", target: "integration-slack" },
                { id: "e15", source: "integration-slack", target: "output-1" },
                { id: "e16", source: "integration-slack-rejected", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // FINANCE/ACCOUNTING (2 templates)
    // ========================================================================

    // Finance 1: Invoice Processing & Payment (16 nodes)
    {
        name: "Invoice Processing & Payment",
        description:
            "Automated vendor invoice processing: extract data from email attachments, match to purchase orders, route for approval, schedule payment, and sync with accounting.",
        category: "sales",
        tags: ["invoice", "accounts-payable", "automation", "matching", "payment"],
        required_integrations: ["gmail", "quickbooks", "google-sheets", "slack"],
        featured: true,
        definition: {
            name: "Invoice Processing & Payment",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Invoice Email Received",
                        triggerType: "webhook",
                        webhookProvider: "gmail",
                        description: "Triggered when invoice email is received"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Email & Attachment",
                        provider: "gmail",
                        operation: "getAttachment"
                    }
                },
                {
                    id: "llm-extract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Invoice Data",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract invoice details from this document:\n\n{{attachment}}\n\nFields: vendor name, invoice number, date, due date, PO number (if any), line items, subtotal, tax, total, payment terms.",
                        outputVariable: "invoiceData"
                    }
                },
                {
                    id: "integration-quickbooks-po",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Lookup Purchase Order",
                        provider: "quickbooks",
                        operation: "getPurchaseOrder"
                    }
                },
                {
                    id: "llm-match",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Match to PO",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Compare invoice to purchase order:\n\nInvoice: {{invoiceData.text}}\nPO: {{purchaseOrder}}\n\nCheck: amounts match, quantities match, vendor matches, items match. Flag any discrepancies.",
                        outputVariable: "matchResult"
                    }
                },
                {
                    id: "conditional-match",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "PO Matches?",
                        condition: "matchResult.isMatch === true",
                        outputVariable: "poMatches"
                    }
                },
                {
                    id: "humanReview-discrepancy",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Discrepancy",
                        reviewPrompt:
                            "Invoice does not match PO - review and resolve discrepancies",
                        outputVariable: "discrepancyReview"
                    }
                },
                {
                    id: "router-amount",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route for Approval",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Determine approval level for invoice amount: ${{invoiceData.total}}",
                        routes: [
                            { value: "auto", label: "<$500", description: "Auto-approve" },
                            {
                                value: "manager",
                                label: "$500-$5000",
                                description: "Manager approval"
                            },
                            { value: "finance", label: ">$5000", description: "Finance approval" }
                        ],
                        defaultRoute: "manager",
                        outputVariable: "approvalRoute"
                    }
                },
                {
                    id: "humanReview-approval",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Approval Review",
                        reviewPrompt: "Review and approve invoice for payment",
                        outputVariable: "paymentApproval"
                    }
                },
                {
                    id: "integration-quickbooks-bill",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Bill",
                        provider: "quickbooks",
                        operation: "createBill"
                    }
                },
                {
                    id: "integration-quickbooks-payment",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Payment",
                        provider: "quickbooks",
                        operation: "createBillPayment"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update AP Log",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "integration-gmail-confirm",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Confirm to Vendor",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-drive",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Archive Invoice",
                        provider: "google-drive",
                        operation: "uploadFile"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Finance",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#accounts-payable"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Invoice Processed",
                        outputName: "result",
                        value: "{{invoiceData.invoiceNumber}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-gmail" },
                { id: "e2", source: "integration-gmail", target: "llm-extract" },
                { id: "e3", source: "llm-extract", target: "integration-quickbooks-po" },
                { id: "e4", source: "integration-quickbooks-po", target: "llm-match" },
                { id: "e5", source: "llm-match", target: "conditional-match" },
                {
                    id: "e6",
                    source: "conditional-match",
                    target: "router-amount",
                    sourceHandle: "true"
                },
                {
                    id: "e7",
                    source: "conditional-match",
                    target: "humanReview-discrepancy",
                    sourceHandle: "false"
                },
                { id: "e8", source: "humanReview-discrepancy", target: "router-amount" },
                {
                    id: "e9",
                    source: "router-amount",
                    target: "integration-quickbooks-bill",
                    sourceHandle: "auto"
                },
                {
                    id: "e10",
                    source: "router-amount",
                    target: "humanReview-approval",
                    sourceHandle: "manager"
                },
                {
                    id: "e11",
                    source: "router-amount",
                    target: "humanReview-approval",
                    sourceHandle: "finance"
                },
                {
                    id: "e12",
                    source: "humanReview-approval",
                    target: "integration-quickbooks-bill"
                },
                {
                    id: "e13",
                    source: "integration-quickbooks-bill",
                    target: "integration-quickbooks-payment"
                },
                {
                    id: "e14",
                    source: "integration-quickbooks-payment",
                    target: "integration-sheets"
                },
                { id: "e15", source: "integration-sheets", target: "integration-gmail-confirm" },
                { id: "e16", source: "integration-gmail-confirm", target: "integration-drive" },
                { id: "e17", source: "integration-drive", target: "integration-slack" },
                { id: "e18", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Finance 2: Financial Reconciliation Bot (18 nodes)
    {
        name: "Financial Reconciliation Bot",
        description:
            "Daily automated bank reconciliation: fetch transactions, match against accounting entries, flag discrepancies, create investigation tasks, and generate reconciliation reports.",
        category: "sales",
        tags: ["reconciliation", "accounting", "automation", "bank", "matching"],
        required_integrations: ["quickbooks", "google-sheets", "gmail", "slack"],
        featured: false,
        definition: {
            name: "Financial Reconciliation Bot",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily 6am",
                        triggerType: "schedule",
                        schedule: "0 6 * * *",
                        description: "Runs daily at 6am"
                    }
                },
                {
                    id: "integration-plaid",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Bank Transactions",
                        provider: "http",
                        operation: "get",
                        description: "Plaid bank feed API"
                    }
                },
                {
                    id: "integration-quickbooks",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Accounting Entries",
                        provider: "quickbooks",
                        operation: "queryTransactions"
                    }
                },
                {
                    id: "llm-match",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Match Transactions",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Match bank transactions to accounting entries:\n\nBank: {{bankTransactions}}\nAccounting: {{accountingEntries}}\n\nFor each transaction, find matching entry by: amount, date (within 3 days), description similarity. Classify as: matched, unmatched-bank, unmatched-accounting.",
                        outputVariable: "matchResults"
                    }
                },
                {
                    id: "router-status",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Match Status",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Categorize overall reconciliation status:\n{{matchResults.text}}",
                        routes: [
                            {
                                value: "matched",
                                label: "All Matched",
                                description: "Full reconciliation"
                            },
                            {
                                value: "partial",
                                label: "Partial Match",
                                description: "Some discrepancies"
                            },
                            {
                                value: "major",
                                label: "Major Issues",
                                description: "Significant discrepancies"
                            }
                        ],
                        defaultRoute: "partial",
                        outputVariable: "matchStatus"
                    }
                },
                {
                    id: "integration-quickbooks-reconcile",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Mark Reconciled",
                        provider: "quickbooks",
                        operation: "reconcileTransactions"
                    }
                },
                {
                    id: "llm-investigate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Investigation Tasks",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create investigation tasks for unmatched items:\n\n{{matchResults.text}}\n\nFor each: describe the discrepancy, suggest investigation steps, assign priority.",
                        outputVariable: "investigations"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Tasks",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Reconciliation Tasks"
                    }
                },
                {
                    id: "llm-clarification",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Request Clarification",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate clarification requests for partial matches:\n\n{{matchResults.text}}\n\nAsk specific questions to resolve ambiguity.",
                        outputVariable: "clarifications"
                    }
                },
                {
                    id: "integration-gmail-clarify",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Clarification Requests",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "transform-results",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Aggregate Results",
                        transformType: "template",
                        template:
                            '{"matched": {{matchedCount}}, "unmatched": {{unmatchedCount}}, "investigating": {{investigatingCount}}}',
                        outputVariable: "aggregatedResults"
                    }
                },
                {
                    id: "llm-report",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Report",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a daily reconciliation report:\n\n{{aggregatedResults}}\n{{matchResults.text}}\n\nInclude: summary stats, discrepancy details, recommended actions, trend analysis if patterns detected.",
                        outputVariable: "report"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Results",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Report",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack-alert",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Major Issues",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#finance-alerts"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Daily Summary",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#finance"
                    }
                },
                {
                    id: "integration-datadog",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Track Metrics",
                        provider: "datadog",
                        operation: "submitMetrics"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Reconciliation Complete",
                        outputName: "result",
                        value: "{{report}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-plaid" },
                { id: "e2", source: "trigger-1", target: "integration-quickbooks" },
                { id: "e3", source: "integration-plaid", target: "llm-match" },
                { id: "e4", source: "integration-quickbooks", target: "llm-match" },
                { id: "e5", source: "llm-match", target: "router-status" },
                {
                    id: "e6",
                    source: "router-status",
                    target: "integration-quickbooks-reconcile",
                    sourceHandle: "matched"
                },
                {
                    id: "e7",
                    source: "router-status",
                    target: "llm-clarification",
                    sourceHandle: "partial"
                },
                {
                    id: "e8",
                    source: "router-status",
                    target: "llm-investigate",
                    sourceHandle: "major"
                },
                {
                    id: "e9",
                    source: "integration-quickbooks-reconcile",
                    target: "transform-results"
                },
                { id: "e10", source: "llm-clarification", target: "integration-gmail-clarify" },
                { id: "e11", source: "integration-gmail-clarify", target: "transform-results" },
                { id: "e12", source: "llm-investigate", target: "integration-airtable" },
                { id: "e13", source: "integration-airtable", target: "integration-slack-alert" },
                { id: "e14", source: "integration-slack-alert", target: "transform-results" },
                { id: "e15", source: "transform-results", target: "llm-report" },
                { id: "e16", source: "llm-report", target: "integration-sheets" },
                { id: "e17", source: "integration-sheets", target: "integration-gmail" },
                { id: "e18", source: "integration-gmail", target: "integration-slack" },
                { id: "e19", source: "integration-slack", target: "integration-datadog" },
                { id: "e20", source: "integration-datadog", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // RECRUITING/HR (2 templates)
    // ========================================================================

    // HR 1: Interview Scheduling Coordinator (14 nodes)
    {
        name: "Interview Scheduling Coordinator",
        description:
            "Automate interview scheduling: find interviewer availability, propose times to candidates, create calendar events, and send preparation materials to all participants.",
        category: "saas",
        tags: ["recruiting", "scheduling", "interviews", "automation", "hr"],
        required_integrations: ["calendly", "google-calendar", "gmail", "airtable", "slack"],
        featured: true,
        definition: {
            name: "Interview Scheduling Coordinator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Candidate Qualified",
                        triggerType: "webhook",
                        webhookProvider: "airtable",
                        description: "Triggered when candidate moves to interview stage"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Candidate Details",
                        provider: "airtable",
                        operation: "getRecord"
                    }
                },
                {
                    id: "llm-requirements",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Determine Interview Panel",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on this candidate and role:\n\n{{candidate}}\n\nDetermine: interview type (technical/culture/executive), required interviewers, interview duration, special requirements.",
                        outputVariable: "interviewPlan"
                    }
                },
                {
                    id: "integration-calendar-check",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Interviewer Availability",
                        provider: "google-calendar",
                        operation: "getFreeBusy"
                    }
                },
                {
                    id: "llm-slots",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Find Optimal Slots",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Find the best interview slots based on:\n\nAvailability: {{availability}}\nInterview Plan: {{interviewPlan.text}}\n\nPropose 3 time slots that work for all required interviewers. Consider time zones if candidate is remote.",
                        outputVariable: "proposedSlots"
                    }
                },
                {
                    id: "integration-gmail-propose",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Time Options",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "wait-response",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait for Response",
                        waitType: "webhook",
                        timeout: 172800000,
                        outputVariable: "candidateResponse"
                    }
                },
                {
                    id: "integration-calendar-create",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Calendar Event",
                        provider: "google-calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "llm-prep-interviewer",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Interviewer Prep",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create interview preparation materials for the interviewer:\n\nCandidate: {{candidate}}\nInterview Type: {{interviewPlan.text}}\n\nInclude: resume highlights, suggested questions, evaluation criteria, red/green flags to watch for.",
                        outputVariable: "interviewerPrep"
                    }
                },
                {
                    id: "llm-prep-candidate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Candidate Guide",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create interview preparation guide for the candidate:\n\nRole: {{candidate.role}}\nInterview Type: {{interviewPlan.text}}\n\nInclude: what to expect, how to prepare, logistics, interviewer background.",
                        outputVariable: "candidatePrep"
                    }
                },
                {
                    id: "integration-gmail-prep",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Prep Materials",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-airtable-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Candidate Record",
                        provider: "airtable",
                        operation: "updateRecord"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Recruiting",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#recruiting"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Interview Scheduled",
                        outputName: "result",
                        value: "Interview scheduled for {{candidateResponse.selectedSlot}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-airtable" },
                { id: "e2", source: "integration-airtable", target: "llm-requirements" },
                { id: "e3", source: "llm-requirements", target: "integration-calendar-check" },
                { id: "e4", source: "integration-calendar-check", target: "llm-slots" },
                { id: "e5", source: "llm-slots", target: "integration-gmail-propose" },
                { id: "e6", source: "integration-gmail-propose", target: "wait-response" },
                { id: "e7", source: "wait-response", target: "integration-calendar-create" },
                { id: "e8", source: "integration-calendar-create", target: "llm-prep-interviewer" },
                { id: "e9", source: "integration-calendar-create", target: "llm-prep-candidate" },
                { id: "e10", source: "llm-prep-interviewer", target: "integration-gmail-prep" },
                { id: "e11", source: "llm-prep-candidate", target: "integration-gmail-prep" },
                {
                    id: "e12",
                    source: "integration-gmail-prep",
                    target: "integration-airtable-update"
                },
                { id: "e13", source: "integration-airtable-update", target: "integration-slack" },
                { id: "e14", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // HR 2: Employee Offboarding Orchestrator (16 nodes)
    {
        name: "Employee Offboarding Orchestrator",
        description:
            "Comprehensive employee offboarding: coordinate IT access revocation, HR paperwork, final pay processing, exit interview scheduling, and knowledge transfer across departments.",
        category: "saas",
        tags: ["offboarding", "hr", "security", "automation", "compliance"],
        required_integrations: ["slack", "google-calendar", "gmail", "airtable"],
        featured: false,
        definition: {
            name: "Employee Offboarding Orchestrator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Offboarding Initiated",
                        triggerType: "webhook",
                        webhookProvider: "airtable",
                        description: "Triggered when employee offboarding is initiated"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Employee Details",
                        provider: "airtable",
                        operation: "getRecord"
                    }
                },
                {
                    id: "llm-calculate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Calculate Last Day",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Calculate offboarding timeline:\n\nEmployee: {{employee}}\nNotice date: {{trigger.date}}\n\nDetermine: last working day, final pay date, benefits end date, access revocation date.",
                        outputVariable: "timeline"
                    }
                },
                {
                    id: "integration-slack-it",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify IT",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#it-support"
                    }
                },
                {
                    id: "integration-slack-hr",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify HR",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#hr"
                    }
                },
                {
                    id: "integration-slack-finance",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Finance",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#finance"
                    }
                },
                {
                    id: "integration-slack-manager",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Manager",
                        provider: "slack",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Exit Interview",
                        provider: "google-calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "llm-checklist",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Checklist",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create offboarding checklist for:\n\n{{employee}}\n\nInclude: IT items to return/revoke, HR documents needed, knowledge transfer items, project handoff tasks.",
                        outputVariable: "checklist"
                    }
                },
                {
                    id: "integration-airtable-checklist",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Checklist Tasks",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Offboarding Checklists"
                    }
                },
                {
                    id: "wait-lastday",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait Until Last Day",
                        waitType: "until",
                        untilDate: "{{timeline.lastDay}}",
                        outputVariable: "lastDayReached"
                    }
                },
                {
                    id: "integration-slack-revoke",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Trigger Access Revocation",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#it-support"
                    }
                },
                {
                    id: "integration-gmail-survey",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Exit Survey",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-airtable-archive",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Archive Employee Record",
                        provider: "airtable",
                        operation: "updateRecord"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Completion",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Offboarding Complete",
                        outputName: "result",
                        value: "Offboarding completed for {{employee.name}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-airtable" },
                { id: "e2", source: "integration-airtable", target: "llm-calculate" },
                { id: "e3", source: "llm-calculate", target: "integration-slack-it" },
                { id: "e4", source: "llm-calculate", target: "integration-slack-hr" },
                { id: "e5", source: "llm-calculate", target: "integration-slack-finance" },
                { id: "e6", source: "llm-calculate", target: "integration-slack-manager" },
                { id: "e7", source: "integration-slack-it", target: "integration-calendar" },
                { id: "e8", source: "integration-slack-hr", target: "integration-calendar" },
                { id: "e9", source: "integration-slack-finance", target: "integration-calendar" },
                { id: "e10", source: "integration-slack-manager", target: "integration-calendar" },
                { id: "e11", source: "integration-calendar", target: "llm-checklist" },
                { id: "e12", source: "llm-checklist", target: "integration-airtable-checklist" },
                { id: "e13", source: "integration-airtable-checklist", target: "wait-lastday" },
                { id: "e14", source: "wait-lastday", target: "integration-slack-revoke" },
                {
                    id: "e15",
                    source: "integration-slack-revoke",
                    target: "integration-gmail-survey"
                },
                {
                    id: "e16",
                    source: "integration-gmail-survey",
                    target: "integration-airtable-archive"
                },
                { id: "e17", source: "integration-airtable-archive", target: "integration-sheets" },
                { id: "e18", source: "integration-sheets", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // CUSTOMER SUCCESS (2 templates)
    // ========================================================================

    // CS 1: Customer Health Score & Alert (20 nodes)
    {
        name: "Customer Health Score & Alert",
        description:
            "Aggregate customer signals from product usage, support, billing, and NPS to calculate health scores. Automatically trigger interventions for at-risk accounts.",
        category: "saas",
        tags: ["customer-success", "health-score", "churn-prevention", "automation"],
        required_integrations: ["mixpanel", "zendesk", "stripe", "hubspot", "slack"],
        featured: true,
        definition: {
            name: "Customer Health Score & Alert",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Check",
                        triggerType: "schedule",
                        schedule: "0 8 * * *",
                        description: "Runs daily at 8am"
                    }
                },
                {
                    id: "input-account",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Account ID",
                        inputName: "accountId",
                        inputVariable: "accountId",
                        inputType: "text",
                        description: "Customer account to analyze (or 'all' for batch)"
                    }
                },
                {
                    id: "integration-mixpanel",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Usage Data",
                        provider: "mixpanel",
                        operation: "queryEvents"
                    }
                },
                {
                    id: "integration-zendesk",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Support Tickets",
                        provider: "zendesk",
                        operation: "listTickets"
                    }
                },
                {
                    id: "integration-stripe",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Billing Status",
                        provider: "stripe",
                        operation: "getCustomer"
                    }
                },
                {
                    id: "integration-typeform",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch NPS Score",
                        provider: "typeform",
                        operation: "getResponses"
                    }
                },
                {
                    id: "llm-usage-score",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Calculate Usage Score",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze product usage and calculate score (0-100):\n\n{{usageData}}\n\nConsider: login frequency, feature adoption, engagement trends, comparison to healthy accounts.",
                        outputVariable: "usageScore"
                    }
                },
                {
                    id: "llm-support-score",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Calculate Support Score",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze support interactions and calculate score (0-100):\n\n{{supportTickets}}\n\nConsider: ticket volume, severity, resolution time, sentiment, recurring issues.",
                        outputVariable: "supportScore"
                    }
                },
                {
                    id: "llm-billing-score",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Calculate Billing Score",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Analyze billing status and calculate score (0-100):\n\n{{billingData}}\n\nConsider: payment history, plan type, expansion/contraction, invoice issues.",
                        outputVariable: "billingScore"
                    }
                },
                {
                    id: "llm-composite",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Calculate Health Score",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Calculate composite customer health score:\n\nUsage: {{usageScore.text}}\nSupport: {{supportScore.text}}\nBilling: {{billingScore.text}}\nNPS: {{npsData}}\n\nWeight: Usage 40%, Support 25%, Billing 20%, NPS 15%. Provide overall score and risk assessment.",
                        outputVariable: "healthScore"
                    }
                },
                {
                    id: "router-health",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Health",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on health score:\n{{healthScore.text}}\n\nDetermine intervention level.",
                        routes: [
                            {
                                value: "healthy",
                                label: "Score >80",
                                description: "Healthy - log only"
                            },
                            {
                                value: "warning",
                                label: "Score 50-80",
                                description: "Warning - CSM task"
                            },
                            {
                                value: "critical",
                                label: "Score <50",
                                description: "Critical - immediate action"
                            }
                        ],
                        defaultRoute: "warning",
                        outputVariable: "healthRoute"
                    }
                },
                {
                    id: "integration-hubspot-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update CRM Health",
                        provider: "hubspot",
                        operation: "updateCompany"
                    }
                },
                {
                    id: "integration-hubspot-task",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create CSM Task",
                        provider: "hubspot",
                        operation: "createTask"
                    }
                },
                {
                    id: "integration-zendesk-ticket",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Urgent Ticket",
                        provider: "zendesk",
                        operation: "createTicket"
                    }
                },
                {
                    id: "integration-slack-critical",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert CSM & Manager",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#customer-success-alerts"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Health Score",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "llm-report",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Trend Report",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate weekly health trend report:\n\n{{healthScore.text}}\n\nInclude: score changes, risk factors, recommended actions, success predictions.",
                        outputVariable: "trendReport"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Summary",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#customer-success"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Weekly Report",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Health Check Complete",
                        outputName: "result",
                        value: "{{healthScore}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "input-account" },
                { id: "e2", source: "input-account", target: "integration-mixpanel" },
                { id: "e3", source: "input-account", target: "integration-zendesk" },
                { id: "e4", source: "input-account", target: "integration-stripe" },
                { id: "e5", source: "input-account", target: "integration-typeform" },
                { id: "e6", source: "integration-mixpanel", target: "llm-usage-score" },
                { id: "e7", source: "integration-zendesk", target: "llm-support-score" },
                { id: "e8", source: "integration-stripe", target: "llm-billing-score" },
                { id: "e9", source: "llm-usage-score", target: "llm-composite" },
                { id: "e10", source: "llm-support-score", target: "llm-composite" },
                { id: "e11", source: "llm-billing-score", target: "llm-composite" },
                { id: "e12", source: "integration-typeform", target: "llm-composite" },
                { id: "e13", source: "llm-composite", target: "router-health" },
                {
                    id: "e14",
                    source: "router-health",
                    target: "integration-hubspot-update",
                    sourceHandle: "healthy"
                },
                {
                    id: "e15",
                    source: "router-health",
                    target: "integration-hubspot-task",
                    sourceHandle: "warning"
                },
                {
                    id: "e16",
                    source: "router-health",
                    target: "integration-slack-critical",
                    sourceHandle: "critical"
                },
                {
                    id: "e17",
                    source: "integration-slack-critical",
                    target: "integration-zendesk-ticket"
                },
                {
                    id: "e18",
                    source: "integration-zendesk-ticket",
                    target: "integration-hubspot-task"
                },
                { id: "e19", source: "integration-hubspot-update", target: "integration-sheets" },
                { id: "e20", source: "integration-hubspot-task", target: "integration-sheets" },
                { id: "e21", source: "integration-sheets", target: "llm-report" },
                { id: "e22", source: "llm-report", target: "integration-slack" },
                { id: "e23", source: "integration-slack", target: "integration-gmail" },
                { id: "e24", source: "integration-gmail", target: "output-1" }
            ]
        }
    },

    // CS 2: Renewal Pipeline Manager (18 nodes)
    {
        name: "Renewal Pipeline Manager",
        description:
            "Proactive renewal management: identify accounts 90 days before renewal, assess health and expansion potential, generate personalized outreach, and track to close.",
        category: "saas",
        tags: ["renewals", "customer-success", "pipeline", "automation", "retention"],
        required_integrations: ["hubspot", "stripe", "mixpanel", "gmail", "slack"],
        featured: true,
        definition: {
            name: "Renewal Pipeline Manager",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Renewal Check",
                        triggerType: "schedule",
                        schedule: "0 7 * * *",
                        description: "Runs daily at 7am"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Upcoming Renewals",
                        provider: "hubspot",
                        operation: "searchDeals"
                    }
                },
                {
                    id: "integration-stripe-sub",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Subscription Details",
                        provider: "stripe",
                        operation: "getSubscription"
                    }
                },
                {
                    id: "integration-mixpanel",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Usage Trends",
                        provider: "mixpanel",
                        operation: "queryEvents"
                    }
                },
                {
                    id: "integration-hubspot-health",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Health Score",
                        provider: "hubspot",
                        operation: "getCompany"
                    }
                },
                {
                    id: "llm-assess",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Assess Renewal Risk",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Assess renewal likelihood for this account:\n\nSubscription: {{subscription}}\nUsage: {{usageTrends}}\nHealth: {{healthScore}}\n\nConsider: usage trends, support history, engagement, expansion signals, competitive threats.",
                        outputVariable: "riskAssessment"
                    }
                },
                {
                    id: "llm-message",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Outreach",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate personalized renewal outreach:\n\nAccount: {{account}}\nRisk: {{riskAssessment.text}}\n\nCreate message that: acknowledges their usage, highlights value delivered, addresses potential concerns, offers expansion opportunities if appropriate.",
                        outputVariable: "outreachMessage"
                    }
                },
                {
                    id: "router-strategy",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Strategy",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on assessment:\n{{riskAssessment.text}}\n\nDetermine renewal strategy.",
                        routes: [
                            {
                                value: "auto",
                                label: "Auto-Renew",
                                description: "Healthy account, send reminder"
                            },
                            {
                                value: "sales",
                                label: "Sales Touch",
                                description: "Expansion opportunity"
                            },
                            {
                                value: "risk",
                                label: "At-Risk",
                                description: "Executive escalation needed"
                            }
                        ],
                        defaultRoute: "sales",
                        outputVariable: "strategyRoute"
                    }
                },
                {
                    id: "integration-gmail-auto",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Renewal Reminder",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-hubspot-opp",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Opportunity",
                        provider: "hubspot",
                        operation: "createDeal"
                    }
                },
                {
                    id: "integration-hubspot-task",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create CSM Task",
                        provider: "hubspot",
                        operation: "createTask"
                    }
                },
                {
                    id: "integration-slack-escalate",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Executive Escalation",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#executive-alerts"
                    }
                },
                {
                    id: "integration-gmail-outreach",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Outreach",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Pipeline",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "llm-forecast",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Forecast",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate weekly renewal forecast:\n\nPipeline: {{renewalPipeline}}\n\nInclude: expected renewals, at-risk amount, expansion opportunities, recommended actions.",
                        outputVariable: "forecast"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Forecast",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#customer-success"
                    }
                },
                {
                    id: "integration-gmail-report",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Report",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Renewal Check Complete",
                        outputName: "result",
                        value: "{{forecast}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot" },
                { id: "e2", source: "integration-hubspot", target: "integration-stripe-sub" },
                { id: "e3", source: "integration-hubspot", target: "integration-mixpanel" },
                { id: "e4", source: "integration-hubspot", target: "integration-hubspot-health" },
                { id: "e5", source: "integration-stripe-sub", target: "llm-assess" },
                { id: "e6", source: "integration-mixpanel", target: "llm-assess" },
                { id: "e7", source: "integration-hubspot-health", target: "llm-assess" },
                { id: "e8", source: "llm-assess", target: "llm-message" },
                { id: "e9", source: "llm-message", target: "router-strategy" },
                {
                    id: "e10",
                    source: "router-strategy",
                    target: "integration-gmail-auto",
                    sourceHandle: "auto"
                },
                {
                    id: "e11",
                    source: "router-strategy",
                    target: "integration-hubspot-opp",
                    sourceHandle: "sales"
                },
                {
                    id: "e12",
                    source: "router-strategy",
                    target: "integration-slack-escalate",
                    sourceHandle: "risk"
                },
                {
                    id: "e13",
                    source: "integration-hubspot-opp",
                    target: "integration-hubspot-task"
                },
                {
                    id: "e14",
                    source: "integration-hubspot-task",
                    target: "integration-gmail-outreach"
                },
                {
                    id: "e15",
                    source: "integration-slack-escalate",
                    target: "integration-gmail-outreach"
                },
                { id: "e16", source: "integration-gmail-auto", target: "integration-sheets" },
                { id: "e17", source: "integration-gmail-outreach", target: "integration-sheets" },
                { id: "e18", source: "integration-sheets", target: "llm-forecast" },
                { id: "e19", source: "llm-forecast", target: "integration-slack" },
                { id: "e20", source: "integration-slack", target: "integration-gmail-report" },
                { id: "e21", source: "integration-gmail-report", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // ADDITIONAL SALES TEMPLATES (2 templates to reach 10)
    // ========================================================================

    // Sales: Proposal Generator
    {
        name: "AI Proposal Generator",
        description:
            "Generate customized sales proposals using AI. Analyze deal context, company info, and requirements to create professional, tailored proposals with dynamic pricing.",
        category: "sales",
        tags: ["proposals", "ai-generation", "sales-automation", "documents"],
        required_integrations: ["salesforce", "google-docs", "gmail", "slack"],
        featured: true,
        definition: {
            name: "AI Proposal Generator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Proposal Requested",
                        triggerType: "webhook",
                        webhookProvider: "salesforce",
                        description: "Triggered when proposal is requested for an opportunity"
                    }
                },
                {
                    id: "integration-salesforce",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Opportunity Data",
                        provider: "salesforce",
                        operation: "getOpportunity"
                    }
                },
                {
                    id: "integration-salesforce-account",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Account Info",
                        provider: "salesforce",
                        operation: "getAccount"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Requirements",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze the deal context and identify key requirements:\n\nOpportunity: {{opportunity}}\nAccount: {{account}}\n\nIdentify: pain points, desired outcomes, decision criteria, budget considerations.",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-proposal",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Proposal",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a professional sales proposal:\n\n{{analysis.text}}\n\nInclude: executive summary, solution overview, implementation timeline, pricing options, ROI projections, next steps.",
                        outputVariable: "proposal"
                    }
                },
                {
                    id: "llm-pricing",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Calculate Pricing",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate pricing options based on:\n\nRequirements: {{analysis.text}}\nBudget signals: {{opportunity.budget}}\n\nCreate 3 tiers: Good, Better, Best with clear value differentiation.",
                        outputVariable: "pricing"
                    }
                },
                {
                    id: "integration-docs",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Proposal Doc",
                        provider: "google-docs",
                        operation: "createDocument"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Proposal",
                        reviewPrompt:
                            "Review generated proposal for accuracy and customize as needed",
                        outputVariable: "approvedProposal"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Proposal",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-salesforce-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Opportunity",
                        provider: "salesforce",
                        operation: "updateOpportunity"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Sales Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#sales"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Proposal Sent",
                        outputName: "result",
                        value: "{{proposal}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-salesforce" },
                {
                    id: "e2",
                    source: "integration-salesforce",
                    target: "integration-salesforce-account"
                },
                { id: "e3", source: "integration-salesforce-account", target: "llm-analyze" },
                { id: "e4", source: "llm-analyze", target: "llm-proposal" },
                { id: "e5", source: "llm-analyze", target: "llm-pricing" },
                { id: "e6", source: "llm-proposal", target: "integration-docs" },
                { id: "e7", source: "llm-pricing", target: "integration-docs" },
                { id: "e8", source: "integration-docs", target: "humanReview-1" },
                { id: "e9", source: "humanReview-1", target: "integration-gmail" },
                { id: "e10", source: "integration-gmail", target: "integration-salesforce-update" },
                { id: "e11", source: "integration-salesforce-update", target: "integration-slack" },
                { id: "e12", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Sales: Win/Loss Analysis (15 nodes - with parallel data, outcome routing, parallel outputs)
    {
        name: "Win/Loss Analysis Pipeline",
        description:
            "Analyze closed deals to identify patterns. Aggregate feedback, interview transcripts, and deal data to generate actionable insights for improving win rates.",
        category: "sales",
        tags: ["analytics", "win-loss", "insights", "sales-intelligence"],
        required_integrations: ["salesforce", "hubspot", "notion", "slack", "gmail"],
        featured: false,
        definition: {
            name: "Win/Loss Analysis Pipeline",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Deal Closed",
                        triggerType: "webhook",
                        webhookProvider: "salesforce",
                        description: "Triggered when opportunity is closed won or lost"
                    }
                },
                // Parallel data fetching
                {
                    id: "integration-salesforce",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Deal Details",
                        provider: "salesforce",
                        operation: "getOpportunity"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Engagement History",
                        provider: "hubspot",
                        operation: "listEmails"
                    }
                },
                {
                    id: "integration-hubspot-notes",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Call Notes",
                        provider: "hubspot",
                        operation: "listNotes"
                    }
                },
                {
                    id: "transform-merge",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Merge Deal Data",
                        transformType: "merge",
                        outputVariable: "dealContext"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Deal Factors",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this closed deal:\n\n{{dealContext}}\n\nIdentify: outcome (won/lost), key factors, decision influences, competitive dynamics.",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "router-outcome",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Outcome",
                        routerType: "llm",
                        routes: ["won", "lost", "no_decision"],
                        prompt: "Based on {{analysis.text}}, what was the deal outcome?"
                    }
                },
                // Won path - success factors
                {
                    id: "llm-won",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Win Factors",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze winning factors:\n\n{{analysis.text}}\n\nIdentify: what worked, rep behaviors to replicate, messaging that resonated.",
                        outputVariable: "winFactors"
                    }
                },
                // Lost path - improvement opportunities
                {
                    id: "llm-lost",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Loss Analysis",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze loss factors:\n\n{{analysis.text}}\n\nIdentify: what went wrong, objections not handled, competitive gaps, process improvements.",
                        outputVariable: "lossFactors"
                    }
                },
                // No decision path
                {
                    id: "llm-nodecision",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Stall Analysis",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze stalled deal:\n\n{{analysis.text}}\n\nIdentify: why no decision, stakeholder gaps, timing issues, re-engagement opportunities.",
                        outputVariable: "stallFactors"
                    }
                },
                {
                    id: "transform-compile",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Insights",
                        transformType: "merge",
                        outputVariable: "insights"
                    }
                },
                // Parallel outputs
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save Analysis",
                        provider: "notion",
                        operation: "createPage",
                        database: "Win/Loss Analysis"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Share Insights",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#sales-insights"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Rep",
                        provider: "gmail",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analysis Complete",
                        outputName: "result",
                        value: "{{insights}}"
                    }
                }
            ],
            edges: [
                // Parallel data fetching
                { id: "e1", source: "trigger-1", target: "integration-salesforce" },
                { id: "e2", source: "trigger-1", target: "integration-hubspot" },
                { id: "e3", source: "trigger-1", target: "integration-hubspot-notes" },
                // Fan-in to merge
                { id: "e4", source: "integration-salesforce", target: "transform-merge" },
                { id: "e5", source: "integration-hubspot", target: "transform-merge" },
                { id: "e6", source: "integration-hubspot-notes", target: "transform-merge" },
                // Analysis and routing
                { id: "e7", source: "transform-merge", target: "llm-analyze" },
                { id: "e8", source: "llm-analyze", target: "router-outcome" },
                // Fan-out by outcome
                { id: "e9", source: "router-outcome", target: "llm-won", sourceHandle: "won" },
                { id: "e10", source: "router-outcome", target: "llm-lost", sourceHandle: "lost" },
                {
                    id: "e11",
                    source: "router-outcome",
                    target: "llm-nodecision",
                    sourceHandle: "no_decision"
                },
                // Fan-in to compile
                { id: "e12", source: "llm-won", target: "transform-compile" },
                { id: "e13", source: "llm-lost", target: "transform-compile" },
                { id: "e14", source: "llm-nodecision", target: "transform-compile" },
                // Parallel outputs
                { id: "e15", source: "transform-compile", target: "integration-notion" },
                { id: "e16", source: "transform-compile", target: "integration-slack" },
                { id: "e17", source: "transform-compile", target: "integration-gmail" },
                // Fan-in to output
                { id: "e18", source: "integration-notion", target: "output-1" },
                { id: "e19", source: "integration-slack", target: "output-1" },
                { id: "e20", source: "integration-gmail", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // ADDITIONAL SUPPORT TEMPLATES (5 templates to reach 10)
    // ========================================================================

    // Support: Knowledge Base Auto-Updater
    {
        name: "Knowledge Base Auto-Updater",
        description:
            "Automatically update knowledge base articles based on resolved support tickets. Identify new solutions, update existing articles, and flag gaps in documentation.",
        category: "support",
        tags: ["knowledge-base", "documentation", "automation", "self-service"],
        required_integrations: ["zendesk", "notion", "slack"],
        featured: true,
        definition: {
            name: "Knowledge Base Auto-Updater",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Ticket Resolved",
                        triggerType: "webhook",
                        webhookProvider: "zendesk",
                        description: "Triggered when support ticket is resolved"
                    }
                },
                {
                    id: "integration-zendesk",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Ticket Details",
                        provider: "zendesk",
                        operation: "getTicket"
                    }
                },
                {
                    id: "llm-extract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Solution",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract the solution from this resolved ticket:\n\n{{ticket}}\n\nIdentify: problem description, solution steps, root cause, keywords for searchability.",
                        outputVariable: "solution"
                    }
                },
                {
                    id: "integration-notion-search",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Search Existing Articles",
                        provider: "notion",
                        operation: "searchPages"
                    }
                },
                {
                    id: "llm-compare",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compare to Existing",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Compare new solution to existing KB articles:\n\nNew: {{solution.text}}\nExisting: {{existingArticles}}\n\nDetermine: is this new content, update to existing, or duplicate?",
                        outputVariable: "comparison"
                    }
                },
                {
                    id: "router-action",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Determine Action",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on comparison:\n{{comparison.text}}\n\nWhat action is needed?",
                        routes: [
                            {
                                value: "new",
                                label: "Create New",
                                description: "Create new KB article"
                            },
                            {
                                value: "update",
                                label: "Update Existing",
                                description: "Update existing article"
                            },
                            { value: "skip", label: "Skip", description: "Already documented" }
                        ],
                        defaultRoute: "skip",
                        outputVariable: "actionRoute"
                    }
                },
                {
                    id: "llm-article",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Article",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a knowledge base article from:\n\n{{solution.text}}\n\nFormat: title, summary, step-by-step solution, related articles, keywords.",
                        outputVariable: "article"
                    }
                },
                {
                    id: "integration-notion-create",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create KB Article",
                        provider: "notion",
                        operation: "createPage",
                        database: "Knowledge Base"
                    }
                },
                {
                    id: "integration-notion-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update KB Article",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#knowledge-base"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "KB Updated",
                        outputName: "result",
                        value: "{{article}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-zendesk" },
                { id: "e2", source: "integration-zendesk", target: "llm-extract" },
                { id: "e3", source: "llm-extract", target: "integration-notion-search" },
                { id: "e4", source: "integration-notion-search", target: "llm-compare" },
                { id: "e5", source: "llm-compare", target: "router-action" },
                { id: "e6", source: "router-action", target: "llm-article", sourceHandle: "new" },
                {
                    id: "e7",
                    source: "router-action",
                    target: "llm-article",
                    sourceHandle: "update"
                },
                { id: "e8", source: "router-action", target: "output-1", sourceHandle: "skip" },
                { id: "e9", source: "llm-article", target: "integration-notion-create" },
                { id: "e10", source: "integration-notion-create", target: "integration-slack" },
                { id: "e11", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Support: Smart Escalation Manager
    {
        name: "Smart Escalation Manager",
        description:
            "Intelligent ticket escalation with context preservation. Analyze ticket history, customer sentiment, and urgency to route escalations with full context to the right team.",
        category: "support",
        tags: ["escalation", "routing", "context", "priority"],
        required_integrations: ["zendesk", "slack", "pagerduty"],
        featured: false,
        definition: {
            name: "Smart Escalation Manager",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Escalation Triggered",
                        triggerType: "webhook",
                        webhookProvider: "zendesk",
                        description: "Triggered when ticket is escalated"
                    }
                },
                {
                    id: "integration-zendesk",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Full Ticket History",
                        provider: "zendesk",
                        operation: "getTicket"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Escalation",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this escalation:\n\n{{ticket}}\n\nIdentify: root cause, customer sentiment, urgency level, technical complexity, business impact, previous resolution attempts.",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-summary",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Context Summary",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an executive summary for the escalation team:\n\n{{analysis.text}}\n\nInclude: customer background, issue timeline, impact, what's been tried, recommended next steps.",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "router-team",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route to Team",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on analysis:\n{{analysis.text}}\n\nWhich team should handle this?",
                        routes: [
                            {
                                value: "engineering",
                                label: "Engineering",
                                description: "Technical issue"
                            },
                            {
                                value: "senior-support",
                                label: "Senior Support",
                                description: "Complex support issue"
                            },
                            {
                                value: "management",
                                label: "Management",
                                description: "Executive escalation"
                            }
                        ],
                        defaultRoute: "senior-support",
                        outputVariable: "teamRoute"
                    }
                },
                {
                    id: "integration-pagerduty",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Page On-Call",
                        provider: "pagerduty",
                        operation: "createIncident"
                    }
                },
                {
                    id: "integration-zendesk-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Ticket",
                        provider: "zendesk",
                        operation: "updateTicket"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Team",
                        provider: "slack",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Escalation Routed",
                        outputName: "result",
                        value: "{{summary}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-zendesk" },
                { id: "e2", source: "integration-zendesk", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "llm-summary" },
                { id: "e4", source: "llm-summary", target: "router-team" },
                {
                    id: "e5",
                    source: "router-team",
                    target: "integration-pagerduty",
                    sourceHandle: "engineering"
                },
                {
                    id: "e6",
                    source: "router-team",
                    target: "integration-slack",
                    sourceHandle: "senior-support"
                },
                {
                    id: "e7",
                    source: "router-team",
                    target: "integration-slack",
                    sourceHandle: "management"
                },
                { id: "e8", source: "integration-pagerduty", target: "integration-zendesk-update" },
                { id: "e9", source: "integration-slack", target: "integration-zendesk-update" },
                { id: "e10", source: "integration-zendesk-update", target: "output-1" }
            ]
        }
    },

    // Support: Proactive Outreach
    {
        name: "Proactive Support Outreach",
        description:
            "Reach out to customers before they experience issues. Monitor usage patterns, detect anomalies, and trigger proactive support conversations.",
        category: "support",
        tags: ["proactive", "monitoring", "customer-success", "prevention"],
        required_integrations: ["mixpanel", "intercom", "slack"],
        featured: false,
        definition: {
            name: "Proactive Support Outreach",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Check",
                        triggerType: "schedule",
                        schedule: "0 10 * * *",
                        description: "Runs daily at 10am"
                    }
                },
                {
                    id: "integration-mixpanel",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Usage Patterns",
                        provider: "mixpanel",
                        operation: "queryEvents"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Detect Anomalies",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze usage patterns for anomalies:\n\n{{usageData}}\n\nIdentify: sudden drop in usage, error patterns, feature abandonment, unusual behavior. List customers at risk.",
                        outputVariable: "anomalies"
                    }
                },
                {
                    id: "conditional-issues",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Issues Detected?",
                        condition: "anomalies.atRiskCustomers.length > 0",
                        outputVariable: "hasIssues"
                    }
                },
                {
                    id: "llm-message",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Outreach",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create personalized outreach messages for at-risk customers:\n\n{{anomalies.text}}\n\nTone: helpful, not intrusive. Offer assistance without alarming them.",
                        outputVariable: "outreach"
                    }
                },
                {
                    id: "integration-intercom",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Messages",
                        provider: "intercom",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#customer-success"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Outreach Complete",
                        outputName: "result",
                        value: "{{outreach}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-mixpanel" },
                { id: "e2", source: "integration-mixpanel", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "conditional-issues" },
                {
                    id: "e4",
                    source: "conditional-issues",
                    target: "llm-message",
                    sourceHandle: "true"
                },
                {
                    id: "e5",
                    source: "conditional-issues",
                    target: "output-1",
                    sourceHandle: "false"
                },
                { id: "e6", source: "llm-message", target: "integration-intercom" },
                { id: "e7", source: "integration-intercom", target: "integration-slack" },
                { id: "e8", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Support: SLA Monitor & Alert
    {
        name: "SLA Monitor & Alert",
        description:
            "Real-time SLA monitoring with proactive alerts. Track response and resolution times, predict breaches before they happen, and escalate automatically.",
        category: "support",
        tags: ["sla", "monitoring", "alerts", "compliance"],
        required_integrations: ["zendesk", "slack", "pagerduty"],
        featured: false,
        definition: {
            name: "SLA Monitor & Alert",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Every 15 Minutes",
                        triggerType: "schedule",
                        schedule: "*/15 * * * *",
                        description: "Runs every 15 minutes"
                    }
                },
                {
                    id: "integration-zendesk",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Open Tickets",
                        provider: "zendesk",
                        operation: "listTickets"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze SLA Status",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze SLA status for tickets:\n\n{{tickets}}\n\nFor each ticket: time remaining, breach risk (high/medium/low), predicted breach time, recommended action.",
                        outputVariable: "slaStatus"
                    }
                },
                {
                    id: "router-risk",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Risk",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on SLA analysis:\n{{slaStatus.text}}\n\nDetermine alert level needed.",
                        routes: [
                            {
                                value: "critical",
                                label: "Critical",
                                description: "Breach imminent"
                            },
                            { value: "warning", label: "Warning", description: "At risk" },
                            { value: "ok", label: "OK", description: "On track" }
                        ],
                        defaultRoute: "ok",
                        outputVariable: "riskRoute"
                    }
                },
                {
                    id: "integration-pagerduty",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Page Supervisor",
                        provider: "pagerduty",
                        operation: "createIncident"
                    }
                },
                {
                    id: "integration-slack-warning",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Warning",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#support-alerts"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Metrics",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Complete",
                        outputName: "result",
                        value: "{{slaStatus}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-zendesk" },
                { id: "e2", source: "integration-zendesk", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "router-risk" },
                {
                    id: "e4",
                    source: "router-risk",
                    target: "integration-pagerduty",
                    sourceHandle: "critical"
                },
                {
                    id: "e5",
                    source: "router-risk",
                    target: "integration-slack-warning",
                    sourceHandle: "warning"
                },
                {
                    id: "e6",
                    source: "router-risk",
                    target: "integration-sheets",
                    sourceHandle: "ok"
                },
                { id: "e7", source: "integration-pagerduty", target: "integration-sheets" },
                { id: "e8", source: "integration-slack-warning", target: "integration-sheets" },
                { id: "e9", source: "integration-sheets", target: "output-1" }
            ]
        }
    },

    // Support: Bug Report Handler (15 nodes - with parallel data, priority routing, parallel actions)
    {
        name: "Bug Report Handler",
        description:
            "Intelligent bug report processing. Validate, deduplicate, prioritize, and route bug reports to engineering with full context and reproduction steps.",
        category: "support",
        tags: ["bugs", "triage", "engineering", "routing"],
        required_integrations: ["zendesk", "github", "slack", "gmail"],
        featured: false,
        definition: {
            name: "Bug Report Handler",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Bug Report Received",
                        triggerType: "webhook",
                        webhookProvider: "zendesk",
                        description: "Triggered when ticket is tagged as bug"
                    }
                },
                // Parallel data fetching
                {
                    id: "integration-zendesk",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Report Details",
                        provider: "zendesk",
                        operation: "getTicket"
                    }
                },
                {
                    id: "integration-github-search",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Search Existing Issues",
                        provider: "github",
                        operation: "listIssues"
                    }
                },
                {
                    id: "integration-zendesk-history",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get User History",
                        provider: "zendesk",
                        operation: "listTickets"
                    }
                },
                {
                    id: "transform-merge",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Merge Bug Context",
                        transformType: "merge",
                        outputVariable: "bugContext"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Bug",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this bug report:\n\n{{bugContext}}\n\nValidate: is it a real bug? Check duplicates. Determine priority (P0-critical, P1-high, P2-medium, P3-low).",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "router-priority",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Priority",
                        routerType: "llm",
                        routes: ["critical", "high", "normal"],
                        prompt: "Based on {{analysis.text}}, what is the bug priority level?"
                    }
                },
                // Critical path - immediate escalation
                {
                    id: "llm-critical",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Critical Bug Alert",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create critical bug alert:\n\n{{analysis.text}}\n\nFormat for immediate engineering attention. Include: impact scope, affected users, potential workaround.",
                        outputVariable: "criticalAlert"
                    }
                },
                // High priority path
                {
                    id: "llm-high",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "High Priority Issue",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create high priority issue:\n\n{{analysis.text}}\n\nFormat for sprint planning. Include: repro steps, expected vs actual, suggested fix.",
                        outputVariable: "highPriority"
                    }
                },
                // Normal priority path
                {
                    id: "llm-normal",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Standard Issue",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create standard bug issue:\n\n{{analysis.text}}\n\nFormat for backlog. Include: clear description, repro steps, acceptance criteria.",
                        outputVariable: "normalIssue"
                    }
                },
                {
                    id: "transform-compile",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Issue",
                        transformType: "merge",
                        outputVariable: "issueContent"
                    }
                },
                // Parallel actions
                {
                    id: "integration-github-create",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create GitHub Issue",
                        provider: "github",
                        operation: "createIssue"
                    }
                },
                {
                    id: "integration-zendesk-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Ticket",
                        provider: "zendesk",
                        operation: "updateTicket"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Engineering",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#engineering-bugs"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Bug Routed",
                        outputName: "result",
                        value: "{{issueContent}}"
                    }
                }
            ],
            edges: [
                // Parallel data fetching
                { id: "e1", source: "trigger-1", target: "integration-zendesk" },
                { id: "e2", source: "trigger-1", target: "integration-github-search" },
                { id: "e3", source: "trigger-1", target: "integration-zendesk-history" },
                // Fan-in to merge
                { id: "e4", source: "integration-zendesk", target: "transform-merge" },
                { id: "e5", source: "integration-github-search", target: "transform-merge" },
                { id: "e6", source: "integration-zendesk-history", target: "transform-merge" },
                // Analysis and routing
                { id: "e7", source: "transform-merge", target: "llm-analyze" },
                { id: "e8", source: "llm-analyze", target: "router-priority" },
                // Fan-out by priority
                {
                    id: "e9",
                    source: "router-priority",
                    target: "llm-critical",
                    sourceHandle: "critical"
                },
                { id: "e10", source: "router-priority", target: "llm-high", sourceHandle: "high" },
                {
                    id: "e11",
                    source: "router-priority",
                    target: "llm-normal",
                    sourceHandle: "normal"
                },
                // Fan-in to compile
                { id: "e12", source: "llm-critical", target: "transform-compile" },
                { id: "e13", source: "llm-high", target: "transform-compile" },
                { id: "e14", source: "llm-normal", target: "transform-compile" },
                // Parallel actions
                { id: "e15", source: "transform-compile", target: "integration-github-create" },
                { id: "e16", source: "transform-compile", target: "integration-zendesk-update" },
                { id: "e17", source: "transform-compile", target: "integration-slack" },
                // Fan-in to output
                { id: "e18", source: "integration-github-create", target: "output-1" },
                { id: "e19", source: "integration-zendesk-update", target: "output-1" },
                { id: "e20", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // ADDITIONAL E-COMMERCE TEMPLATES (3 templates to reach 10)
    // ========================================================================

    // E-commerce: Product Review Analyzer
    {
        name: "Product Review Analyzer",
        description:
            "Analyze product reviews at scale. Extract sentiment, identify common themes, flag quality issues, and generate actionable product improvement insights.",
        category: "ecommerce",
        tags: ["reviews", "sentiment", "analytics", "product-insights"],
        required_integrations: ["shopify", "airtable", "slack"],
        featured: true,
        definition: {
            name: "Product Review Analyzer",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Analysis",
                        triggerType: "schedule",
                        schedule: "0 6 * * *",
                        description: "Runs daily at 6am"
                    }
                },
                {
                    id: "integration-shopify",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch New Reviews",
                        provider: "shopify",
                        operation: "listProductReviews"
                    }
                },
                {
                    id: "llm-sentiment",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Sentiment",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze sentiment for each review:\n\n{{reviews}}\n\nClassify: positive/neutral/negative. Identify specific praise and complaints.",
                        outputVariable: "sentiment"
                    }
                },
                {
                    id: "llm-themes",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Themes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Identify recurring themes:\n\n{{sentiment.text}}\n\nGroup by: quality issues, shipping problems, sizing feedback, feature requests, praise categories.",
                        outputVariable: "themes"
                    }
                },
                {
                    id: "llm-insights",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Insights",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate actionable insights:\n\n{{themes.text}}\n\nProvide: priority improvements, quick wins, response templates for common issues.",
                        outputVariable: "insights"
                    }
                },
                {
                    id: "conditional-urgent",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Urgent Issues?",
                        condition: "insights.urgentIssues.length > 0",
                        outputVariable: "hasUrgent"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save Analysis",
                        provider: "airtable",
                        operation: "createRecord",
                        table: "Review Analysis"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Share Insights",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#product"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analysis Complete",
                        outputName: "result",
                        value: "{{insights}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-shopify" },
                { id: "e2", source: "integration-shopify", target: "llm-sentiment" },
                { id: "e3", source: "llm-sentiment", target: "llm-themes" },
                { id: "e4", source: "llm-themes", target: "llm-insights" },
                { id: "e5", source: "llm-insights", target: "conditional-urgent" },
                {
                    id: "e6",
                    source: "conditional-urgent",
                    target: "integration-slack",
                    sourceHandle: "true"
                },
                {
                    id: "e7",
                    source: "conditional-urgent",
                    target: "integration-airtable",
                    sourceHandle: "false"
                },
                { id: "e8", source: "integration-slack", target: "integration-airtable" },
                { id: "e9", source: "integration-airtable", target: "output-1" }
            ]
        }
    },

    // E-commerce: Dynamic Pricing Engine
    {
        name: "Dynamic Pricing Engine",
        description:
            "Intelligent pricing automation. Monitor competitor prices, analyze demand signals, and suggest optimal pricing adjustments to maximize revenue.",
        category: "ecommerce",
        tags: ["pricing", "dynamic", "competitive", "revenue-optimization"],
        required_integrations: ["shopify", "google-sheets", "slack"],
        featured: false,
        definition: {
            name: "Dynamic Pricing Engine",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Hourly Check",
                        triggerType: "schedule",
                        schedule: "0 * * * *",
                        description: "Runs every hour"
                    }
                },
                {
                    id: "integration-shopify-products",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Product Data",
                        provider: "shopify",
                        operation: "listProducts"
                    }
                },
                {
                    id: "integration-sheets-competitors",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Competitor Prices",
                        provider: "google-sheets",
                        operation: "getValues"
                    }
                },
                {
                    id: "integration-shopify-analytics",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Sales Data",
                        provider: "shopify",
                        operation: "getAnalytics"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Pricing",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze pricing opportunities:\n\nProducts: {{products}}\nCompetitor Prices: {{competitorPrices}}\nSales Data: {{salesData}}\n\nIdentify: underpriced items, overpriced items, demand elasticity, competitive gaps.",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-recommendations",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Recommendations",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate pricing recommendations:\n\n{{analysis.text}}\n\nFor each product: current price, recommended price, expected revenue impact, confidence level.",
                        outputVariable: "recommendations"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Changes",
                        reviewPrompt: "Review and approve pricing changes before applying",
                        outputVariable: "approvedChanges"
                    }
                },
                {
                    id: "integration-shopify-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Prices",
                        provider: "shopify",
                        operation: "updateProduct"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#pricing"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Pricing Updated",
                        outputName: "result",
                        value: "{{recommendations}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-shopify-products" },
                { id: "e2", source: "trigger-1", target: "integration-sheets-competitors" },
                { id: "e3", source: "trigger-1", target: "integration-shopify-analytics" },
                { id: "e4", source: "integration-shopify-products", target: "llm-analyze" },
                { id: "e5", source: "integration-sheets-competitors", target: "llm-analyze" },
                { id: "e6", source: "integration-shopify-analytics", target: "llm-analyze" },
                { id: "e7", source: "llm-analyze", target: "llm-recommendations" },
                { id: "e8", source: "llm-recommendations", target: "humanReview-1" },
                { id: "e9", source: "humanReview-1", target: "integration-shopify-update" },
                { id: "e10", source: "integration-shopify-update", target: "integration-slack" },
                { id: "e11", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // E-commerce: Customer Segmentation (15 nodes - with parallel data, segment routing, parallel outputs)
    {
        name: "Customer Segmentation Engine",
        description:
            "Automatically segment customers based on behavior, purchase history, and engagement. Generate targeted marketing lists and personalized recommendations.",
        category: "ecommerce",
        tags: ["segmentation", "personalization", "marketing", "analytics"],
        required_integrations: ["shopify", "klaviyo", "airtable", "slack", "gmail"],
        featured: false,
        definition: {
            name: "Customer Segmentation Engine",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Weekly Segmentation",
                        triggerType: "schedule",
                        schedule: "0 3 * * 0",
                        description: "Runs weekly on Sunday"
                    }
                },
                // Parallel data fetching
                {
                    id: "integration-shopify-customers",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Customer Data",
                        provider: "shopify",
                        operation: "listCustomers"
                    }
                },
                {
                    id: "integration-shopify-orders",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Order History",
                        provider: "shopify",
                        operation: "listOrders"
                    }
                },
                {
                    id: "integration-klaviyo-engagement",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Email Engagement",
                        provider: "klaviyo",
                        operation: "getListProfiles"
                    }
                },
                {
                    id: "transform-merge",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Merge Customer Data",
                        transformType: "merge",
                        outputVariable: "customerData"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Behavior",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze customer behavior:\n\n{{customerData}}\n\nCalculate RFM scores, lifetime value, churn risk. Categorize: vip, at_risk, growth_potential.",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "router-segment",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Segment",
                        routerType: "llm",
                        routes: ["vip", "at_risk", "growth_potential"],
                        prompt: "Based on {{analysis.text}}, what is the primary segment focus for campaigns?"
                    }
                },
                // VIP path
                {
                    id: "llm-vip",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "VIP Campaign",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create VIP customer campaign:\n\n{{analysis.text}}\n\nFocus: exclusive offers, early access, loyalty rewards, personalized recommendations.",
                        outputVariable: "vipCampaign"
                    }
                },
                // At-risk path
                {
                    id: "llm-atrisk",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Win-Back Campaign",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create win-back campaign:\n\n{{analysis.text}}\n\nFocus: re-engagement offers, we miss you messaging, special discounts, feedback requests.",
                        outputVariable: "winbackCampaign"
                    }
                },
                // Growth potential path
                {
                    id: "llm-growth",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Growth Campaign",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create growth campaign:\n\n{{analysis.text}}\n\nFocus: upsell, cross-sell, category expansion, subscription offers.",
                        outputVariable: "growthCampaign"
                    }
                },
                {
                    id: "transform-compile",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Campaigns",
                        transformType: "merge",
                        outputVariable: "campaigns"
                    }
                },
                // Parallel outputs
                {
                    id: "integration-klaviyo",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Lists",
                        provider: "klaviyo",
                        operation: "addProfilesToList"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save Segments",
                        provider: "airtable",
                        operation: "batchUpdateRecords"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Share Insights",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#marketing"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Segmentation Complete",
                        outputName: "result",
                        value: "{{campaigns}}"
                    }
                }
            ],
            edges: [
                // Parallel data fetching
                { id: "e1", source: "trigger-1", target: "integration-shopify-customers" },
                { id: "e2", source: "trigger-1", target: "integration-shopify-orders" },
                { id: "e3", source: "trigger-1", target: "integration-klaviyo-engagement" },
                // Fan-in to merge
                { id: "e4", source: "integration-shopify-customers", target: "transform-merge" },
                { id: "e5", source: "integration-shopify-orders", target: "transform-merge" },
                { id: "e6", source: "integration-klaviyo-engagement", target: "transform-merge" },
                // Analysis and routing
                { id: "e7", source: "transform-merge", target: "llm-analyze" },
                { id: "e8", source: "llm-analyze", target: "router-segment" },
                // Fan-out by segment
                { id: "e9", source: "router-segment", target: "llm-vip", sourceHandle: "vip" },
                {
                    id: "e10",
                    source: "router-segment",
                    target: "llm-atrisk",
                    sourceHandle: "at_risk"
                },
                {
                    id: "e11",
                    source: "router-segment",
                    target: "llm-growth",
                    sourceHandle: "growth_potential"
                },
                // Fan-in to compile
                { id: "e12", source: "llm-vip", target: "transform-compile" },
                { id: "e13", source: "llm-atrisk", target: "transform-compile" },
                { id: "e14", source: "llm-growth", target: "transform-compile" },
                // Parallel outputs
                { id: "e15", source: "transform-compile", target: "integration-klaviyo" },
                { id: "e16", source: "transform-compile", target: "integration-airtable" },
                { id: "e17", source: "transform-compile", target: "integration-slack" },
                // Fan-in to output
                { id: "e18", source: "integration-klaviyo", target: "output-1" },
                { id: "e19", source: "integration-airtable", target: "output-1" },
                { id: "e20", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // ADDITIONAL SAAS TEMPLATE (1 template to reach 10)
    // ========================================================================

    // SaaS: Churn Prediction Pipeline
    {
        name: "Churn Prediction Pipeline",
        description:
            "Predict customer churn before it happens. Analyze usage patterns, engagement signals, and account health to identify at-risk customers and trigger retention workflows.",
        category: "saas",
        tags: ["churn", "prediction", "retention", "customer-success"],
        required_integrations: ["mixpanel", "hubspot", "intercom", "slack"],
        featured: true,
        definition: {
            name: "Churn Prediction Pipeline",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Prediction",
                        triggerType: "schedule",
                        schedule: "0 7 * * *",
                        description: "Runs daily at 7am"
                    }
                },
                {
                    id: "integration-mixpanel",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Usage Data",
                        provider: "mixpanel",
                        operation: "queryEvents"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Account Health",
                        provider: "hubspot",
                        operation: "listCompanies"
                    }
                },
                {
                    id: "integration-intercom",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Support History",
                        provider: "intercom",
                        operation: "listConversations"
                    }
                },
                {
                    id: "llm-predict",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Predict Churn Risk",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Predict churn risk for each account:\n\nUsage: {{usageData}}\nHealth: {{accountHealth}}\nSupport: {{supportHistory}}\n\nScore 0-100 churn probability. Identify top risk factors.",
                        outputVariable: "predictions"
                    }
                },
                {
                    id: "router-risk",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Risk",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on churn predictions:\n{{predictions.text}}\n\nDetermine intervention level.",
                        routes: [
                            {
                                value: "high",
                                label: "High Risk",
                                description: ">70% churn probability"
                            },
                            {
                                value: "medium",
                                label: "Medium Risk",
                                description: "40-70% probability"
                            },
                            { value: "low", label: "Low Risk", description: "<40% probability" }
                        ],
                        defaultRoute: "low",
                        outputVariable: "riskRoute"
                    }
                },
                {
                    id: "llm-intervention",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Plan Intervention",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Plan retention intervention:\n\n{{predictions.text}}\n\nSuggest: outreach strategy, offer to make, talking points, best contact method.",
                        outputVariable: "intervention"
                    }
                },
                {
                    id: "integration-hubspot-task",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create CSM Task",
                        provider: "hubspot",
                        operation: "createTask"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert CS Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#customer-success"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Predictions",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Predictions Complete",
                        outputName: "result",
                        value: "{{predictions}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-mixpanel" },
                { id: "e2", source: "trigger-1", target: "integration-hubspot" },
                { id: "e3", source: "trigger-1", target: "integration-intercom" },
                { id: "e4", source: "integration-mixpanel", target: "llm-predict" },
                { id: "e5", source: "integration-hubspot", target: "llm-predict" },
                { id: "e6", source: "integration-intercom", target: "llm-predict" },
                { id: "e7", source: "llm-predict", target: "router-risk" },
                {
                    id: "e8",
                    source: "router-risk",
                    target: "llm-intervention",
                    sourceHandle: "high"
                },
                {
                    id: "e9",
                    source: "router-risk",
                    target: "integration-hubspot-task",
                    sourceHandle: "medium"
                },
                {
                    id: "e10",
                    source: "router-risk",
                    target: "integration-sheets",
                    sourceHandle: "low"
                },
                { id: "e11", source: "llm-intervention", target: "integration-slack" },
                { id: "e12", source: "integration-slack", target: "integration-hubspot-task" },
                { id: "e13", source: "integration-hubspot-task", target: "integration-sheets" },
                { id: "e14", source: "integration-sheets", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // ADDITIONAL HEALTHCARE TEMPLATES (7 templates to reach 10)
    // ========================================================================

    // Healthcare: Prescription Refill Workflow
    {
        name: "Prescription Refill Workflow",
        description:
            "Automate prescription refill requests. Validate eligibility, check for interactions, route to pharmacy or physician, and notify patients of status.",
        category: "healthcare",
        tags: ["prescriptions", "pharmacy", "automation", "patient-care"],
        required_integrations: ["gmail", "google-sheets", "slack"],
        featured: true,
        definition: {
            name: "Prescription Refill Workflow",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Refill Request",
                        triggerType: "webhook",
                        description: "Triggered when patient requests refill"
                    }
                },
                {
                    id: "llm-validate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Validate Request",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Validate refill request:\n\n{{request}}\n\nCheck: prescription still valid, refills remaining, too early for refill, patient identity confirmed.",
                        outputVariable: "validation"
                    }
                },
                {
                    id: "router-status",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route Request",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on validation:\n{{validation.text}}\n\nDetermine next step.",
                        routes: [
                            {
                                value: "approved",
                                label: "Auto-Approve",
                                description: "Eligible for automatic refill"
                            },
                            {
                                value: "review",
                                label: "Physician Review",
                                description: "Needs physician approval"
                            },
                            { value: "denied", label: "Denied", description: "Cannot be refilled" }
                        ],
                        defaultRoute: "review",
                        outputVariable: "statusRoute"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Physician Review",
                        reviewPrompt:
                            "Review prescription refill request for medical appropriateness",
                        outputVariable: "physicianApproval"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Records",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Patient",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Pharmacy",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#pharmacy"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Request Processed",
                        outputName: "result",
                        value: "{{validation}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-validate" },
                { id: "e2", source: "llm-validate", target: "router-status" },
                {
                    id: "e3",
                    source: "router-status",
                    target: "integration-slack",
                    sourceHandle: "approved"
                },
                {
                    id: "e4",
                    source: "router-status",
                    target: "humanReview-1",
                    sourceHandle: "review"
                },
                {
                    id: "e5",
                    source: "router-status",
                    target: "integration-gmail",
                    sourceHandle: "denied"
                },
                { id: "e6", source: "humanReview-1", target: "integration-slack" },
                { id: "e7", source: "integration-slack", target: "integration-sheets" },
                { id: "e8", source: "integration-sheets", target: "integration-gmail" },
                { id: "e9", source: "integration-gmail", target: "output-1" }
            ]
        }
    },

    // Healthcare: Insurance Verification
    {
        name: "Insurance Verification Bot",
        description:
            "Verify patient insurance coverage before appointments. Check eligibility, coverage limits, and pre-authorization requirements automatically.",
        category: "healthcare",
        tags: ["insurance", "verification", "billing", "automation"],
        required_integrations: ["gmail", "google-sheets", "slack"],
        featured: false,
        definition: {
            name: "Insurance Verification Bot",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Appointment Scheduled",
                        triggerType: "webhook",
                        description: "Triggered 48 hours before appointment"
                    }
                },
                {
                    id: "llm-extract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Insurance Info",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract insurance information:\n\n{{appointment}}\n\nIdentify: insurance provider, policy number, group number, subscriber info.",
                        outputVariable: "insuranceInfo"
                    }
                },
                {
                    id: "llm-verify",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Verify Coverage",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Verify insurance coverage:\n\n{{insuranceInfo.text}}\n\nCheck: active status, procedure coverage, deductible status, co-pay amount, pre-auth required.",
                        outputVariable: "verification"
                    }
                },
                {
                    id: "conditional-preauth",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Pre-Auth Needed?",
                        condition: "verification.preAuthRequired === true",
                        outputVariable: "needsPreAuth"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Verification",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Billing",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Pre-Auth Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#billing"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Verification Complete",
                        outputName: "result",
                        value: "{{verification}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-extract" },
                { id: "e2", source: "llm-extract", target: "llm-verify" },
                { id: "e3", source: "llm-verify", target: "conditional-preauth" },
                {
                    id: "e4",
                    source: "conditional-preauth",
                    target: "integration-slack",
                    sourceHandle: "true"
                },
                {
                    id: "e5",
                    source: "conditional-preauth",
                    target: "integration-sheets",
                    sourceHandle: "false"
                },
                { id: "e6", source: "integration-slack", target: "integration-sheets" },
                { id: "e7", source: "integration-sheets", target: "integration-gmail" },
                { id: "e8", source: "integration-gmail", target: "output-1" }
            ]
        }
    },

    // Healthcare: Care Coordination Hub (14 nodes - with parallel data, change type routing, parallel notifications)
    {
        name: "Care Coordination Hub",
        description:
            "Coordinate care across multiple providers. Sync treatment plans, share updates, and ensure all providers have current patient information.",
        category: "healthcare",
        tags: ["care-coordination", "multi-provider", "collaboration", "patient-care"],
        required_integrations: ["gmail", "google-docs", "slack", "google-sheets"],
        featured: false,
        definition: {
            name: "Care Coordination Hub",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Care Plan Updated",
                        triggerType: "webhook",
                        description: "Triggered when care plan is modified"
                    }
                },
                // Parallel data fetching
                {
                    id: "integration-docs-plan",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Care Plan",
                        provider: "google-docs",
                        operation: "getDocument"
                    }
                },
                {
                    id: "integration-sheets-providers",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Provider List",
                        provider: "google-sheets",
                        operation: "getValues"
                    }
                },
                {
                    id: "transform-merge",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Merge Context",
                        transformType: "merge",
                        outputVariable: "careContext"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Changes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze care plan changes:\n\n{{careContext}}\n\nIdentify: change type (medication, therapy, referral), urgency level, affected providers.",
                        outputVariable: "changeAnalysis"
                    }
                },
                {
                    id: "router-change",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Change Type",
                        routerType: "llm",
                        routes: ["medication", "therapy", "referral"],
                        prompt: "Based on {{changeAnalysis.text}}, select the primary change type."
                    }
                },
                // Medication change path
                {
                    id: "llm-medication",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Medication Alert",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create medication change notification:\n\n{{changeAnalysis.text}}\n\nInclude: drug interactions, dosage changes, pharmacy notification requirements.",
                        outputVariable: "medAlert"
                    }
                },
                // Therapy change path
                {
                    id: "llm-therapy",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Therapy Update",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create therapy update notification:\n\n{{changeAnalysis.text}}\n\nInclude: new treatment protocols, session adjustments, goals update.",
                        outputVariable: "therapyUpdate"
                    }
                },
                // Referral path
                {
                    id: "llm-referral",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Referral Notice",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create specialist referral notification:\n\n{{changeAnalysis.text}}\n\nInclude: referral reason, urgency, patient history summary.",
                        outputVariable: "referralNotice"
                    }
                },
                {
                    id: "transform-compile",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Notifications",
                        transformType: "merge",
                        outputVariable: "notifications"
                    }
                },
                // Parallel notifications
                {
                    id: "integration-docs-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Care Doc",
                        provider: "google-docs",
                        operation: "appendText"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Providers",
                        provider: "gmail",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Care Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#care-coordination"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Coordination Complete",
                        outputName: "result",
                        value: "{{notifications}}"
                    }
                }
            ],
            edges: [
                // Parallel data fetching
                { id: "e1", source: "trigger-1", target: "integration-docs-plan" },
                { id: "e2", source: "trigger-1", target: "integration-sheets-providers" },
                // Fan-in to merge
                { id: "e3", source: "integration-docs-plan", target: "transform-merge" },
                { id: "e4", source: "integration-sheets-providers", target: "transform-merge" },
                // Analysis and routing
                { id: "e5", source: "transform-merge", target: "llm-analyze" },
                { id: "e6", source: "llm-analyze", target: "router-change" },
                // Fan-out by change type
                {
                    id: "e7",
                    source: "router-change",
                    target: "llm-medication",
                    sourceHandle: "medication"
                },
                {
                    id: "e8",
                    source: "router-change",
                    target: "llm-therapy",
                    sourceHandle: "therapy"
                },
                {
                    id: "e9",
                    source: "router-change",
                    target: "llm-referral",
                    sourceHandle: "referral"
                },
                // Fan-in to compile
                { id: "e10", source: "llm-medication", target: "transform-compile" },
                { id: "e11", source: "llm-therapy", target: "transform-compile" },
                { id: "e12", source: "llm-referral", target: "transform-compile" },
                // Parallel notifications
                { id: "e13", source: "transform-compile", target: "integration-docs-update" },
                { id: "e14", source: "transform-compile", target: "integration-gmail" },
                { id: "e15", source: "transform-compile", target: "integration-slack" },
                // Fan-in to output
                { id: "e16", source: "integration-docs-update", target: "output-1" },
                { id: "e17", source: "integration-gmail", target: "output-1" },
                { id: "e18", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Healthcare: Discharge Planning
    {
        name: "Discharge Planning Coordinator",
        description:
            "Coordinate patient discharge from hospital. Arrange follow-up care, medication instructions, home health services, and post-discharge monitoring.",
        category: "healthcare",
        tags: ["discharge", "planning", "transitions", "post-acute"],
        required_integrations: ["gmail", "google-docs", "slack"],
        featured: false,
        definition: {
            name: "Discharge Planning Coordinator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Discharge Initiated",
                        triggerType: "webhook",
                        description: "Triggered when discharge is ordered"
                    }
                },
                {
                    id: "llm-assess",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Assess Discharge Needs",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Assess discharge needs:\n\n{{patient}}\n\nIdentify: required follow-ups, medication needs, home care requirements, equipment needs, transportation.",
                        outputVariable: "needs"
                    }
                },
                {
                    id: "llm-instructions",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Instructions",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create discharge instructions:\n\n{{needs.text}}\n\nInclude: medication schedule, activity restrictions, warning signs, follow-up appointments.",
                        outputVariable: "instructions"
                    }
                },
                {
                    id: "integration-docs",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Discharge Doc",
                        provider: "google-docs",
                        operation: "createDocument"
                    }
                },
                {
                    id: "integration-gmail-patient",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Patient",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-gmail-pcp",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify PCP",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Care Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#discharges"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Discharge Planned",
                        outputName: "result",
                        value: "{{instructions}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-assess" },
                { id: "e2", source: "llm-assess", target: "llm-instructions" },
                { id: "e3", source: "llm-instructions", target: "integration-docs" },
                { id: "e4", source: "integration-docs", target: "integration-gmail-patient" },
                { id: "e5", source: "integration-docs", target: "integration-gmail-pcp" },
                { id: "e6", source: "integration-gmail-patient", target: "integration-slack" },
                { id: "e7", source: "integration-gmail-pcp", target: "integration-slack" },
                { id: "e8", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Healthcare: Follow-up Scheduler (12 nodes - with parallel data fetching, urgency routing, parallel notifications)
    {
        name: "Patient Follow-up Scheduler",
        description:
            "Automatically schedule and manage patient follow-up appointments. Track compliance, send reminders, and reschedule missed appointments.",
        category: "healthcare",
        tags: ["scheduling", "follow-up", "reminders", "compliance"],
        required_integrations: ["google-calendar", "gmail", "slack", "google-sheets"],
        featured: false,
        definition: {
            name: "Patient Follow-up Scheduler",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Follow-up Needed",
                        triggerType: "webhook",
                        description: "Triggered when follow-up is required"
                    }
                },
                // Parallel data fetching
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Provider Availability",
                        provider: "google-calendar",
                        operation: "getFreeBusy"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Patient History",
                        provider: "google-sheets",
                        operation: "getValues"
                    }
                },
                {
                    id: "transform-merge",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Merge Data",
                        transformType: "merge",
                        outputVariable: "patientContext"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Urgency",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze follow-up urgency:\n\n{{patientContext}}\n\nConsider: condition type, treatment phase, missed appointments, compliance history. Return urgency: urgent, routine, or flexible.",
                        outputVariable: "urgencyAnalysis"
                    }
                },
                {
                    id: "router-urgency",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Urgency",
                        routerType: "llm",
                        routes: ["urgent", "routine", "flexible"],
                        prompt: "Based on analysis: {{urgencyAnalysis.text}}, select the appropriate urgency level."
                    }
                },
                // Urgent path - immediate scheduling
                {
                    id: "llm-urgent",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Priority Scheduling",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create urgent appointment message:\n\n{{patientContext}}\n\nEmphasize importance, offer earliest available slots, include direct booking link.",
                        outputVariable: "urgentMessage"
                    }
                },
                // Routine path - standard scheduling
                {
                    id: "llm-routine",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Standard Scheduling",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create routine follow-up message:\n\n{{patientContext}}\n\nOffer convenient time options, include self-scheduling link.",
                        outputVariable: "routineMessage"
                    }
                },
                // Flexible path - patient-driven
                {
                    id: "llm-flexible",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Flexible Scheduling",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create flexible scheduling message:\n\n{{patientContext}}\n\nAllow patient to choose timing, provide scheduling portal access.",
                        outputVariable: "flexibleMessage"
                    }
                },
                {
                    id: "transform-compile",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Message",
                        transformType: "merge",
                        outputVariable: "finalMessage"
                    }
                },
                // Parallel notifications
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send to Patient",
                        provider: "gmail",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Staff",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#scheduling"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Follow-up Scheduled",
                        outputName: "result",
                        value: "{{finalMessage}}"
                    }
                }
            ],
            edges: [
                // Parallel data fetching from trigger
                { id: "e1", source: "trigger-1", target: "integration-calendar" },
                { id: "e2", source: "trigger-1", target: "integration-sheets" },
                // Fan-in to merge
                { id: "e3", source: "integration-calendar", target: "transform-merge" },
                { id: "e4", source: "integration-sheets", target: "transform-merge" },
                // Analysis and routing
                { id: "e5", source: "transform-merge", target: "llm-analyze" },
                { id: "e6", source: "llm-analyze", target: "router-urgency" },
                // Fan-out by urgency
                {
                    id: "e7",
                    source: "router-urgency",
                    target: "llm-urgent",
                    sourceHandle: "urgent"
                },
                {
                    id: "e8",
                    source: "router-urgency",
                    target: "llm-routine",
                    sourceHandle: "routine"
                },
                {
                    id: "e9",
                    source: "router-urgency",
                    target: "llm-flexible",
                    sourceHandle: "flexible"
                },
                // Fan-in to compile
                { id: "e10", source: "llm-urgent", target: "transform-compile" },
                { id: "e11", source: "llm-routine", target: "transform-compile" },
                { id: "e12", source: "llm-flexible", target: "transform-compile" },
                // Parallel notifications
                { id: "e13", source: "transform-compile", target: "integration-gmail" },
                { id: "e14", source: "transform-compile", target: "integration-slack" },
                // Fan-in to output
                { id: "e15", source: "integration-gmail", target: "output-1" },
                { id: "e16", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Healthcare: Health Screening Reminder (14 nodes - with parallel data, screening type routing, parallel outreach)
    {
        name: "Health Screening Reminder",
        description:
            "Proactive preventive care reminders. Track patient age, history, and guidelines to send timely reminders for recommended health screenings.",
        category: "healthcare",
        tags: ["preventive", "screenings", "reminders", "wellness"],
        required_integrations: ["gmail", "google-sheets", "slack", "google-calendar"],
        featured: false,
        definition: {
            name: "Health Screening Reminder",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Monthly Check",
                        triggerType: "schedule",
                        schedule: "0 8 1 * *",
                        description: "Runs monthly on the 1st"
                    }
                },
                // Parallel data fetching
                {
                    id: "integration-sheets-patients",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Patient Records",
                        provider: "google-sheets",
                        operation: "getValues"
                    }
                },
                {
                    id: "integration-sheets-history",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Screening History",
                        provider: "google-sheets",
                        operation: "getValues"
                    }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Available Slots",
                        provider: "google-calendar",
                        operation: "getFreeBusy"
                    }
                },
                {
                    id: "transform-merge",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Merge Patient Data",
                        transformType: "merge",
                        outputVariable: "patientData"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Identify Due Screenings",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Identify patients due for screenings:\n\n{{patientData}}\n\nCheck against guidelines based on age, gender, risk factors. Categorize by screening type.",
                        outputVariable: "dueScreenings"
                    }
                },
                {
                    id: "router-type",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Type",
                        routerType: "llm",
                        routes: ["cancer_screening", "cardiovascular", "general_wellness"],
                        prompt: "Based on screening analysis, categorize the primary screening type for this batch."
                    }
                },
                // Cancer screening path
                {
                    id: "llm-cancer",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Cancer Screening Message",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create cancer screening reminder:\n\n{{dueScreenings.text}}\n\nInclude: mammogram, colonoscopy, skin check info. Emphasize early detection importance.",
                        outputVariable: "cancerMessage"
                    }
                },
                // Cardiovascular path
                {
                    id: "llm-cardio",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Heart Health Message",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create cardiovascular screening reminder:\n\n{{dueScreenings.text}}\n\nInclude: cholesterol, blood pressure, diabetes screening. Focus on heart health.",
                        outputVariable: "cardioMessage"
                    }
                },
                // General wellness path
                {
                    id: "llm-wellness",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wellness Check Message",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create general wellness reminder:\n\n{{dueScreenings.text}}\n\nInclude: annual physical, vision, hearing. Friendly wellness focus.",
                        outputVariable: "wellnessMessage"
                    }
                },
                {
                    id: "transform-compile",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Messages",
                        transformType: "merge",
                        outputVariable: "allMessages"
                    }
                },
                // Parallel outreach
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Patient Reminders",
                        provider: "gmail",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "integration-sheets-log",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Outreach",
                        provider: "google-sheets",
                        operation: "appendValues"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Care Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#preventive-care"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Reminders Sent",
                        outputName: "result",
                        value: "{{allMessages}}"
                    }
                }
            ],
            edges: [
                // Parallel data fetching
                { id: "e1", source: "trigger-1", target: "integration-sheets-patients" },
                { id: "e2", source: "trigger-1", target: "integration-sheets-history" },
                { id: "e3", source: "trigger-1", target: "integration-calendar" },
                // Fan-in to merge
                { id: "e4", source: "integration-sheets-patients", target: "transform-merge" },
                { id: "e5", source: "integration-sheets-history", target: "transform-merge" },
                { id: "e6", source: "integration-calendar", target: "transform-merge" },
                // Analysis and routing
                { id: "e7", source: "transform-merge", target: "llm-analyze" },
                { id: "e8", source: "llm-analyze", target: "router-type" },
                // Fan-out by screening type
                {
                    id: "e9",
                    source: "router-type",
                    target: "llm-cancer",
                    sourceHandle: "cancer_screening"
                },
                {
                    id: "e10",
                    source: "router-type",
                    target: "llm-cardio",
                    sourceHandle: "cardiovascular"
                },
                {
                    id: "e11",
                    source: "router-type",
                    target: "llm-wellness",
                    sourceHandle: "general_wellness"
                },
                // Fan-in to compile
                { id: "e12", source: "llm-cancer", target: "transform-compile" },
                { id: "e13", source: "llm-cardio", target: "transform-compile" },
                { id: "e14", source: "llm-wellness", target: "transform-compile" },
                // Parallel outreach
                { id: "e15", source: "transform-compile", target: "integration-gmail" },
                { id: "e16", source: "transform-compile", target: "integration-sheets-log" },
                { id: "e17", source: "transform-compile", target: "integration-slack" },
                // Fan-in to output
                { id: "e18", source: "integration-gmail", target: "output-1" },
                { id: "e19", source: "integration-sheets-log", target: "output-1" },
                { id: "e20", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // Healthcare: Clinical Trial Matching
    {
        name: "Clinical Trial Matcher",
        description:
            "Match patients to eligible clinical trials. Analyze patient criteria against trial requirements and notify research coordinators of potential matches.",
        category: "healthcare",
        tags: ["clinical-trials", "research", "matching", "recruitment"],
        required_integrations: ["gmail", "google-sheets", "slack"],
        featured: false,
        definition: {
            name: "Clinical Trial Matcher",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Weekly Matching",
                        triggerType: "schedule",
                        schedule: "0 9 * * 1",
                        description: "Runs weekly on Monday"
                    }
                },
                {
                    id: "integration-sheets-patients",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Patient Pool",
                        provider: "google-sheets",
                        operation: "getValues"
                    }
                },
                {
                    id: "integration-sheets-trials",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Active Trials",
                        provider: "google-sheets",
                        operation: "getValues"
                    }
                },
                {
                    id: "llm-match",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Match Patients to Trials",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Match patients to clinical trials:\n\nPatients: {{patients}}\nTrials: {{trials}}\n\nCheck inclusion/exclusion criteria. List matches with confidence score.",
                        outputVariable: "matches"
                    }
                },
                {
                    id: "llm-summary",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Summary",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create matching summary:\n\n{{matches.text}}\n\nFormat: by trial, list potential patients with key qualifying criteria.",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Coordinators",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to Research",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#clinical-research"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Matching Complete",
                        outputName: "result",
                        value: "{{summary}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-sheets-patients" },
                { id: "e2", source: "trigger-1", target: "integration-sheets-trials" },
                { id: "e3", source: "integration-sheets-patients", target: "llm-match" },
                { id: "e4", source: "integration-sheets-trials", target: "llm-match" },
                { id: "e5", source: "llm-match", target: "llm-summary" },
                { id: "e6", source: "llm-summary", target: "integration-gmail" },
                { id: "e7", source: "integration-gmail", target: "integration-slack" },
                { id: "e8", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // MICROSOFT ECOSYSTEM (4 templates)
    // ========================================================================

    // Microsoft Ecosystem: Teams Meeting Intelligence Hub (Featured)
    {
        name: "Teams Meeting Intelligence Hub",
        description:
            "Automatically process Teams meeting transcripts with AI. Categorize by meeting type (strategy, standup, client, other), extract action items, save notes to SharePoint, and send follow-up emails via Outlook.",
        category: "operations",
        tags: ["microsoft", "teams", "meetings", "ai", "transcription", "automation"],
        required_integrations: [
            "microsoft-teams",
            "microsoft-outlook",
            "sharepoint",
            "notion",
            "slack"
        ],
        featured: true,
        definition: {
            name: "Teams Meeting Intelligence Hub",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Teams Meeting Ended",
                        triggerType: "webhook",
                        provider: "microsoft-teams",
                        event: "meeting.ended",
                        description: "Triggered when a Teams meeting ends"
                    }
                },
                {
                    id: "integration-teams-transcript",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Transcript",
                        provider: "microsoft-teams",
                        operation: "getTranscript",
                        outputVariable: "transcript"
                    }
                },
                {
                    id: "llm-summarize",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Summary",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this meeting transcript and generate a comprehensive summary:\n\n{{transcript}}\n\nInclude: key discussion points, decisions made, action items with owners, and next steps.",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "router-content",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Content Type Router",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Based on this meeting summary, classify the meeting type:\n\n{{summary.text}}\n\nCategories: strategy (planning, roadmap), standup (daily sync, blockers), client (external stakeholders), other (general)",
                        routes: [
                            {
                                value: "strategy",
                                label: "Strategy Meeting",
                                description: "Planning and roadmap discussions"
                            },
                            {
                                value: "standup",
                                label: "Standup",
                                description: "Daily sync and blockers"
                            },
                            {
                                value: "client",
                                label: "Client Meeting",
                                description: "External stakeholders"
                            },
                            { value: "other", label: "Other", description: "General meetings" }
                        ],
                        defaultRoute: "other",
                        outputVariable: "meetingType"
                    }
                },
                {
                    id: "llm-strategy",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Decisions",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract strategic decisions and roadmap items from this strategy meeting:\n\n{{summary.text}}\n\nFormat as: Decision, Rationale, Owner, Timeline",
                        outputVariable: "strategyNotes"
                    }
                },
                {
                    id: "llm-standup",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Blockers",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract blockers and updates from this standup:\n\n{{summary.text}}\n\nFormat as: Person, Yesterday, Today, Blockers",
                        outputVariable: "standupNotes"
                    }
                },
                {
                    id: "llm-client",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract CRM Updates",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract client-related updates from this meeting:\n\n{{summary.text}}\n\nFormat as: Client concerns, Commitments made, Follow-up required, Relationship notes",
                        outputVariable: "clientNotes"
                    }
                },
                {
                    id: "llm-general",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Basic Notes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create concise meeting notes from:\n\n{{summary.text}}\n\nFormat as: Attendees, Topics discussed, Key points, Action items",
                        outputVariable: "generalNotes"
                    }
                },
                {
                    id: "router-actions",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Has Actions?",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Does this summary contain action items that need follow-up?\n\n{{summary.text}}",
                        routes: [
                            {
                                value: "yes",
                                label: "Has Actions",
                                description: "Action items identified"
                            },
                            { value: "no", label: "No Actions", description: "No follow-up needed" }
                        ],
                        defaultRoute: "no",
                        outputVariable: "hasActions"
                    }
                },
                {
                    id: "sharepoint-save",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save Notes",
                        provider: "sharepoint",
                        operation: "uploadFile"
                    }
                },
                {
                    id: "outlook-send",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Follow-up",
                        provider: "microsoft-outlook",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "notion-tasks",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Tasks",
                        provider: "notion",
                        operation: "createPage",
                        database: "Action Items"
                    }
                },
                {
                    id: "sharepoint-archive",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Archive Notes",
                        provider: "sharepoint",
                        operation: "uploadFile"
                    }
                },
                {
                    id: "teams-post",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Summary",
                        provider: "microsoft-teams",
                        operation: "sendMessage",
                        channel: "#meeting-notes"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Meeting Processed",
                        outputName: "result",
                        value: "{{summary}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-teams-transcript" },
                { id: "e2", source: "integration-teams-transcript", target: "llm-summarize" },
                { id: "e3", source: "llm-summarize", target: "router-content" },
                {
                    id: "e4",
                    source: "router-content",
                    target: "llm-strategy",
                    sourceHandle: "strategy"
                },
                {
                    id: "e5",
                    source: "router-content",
                    target: "llm-standup",
                    sourceHandle: "standup"
                },
                {
                    id: "e6",
                    source: "router-content",
                    target: "llm-client",
                    sourceHandle: "client"
                },
                {
                    id: "e7",
                    source: "router-content",
                    target: "llm-general",
                    sourceHandle: "other"
                },
                { id: "e8", source: "llm-strategy", target: "router-actions" },
                { id: "e9", source: "llm-standup", target: "router-actions" },
                { id: "e10", source: "llm-client", target: "router-actions" },
                { id: "e11", source: "llm-general", target: "sharepoint-archive" },
                {
                    id: "e12",
                    source: "router-actions",
                    target: "sharepoint-save",
                    sourceHandle: "yes"
                },
                {
                    id: "e13",
                    source: "router-actions",
                    target: "outlook-send",
                    sourceHandle: "yes"
                },
                {
                    id: "e14",
                    source: "router-actions",
                    target: "notion-tasks",
                    sourceHandle: "yes"
                },
                {
                    id: "e15",
                    source: "router-actions",
                    target: "sharepoint-archive",
                    sourceHandle: "no"
                },
                { id: "e16", source: "sharepoint-save", target: "teams-post" },
                { id: "e17", source: "outlook-send", target: "teams-post" },
                { id: "e18", source: "notion-tasks", target: "teams-post" },
                { id: "e19", source: "sharepoint-archive", target: "teams-post" },
                { id: "e20", source: "teams-post", target: "output-1" }
            ]
        }
    },

    // Microsoft Ecosystem: Microsoft 365 Document Approval Hub
    {
        name: "Microsoft 365 Document Approval Hub",
        description:
            "Route SharePoint documents through AI classification and department-specific approval workflows. Contracts go to legal, policies to HR, technical docs to engineering, with automated Teams notifications.",
        category: "operations",
        tags: ["microsoft", "sharepoint", "approval", "documents", "workflow"],
        required_integrations: [
            "sharepoint",
            "microsoft-teams",
            "microsoft-outlook",
            "microsoft-onedrive"
        ],
        featured: false,
        definition: {
            name: "Microsoft 365 Document Approval Hub",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "SharePoint New File",
                        triggerType: "webhook",
                        provider: "sharepoint",
                        event: "file.created",
                        description: "Triggered when a new file is uploaded"
                    }
                },
                {
                    id: "integration-sharepoint-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Metadata",
                        provider: "sharepoint",
                        operation: "getFile",
                        outputVariable: "fileMetadata"
                    }
                },
                {
                    id: "llm-classify",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Classify Document",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this document metadata and classify it:\n\nFilename: {{fileMetadata.name}}\nPath: {{fileMetadata.path}}\n\nClassify as: contract, policy, technical, general",
                        outputVariable: "classification"
                    }
                },
                {
                    id: "router-type",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Document Type",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route this document based on classification:\n\n{{classification.text}}",
                        routes: [
                            {
                                value: "contract",
                                label: "Contract",
                                description: "Legal documents"
                            },
                            { value: "policy", label: "Policy", description: "HR policies" },
                            {
                                value: "technical",
                                label: "Technical",
                                description: "Engineering docs"
                            },
                            { value: "general", label: "General", description: "Other documents" }
                        ],
                        defaultRoute: "general",
                        outputVariable: "docType"
                    }
                },
                {
                    id: "teams-legal",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Legal",
                        provider: "microsoft-teams",
                        operation: "sendMessage",
                        channel: "#legal"
                    }
                },
                {
                    id: "teams-hr",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify HR",
                        provider: "microsoft-teams",
                        operation: "sendMessage",
                        channel: "#hr"
                    }
                },
                {
                    id: "teams-eng",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Engineering",
                        provider: "microsoft-teams",
                        operation: "sendMessage",
                        channel: "#engineering"
                    }
                },
                {
                    id: "teams-ops",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Operations",
                        provider: "microsoft-teams",
                        operation: "sendMessage",
                        channel: "#operations"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Approve/Reject",
                        reviewPrompt: "Review document for approval",
                        outputVariable: "reviewDecision"
                    }
                },
                {
                    id: "router-decision",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Decision Router",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route based on review decision:\n\n{{reviewDecision}}",
                        routes: [
                            {
                                value: "approve",
                                label: "Approved",
                                description: "Document approved"
                            },
                            { value: "reject", label: "Rejected", description: "Document rejected" }
                        ],
                        defaultRoute: "approve",
                        outputVariable: "finalDecision"
                    }
                },
                {
                    id: "onedrive-move",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Move to Approved",
                        provider: "microsoft-onedrive",
                        operation: "moveFile"
                    }
                },
                {
                    id: "outlook-notify",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Author",
                        provider: "microsoft-outlook",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "outlook-revisions",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Request Changes",
                        provider: "microsoft-outlook",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Document Processed",
                        outputName: "result",
                        value: "{{finalDecision}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-sharepoint-get" },
                { id: "e2", source: "integration-sharepoint-get", target: "llm-classify" },
                { id: "e3", source: "llm-classify", target: "router-type" },
                {
                    id: "e4",
                    source: "router-type",
                    target: "teams-legal",
                    sourceHandle: "contract"
                },
                { id: "e5", source: "router-type", target: "teams-hr", sourceHandle: "policy" },
                { id: "e6", source: "router-type", target: "teams-eng", sourceHandle: "technical" },
                { id: "e7", source: "router-type", target: "teams-ops", sourceHandle: "general" },
                { id: "e8", source: "teams-legal", target: "humanReview-1" },
                { id: "e9", source: "teams-hr", target: "humanReview-1" },
                { id: "e10", source: "teams-eng", target: "humanReview-1" },
                { id: "e11", source: "teams-ops", target: "humanReview-1" },
                { id: "e12", source: "humanReview-1", target: "router-decision" },
                {
                    id: "e13",
                    source: "router-decision",
                    target: "onedrive-move",
                    sourceHandle: "approve"
                },
                {
                    id: "e14",
                    source: "router-decision",
                    target: "outlook-notify",
                    sourceHandle: "approve"
                },
                {
                    id: "e15",
                    source: "router-decision",
                    target: "outlook-revisions",
                    sourceHandle: "reject"
                },
                { id: "e16", source: "onedrive-move", target: "output-1" },
                { id: "e17", source: "outlook-notify", target: "output-1" },
                { id: "e18", source: "outlook-revisions", target: "output-1" }
            ]
        }
    },

    // Microsoft Ecosystem: Outlook Smart Inbox Manager
    {
        name: "Outlook Smart Inbox Manager",
        description:
            "AI-powered email triage for shared mailboxes. Categorize incoming emails by intent and urgency, route to appropriate Teams channels, draft responses, and log interactions to SharePoint.",
        category: "support",
        tags: ["microsoft", "outlook", "email", "triage", "ai", "automation"],
        required_integrations: ["microsoft-outlook", "microsoft-teams", "sharepoint", "hubspot"],
        featured: false,
        definition: {
            name: "Outlook Smart Inbox Manager",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Email",
                        triggerType: "webhook",
                        provider: "microsoft-outlook",
                        event: "mail.received",
                        description: "New email in shared mailbox"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this email and determine:\n1. Category: support, sales, billing, inquiry, spam\n2. Urgency: urgent, normal\n3. Sentiment: positive, neutral, negative\n\nEmail: {{trigger.email}}",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "router-category",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Category",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route this email based on analysis:\n\n{{analysis.text}}",
                        routes: [
                            { value: "support", label: "Support", description: "Support requests" },
                            { value: "sales", label: "Sales", description: "Sales inquiries" },
                            { value: "billing", label: "Billing", description: "Billing issues" },
                            {
                                value: "inquiry",
                                label: "Inquiry",
                                description: "General questions"
                            },
                            { value: "spam", label: "Spam", description: "Junk mail" }
                        ],
                        defaultRoute: "inquiry",
                        outputVariable: "category"
                    }
                },
                {
                    id: "router-urgency",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Support Urgency",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Is this support request urgent?\n\n{{analysis.text}}",
                        routes: [
                            {
                                value: "urgent",
                                label: "Urgent",
                                description: "Requires immediate attention"
                            },
                            { value: "normal", label: "Normal", description: "Standard priority" }
                        ],
                        defaultRoute: "normal",
                        outputVariable: "urgency"
                    }
                },
                {
                    id: "hubspot-lead",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Lead",
                        provider: "hubspot",
                        operation: "createContact"
                    }
                },
                {
                    id: "teams-finance",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Finance",
                        provider: "microsoft-teams",
                        operation: "sendMessage",
                        channel: "#finance"
                    }
                },
                {
                    id: "teams-info",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "General Info",
                        provider: "microsoft-teams",
                        operation: "sendMessage",
                        channel: "#general"
                    }
                },
                {
                    id: "outlook-archive",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Archive Spam",
                        provider: "microsoft-outlook",
                        operation: "moveEmail"
                    }
                },
                {
                    id: "teams-urgent",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Urgent Support",
                        provider: "microsoft-teams",
                        operation: "sendMessage",
                        channel: "#support-urgent"
                    }
                },
                {
                    id: "teams-support",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Normal Support",
                        provider: "microsoft-teams",
                        operation: "sendMessage",
                        channel: "#support"
                    }
                },
                {
                    id: "llm-draft",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Draft Response",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Draft a professional response to this email:\n\n{{trigger.email}}\n\nAnalysis: {{analysis.text}}",
                        outputVariable: "draftResponse"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review & Edit",
                        reviewPrompt: "Review and edit the draft response before sending",
                        outputVariable: "finalResponse"
                    }
                },
                {
                    id: "outlook-send",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Reply",
                        provider: "microsoft-outlook",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "sharepoint-log",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Interaction",
                        provider: "sharepoint",
                        operation: "createListItem"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Processed",
                        outputName: "result",
                        value: "{{category}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-analyze" },
                { id: "e2", source: "llm-analyze", target: "router-category" },
                {
                    id: "e3",
                    source: "router-category",
                    target: "router-urgency",
                    sourceHandle: "support"
                },
                {
                    id: "e4",
                    source: "router-category",
                    target: "hubspot-lead",
                    sourceHandle: "sales"
                },
                {
                    id: "e5",
                    source: "router-category",
                    target: "teams-finance",
                    sourceHandle: "billing"
                },
                {
                    id: "e6",
                    source: "router-category",
                    target: "teams-info",
                    sourceHandle: "inquiry"
                },
                {
                    id: "e7",
                    source: "router-category",
                    target: "outlook-archive",
                    sourceHandle: "spam"
                },
                {
                    id: "e8",
                    source: "router-urgency",
                    target: "teams-urgent",
                    sourceHandle: "urgent"
                },
                {
                    id: "e9",
                    source: "router-urgency",
                    target: "teams-support",
                    sourceHandle: "normal"
                },
                { id: "e10", source: "teams-urgent", target: "llm-draft" },
                { id: "e11", source: "teams-support", target: "llm-draft" },
                { id: "e12", source: "llm-draft", target: "humanReview-1" },
                { id: "e13", source: "humanReview-1", target: "outlook-send" },
                { id: "e14", source: "outlook-send", target: "sharepoint-log" },
                { id: "e15", source: "hubspot-lead", target: "output-1" },
                { id: "e16", source: "teams-finance", target: "output-1" },
                { id: "e17", source: "teams-info", target: "output-1" },
                { id: "e18", source: "outlook-archive", target: "output-1" },
                { id: "e19", source: "sharepoint-log", target: "output-1" }
            ]
        }
    },

    // Microsoft Ecosystem: SharePoint Site Provisioning Orchestrator
    {
        name: "SharePoint Site Provisioning Orchestrator",
        description:
            "Automate SharePoint site creation with parallel folder setup, Teams channel linking, and personalized welcome guides. Includes notifications to site owners and team announcements.",
        category: "operations",
        tags: ["microsoft", "sharepoint", "provisioning", "automation", "teams"],
        required_integrations: [
            "sharepoint",
            "microsoft-onedrive",
            "microsoft-teams",
            "microsoft-outlook"
        ],
        featured: false,
        definition: {
            name: "SharePoint Site Provisioning Orchestrator",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Site Request",
                        inputName: "siteRequest",
                        inputVariable: "siteRequest",
                        inputType: "json",
                        description: '{"name": "", "type": "", "owner": "", "description": ""}'
                    }
                },
                {
                    id: "llm-plan",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Site Plan",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a site structure plan for:\n\nName: {{siteRequest.name}}\nType: {{siteRequest.type}}\nOwner: {{siteRequest.owner}}\n\nInclude: folder structure, permissions, and recommended document libraries.",
                        outputVariable: "sitePlan"
                    }
                },
                {
                    id: "sharepoint-create",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Site",
                        provider: "sharepoint",
                        operation: "createSite"
                    }
                },
                {
                    id: "onedrive-folders",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Folders",
                        provider: "microsoft-onedrive",
                        operation: "createFolder"
                    }
                },
                {
                    id: "teams-channel",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Link Channel",
                        provider: "microsoft-teams",
                        operation: "createChannel"
                    }
                },
                {
                    id: "transform-compile",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Details",
                        transformType: "template",
                        template:
                            '{"siteUrl": "{{sharepoint.url}}", "folders": "{{onedrive.folders}}", "channel": "{{teams.channel}}"}',
                        outputVariable: "siteDetails"
                    }
                },
                {
                    id: "llm-welcome",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Welcome Guide",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a welcome guide for the new SharePoint site:\n\nSite: {{siteRequest.name}}\nDetails: {{siteDetails}}\n\nInclude: getting started steps, key features, and best practices.",
                        outputVariable: "welcomeGuide"
                    }
                },
                {
                    id: "outlook-owner",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Owner",
                        provider: "microsoft-outlook",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "teams-announce",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Announce Site",
                        provider: "microsoft-teams",
                        operation: "sendMessage",
                        channel: "#announcements"
                    }
                },
                {
                    id: "sharepoint-doc",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save Guide",
                        provider: "sharepoint",
                        operation: "uploadFile"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Site Provisioned",
                        outputName: "result",
                        value: "{{siteDetails}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-plan" },
                { id: "e2", source: "llm-plan", target: "sharepoint-create" },
                { id: "e3", source: "llm-plan", target: "onedrive-folders" },
                { id: "e4", source: "llm-plan", target: "teams-channel" },
                { id: "e5", source: "sharepoint-create", target: "transform-compile" },
                { id: "e6", source: "onedrive-folders", target: "transform-compile" },
                { id: "e7", source: "teams-channel", target: "transform-compile" },
                { id: "e8", source: "transform-compile", target: "llm-welcome" },
                { id: "e9", source: "llm-welcome", target: "outlook-owner" },
                { id: "e10", source: "llm-welcome", target: "teams-announce" },
                { id: "e11", source: "llm-welcome", target: "sharepoint-doc" },
                { id: "e12", source: "outlook-owner", target: "output-1" },
                { id: "e13", source: "teams-announce", target: "output-1" },
                { id: "e14", source: "sharepoint-doc", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // HR & PEOPLE OPS (4 templates)
    // ========================================================================

    // HR: BambooHR Employee Lifecycle Hub (Featured)
    {
        name: "BambooHR Employee Lifecycle Hub",
        description:
            "Comprehensive employee lifecycle automation. Detect status changes (new hire, promotion, termination) and trigger appropriate workflows with onboarding tasks, announcements, and offboarding checklists.",
        category: "operations",
        tags: ["hr", "bamboohr", "employee", "lifecycle", "onboarding", "offboarding"],
        required_integrations: ["bamboohr", "slack", "google-calendar", "gmail", "notion"],
        featured: true,
        definition: {
            name: "BambooHR Employee Lifecycle Hub",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Employee Status Change",
                        triggerType: "webhook",
                        provider: "bamboohr",
                        event: "employee.updated",
                        description: "Triggered when employee status changes"
                    }
                },
                {
                    id: "integration-bamboo-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Employee Details",
                        provider: "bamboohr",
                        operation: "getEmployee",
                        outputVariable: "employee"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Change Type",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this employee status change:\n\n{{employee}}\n\nDetermine: Is this a new_hire, promotion, or termination?",
                        outputVariable: "changeAnalysis"
                    }
                },
                {
                    id: "router-lifecycle",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Status Type",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route based on employee lifecycle event:\n\n{{changeAnalysis.text}}",
                        routes: [
                            {
                                value: "new_hire",
                                label: "New Hire",
                                description: "Employee onboarding"
                            },
                            { value: "promotion", label: "Promotion", description: "Role change" },
                            {
                                value: "termination",
                                label: "Termination",
                                description: "Offboarding"
                            }
                        ],
                        defaultRoute: "new_hire",
                        outputVariable: "lifecycleType"
                    }
                },
                {
                    id: "llm-onboard",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Onboarding Plan",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an onboarding plan for:\n\n{{employee}}\n\nInclude: first week schedule, required training, team introductions, equipment setup.",
                        outputVariable: "onboardingPlan"
                    }
                },
                {
                    id: "llm-promo",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Transition Plan",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a promotion transition plan for:\n\n{{employee}}\n\nInclude: knowledge transfer, new responsibilities, announcement draft.",
                        outputVariable: "transitionPlan"
                    }
                },
                {
                    id: "llm-offboard",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Offboarding Plan",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an offboarding checklist for:\n\n{{employee}}\n\nInclude: knowledge transfer, access revocation, equipment return, exit interview.",
                        outputVariable: "offboardingPlan"
                    }
                },
                {
                    id: "slack-welcome",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Welcome Message",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#general"
                    }
                },
                {
                    id: "calendar-orient",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Orientation",
                        provider: "google-calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "gmail-welcome",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Welcome Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "slack-announce",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Announce Promotion",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#announcements"
                    }
                },
                {
                    id: "gmail-congrats",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Congratulations Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "slack-it",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "IT Notification",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#it-ops"
                    }
                },
                {
                    id: "calendar-exit",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Exit Interview",
                        provider: "google-calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "notion-checklist",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Offboarding Checklist",
                        provider: "notion",
                        operation: "createPage",
                        database: "Offboarding"
                    }
                },
                {
                    id: "notion-onboard-tasks",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Onboarding Tasks",
                        provider: "notion",
                        operation: "createPage",
                        database: "Onboarding"
                    }
                },
                {
                    id: "bamboo-update-promo",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Promotion Record",
                        provider: "bamboohr",
                        operation: "updateEmployee"
                    }
                },
                {
                    id: "bamboo-update-term",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Term Record",
                        provider: "bamboohr",
                        operation: "updateEmployee"
                    }
                },
                {
                    id: "integration-bamboo-final",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Status",
                        provider: "bamboohr",
                        operation: "updateEmployee"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Lifecycle Complete",
                        outputName: "result",
                        value: "{{lifecycleType}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-bamboo-get" },
                { id: "e2", source: "integration-bamboo-get", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "router-lifecycle" },
                {
                    id: "e4",
                    source: "router-lifecycle",
                    target: "llm-onboard",
                    sourceHandle: "new_hire"
                },
                {
                    id: "e5",
                    source: "router-lifecycle",
                    target: "llm-promo",
                    sourceHandle: "promotion"
                },
                {
                    id: "e6",
                    source: "router-lifecycle",
                    target: "llm-offboard",
                    sourceHandle: "termination"
                },
                { id: "e7", source: "llm-onboard", target: "slack-welcome" },
                { id: "e8", source: "llm-onboard", target: "calendar-orient" },
                { id: "e9", source: "llm-onboard", target: "gmail-welcome" },
                { id: "e10", source: "llm-promo", target: "slack-announce" },
                { id: "e11", source: "llm-promo", target: "gmail-congrats" },
                { id: "e12", source: "llm-offboard", target: "slack-it" },
                { id: "e13", source: "llm-offboard", target: "calendar-exit" },
                { id: "e14", source: "llm-offboard", target: "notion-checklist" },
                { id: "e15", source: "slack-welcome", target: "notion-onboard-tasks" },
                { id: "e16", source: "calendar-orient", target: "notion-onboard-tasks" },
                { id: "e17", source: "gmail-welcome", target: "notion-onboard-tasks" },
                { id: "e18", source: "slack-announce", target: "bamboo-update-promo" },
                { id: "e19", source: "gmail-congrats", target: "bamboo-update-promo" },
                { id: "e20", source: "slack-it", target: "bamboo-update-term" },
                { id: "e21", source: "calendar-exit", target: "bamboo-update-term" },
                { id: "e22", source: "notion-checklist", target: "bamboo-update-term" },
                { id: "e23", source: "notion-onboard-tasks", target: "integration-bamboo-final" },
                { id: "e24", source: "bamboo-update-promo", target: "integration-bamboo-final" },
                { id: "e25", source: "bamboo-update-term", target: "integration-bamboo-final" },
                { id: "e26", source: "integration-bamboo-final", target: "output-1" }
            ]
        }
    },

    // HR: Workday Payroll Exception Command Center
    {
        name: "Workday Payroll Exception Command Center",
        description:
            "Daily payroll exception monitoring with severity-based routing. Critical issues page on-call, high severity alerts go to Slack, and all exceptions are logged with automated daily reports.",
        category: "operations",
        tags: ["hr", "workday", "payroll", "monitoring", "alerts", "automation"],
        required_integrations: ["workday", "slack", "gmail", "google-sheets", "pagerduty"],
        featured: false,
        definition: {
            name: "Workday Payroll Exception Command Center",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Check",
                        triggerType: "schedule",
                        schedule: "0 6 * * *",
                        description: "Runs daily at 6 AM"
                    }
                },
                {
                    id: "integration-workday",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Exceptions",
                        provider: "workday",
                        operation: "getPayrollExceptions",
                        outputVariable: "exceptions"
                    }
                },
                {
                    id: "router-hasExceptions",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Has Exceptions?",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Are there any payroll exceptions?\n\n{{exceptions}}",
                        routes: [
                            {
                                value: "yes",
                                label: "Has Exceptions",
                                description: "Exceptions found"
                            },
                            { value: "no", label: "All Clear", description: "No exceptions" }
                        ],
                        defaultRoute: "no",
                        outputVariable: "hasExceptions"
                    }
                },
                {
                    id: "slack-allclear",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "All Clear",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#payroll"
                    }
                },
                {
                    id: "llm-categorize",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Categorize & Prioritize",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Categorize these payroll exceptions by severity:\n\n{{exceptions}}\n\nCategories: critical (payment failures), high (missing data), warning (pending approvals), info (notifications)",
                        outputVariable: "categorized"
                    }
                },
                {
                    id: "router-severity",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "By Severity",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "What is the highest severity in these exceptions?\n\n{{categorized.text}}",
                        routes: [
                            {
                                value: "critical",
                                label: "Critical",
                                description: "Payment failures"
                            },
                            { value: "high", label: "High", description: "Missing data" },
                            {
                                value: "warning",
                                label: "Warning",
                                description: "Pending approvals"
                            },
                            { value: "info", label: "Info", description: "Notifications only" }
                        ],
                        defaultRoute: "info",
                        outputVariable: "severity"
                    }
                },
                {
                    id: "pagerduty",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Page On-Call",
                        provider: "pagerduty",
                        operation: "createIncident"
                    }
                },
                {
                    id: "slack-incident",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Critical Alert",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#payroll-urgent"
                    }
                },
                {
                    id: "slack-high",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "High Priority",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#payroll"
                    }
                },
                {
                    id: "slack-warn",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Warning",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#payroll"
                    }
                },
                {
                    id: "sheets-log",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Exceptions",
                        provider: "google-sheets",
                        operation: "appendRow"
                    }
                },
                {
                    id: "gmail-director",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email HR Director",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "llm-report",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Report",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a daily payroll exception report:\n\n{{categorized.text}}\n\nInclude: summary stats, trends, recommended actions.",
                        outputVariable: "dailyReport"
                    }
                },
                {
                    id: "slack-summary",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Summary",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#payroll"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Complete",
                        outputName: "result",
                        value: "{{dailyReport}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-workday" },
                { id: "e2", source: "integration-workday", target: "router-hasExceptions" },
                {
                    id: "e3",
                    source: "router-hasExceptions",
                    target: "slack-allclear",
                    sourceHandle: "no"
                },
                {
                    id: "e4",
                    source: "router-hasExceptions",
                    target: "llm-categorize",
                    sourceHandle: "yes"
                },
                { id: "e5", source: "llm-categorize", target: "router-severity" },
                {
                    id: "e6",
                    source: "router-severity",
                    target: "pagerduty",
                    sourceHandle: "critical"
                },
                {
                    id: "e7",
                    source: "router-severity",
                    target: "slack-incident",
                    sourceHandle: "critical"
                },
                { id: "e8", source: "router-severity", target: "slack-high", sourceHandle: "high" },
                {
                    id: "e9",
                    source: "router-severity",
                    target: "slack-warn",
                    sourceHandle: "warning"
                },
                {
                    id: "e10",
                    source: "router-severity",
                    target: "sheets-log",
                    sourceHandle: "info"
                },
                { id: "e11", source: "pagerduty", target: "gmail-director" },
                { id: "e12", source: "slack-incident", target: "gmail-director" },
                { id: "e13", source: "slack-high", target: "sheets-log" },
                { id: "e14", source: "slack-warn", target: "sheets-log" },
                { id: "e15", source: "gmail-director", target: "sheets-log" },
                { id: "e16", source: "sheets-log", target: "llm-report" },
                { id: "e17", source: "llm-report", target: "slack-summary" },
                { id: "e18", source: "slack-allclear", target: "output-1" },
                { id: "e19", source: "slack-summary", target: "output-1" }
            ]
        }
    },

    // HR: Gusto PTO Request Orchestrator
    {
        name: "Gusto PTO Request Orchestrator",
        description:
            "Streamline PTO approvals with AI-powered coverage analysis. Notify managers, check team availability, route through approval workflow, and automatically update calendars upon approval.",
        category: "operations",
        tags: ["hr", "gusto", "pto", "time-off", "approval", "calendar"],
        required_integrations: ["gusto", "slack", "google-calendar", "gmail", "notion"],
        featured: false,
        definition: {
            name: "Gusto PTO Request Orchestrator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "PTO Request Submitted",
                        triggerType: "webhook",
                        provider: "gusto",
                        event: "time_off.requested",
                        description: "Triggered when PTO is requested"
                    }
                },
                {
                    id: "integration-gusto-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Request Details",
                        provider: "gusto",
                        operation: "getTimeOffRequest",
                        outputVariable: "ptoRequest"
                    }
                },
                {
                    id: "llm-coverage",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Coverage",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze team coverage for this PTO request:\n\n{{ptoRequest}}\n\nCheck: overlapping requests, critical dates, minimum coverage requirements.",
                        outputVariable: "coverageAnalysis"
                    }
                },
                {
                    id: "slack-manager",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Manager",
                        provider: "slack",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "notion-log",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Request",
                        provider: "notion",
                        operation: "createPage",
                        database: "PTO Requests"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Manager Approval",
                        reviewPrompt: "Review PTO request with coverage analysis",
                        outputVariable: "managerDecision"
                    }
                },
                {
                    id: "router-decision",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Approved?",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Was this PTO request approved?\n\n{{managerDecision}}",
                        routes: [
                            {
                                value: "approved",
                                label: "Approved",
                                description: "Request approved"
                            },
                            { value: "denied", label: "Denied", description: "Request denied" }
                        ],
                        defaultRoute: "approved",
                        outputVariable: "decision"
                    }
                },
                {
                    id: "calendar-block",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Block Calendar",
                        provider: "google-calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "gmail-confirm",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Confirmation Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "gmail-deny",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Denial Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-gusto-approve",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Approve in Gusto",
                        provider: "gusto",
                        operation: "approveTimeOff"
                    }
                },
                {
                    id: "integration-gusto-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Status",
                        provider: "gusto",
                        operation: "updateTimeOff"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Request Processed",
                        outputName: "result",
                        value: "{{decision}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-gusto-get" },
                { id: "e2", source: "integration-gusto-get", target: "llm-coverage" },
                { id: "e3", source: "llm-coverage", target: "slack-manager" },
                { id: "e4", source: "llm-coverage", target: "notion-log" },
                { id: "e5", source: "slack-manager", target: "humanReview-1" },
                { id: "e6", source: "notion-log", target: "humanReview-1" },
                { id: "e7", source: "humanReview-1", target: "router-decision" },
                {
                    id: "e8",
                    source: "router-decision",
                    target: "calendar-block",
                    sourceHandle: "approved"
                },
                {
                    id: "e9",
                    source: "router-decision",
                    target: "gmail-confirm",
                    sourceHandle: "approved"
                },
                {
                    id: "e10",
                    source: "router-decision",
                    target: "gmail-deny",
                    sourceHandle: "denied"
                },
                { id: "e11", source: "calendar-block", target: "integration-gusto-approve" },
                { id: "e12", source: "gmail-confirm", target: "integration-gusto-approve" },
                { id: "e13", source: "gmail-deny", target: "integration-gusto-update" },
                { id: "e14", source: "integration-gusto-approve", target: "output-1" },
                { id: "e15", source: "integration-gusto-update", target: "output-1" }
            ]
        }
    },

    // HR: Quarterly Review Cycle Coordinator
    {
        name: "Quarterly Review Cycle Coordinator",
        description:
            "Automate performance review cycles. Create department review pages, notify managers, send reminders for incomplete reviews, and generate leadership summaries when the cycle completes.",
        category: "operations",
        tags: ["hr", "performance", "reviews", "quarterly", "automation", "bamboohr"],
        required_integrations: ["bamboohr", "slack", "gmail", "notion", "google-calendar"],
        featured: false,
        definition: {
            name: "Quarterly Review Cycle Coordinator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Quarterly Trigger",
                        triggerType: "schedule",
                        schedule: "0 9 1 1,4,7,10 *",
                        description: "Runs quarterly on the 1st"
                    }
                },
                {
                    id: "integration-bamboo-employees",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Active Employees",
                        provider: "bamboohr",
                        operation: "listEmployees",
                        outputVariable: "employees"
                    }
                },
                {
                    id: "llm-schedule",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Schedule",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a review schedule by department:\n\n{{employees}}\n\nGroup by: Engineering, Sales, Operations, Customer Success. Set deadlines 2 weeks out.",
                        outputVariable: "reviewSchedule"
                    }
                },
                {
                    id: "notion-eng",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Engineering Reviews",
                        provider: "notion",
                        operation: "createPage",
                        database: "Performance Reviews"
                    }
                },
                {
                    id: "notion-sales",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Sales Reviews",
                        provider: "notion",
                        operation: "createPage",
                        database: "Performance Reviews"
                    }
                },
                {
                    id: "notion-ops",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Ops Reviews",
                        provider: "notion",
                        operation: "createPage",
                        database: "Performance Reviews"
                    }
                },
                {
                    id: "notion-cs",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "CS Reviews",
                        provider: "notion",
                        operation: "createPage",
                        database: "Performance Reviews"
                    }
                },
                {
                    id: "gmail-eng",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Eng Managers",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "gmail-sales",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Sales Managers",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "gmail-ops",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Ops Managers",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "gmail-cs",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email CS Managers",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "delay-1",
                    type: "delay",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait 2 Weeks",
                        delayType: "fixed",
                        duration: 1209600000,
                        description: "Wait for review completion"
                    }
                },
                {
                    id: "integration-bamboo-check",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Completion",
                        provider: "bamboohr",
                        operation: "getPerformanceReviews",
                        outputVariable: "reviewStatus"
                    }
                },
                {
                    id: "router-complete",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "All Complete?",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Are all reviews complete?\n\n{{reviewStatus}}",
                        routes: [
                            { value: "yes", label: "Complete", description: "All reviews done" },
                            {
                                value: "no",
                                label: "Incomplete",
                                description: "Some reviews pending"
                            }
                        ],
                        defaultRoute: "no",
                        outputVariable: "isComplete"
                    }
                },
                {
                    id: "slack-reminder",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Reminders",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#managers"
                    }
                },
                {
                    id: "llm-report",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Summary",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a quarterly review cycle summary:\n\n{{reviewStatus}}\n\nInclude: completion rates by department, key themes, promotion recommendations.",
                        outputVariable: "cycleSummary"
                    }
                },
                {
                    id: "slack-leadership",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Leadership Summary",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#leadership"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Cycle Complete",
                        outputName: "result",
                        value: "{{cycleSummary}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-bamboo-employees" },
                { id: "e2", source: "integration-bamboo-employees", target: "llm-schedule" },
                { id: "e3", source: "llm-schedule", target: "notion-eng" },
                { id: "e4", source: "llm-schedule", target: "notion-sales" },
                { id: "e5", source: "llm-schedule", target: "notion-ops" },
                { id: "e6", source: "llm-schedule", target: "notion-cs" },
                { id: "e7", source: "notion-eng", target: "gmail-eng" },
                { id: "e8", source: "notion-sales", target: "gmail-sales" },
                { id: "e9", source: "notion-ops", target: "gmail-ops" },
                { id: "e10", source: "notion-cs", target: "gmail-cs" },
                { id: "e11", source: "gmail-eng", target: "delay-1" },
                { id: "e12", source: "gmail-sales", target: "delay-1" },
                { id: "e13", source: "gmail-ops", target: "delay-1" },
                { id: "e14", source: "gmail-cs", target: "delay-1" },
                { id: "e15", source: "delay-1", target: "integration-bamboo-check" },
                { id: "e16", source: "integration-bamboo-check", target: "router-complete" },
                {
                    id: "e17",
                    source: "router-complete",
                    target: "slack-reminder",
                    sourceHandle: "no"
                },
                { id: "e18", source: "router-complete", target: "llm-report", sourceHandle: "yes" },
                { id: "e19", source: "slack-reminder", target: "output-1" },
                { id: "e20", source: "llm-report", target: "slack-leadership" },
                { id: "e21", source: "slack-leadership", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // FORMS & SURVEYS (4 templates)
    // ========================================================================

    // Forms: Typeform Lead Intelligence Engine (Featured)
    {
        name: "Typeform Lead Intelligence Engine",
        description:
            "Transform Typeform submissions into qualified leads. Enrich data with Apollo, score leads with AI, route hot leads to sales immediately, and nurture others with automated sequences.",
        category: "sales",
        tags: ["typeform", "leads", "scoring", "apollo", "hubspot", "automation"],
        required_integrations: ["typeform", "hubspot", "slack", "gmail", "apollo"],
        featured: true,
        definition: {
            name: "Typeform Lead Intelligence Engine",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Typeform Submission",
                        triggerType: "webhook",
                        provider: "typeform",
                        event: "form.submitted",
                        description: "Triggered when form is submitted"
                    }
                },
                {
                    id: "integration-typeform",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Responses",
                        provider: "typeform",
                        operation: "getResponse",
                        outputVariable: "formData"
                    }
                },
                {
                    id: "integration-apollo",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Enrich Lead",
                        provider: "apollo",
                        operation: "enrichPerson",
                        outputVariable: "enrichedData"
                    }
                },
                {
                    id: "llm-score",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Score Lead",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Score this lead 0-100 and analyze intent:\n\nForm Data: {{formData}}\nEnriched Data: {{enrichedData}}\n\nConsider: company size, role seniority, engagement signals, budget indicators.",
                        outputVariable: "leadScore"
                    }
                },
                {
                    id: "integration-hubspot-create",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Contact",
                        provider: "hubspot",
                        operation: "createContact"
                    }
                },
                {
                    id: "router-score",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Lead Score",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Route this lead based on score:\n\n{{leadScore.text}}\n\nCategories: hot (80+), warm (50-79), cold (20-49), nurture (<20)",
                        routes: [
                            { value: "hot", label: "Hot (80+)", description: "High intent leads" },
                            {
                                value: "warm",
                                label: "Warm (50-79)",
                                description: "Medium interest"
                            },
                            { value: "cold", label: "Cold (20-49)", description: "Low interest" },
                            {
                                value: "nurture",
                                label: "Nurture (<20)",
                                description: "Long-term nurture"
                            }
                        ],
                        defaultRoute: "warm",
                        outputVariable: "scoreCategory"
                    }
                },
                {
                    id: "slack-hot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Sales",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#sales-hot"
                    }
                },
                {
                    id: "gmail-vip",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "VIP Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "hubspot-seq",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Nurture Sequence",
                        provider: "hubspot",
                        operation: "enrollInSequence"
                    }
                },
                {
                    id: "hubspot-news",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add to Newsletter",
                        provider: "hubspot",
                        operation: "addToList"
                    }
                },
                {
                    id: "hubspot-drip",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Long Nurture",
                        provider: "hubspot",
                        operation: "enrollInSequence"
                    }
                },
                {
                    id: "router-enterprise",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Company Size",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Is this an enterprise company (500+ employees)?\n\n{{enrichedData}}",
                        routes: [
                            {
                                value: "enterprise",
                                label: "Enterprise",
                                description: "500+ employees"
                            },
                            { value: "smb", label: "SMB", description: "Under 500 employees" }
                        ],
                        defaultRoute: "smb",
                        outputVariable: "companySize"
                    }
                },
                {
                    id: "slack-ae",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify AE Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#ae-team"
                    }
                },
                {
                    id: "slack-sdr",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify SDR Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#sdr-team"
                    }
                },
                {
                    id: "llm-personalize",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Personalize Thank You",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a personalized thank you message for:\n\n{{formData}}\n{{enrichedData}}\n\nMake it warm, relevant to their industry, and include next steps.",
                        outputVariable: "thankYouMessage"
                    }
                },
                {
                    id: "gmail-thankyou",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Thank You",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Lead Processed",
                        outputName: "result",
                        value: "{{scoreCategory}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-typeform" },
                { id: "e2", source: "integration-typeform", target: "integration-apollo" },
                { id: "e3", source: "integration-apollo", target: "llm-score" },
                { id: "e4", source: "llm-score", target: "integration-hubspot-create" },
                { id: "e5", source: "integration-hubspot-create", target: "router-score" },
                { id: "e6", source: "router-score", target: "slack-hot", sourceHandle: "hot" },
                { id: "e7", source: "router-score", target: "gmail-vip", sourceHandle: "hot" },
                { id: "e8", source: "router-score", target: "hubspot-seq", sourceHandle: "warm" },
                { id: "e9", source: "router-score", target: "hubspot-news", sourceHandle: "cold" },
                {
                    id: "e10",
                    source: "router-score",
                    target: "hubspot-drip",
                    sourceHandle: "nurture"
                },
                { id: "e11", source: "slack-hot", target: "router-enterprise" },
                { id: "e12", source: "gmail-vip", target: "router-enterprise" },
                {
                    id: "e13",
                    source: "router-enterprise",
                    target: "slack-ae",
                    sourceHandle: "enterprise"
                },
                {
                    id: "e14",
                    source: "router-enterprise",
                    target: "slack-sdr",
                    sourceHandle: "smb"
                },
                { id: "e15", source: "slack-ae", target: "llm-personalize" },
                { id: "e16", source: "slack-sdr", target: "llm-personalize" },
                { id: "e17", source: "hubspot-seq", target: "llm-personalize" },
                { id: "e18", source: "hubspot-news", target: "llm-personalize" },
                { id: "e19", source: "hubspot-drip", target: "llm-personalize" },
                { id: "e20", source: "llm-personalize", target: "gmail-thankyou" },
                { id: "e21", source: "gmail-thankyou", target: "output-1" }
            ]
        }
    },

    // Forms: SurveyMonkey NPS Command Center
    {
        name: "SurveyMonkey NPS Command Center",
        description:
            "Process NPS survey responses with sentiment analysis. Route promoters to referral programs, engage passives with improvement ideas, and trigger recovery workflows for detractors.",
        category: "support",
        tags: ["surveymonkey", "nps", "feedback", "sentiment", "customer-success"],
        required_integrations: [
            "surveymonkey",
            "slack",
            "google-sheets",
            "gmail",
            "hubspot",
            "linear"
        ],
        featured: false,
        definition: {
            name: "SurveyMonkey NPS Command Center",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Survey Response",
                        triggerType: "webhook",
                        provider: "surveymonkey",
                        event: "response.completed",
                        description: "Triggered when survey is completed"
                    }
                },
                {
                    id: "integration-survey",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Response",
                        provider: "surveymonkey",
                        operation: "getResponse",
                        outputVariable: "surveyResponse"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Sentiment",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this NPS survey response:\n\n{{surveyResponse}}\n\nExtract: NPS score, sentiment, key themes, specific feedback, improvement suggestions.",
                        outputVariable: "sentimentAnalysis"
                    }
                },
                {
                    id: "router-nps",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "NPS Category",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Categorize this NPS response:\n\n{{sentimentAnalysis.text}}\n\nCategories: promoter (9-10), passive (7-8), detractor (0-6)",
                        routes: [
                            {
                                value: "promoter",
                                label: "Promoter (9-10)",
                                description: "Highly satisfied"
                            },
                            {
                                value: "passive",
                                label: "Passive (7-8)",
                                description: "Satisfied but not enthusiastic"
                            },
                            {
                                value: "detractor",
                                label: "Detractor (0-6)",
                                description: "Unsatisfied"
                            }
                        ],
                        defaultRoute: "passive",
                        outputVariable: "npsCategory"
                    }
                },
                {
                    id: "gmail-ref",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Referral Request",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "hubspot-tag",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Tag Promoter",
                        provider: "hubspot",
                        operation: "updateContact"
                    }
                },
                {
                    id: "llm-improve",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Ideas",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract actionable improvement ideas from this passive feedback:\n\n{{surveyResponse}}\n\nFormat as feature requests or improvement suggestions.",
                        outputVariable: "improvementIdeas"
                    }
                },
                {
                    id: "slack-prod",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Product Ideas",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#product"
                    }
                },
                {
                    id: "linear-feature",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Feature",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "slack-cs",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "CS Alert",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#cs-urgent"
                    }
                },
                {
                    id: "llm-recovery",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Recovery Strategy",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a recovery strategy for this detractor:\n\n{{surveyResponse}}\n{{sentimentAnalysis.text}}\n\nInclude: immediate actions, talking points, compensation options if appropriate.",
                        outputVariable: "recoveryStrategy"
                    }
                },
                {
                    id: "gmail-recover",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Recovery Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "hubspot-task",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "CS Follow-up",
                        provider: "hubspot",
                        operation: "createTask"
                    }
                },
                {
                    id: "sheets-log",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Response",
                        provider: "google-sheets",
                        operation: "appendRow"
                    }
                },
                {
                    id: "transform-weekly",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Aggregate Weekly",
                        transformType: "template",
                        template:
                            '{"npsScore": "{{npsCategory}}", "sentiment": "{{sentimentAnalysis}}"}',
                        outputVariable: "weeklyData"
                    }
                },
                {
                    id: "llm-report",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Weekly Report",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a weekly NPS insights report:\n\n{{weeklyData}}\n\nInclude: NPS trend, common themes, top concerns, recommended actions.",
                        outputVariable: "weeklyReport"
                    }
                },
                {
                    id: "slack-leadership",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Leadership Report",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#leadership"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Response Processed",
                        outputName: "result",
                        value: "{{npsCategory}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-survey" },
                { id: "e2", source: "integration-survey", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "router-nps" },
                { id: "e4", source: "router-nps", target: "gmail-ref", sourceHandle: "promoter" },
                { id: "e5", source: "router-nps", target: "hubspot-tag", sourceHandle: "promoter" },
                { id: "e6", source: "router-nps", target: "llm-improve", sourceHandle: "passive" },
                { id: "e7", source: "router-nps", target: "slack-prod", sourceHandle: "passive" },
                { id: "e8", source: "router-nps", target: "slack-cs", sourceHandle: "detractor" },
                {
                    id: "e9",
                    source: "router-nps",
                    target: "llm-recovery",
                    sourceHandle: "detractor"
                },
                { id: "e10", source: "llm-improve", target: "linear-feature" },
                { id: "e11", source: "llm-recovery", target: "gmail-recover" },
                { id: "e12", source: "llm-recovery", target: "hubspot-task" },
                { id: "e13", source: "gmail-ref", target: "sheets-log" },
                { id: "e14", source: "hubspot-tag", target: "sheets-log" },
                { id: "e15", source: "slack-prod", target: "sheets-log" },
                { id: "e16", source: "linear-feature", target: "sheets-log" },
                { id: "e17", source: "slack-cs", target: "sheets-log" },
                { id: "e18", source: "gmail-recover", target: "sheets-log" },
                { id: "e19", source: "hubspot-task", target: "sheets-log" },
                { id: "e20", source: "sheets-log", target: "transform-weekly" },
                { id: "e21", source: "transform-weekly", target: "llm-report" },
                { id: "e22", source: "llm-report", target: "slack-leadership" },
                { id: "e23", source: "slack-leadership", target: "output-1" }
            ]
        }
    },

    // Forms: Google Forms Event Registration Hub
    {
        name: "Google Forms Event Registration Hub",
        description:
            "Automate event registration with capacity management. Send personalized confirmations, add attendees to calendar and Zoom, manage waitlists, and alert organizers when capacity is near.",
        category: "operations",
        tags: ["google-forms", "events", "registration", "calendar", "zoom", "automation"],
        required_integrations: [
            "google-forms",
            "google-calendar",
            "gmail",
            "slack",
            "google-sheets",
            "zoom"
        ],
        featured: false,
        definition: {
            name: "Google Forms Event Registration Hub",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Form Submission",
                        triggerType: "webhook",
                        provider: "google-forms",
                        event: "form.submitted",
                        description: "Triggered when registration form is submitted"
                    }
                },
                {
                    id: "integration-forms",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Registration",
                        provider: "google-forms",
                        operation: "getResponse",
                        outputVariable: "registration"
                    }
                },
                {
                    id: "sheets-attendees",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add to List",
                        provider: "google-sheets",
                        operation: "appendRow"
                    }
                },
                {
                    id: "llm-personalize",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Personalize Confirmation",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a personalized event confirmation for:\n\n{{registration}}\n\nInclude: warm welcome, event details, what to bring, how to prepare.",
                        outputVariable: "confirmationMessage"
                    }
                },
                {
                    id: "calendar-invite",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Invite",
                        provider: "google-calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "gmail-confirm",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Confirmation Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "zoom-add",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add to Zoom",
                        provider: "zoom",
                        operation: "addRegistrant"
                    }
                },
                {
                    id: "transform-capacity",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Capacity",
                        transformType: "template",
                        template:
                            '{"currentCount": {{sheets.rowCount}}, "maxCapacity": 100, "percentFull": {{sheets.rowCount / 100 * 100}}}',
                        outputVariable: "capacityStatus"
                    }
                },
                {
                    id: "router-capacity",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Capacity Status",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Determine capacity status:\n\n{{capacityStatus}}\n\nCategories: available (<80%), near_full (80-99%), waitlist (100%)",
                        routes: [
                            {
                                value: "available",
                                label: "Available",
                                description: "Spots available"
                            },
                            {
                                value: "near_full",
                                label: "Near Full",
                                description: "80-99% capacity"
                            },
                            { value: "waitlist", label: "Waitlist", description: "At capacity" }
                        ],
                        defaultRoute: "available",
                        outputVariable: "capacityCategory"
                    }
                },
                {
                    id: "slack-organizer",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Organizer",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#events"
                    }
                },
                {
                    id: "sheets-status",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Status",
                        provider: "google-sheets",
                        operation: "updateCell"
                    }
                },
                {
                    id: "gmail-waitlist",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Waitlist Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "sheets-waitlist",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add to Waitlist",
                        provider: "google-sheets",
                        operation: "appendRow"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Registration Complete",
                        outputName: "result",
                        value: "{{capacityCategory}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-forms" },
                { id: "e2", source: "integration-forms", target: "sheets-attendees" },
                { id: "e3", source: "sheets-attendees", target: "llm-personalize" },
                { id: "e4", source: "llm-personalize", target: "calendar-invite" },
                { id: "e5", source: "llm-personalize", target: "gmail-confirm" },
                { id: "e6", source: "llm-personalize", target: "zoom-add" },
                { id: "e7", source: "calendar-invite", target: "transform-capacity" },
                { id: "e8", source: "gmail-confirm", target: "transform-capacity" },
                { id: "e9", source: "zoom-add", target: "transform-capacity" },
                { id: "e10", source: "transform-capacity", target: "router-capacity" },
                {
                    id: "e11",
                    source: "router-capacity",
                    target: "output-1",
                    sourceHandle: "available"
                },
                {
                    id: "e12",
                    source: "router-capacity",
                    target: "slack-organizer",
                    sourceHandle: "near_full"
                },
                {
                    id: "e13",
                    source: "router-capacity",
                    target: "gmail-waitlist",
                    sourceHandle: "waitlist"
                },
                { id: "e14", source: "slack-organizer", target: "sheets-status" },
                { id: "e15", source: "gmail-waitlist", target: "sheets-waitlist" },
                { id: "e16", source: "sheets-status", target: "output-1" },
                { id: "e17", source: "sheets-waitlist", target: "output-1" }
            ]
        }
    },

    // Forms: Multi-Channel Feedback Aggregator
    {
        name: "Multi-Channel Feedback Aggregator",
        description:
            "Aggregate feedback from Typeform, SurveyMonkey, and Google Forms into a unified database. AI categorizes and extracts themes, routes critical feedback to support, and generates daily insights.",
        category: "support",
        tags: ["feedback", "aggregation", "typeform", "surveymonkey", "google-forms", "insights"],
        required_integrations: [
            "typeform",
            "surveymonkey",
            "google-forms",
            "notion",
            "slack",
            "linear"
        ],
        featured: false,
        definition: {
            name: "Multi-Channel Feedback Aggregator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Aggregation",
                        triggerType: "schedule",
                        schedule: "0 8 * * *",
                        description: "Runs daily at 8 AM"
                    }
                },
                {
                    id: "integration-typeform",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Typeform",
                        provider: "typeform",
                        operation: "listResponses",
                        outputVariable: "typeformResponses"
                    }
                },
                {
                    id: "integration-survey",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch SurveyMonkey",
                        provider: "surveymonkey",
                        operation: "listResponses",
                        outputVariable: "surveyResponses"
                    }
                },
                {
                    id: "integration-forms",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Google Forms",
                        provider: "google-forms",
                        operation: "listResponses",
                        outputVariable: "formsResponses"
                    }
                },
                {
                    id: "transform-normalize",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Unify Format",
                        transformType: "template",
                        template:
                            '{"allFeedback": [{{typeformResponses}}, {{surveyResponses}}, {{formsResponses}}]}',
                        outputVariable: "unifiedFeedback"
                    }
                },
                {
                    id: "llm-categorize",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Categorize & Theme",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Categorize and extract themes from this feedback:\n\n{{unifiedFeedback}}\n\nFor each item: category (critical, feature, normal), sentiment, key theme, actionable insight.",
                        outputVariable: "categorizedFeedback"
                    }
                },
                {
                    id: "notion-database",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Database",
                        provider: "notion",
                        operation: "createPage",
                        database: "Feedback"
                    }
                },
                {
                    id: "router-critical",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Has Critical?",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Does this feedback contain critical issues, feature requests, or just normal feedback?\n\n{{categorizedFeedback.text}}",
                        routes: [
                            { value: "critical", label: "Critical", description: "Urgent issues" },
                            { value: "feature", label: "Feature", description: "Feature requests" },
                            { value: "normal", label: "Normal", description: "Regular feedback" }
                        ],
                        defaultRoute: "normal",
                        outputVariable: "feedbackType"
                    }
                },
                {
                    id: "slack-urgent",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Urgent Alert",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#support-urgent"
                    }
                },
                {
                    id: "llm-escalate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Escalation Brief",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an escalation brief for critical feedback:\n\n{{categorizedFeedback.text}}\n\nInclude: issue summary, customer impact, recommended resolution.",
                        outputVariable: "escalationBrief"
                    }
                },
                {
                    id: "linear-feature",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Feature",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "slack-product",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Product Ideas",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#product-ideas"
                    }
                },
                {
                    id: "notion-archive",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Archive Normal",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "llm-insights",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Insights",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate daily feedback insights:\n\n{{categorizedFeedback.text}}\n\nInclude: volume stats, trending themes, sentiment distribution, top requests.",
                        outputVariable: "dailyInsights"
                    }
                },
                {
                    id: "slack-insights",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Insights",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#product-insights"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Aggregation Complete",
                        outputName: "result",
                        value: "{{dailyInsights}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-typeform" },
                { id: "e2", source: "trigger-1", target: "integration-survey" },
                { id: "e3", source: "trigger-1", target: "integration-forms" },
                { id: "e4", source: "integration-typeform", target: "transform-normalize" },
                { id: "e5", source: "integration-survey", target: "transform-normalize" },
                { id: "e6", source: "integration-forms", target: "transform-normalize" },
                { id: "e7", source: "transform-normalize", target: "llm-categorize" },
                { id: "e8", source: "llm-categorize", target: "notion-database" },
                { id: "e9", source: "notion-database", target: "router-critical" },
                {
                    id: "e10",
                    source: "router-critical",
                    target: "slack-urgent",
                    sourceHandle: "critical"
                },
                {
                    id: "e11",
                    source: "router-critical",
                    target: "linear-feature",
                    sourceHandle: "feature"
                },
                {
                    id: "e12",
                    source: "router-critical",
                    target: "notion-archive",
                    sourceHandle: "normal"
                },
                { id: "e13", source: "slack-urgent", target: "llm-escalate" },
                { id: "e14", source: "linear-feature", target: "slack-product" },
                { id: "e15", source: "llm-escalate", target: "llm-insights" },
                { id: "e16", source: "slack-product", target: "llm-insights" },
                { id: "e17", source: "notion-archive", target: "llm-insights" },
                { id: "e18", source: "llm-insights", target: "slack-insights" },
                { id: "e19", source: "slack-insights", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // ALTERNATIVE DEVOPS (4 templates)
    // ========================================================================

    // DevOps: GitLab CI/CD Command Center (Featured)
    {
        name: "GitLab CI/CD Command Center",
        description:
            "Monitor GitLab pipelines with intelligent failure diagnosis. AI analyzes logs, suggests fixes, routes by severity (critical to PagerDuty, others to Slack), and tracks deployment metrics in Datadog.",
        category: "engineering",
        tags: ["gitlab", "ci-cd", "devops", "monitoring", "automation", "pagerduty"],
        required_integrations: ["gitlab", "slack", "pagerduty", "notion", "datadog"],
        featured: true,
        definition: {
            name: "GitLab CI/CD Command Center",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Pipeline Event",
                        triggerType: "webhook",
                        provider: "gitlab",
                        event: "pipeline",
                        description: "Triggered on pipeline status change"
                    }
                },
                {
                    id: "integration-gitlab",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Pipeline",
                        provider: "gitlab",
                        operation: "getPipeline",
                        outputVariable: "pipelineDetails"
                    }
                },
                {
                    id: "router-status",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Pipeline Status",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "What is the pipeline status?\n\n{{pipelineDetails}}",
                        routes: [
                            { value: "failed", label: "Failed", description: "Pipeline failed" },
                            {
                                value: "success",
                                label: "Success",
                                description: "Pipeline succeeded"
                            }
                        ],
                        defaultRoute: "success",
                        outputVariable: "pipelineStatus"
                    }
                },
                {
                    id: "llm-diagnose",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Diagnose Failure",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this pipeline failure:\n\n{{pipelineDetails}}\n\nIdentify: root cause, affected jobs, error messages, and recommended fix.",
                        outputVariable: "diagnosis"
                    }
                },
                {
                    id: "router-severity",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Failure Severity",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Rate the severity of this failure:\n\n{{diagnosis.text}}\n\nCategories: critical (production down), high (blocking release), low (non-blocking)",
                        routes: [
                            {
                                value: "critical",
                                label: "Critical",
                                description: "Production impact"
                            },
                            { value: "high", label: "High", description: "Release blocking" },
                            { value: "low", label: "Low", description: "Non-blocking" }
                        ],
                        defaultRoute: "low",
                        outputVariable: "severity"
                    }
                },
                {
                    id: "pagerduty",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Page On-Call",
                        provider: "pagerduty",
                        operation: "createIncident"
                    }
                },
                {
                    id: "slack-incident",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Critical Alert",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#incidents"
                    }
                },
                {
                    id: "slack-eng",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "High Alert",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#engineering"
                    }
                },
                {
                    id: "slack-team",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Team Notice",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#team"
                    }
                },
                {
                    id: "notion-incident",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Incident",
                        provider: "notion",
                        operation: "createPage",
                        database: "Incidents"
                    }
                },
                {
                    id: "llm-suggest",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Suggest Fix",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on this diagnosis:\n\n{{diagnosis.text}}\n\nSuggest specific code or config changes to fix the issue.",
                        outputVariable: "suggestedFix"
                    }
                },
                {
                    id: "gitlab-comment",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Fix",
                        provider: "gitlab",
                        operation: "createMergeRequestNote"
                    }
                },
                {
                    id: "slack-oncall",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify On-Call",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#oncall"
                    }
                },
                {
                    id: "datadog-event",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Record Incident",
                        provider: "datadog",
                        operation: "createEvent"
                    }
                },
                {
                    id: "router-env",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Environment",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "What environment was this deployment to?\n\n{{pipelineDetails}}",
                        routes: [
                            {
                                value: "production",
                                label: "Production",
                                description: "Prod deploy"
                            },
                            { value: "staging", label: "Staging", description: "Staging/preview" }
                        ],
                        defaultRoute: "staging",
                        outputVariable: "environment"
                    }
                },
                {
                    id: "slack-rel",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Release Announce",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#releases"
                    }
                },
                {
                    id: "notion-log",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Changelog",
                        provider: "notion",
                        operation: "createPage",
                        database: "Changelog"
                    }
                },
                {
                    id: "integration-datadog",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Deploy Metric",
                        provider: "datadog",
                        operation: "submitMetric"
                    }
                },
                {
                    id: "github-comment",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Preview URL",
                        provider: "gitlab",
                        operation: "createMergeRequestNote"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Pipeline Processed",
                        outputName: "result",
                        value: "{{pipelineStatus}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-gitlab" },
                { id: "e2", source: "integration-gitlab", target: "router-status" },
                {
                    id: "e3",
                    source: "router-status",
                    target: "llm-diagnose",
                    sourceHandle: "failed"
                },
                {
                    id: "e4",
                    source: "router-status",
                    target: "router-env",
                    sourceHandle: "success"
                },
                { id: "e5", source: "llm-diagnose", target: "router-severity" },
                {
                    id: "e6",
                    source: "router-severity",
                    target: "pagerduty",
                    sourceHandle: "critical"
                },
                {
                    id: "e7",
                    source: "router-severity",
                    target: "slack-incident",
                    sourceHandle: "critical"
                },
                { id: "e8", source: "router-severity", target: "slack-eng", sourceHandle: "high" },
                { id: "e9", source: "router-severity", target: "slack-team", sourceHandle: "low" },
                { id: "e10", source: "pagerduty", target: "notion-incident" },
                { id: "e11", source: "slack-incident", target: "notion-incident" },
                { id: "e12", source: "notion-incident", target: "llm-suggest" },
                { id: "e13", source: "slack-eng", target: "llm-suggest" },
                { id: "e14", source: "slack-team", target: "llm-suggest" },
                { id: "e15", source: "llm-suggest", target: "gitlab-comment" },
                { id: "e16", source: "gitlab-comment", target: "slack-oncall" },
                { id: "e17", source: "gitlab-comment", target: "datadog-event" },
                {
                    id: "e18",
                    source: "router-env",
                    target: "slack-rel",
                    sourceHandle: "production"
                },
                {
                    id: "e19",
                    source: "router-env",
                    target: "notion-log",
                    sourceHandle: "production"
                },
                {
                    id: "e20",
                    source: "router-env",
                    target: "github-comment",
                    sourceHandle: "staging"
                },
                { id: "e21", source: "slack-rel", target: "integration-datadog" },
                { id: "e22", source: "notion-log", target: "integration-datadog" },
                { id: "e23", source: "slack-oncall", target: "output-1" },
                { id: "e24", source: "datadog-event", target: "output-1" },
                { id: "e25", source: "integration-datadog", target: "output-1" },
                { id: "e26", source: "github-comment", target: "output-1" }
            ]
        }
    },

    // DevOps: CircleCI Build Intelligence Hub
    {
        name: "CircleCI Build Intelligence Hub",
        description:
            "Diagnose CircleCI build failures with AI-powered analysis. Route by failure type (tests, dependencies, infrastructure, timeouts), suggest fixes, and create Linear issues for recurring problems.",
        category: "engineering",
        tags: ["circleci", "ci-cd", "builds", "devops", "automation", "linear"],
        required_integrations: ["circleci", "github", "slack", "linear", "notion"],
        featured: false,
        definition: {
            name: "CircleCI Build Intelligence Hub",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Build Failed",
                        triggerType: "webhook",
                        provider: "circleci",
                        event: "job.failed",
                        description: "Triggered when build fails"
                    }
                },
                {
                    id: "integration-circleci",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Build Logs",
                        provider: "circleci",
                        operation: "getJob",
                        outputVariable: "buildDetails"
                    }
                },
                {
                    id: "llm-diagnose",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Diagnose Failure",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this build failure:\n\n{{buildDetails}}\n\nIdentify: failure type, root cause, affected tests/modules, and recommended fix.",
                        outputVariable: "diagnosis"
                    }
                },
                {
                    id: "router-type",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Failure Type",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "What type of failure is this?\n\n{{diagnosis.text}}\n\nCategories: test_failure, dependency, infra, timeout",
                        routes: [
                            {
                                value: "test_failure",
                                label: "Test Failure",
                                description: "Tests failed"
                            },
                            {
                                value: "dependency",
                                label: "Dependency",
                                description: "Package issues"
                            },
                            {
                                value: "infra",
                                label: "Infrastructure",
                                description: "CI system issue"
                            },
                            { value: "timeout", label: "Timeout", description: "Build timeout" }
                        ],
                        defaultRoute: "test_failure",
                        outputVariable: "failureType"
                    }
                },
                {
                    id: "github-comment",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Comment Tests",
                        provider: "github",
                        operation: "createComment"
                    }
                },
                {
                    id: "slack-author",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Author",
                        provider: "slack",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "linear-task",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Task",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "slack-platform",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Platform Alert",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#platform"
                    }
                },
                {
                    id: "slack-devops",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "DevOps Alert",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#devops"
                    }
                },
                {
                    id: "slack-platform-timeout",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Timeout Alert",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#platform"
                    }
                },
                {
                    id: "llm-scale",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Suggest Scaling",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "This build timed out:\n\n{{buildDetails}}\n\nSuggest: resource scaling, parallelization, or optimization strategies.",
                        outputVariable: "scalingSuggestion"
                    }
                },
                {
                    id: "llm-fix",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Fix",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on this diagnosis:\n\n{{diagnosis.text}}\n\nGenerate a specific code fix or configuration change.",
                        outputVariable: "suggestedFix"
                    }
                },
                {
                    id: "github-suggest",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Fix",
                        provider: "github",
                        operation: "createComment"
                    }
                },
                {
                    id: "notion-log",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Failure",
                        provider: "notion",
                        operation: "createPage",
                        database: "Build Failures"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Build Processed",
                        outputName: "result",
                        value: "{{failureType}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-circleci" },
                { id: "e2", source: "integration-circleci", target: "llm-diagnose" },
                { id: "e3", source: "llm-diagnose", target: "router-type" },
                {
                    id: "e4",
                    source: "router-type",
                    target: "github-comment",
                    sourceHandle: "test_failure"
                },
                {
                    id: "e5",
                    source: "router-type",
                    target: "slack-author",
                    sourceHandle: "test_failure"
                },
                {
                    id: "e6",
                    source: "router-type",
                    target: "linear-task",
                    sourceHandle: "dependency"
                },
                {
                    id: "e7",
                    source: "router-type",
                    target: "slack-platform",
                    sourceHandle: "dependency"
                },
                { id: "e8", source: "router-type", target: "slack-devops", sourceHandle: "infra" },
                {
                    id: "e9",
                    source: "router-type",
                    target: "slack-platform-timeout",
                    sourceHandle: "timeout"
                },
                { id: "e10", source: "slack-platform-timeout", target: "llm-scale" },
                { id: "e11", source: "github-comment", target: "llm-fix" },
                { id: "e12", source: "slack-author", target: "llm-fix" },
                { id: "e13", source: "linear-task", target: "llm-fix" },
                { id: "e14", source: "slack-platform", target: "llm-fix" },
                { id: "e15", source: "slack-devops", target: "llm-fix" },
                { id: "e16", source: "llm-scale", target: "llm-fix" },
                { id: "e17", source: "llm-fix", target: "github-suggest" },
                { id: "e18", source: "github-suggest", target: "notion-log" },
                { id: "e19", source: "notion-log", target: "output-1" }
            ]
        }
    },

    // DevOps: Vercel Deploy Intelligence
    {
        name: "Vercel Deploy Intelligence",
        description:
            "Track Vercel deployments with environment-aware routing. Post preview URLs to PRs, announce production releases, monitor health metrics, and auto-rollback on degraded performance.",
        category: "engineering",
        tags: ["vercel", "deployment", "devops", "monitoring", "preview", "rollback"],
        required_integrations: ["vercel", "slack", "github", "notion", "datadog"],
        featured: false,
        definition: {
            name: "Vercel Deploy Intelligence",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Deploy Complete",
                        triggerType: "webhook",
                        provider: "vercel",
                        event: "deployment.succeeded",
                        description: "Triggered when deployment completes"
                    }
                },
                {
                    id: "integration-vercel",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Deployment",
                        provider: "vercel",
                        operation: "getDeployment",
                        outputVariable: "deployDetails"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Deploy",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this deployment:\n\n{{deployDetails}}\n\nExtract: environment, changes summary, build time, bundle size changes.",
                        outputVariable: "deployAnalysis"
                    }
                },
                {
                    id: "router-env",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Environment",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "What environment is this deployment?\n\n{{deployDetails}}",
                        routes: [
                            {
                                value: "production",
                                label: "Production",
                                description: "Prod deploy"
                            },
                            { value: "preview", label: "Preview", description: "Preview/staging" },
                            {
                                value: "development",
                                label: "Development",
                                description: "Dev deploy"
                            }
                        ],
                        defaultRoute: "preview",
                        outputVariable: "environment"
                    }
                },
                {
                    id: "slack-release",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Release Announce",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#releases"
                    }
                },
                {
                    id: "notion-changelog",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Changelog",
                        provider: "notion",
                        operation: "createPage",
                        database: "Changelog"
                    }
                },
                {
                    id: "github-preview",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Preview URL",
                        provider: "github",
                        operation: "createComment"
                    }
                },
                {
                    id: "slack-dev",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Dev Notice",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#dev"
                    }
                },
                {
                    id: "datadog-deploy",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Record Deploy",
                        provider: "datadog",
                        operation: "createEvent"
                    }
                },
                {
                    id: "vercel-analytics",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Baseline",
                        provider: "vercel",
                        operation: "getAnalytics",
                        outputVariable: "baseline"
                    }
                },
                {
                    id: "delay-5min",
                    type: "delay",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait for Traffic",
                        delayType: "fixed",
                        duration: 300000,
                        description: "Wait 5 minutes for metrics"
                    }
                },
                {
                    id: "integration-datadog-check",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Error Rate",
                        provider: "datadog",
                        operation: "queryMetrics",
                        outputVariable: "errorRate"
                    }
                },
                {
                    id: "router-health",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Health Check",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Is this deployment healthy based on error rates?\n\nBaseline: {{baseline}}\nCurrent: {{errorRate}}",
                        routes: [
                            {
                                value: "healthy",
                                label: "Healthy",
                                description: "Normal error rate"
                            },
                            { value: "degraded", label: "Degraded", description: "Elevated errors" }
                        ],
                        defaultRoute: "healthy",
                        outputVariable: "healthStatus"
                    }
                },
                {
                    id: "notion-success",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Mark Success",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "slack-oncall",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert On-Call",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#oncall"
                    }
                },
                {
                    id: "vercel-rollback",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Trigger Rollback",
                        provider: "vercel",
                        operation: "rollback"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Deploy Processed",
                        outputName: "result",
                        value: "{{healthStatus}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-vercel" },
                { id: "e2", source: "integration-vercel", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "router-env" },
                {
                    id: "e4",
                    source: "router-env",
                    target: "slack-release",
                    sourceHandle: "production"
                },
                {
                    id: "e5",
                    source: "router-env",
                    target: "notion-changelog",
                    sourceHandle: "production"
                },
                {
                    id: "e6",
                    source: "router-env",
                    target: "github-preview",
                    sourceHandle: "preview"
                },
                {
                    id: "e7",
                    source: "router-env",
                    target: "slack-dev",
                    sourceHandle: "development"
                },
                { id: "e8", source: "slack-release", target: "datadog-deploy" },
                { id: "e9", source: "notion-changelog", target: "datadog-deploy" },
                { id: "e10", source: "datadog-deploy", target: "vercel-analytics" },
                { id: "e11", source: "vercel-analytics", target: "delay-5min" },
                { id: "e12", source: "delay-5min", target: "integration-datadog-check" },
                { id: "e13", source: "integration-datadog-check", target: "router-health" },
                {
                    id: "e14",
                    source: "router-health",
                    target: "notion-success",
                    sourceHandle: "healthy"
                },
                {
                    id: "e15",
                    source: "router-health",
                    target: "slack-oncall",
                    sourceHandle: "degraded"
                },
                {
                    id: "e16",
                    source: "router-health",
                    target: "vercel-rollback",
                    sourceHandle: "degraded"
                },
                { id: "e17", source: "notion-success", target: "output-1" },
                { id: "e18", source: "slack-oncall", target: "output-1" },
                { id: "e19", source: "vercel-rollback", target: "output-1" },
                { id: "e20", source: "github-preview", target: "output-1" },
                { id: "e21", source: "slack-dev", target: "output-1" }
            ]
        }
    },

    // DevOps: Bitbucket PR Review Orchestrator
    {
        name: "Bitbucket PR Review Orchestrator",
        description:
            "Streamline Bitbucket PR reviews with AI-powered code analysis. Identify reviewers, send Slack notifications, track review progress with reminders, and escalate stale PRs to managers.",
        category: "engineering",
        tags: ["bitbucket", "code-review", "pull-requests", "devops", "automation"],
        required_integrations: ["bitbucket", "slack", "jira", "gmail", "notion"],
        featured: false,
        definition: {
            name: "Bitbucket PR Review Orchestrator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "PR Created",
                        triggerType: "webhook",
                        provider: "bitbucket",
                        event: "pullrequest.created",
                        description: "Triggered when PR is created"
                    }
                },
                {
                    id: "integration-bitbucket-pr",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get PR Details",
                        provider: "bitbucket",
                        operation: "getPullRequest",
                        outputVariable: "prDetails"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Changes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this pull request:\n\n{{prDetails}}\n\nDetermine: complexity (1-10), risk areas, test coverage needs, review priority.",
                        outputVariable: "prAnalysis"
                    }
                },
                {
                    id: "llm-reviewers",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Identify Reviewers",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on the files changed in this PR:\n\n{{prDetails}}\n\nSuggest appropriate reviewers based on code ownership patterns.",
                        outputVariable: "suggestedReviewers"
                    }
                },
                {
                    id: "bitbucket-reviewers",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Request Reviews",
                        provider: "bitbucket",
                        operation: "addReviewers"
                    }
                },
                {
                    id: "slack-reviewers",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Reviewers",
                        provider: "slack",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "jira-link",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Link to JIRA",
                        provider: "jira",
                        operation: "addComment"
                    }
                },
                {
                    id: "delay-24h",
                    type: "delay",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait 24 Hours",
                        delayType: "fixed",
                        duration: 86400000,
                        description: "Wait for reviews"
                    }
                },
                {
                    id: "integration-bitbucket-check",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Status",
                        provider: "bitbucket",
                        operation: "getPullRequest",
                        outputVariable: "reviewStatus"
                    }
                },
                {
                    id: "router-reviewed",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Status",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "What is the review status?\n\n{{reviewStatus}}\n\nCategories: none (no reviews), some (partial reviews), approved (all approved)",
                        routes: [
                            { value: "none", label: "No Reviews", description: "No reviews yet" },
                            { value: "some", label: "Partial", description: "Some reviews in" },
                            { value: "approved", label: "Approved", description: "All approved" }
                        ],
                        defaultRoute: "none",
                        outputVariable: "reviewState"
                    }
                },
                {
                    id: "slack-reminder",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Urgent Reminder",
                        provider: "slack",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "gmail-escalate",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Manager",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "slack-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Progress Update",
                        provider: "slack",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "delay-12h",
                    type: "delay",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait 12 More Hours",
                        delayType: "fixed",
                        duration: 43200000,
                        description: "Additional wait time"
                    }
                },
                {
                    id: "jira-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Ready to Merge",
                        provider: "jira",
                        operation: "updateIssue"
                    }
                },
                {
                    id: "notion-log",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Approval",
                        provider: "notion",
                        operation: "createPage",
                        database: "PR Reviews"
                    }
                },
                {
                    id: "llm-summary",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Summary",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a review summary for this PR:\n\n{{reviewStatus}}\n\nInclude: key feedback themes, approval status, remaining concerns.",
                        outputVariable: "reviewSummary"
                    }
                },
                {
                    id: "bitbucket-comment",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Summary",
                        provider: "bitbucket",
                        operation: "createComment"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "PR Processed",
                        outputName: "result",
                        value: "{{reviewState}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-bitbucket-pr" },
                { id: "e2", source: "integration-bitbucket-pr", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "llm-reviewers" },
                { id: "e4", source: "llm-reviewers", target: "bitbucket-reviewers" },
                { id: "e5", source: "llm-reviewers", target: "slack-reviewers" },
                { id: "e6", source: "llm-reviewers", target: "jira-link" },
                { id: "e7", source: "bitbucket-reviewers", target: "delay-24h" },
                { id: "e8", source: "slack-reviewers", target: "delay-24h" },
                { id: "e9", source: "jira-link", target: "delay-24h" },
                { id: "e10", source: "delay-24h", target: "integration-bitbucket-check" },
                { id: "e11", source: "integration-bitbucket-check", target: "router-reviewed" },
                {
                    id: "e12",
                    source: "router-reviewed",
                    target: "slack-reminder",
                    sourceHandle: "none"
                },
                {
                    id: "e13",
                    source: "router-reviewed",
                    target: "slack-update",
                    sourceHandle: "some"
                },
                {
                    id: "e14",
                    source: "router-reviewed",
                    target: "jira-update",
                    sourceHandle: "approved"
                },
                { id: "e15", source: "slack-reminder", target: "gmail-escalate" },
                { id: "e16", source: "gmail-escalate", target: "llm-summary" },
                { id: "e17", source: "slack-update", target: "delay-12h" },
                { id: "e18", source: "delay-12h", target: "llm-summary" },
                { id: "e19", source: "jira-update", target: "notion-log" },
                { id: "e20", source: "notion-log", target: "llm-summary" },
                { id: "e21", source: "llm-summary", target: "bitbucket-comment" },
                { id: "e22", source: "bitbucket-comment", target: "output-1" }
            ]
        }
    }
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

async function seedTemplates() {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST || "localhost",
        port: parseInt(process.env.POSTGRES_PORT || "5432"),
        database: process.env.POSTGRES_DB || "flowmaestro",
        user: process.env.POSTGRES_USER || "flowmaestro",
        password: process.env.POSTGRES_PASSWORD || "flowmaestro_dev_password",
        max: 3
    });

    console.log("Starting template seed...\n");

    try {
        // Check if templates already exist
        const existingResult = await pool.query("SELECT COUNT(*) FROM workflow_templates");
        const existingCount = parseInt(existingResult.rows[0].count);

        if (existingCount > 0) {
            console.log(`Found ${existingCount} existing templates.`);
            console.log("Clearing existing templates before seeding...\n");
            await pool.query("DELETE FROM workflow_templates");
        }

        // Insert all templates
        let successCount = 0;
        let errorCount = 0;

        for (const template of templates) {
            try {
                // Deep clone the definition to avoid mutating original
                const definition = JSON.parse(JSON.stringify(template.definition));

                // Apply improved auto-layout for consistent, visually appealing layouts
                applyAutoLayout(definition.nodes, definition.edges);

                await pool.query(
                    `INSERT INTO workflow_templates (
                        name, description, definition, category, tags,
                        required_integrations, featured, version, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        template.name,
                        template.description,
                        JSON.stringify(definition),
                        template.category,
                        template.tags,
                        template.required_integrations,
                        template.featured || false,
                        "1.0.0",
                        "active"
                    ]
                );
                console.log(`✓ Seeded: ${template.name}`);
                successCount++;
            } catch (error) {
                console.error(`✗ Failed: ${template.name}`);
                console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
                errorCount++;
            }
        }

        console.log("\n========================================");
        console.log("Seed complete!");
        console.log(`  Successful: ${successCount}`);
        console.log(`  Failed: ${errorCount}`);
        console.log(`  Total templates: ${templates.length}`);
        console.log("========================================\n");

        // Show category breakdown
        const categoryResult = await pool.query(
            "SELECT category, COUNT(*) as count FROM workflow_templates GROUP BY category ORDER BY count DESC"
        );
        console.log("Templates by category:");
        for (const row of categoryResult.rows) {
            console.log(`  ${row.category}: ${row.count}`);
        }

        // Show featured templates
        const featuredResult = await pool.query(
            "SELECT name, category FROM workflow_templates WHERE featured = true ORDER BY category, name"
        );
        console.log("\nFeatured templates:");
        for (const row of featuredResult.rows) {
            console.log(`  [${row.category}] ${row.name}`);
        }
    } catch (error) {
        console.error("Seed failed:", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the seed
seedTemplates();
