/**
 * Seed Script for Workflow Templates
 *
 * Populates the workflow_templates table with 42 comprehensive templates
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

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Template-specific node type (React Flow compatible)
interface TemplateNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
}

// Layout constants matching workflow-patterns.ts conventions
const LAYOUT = {
    HORIZONTAL_SPACING: 380, // Space between columns
    VERTICAL_SPACING: 200, // Space between rows
    START_X: 100,
    START_Y: 200 // Center point for vertical alignment
};

// Entry node types that should be at the leftmost position
const ENTRY_NODE_TYPES = ["trigger", "input", "files", "url", "audioInput"];

/**
 * Apply BFS-based auto-layout to template nodes.
 * This handles cycles gracefully by only visiting each node once.
 */
function applyAutoLayout(nodes: TemplateNode[], edges: TemplateEdge[]): void {
    if (nodes.length === 0) return;

    // Build adjacency list (forward edges only)
    const adjacencyList = new Map<string, string[]>();
    const reverseAdjacencyList = new Map<string, string[]>();
    const edgesBySource = new Map<string, Array<{ target: string; sourceHandle?: string }>>();

    for (const node of nodes) {
        adjacencyList.set(node.id, []);
        reverseAdjacencyList.set(node.id, []);
        edgesBySource.set(node.id, []);
    }

    for (const edge of edges) {
        const forward = adjacencyList.get(edge.source);
        if (forward) forward.push(edge.target);

        const reverse = reverseAdjacencyList.get(edge.target);
        if (reverse) reverse.push(edge.source);

        const sourceEdges = edgesBySource.get(edge.source);
        if (sourceEdges) sourceEdges.push({ target: edge.target, sourceHandle: edge.sourceHandle });
    }

    // Find entry points (nodes with no incoming edges, preferring trigger/input types)
    const entryPoints: string[] = [];
    for (const node of nodes) {
        const incoming = reverseAdjacencyList.get(node.id) || [];
        if (incoming.length === 0) {
            entryPoints.push(node.id);
        }
    }

    // If no entry points found (all nodes have incoming edges - pure cycle), use first entry-type node
    if (entryPoints.length === 0) {
        const entryTypeNode = nodes.find((n) => ENTRY_NODE_TYPES.includes(n.type));
        if (entryTypeNode) {
            entryPoints.push(entryTypeNode.id);
        } else {
            entryPoints.push(nodes[0].id);
        }
    }

    // BFS to assign levels (handles cycles by only visiting each node once)
    const levels = new Map<string, number>();
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; level: number }> = [];

    // Start BFS from all entry points at level 0
    for (const entry of entryPoints) {
        queue.push({ nodeId: entry, level: 0 });
    }

    while (queue.length > 0) {
        const { nodeId, level } = queue.shift()!;

        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        levels.set(nodeId, level);

        const neighbors = adjacencyList.get(nodeId) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                queue.push({ nodeId: neighbor, level: level + 1 });
            }
        }
    }

    // Handle any disconnected nodes (shouldn't happen but be safe)
    for (const node of nodes) {
        if (!levels.has(node.id)) {
            levels.set(node.id, 0);
        }
    }

    // Group nodes by level
    const nodesByLevel = new Map<number, TemplateNode[]>();
    for (const node of nodes) {
        const level = levels.get(node.id) || 0;
        const levelNodes = nodesByLevel.get(level) || [];
        levelNodes.push(node);
        nodesByLevel.set(level, levelNodes);
    }

    // Order nodes within each level to minimize edge crossings
    // Use barycenter heuristic: position node based on average position of connected nodes in previous level
    const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

    for (let i = 1; i < sortedLevels.length; i++) {
        const currentLevel = sortedLevels[i];
        const prevLevel = sortedLevels[i - 1];
        const currentNodes = nodesByLevel.get(currentLevel) || [];
        const prevNodes = nodesByLevel.get(prevLevel) || [];

        // Create position map for previous level
        const prevPositions = new Map<string, number>();
        prevNodes.forEach((node, index) => {
            prevPositions.set(node.id, index);
        });

        // Calculate barycenter for each node
        const barycenters: Array<{ node: TemplateNode; barycenter: number }> = [];
        for (const node of currentNodes) {
            const incoming = reverseAdjacencyList.get(node.id) || [];
            let sum = 0;
            let count = 0;

            for (const parent of incoming) {
                const pos = prevPositions.get(parent);
                if (pos !== undefined) {
                    sum += pos;
                    count++;
                }
            }

            const barycenter = count > 0 ? sum / count : currentNodes.indexOf(node);
            barycenters.push({ node, barycenter });
        }

        // Sort by barycenter
        barycenters.sort((a, b) => a.barycenter - b.barycenter);
        nodesByLevel.set(
            currentLevel,
            barycenters.map((b) => b.node)
        );
    }

    // Calculate positions
    for (const [level, levelNodes] of nodesByLevel) {
        const x = LAYOUT.START_X + level * LAYOUT.HORIZONTAL_SPACING;

        // Center nodes vertically around START_Y
        const totalHeight = (levelNodes.length - 1) * LAYOUT.VERTICAL_SPACING;
        const startY = LAYOUT.START_Y - totalHeight / 2;

        for (let i = 0; i < levelNodes.length; i++) {
            const node = levelNodes[i];
            const y = startY + i * LAYOUT.VERTICAL_SPACING;
            node.position = { x, y };
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Twitter Posts",
                        provider: "twitter",
                        operation: "createTweet"
                    }
                },
                {
                    id: "integration-linkedin",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule LinkedIn Posts",
                        provider: "linkedin",
                        operation: "createPost"
                    }
                },
                {
                    id: "integration-instagram",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Instagram Posts",
                        provider: "instagram",
                        operation: "createMedia"
                    }
                },
                {
                    id: "integration-tiktok",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Queue TikTok Content",
                        provider: "tiktok",
                        operation: "createVideo"
                    }
                },
                {
                    id: "transform-summary",
                    type: "transform",
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to HubSpot",
                        provider: "hubspot",
                        operation: "createEngagement"
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
                        channel: "#marketing-campaigns"
                    }
                },
                {
                    id: "llm-revise",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Revise Content",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Revise this content based on the feedback provided:\n\nOriginal: {{contentPackage}}\nFeedback: {{approvedContent}}",
                        outputVariable: "revisedContent"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Campaign Results",
                        outputName: "results",
                        value: "{{summary}}"
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
                { id: "e24", source: "llm-revise", target: "humanReview-1" }
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Audio/Video",
                        urlVariable: "episodeDetails.audioUrl",
                        outputVariable: "mediaContent"
                    }
                },
                {
                    id: "llm-transcribe",
                    type: "llm",
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Twitter Thread",
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
                    id: "integration-buffer",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Follow-up Posts",
                        provider: "buffer",
                        operation: "createPost"
                    }
                },
                {
                    id: "transform-summary",
                    type: "transform",
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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
                    position: { x: 0, y: 0 },
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

    // Marketing Intermediate 5: Newsletter Automation (9 nodes)
    {
        name: "Newsletter Automation",
        description:
            "Automated weekly newsletter: curates content from multiple sources, generates engaging copy with AI, routes through review, and sends via Mailchimp with engagement tracking.",
        category: "marketing",
        tags: ["newsletter", "email marketing", "automation", "content curation"],
        required_integrations: ["mailchimp", "notion", "slack"],
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
                    id: "llm-generate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Newsletter",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a newsletter from this curated content:\n\n{{integration-notion.data}}\n\nStructure:\n1. Compelling subject line\n2. Personal intro\n3. Main content with 3-5 highlights\n4. Quick tips section\n5. CTA\n\nTone: Friendly, informative, valuable.",
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
                    id: "llm-subject",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Optimize Subject Line",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Generate 3 A/B test subject line variations for:\n\n{{newsletter.text}}\n\nOptimize for open rates. Make them curiosity-driven.",
                        outputVariable: "subjectLines"
                    }
                },
                {
                    id: "integration-mailchimp",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Newsletter",
                        provider: "mailchimp",
                        operation: "sendCampaign"
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
                { id: "e2", source: "integration-notion", target: "llm-generate" },
                { id: "e3", source: "llm-generate", target: "humanReview-1" },
                { id: "e4", source: "humanReview-1", target: "llm-subject" },
                { id: "e5", source: "llm-subject", target: "integration-mailchimp" },
                { id: "e6", source: "integration-mailchimp", target: "wait-1" },
                { id: "e7", source: "wait-1", target: "integration-slack" },
                { id: "e8", source: "integration-slack", target: "output-1" }
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

    // Sales Simple 6: Deal Stage Notifier (5 nodes)
    {
        name: "Deal Stage Notifier",
        description:
            "Simple deal tracking: when a deal changes stage in Salesforce, format a summary and notify the team in Slack with key details.",
        category: "sales",
        tags: ["notifications", "deal tracking", "simple", "alerts"],
        required_integrations: ["salesforce", "slack"],
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
                    id: "llm-format",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Update",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format this deal update for Slack:\n\n{{integration-salesforce.data}}\n\nInclude: deal name, new stage, amount, close date, owner. Use emoji headers.",
                        outputVariable: "slackMessage"
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
                        channel: "#sales-updates"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notification Sent",
                        outputName: "status",
                        value: "Deal update posted to Slack"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-salesforce" },
                { id: "e2", source: "integration-salesforce", target: "llm-format" },
                { id: "e3", source: "llm-format", target: "integration-slack" },
                { id: "e4", source: "integration-slack", target: "output-1" }
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

    // Operations Simple 5: Document Approval Flow (6 nodes)
    {
        name: "Document Approval Flow",
        description:
            "Simple document approval process: when a document is uploaded, notify the reviewer, collect approval, and update the document status.",
        category: "operations",
        tags: ["documents", "approval", "simple", "workflow"],
        required_integrations: ["google-drive", "slack", "gmail"],
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
                    id: "llm-summary",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Summarize Document",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Provide a brief summary of this document for the reviewer:\n\n{{trigger-1.data}}",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Reviewer",
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
                { id: "e1", source: "trigger-1", target: "llm-summary" },
                { id: "e2", source: "llm-summary", target: "integration-slack" },
                { id: "e3", source: "integration-slack", target: "humanReview-1" },
                { id: "e4", source: "humanReview-1", target: "integration-gmail" },
                { id: "e5", source: "integration-gmail", target: "output-1" }
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

    // Engineering Simple 6: Deployment Notifier (5 nodes)
    {
        name: "Deployment Notifier",
        description:
            "Simple deployment notifications: when code is deployed, format release notes and post to the team Slack channel with key changes.",
        category: "engineering",
        tags: ["deployment", "notifications", "simple", "releases"],
        required_integrations: ["github", "slack"],
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
                    id: "integration-github",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Release Info",
                        provider: "github",
                        operation: "getRelease"
                    }
                },
                {
                    id: "llm-format",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Release Notes",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format these release notes for Slack:\n\n{{integration-github.data}}\n\nUse emoji headers, bullet points, and highlight breaking changes.",
                        outputVariable: "formatted"
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
                        channel: "#deployments"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notification Sent",
                        outputName: "status",
                        value: "Deployment notification posted"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-github" },
                { id: "e2", source: "integration-github", target: "llm-format" },
                { id: "e3", source: "llm-format", target: "integration-slack" },
                { id: "e4", source: "integration-slack", target: "output-1" }
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

    // Support Intermediate 2: Support Ticket Triage (10 nodes)
    {
        name: "Support Ticket Triage",
        description:
            "Intelligent ticket management: classify incoming tickets with AI, route to appropriate team, set priority and SLA, and track resolution metrics.",
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
                        prompt: "Route ticket: {{classification.text}}",
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
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#support"
                    }
                },
                {
                    id: "conditional-urgent",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Is Urgent?",
                        condition: "classification.priority === 'urgent'",
                        outputVariable: "isUrgent"
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
                {
                    id: "e3",
                    source: "router-category",
                    target: "integration-zendesk-update",
                    sourceHandle: "technical"
                },
                {
                    id: "e4",
                    source: "router-category",
                    target: "integration-zendesk-update",
                    sourceHandle: "billing"
                },
                {
                    id: "e5",
                    source: "router-category",
                    target: "integration-zendesk-update",
                    sourceHandle: "bug"
                },
                {
                    id: "e6",
                    source: "router-category",
                    target: "integration-zendesk-update",
                    sourceHandle: "general"
                },
                { id: "e7", source: "integration-zendesk-update", target: "llm-response" },
                { id: "e8", source: "llm-response", target: "integration-zendesk-comment" },
                { id: "e9", source: "integration-zendesk-comment", target: "conditional-urgent" },
                {
                    id: "e10",
                    source: "conditional-urgent",
                    target: "integration-slack",
                    sourceHandle: "true"
                },
                {
                    id: "e11",
                    source: "conditional-urgent",
                    target: "integration-notion",
                    sourceHandle: "false"
                },
                { id: "e12", source: "integration-slack", target: "integration-notion" },
                { id: "e13", source: "integration-notion", target: "output-1" }
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

    // Support Simple 4: Ticket Status Notifier (5 nodes)
    {
        name: "Ticket Status Notifier",
        description:
            "Simple ticket notifications: when a ticket is updated in Zendesk, format the status change and notify the relevant Slack channel.",
        category: "support",
        tags: ["tickets", "notifications", "simple", "status"],
        required_integrations: ["zendesk", "slack"],
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
                    id: "llm-format",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Update",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format this ticket update for Slack:\n\n{{integration-zendesk.data}}\n\nInclude: ticket ID, customer, status change, assignee. Use emoji.",
                        outputVariable: "formatted"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Update",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#support-tickets"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notification Sent",
                        outputName: "status",
                        value: "Ticket update posted"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-zendesk" },
                { id: "e2", source: "integration-zendesk", target: "llm-format" },
                { id: "e3", source: "llm-format", target: "integration-slack" },
                { id: "e4", source: "integration-slack", target: "output-1" }
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

    // E-commerce Intermediate 3: Inventory Alert System (8 nodes)
    {
        name: "Inventory Alert System",
        description:
            "Proactive inventory management: monitor stock levels, alert when below threshold, generate reorder recommendations, and create purchase order drafts.",
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
                    id: "integration-shopify",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Product Details",
                        provider: "shopify",
                        operation: "getProduct"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Reorder Need",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze inventory status:\n\n{{integration-shopify.data}}\n\nRecommend: reorder quantity, urgency level, supplier suggestions based on lead times.",
                        outputVariable: "analysis"
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
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Purchasing",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#purchasing"
                    }
                },
                {
                    id: "llm-email",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Draft Supplier Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Draft reorder email to supplier:\n\n{{analysis.text}}\n\nInclude: product details, quantity needed, requested delivery date.",
                        outputVariable: "supplierEmail"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save Email Draft",
                        provider: "gmail",
                        operation: "createDraft"
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
                { id: "e1", source: "trigger-1", target: "integration-shopify" },
                { id: "e2", source: "integration-shopify", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "integration-airtable" },
                { id: "e4", source: "integration-airtable", target: "integration-slack" },
                { id: "e5", source: "integration-slack", target: "llm-email" },
                { id: "e6", source: "llm-email", target: "integration-gmail" },
                { id: "e7", source: "integration-gmail", target: "output-1" }
            ]
        }
    },

    // E-commerce Simple 4: Order Confirmation Sender (5 nodes)
    {
        name: "Order Confirmation Sender",
        description:
            "Simple order confirmation: when an order is placed, format a friendly confirmation message and send it to the customer via email.",
        category: "ecommerce",
        tags: ["orders", "confirmation", "email", "simple"],
        required_integrations: ["shopify", "gmail"],
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
                    id: "integration-shopify",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Order",
                        provider: "shopify",
                        operation: "getOrder"
                    }
                },
                {
                    id: "llm-format",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Confirmation",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Create a friendly order confirmation email:\n\n{{integration-shopify.data}}\n\nInclude: thank you, order summary, expected delivery, support contact.",
                        outputVariable: "confirmation"
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
                { id: "e1", source: "trigger-1", target: "integration-shopify" },
                { id: "e2", source: "integration-shopify", target: "llm-format" },
                { id: "e3", source: "llm-format", target: "integration-gmail" },
                { id: "e4", source: "integration-gmail", target: "output-1" }
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

    // SaaS Simple 4: Usage Milestone Celebrator (5 nodes)
    {
        name: "Usage Milestone Celebrator",
        description:
            "Celebrate user achievements: when users hit usage milestones, generate a congratulations message and send it via in-app notification.",
        category: "saas",
        tags: ["milestones", "celebration", "engagement", "simple"],
        required_integrations: ["mixpanel", "intercom", "slack"],
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
                    id: "llm-celebrate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Celebration",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Create an exciting milestone celebration message:\n\n{{trigger-1.data}}\n\nBe enthusiastic, mention the specific achievement, encourage next steps.",
                        outputVariable: "celebration"
                    }
                },
                {
                    id: "integration-intercom",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send In-App Message",
                        provider: "intercom",
                        operation: "createMessage"
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
                        channel: "#wins"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Celebration Sent",
                        outputName: "status",
                        value: "Milestone celebrated"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-celebrate" },
                { id: "e2", source: "llm-celebrate", target: "integration-intercom" },
                { id: "e3", source: "integration-intercom", target: "integration-slack" },
                { id: "e4", source: "integration-slack", target: "output-1" }
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

    // Healthcare Simple 3: Lab Results Notifier (6 nodes)
    {
        name: "Lab Results Notifier",
        description:
            "Notify patients when lab results are ready: format a patient-friendly summary and send secure notification with next steps guidance.",
        category: "healthcare",
        tags: ["lab results", "notifications", "patient communication", "simple"],
        required_integrations: ["gmail", "slack"],
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
                    id: "llm-summary",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Summary",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a patient-friendly notification that results are ready:\n\n{{trigger-1.data}}\n\nDo NOT include actual results. Just notify availability and provide next steps (login to portal, call office). Keep HIPAA compliant.",
                        outputVariable: "summary"
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
                        label: "Log Notification",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#lab-notifications"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notification Sent",
                        outputName: "status",
                        value: "Patient notified of results availability"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-summary" },
                { id: "e2", source: "llm-summary", target: "integration-gmail" },
                { id: "e3", source: "integration-gmail", target: "integration-slack" },
                { id: "e4", source: "integration-slack", target: "output-1" }
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

                // Apply auto-layout to ensure consistent, visually appealing layouts
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
