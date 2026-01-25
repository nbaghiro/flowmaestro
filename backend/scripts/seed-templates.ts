/**
 * Seed Script for Workflow Templates
 *
 * Populates the workflow_templates table with 56 pre-built templates
 * across 5 categories: marketing, sales, operations, engineering, support
 *
 * Templates showcase 45+ integrations including: discord, telegram, whatsapp,
 * tiktok, reddit, figma, docusign, hellosign, mongodb, postgresql, surveymonkey,
 * amplitude, mixpanel, heap, posthog, trello, monday, dropbox, box, and more.
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
 * Apply auto-layout to template nodes using the shared autoLayoutWorkflow algorithm.
 * This ensures consistent, visually appealing layouts across all templates.
 */
function applyAutoLayout(nodes: TemplateNode[], edges: TemplateEdge[]): void {
    if (nodes.length === 0) return;

    const positions = autoLayoutWorkflow(nodes, edges);

    // Apply the computed positions back to the nodes
    for (const node of nodes) {
        const newPos = positions.get(node.id);
        if (newPos) {
            node.position = newPos;
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
    {
        name: "Social Media Post Scheduler",
        description:
            "Create and schedule posts across Twitter and LinkedIn from a single brief. AI generates platform-optimized content for each network.",
        category: "marketing",
        tags: ["social media", "scheduling", "content", "automation"],
        required_integrations: ["twitter", "linkedin"],
        featured: false,
        definition: {
            name: "Social Media Post Scheduler",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Content Brief",
                        inputName: "brief",
                        inputVariable: "brief",
                        inputType: "text",
                        description: "Topic, key points, and desired tone"
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
                        prompt: "Create an engaging Twitter post (max 280 chars) from this brief:\n\n{{brief}}\n\nUse hashtags sparingly, make it conversational and shareable.",
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
                        prompt: "Create a professional LinkedIn post (300-500 words) from this brief:\n\n{{brief}}\n\nInclude a hook, value-driven content, and a call to action. Use line breaks for readability.",
                        outputVariable: "linkedinPost"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generated Posts",
                        outputName: "posts",
                        value: '{"twitter": "{{twitterPost.text}}", "linkedin": "{{linkedinPost.text}}"}'
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-twitter" },
                { id: "e2", source: "input-1", target: "llm-linkedin" },
                { id: "e3", source: "llm-twitter", target: "output-1" },
                { id: "e4", source: "llm-linkedin", target: "output-1" }
            ]
        }
    },
    {
        name: "Competitor Content Monitor",
        description:
            "Monitor competitor blogs via RSS feeds, summarize new content with AI, and alert your team in Slack with key takeaways.",
        category: "marketing",
        tags: ["competitive intelligence", "RSS", "alerts", "monitoring"],
        required_integrations: ["slack"],
        featured: false,
        definition: {
            name: "Competitor Content Monitor",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "RSS Feed Trigger",
                        triggerType: "webhook",
                        description: "Triggered when new content is published"
                    }
                },
                {
                    id: "url-1",
                    type: "url",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Article",
                        urlVariable: "trigger.articleUrl",
                        outputVariable: "articleContent"
                    }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Summarize & Analyze",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this competitor article:\n\n{{articleContent.text}}\n\nProvide:\n1. 3-bullet summary of key points\n2. Main topics/themes covered\n3. Notable claims or statistics\n4. Potential response opportunities for our content team",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-2",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Slack Message",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format this analysis as a concise Slack message with emoji headers:\n\n{{analysis.text}}\n\nInclude the article title and URL at the top.",
                        outputVariable: "slackMessage"
                    }
                },
                {
                    id: "integration-1",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to Slack",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#competitive-intel"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "url-1" },
                { id: "e2", source: "url-1", target: "llm-1" },
                { id: "e3", source: "llm-1", target: "llm-2" },
                { id: "e4", source: "llm-2", target: "integration-1" }
            ]
        }
    },
    {
        name: "Campaign Performance Reporter",
        description:
            "Pull campaign data from HubSpot, analyze performance with AI, generate executive summaries, and share insights via Slack.",
        category: "marketing",
        tags: ["analytics", "reporting", "HubSpot", "performance"],
        required_integrations: ["hubspot", "google-docs", "slack"],
        featured: true,
        definition: {
            name: "Campaign Performance Reporter",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Weekly Schedule",
                        triggerType: "schedule",
                        schedule: "0 9 * * 1",
                        description: "Runs every Monday at 9am"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Campaign Data",
                        provider: "hubspot",
                        operation: "getCampaignAnalytics",
                        dateRange: "last_7_days"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Performance",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this campaign performance data:\n\n{{integration-hubspot.data}}\n\nProvide:\n1. Top 3 performing campaigns by ROI\n2. Underperforming campaigns needing attention\n3. Week-over-week trends\n4. Specific optimization recommendations",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-summary",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Executive Summary",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a 1-page executive summary from this analysis:\n\n{{analysis.text}}\n\nFormat for busy executives: lead with key metrics, then insights, then recommended actions.",
                        outputVariable: "execSummary"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Share in Slack",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#marketing-reports"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Full Report",
                        outputName: "report",
                        value: "{{execSummary.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot" },
                { id: "e2", source: "integration-hubspot", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "llm-summary" },
                { id: "e4", source: "llm-summary", target: "integration-slack" },
                { id: "e5", source: "llm-summary", target: "output-1" }
            ]
        }
    },
    {
        name: "Lead Magnet Content Repurposer",
        description:
            "Transform long-form content (ebooks, whitepapers) into email sequences, social media threads, and blog post outlines.",
        category: "marketing",
        tags: ["content repurposing", "email", "social media", "productivity"],
        required_integrations: ["google-drive"],
        featured: false,
        definition: {
            name: "Lead Magnet Content Repurposer",
            nodes: [
                {
                    id: "files-1",
                    type: "files",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Upload Content",
                        allowedTypes: ["pdf", "docx", "txt"],
                        outputVariable: "sourceContent"
                    }
                },
                {
                    id: "llm-extract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Key Points",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Extract the key points, statistics, and insights from this content:\n\n{{sourceContent.text}}\n\nOrganize by theme and identify the most compelling/shareable elements.",
                        outputVariable: "keyPoints"
                    }
                },
                {
                    id: "llm-email",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Email Sequence",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a 5-email nurture sequence based on these key points:\n\n{{keyPoints.text}}\n\nEach email should: have a compelling subject line, provide standalone value, and lead to the next.",
                        outputVariable: "emailSequence"
                    }
                },
                {
                    id: "llm-social",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Social Threads",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create 3 social media thread concepts (Twitter/LinkedIn) from:\n\n{{keyPoints.text}}\n\nEach thread should be 5-7 posts, start with a hook, and end with a CTA.",
                        outputVariable: "socialThreads"
                    }
                },
                {
                    id: "llm-blog",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Blog Outlines",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create 3 blog post outlines that expand on different themes from:\n\n{{keyPoints.text}}\n\nEach outline should include: title, meta description, H2 sections, and key points per section.",
                        outputVariable: "blogOutlines"
                    }
                },
                {
                    id: "transform-1",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Package",
                        transformType: "template",
                        template:
                            '{"emailSequence": "{{emailSequence.text}}", "socialThreads": "{{socialThreads.text}}", "blogOutlines": "{{blogOutlines.text}}"}',
                        outputVariable: "contentPackage"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Content Package",
                        outputName: "repurposedContent",
                        value: "{{contentPackage}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "files-1", target: "llm-extract" },
                { id: "e2", source: "llm-extract", target: "llm-email" },
                { id: "e3", source: "llm-extract", target: "llm-social" },
                { id: "e4", source: "llm-extract", target: "llm-blog" },
                { id: "e5", source: "llm-email", target: "transform-1" },
                { id: "e6", source: "llm-social", target: "transform-1" },
                { id: "e7", source: "llm-blog", target: "transform-1" },
                { id: "e8", source: "transform-1", target: "output-1" }
            ]
        }
    },
    {
        name: "Influencer Outreach Pipeline",
        description:
            "Research influencers using Apollo, generate personalized outreach emails, track responses in Google Sheets, and manage follow-ups.",
        category: "marketing",
        tags: ["influencer marketing", "outreach", "personalization", "CRM"],
        required_integrations: ["apollo", "gmail", "google-sheets"],
        featured: false,
        definition: {
            name: "Influencer Outreach Pipeline",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Campaign Brief",
                        inputName: "campaignBrief",
                        inputVariable: "campaignBrief",
                        inputType: "json",
                        description:
                            '{"niche": "tech", "followerRange": "10k-100k", "platforms": ["instagram", "youtube"]}'
                    }
                },
                {
                    id: "integration-apollo",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Find Influencers",
                        provider: "apollo",
                        operation: "searchPeople"
                    }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Process Each Influencer",
                        collection: "integration-apollo.results",
                        itemVariable: "influencer"
                    }
                },
                {
                    id: "llm-research",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Research Influencer",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Research this influencer profile:\n\n{{influencer}}\n\nIdentify: recent content themes, engagement style, brand partnerships, and personalization hooks for outreach.",
                        outputVariable: "research"
                    }
                },
                {
                    id: "llm-email",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Outreach Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write a personalized outreach email for:\n\nInfluencer: {{influencer.name}}\nResearch: {{research.text}}\nCampaign: {{campaignBrief}}\n\nMake it personal, reference their specific work, and propose clear value exchange.",
                        outputVariable: "outreachEmail"
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
                        sheetName: "Influencer Outreach"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review & Approve",
                        reviewPrompt: "Review the personalized outreach email before sending",
                        outputVariable: "approved"
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
                        label: "Campaign Results",
                        outputName: "results",
                        value: "{{integration-sheets.data}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "integration-apollo" },
                { id: "e2", source: "integration-apollo", target: "loop-1" },
                { id: "e3", source: "loop-1", target: "llm-research" },
                { id: "e4", source: "llm-research", target: "llm-email" },
                { id: "e5", source: "llm-email", target: "integration-sheets" },
                { id: "e6", source: "integration-sheets", target: "humanReview-1" },
                { id: "e7", source: "humanReview-1", target: "integration-gmail" },
                { id: "e8", source: "integration-gmail", target: "output-1" }
            ]
        }
    },
    {
        name: "Event-Triggered Nurture Campaign",
        description:
            "Multi-touch nurture sequence triggered by lead magnet downloads. Personalizes follow-ups based on content consumed and engagement.",
        category: "marketing",
        tags: ["lead nurturing", "marketing automation", "email", "personalization"],
        required_integrations: ["typeform", "hubspot", "gmail"],
        featured: true,
        definition: {
            name: "Event-Triggered Nurture Campaign",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Form Submission",
                        triggerType: "webhook",
                        webhookProvider: "typeform"
                    }
                },
                {
                    id: "integration-hubspot-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Contact History",
                        provider: "hubspot",
                        operation: "getContact"
                    }
                },
                {
                    id: "llm-segment",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Segment & Score Lead",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this lead and determine nurture path:\n\nForm data: {{trigger-1.data}}\nContact history: {{integration-hubspot-get.data}}\n\nReturn JSON: {"segment": "hot/warm/cold", "interests": [], "recommendedContent": [], "urgency": "high/medium/low"}',
                        outputVariable: "segmentation"
                    }
                },
                {
                    id: "integration-hubspot-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Contact Properties",
                        provider: "hubspot",
                        operation: "updateContact"
                    }
                },
                {
                    id: "llm-email1",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Welcome Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write a personalized welcome email for:\n\nLead: {{trigger-1.data}}\nSegmentation: {{segmentation.text}}\n\nDeliver the requested content and set expectations for the nurture sequence.",
                        outputVariable: "welcomeEmail"
                    }
                },
                {
                    id: "integration-gmail-1",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Welcome Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait 3 Days",
                        duration: 259200,
                        durationUnit: "seconds"
                    }
                },
                {
                    id: "llm-email2",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Follow-up Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write a follow-up nurture email:\n\nLead: {{trigger-1.data}}\nSegmentation: {{segmentation.text}}\n\nProvide additional value related to their interests, include a soft CTA.",
                        outputVariable: "followupEmail"
                    }
                },
                {
                    id: "integration-gmail-2",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Follow-up Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Nurture Status",
                        outputName: "status",
                        value: '{"lead": "{{trigger-1.data.email}}", "segment": "{{segmentation.text}}", "emailsSent": 2}'
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot-get" },
                { id: "e2", source: "integration-hubspot-get", target: "llm-segment" },
                { id: "e3", source: "llm-segment", target: "integration-hubspot-update" },
                { id: "e4", source: "integration-hubspot-update", target: "llm-email1" },
                { id: "e5", source: "llm-email1", target: "integration-gmail-1" },
                { id: "e6", source: "integration-gmail-1", target: "wait-1" },
                { id: "e7", source: "wait-1", target: "llm-email2" },
                { id: "e8", source: "llm-email2", target: "integration-gmail-2" },
                { id: "e9", source: "integration-gmail-2", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // SALES (6 templates)
    // ========================================================================
    {
        name: "Call Recording to CRM Notes",
        description:
            "Transcribe sales call recordings and automatically create structured CRM notes with action items, next steps, and deal insights.",
        category: "sales",
        tags: ["calls", "CRM", "transcription", "automation"],
        required_integrations: ["hubspot"],
        featured: true,
        definition: {
            name: "Call Recording to CRM Notes",
            nodes: [
                {
                    id: "files-1",
                    type: "files",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Upload Recording",
                        allowedTypes: ["mp3", "wav", "m4a", "mp4"],
                        outputVariable: "recording"
                    }
                },
                {
                    id: "transcribe-1",
                    type: "audioTranscription",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Transcribe Call",
                        provider: "openai",
                        model: "whisper-1",
                        outputVariable: "transcript"
                    }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract CRM Notes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Extract structured CRM notes from this sales call:\n\n{{transcript.text}}\n\nReturn JSON:\n{\n  "summary": "2-3 sentence call summary",\n  "attendees": ["names mentioned"],\n  "painPoints": ["customer pain points discussed"],\n  "objections": ["objections raised"],\n  "actionItems": [{"task": "", "owner": "", "dueDate": ""}],\n  "nextSteps": "agreed next steps",\n  "dealSignals": "positive/negative signals for the deal",\n  "competitorsMentioned": []\n}',
                        outputVariable: "notes"
                    }
                },
                {
                    id: "integration-1",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create HubSpot Note",
                        provider: "hubspot",
                        operation: "createNote"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "files-1", target: "transcribe-1" },
                { id: "e2", source: "transcribe-1", target: "llm-1" },
                { id: "e3", source: "llm-1", target: "integration-1" }
            ]
        }
    },
    {
        name: "LinkedIn Profile to Outreach Email",
        description:
            "Extract LinkedIn profile information and generate hyper-personalized cold outreach emails that reference specific achievements and interests.",
        category: "sales",
        tags: ["LinkedIn", "cold email", "personalization", "prospecting"],
        required_integrations: [],
        featured: false,
        definition: {
            name: "LinkedIn Profile to Outreach Email",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "LinkedIn Profile Data",
                        inputName: "profile",
                        inputVariable: "profile",
                        inputType: "text",
                        description: "Paste LinkedIn profile text or summary"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Profile",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this LinkedIn profile:\n\n{{profile}}\n\nExtract:\n1. Current role and company\n2. Career trajectory and achievements\n3. Interests and topics they post about\n4. Mutual connections or shared experiences\n5. Personalization hooks (awards, promotions, posts)",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-email",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Outreach Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write a personalized cold email using this profile analysis:\n\n{{analysis.text}}\n\nRequirements:\n- Reference specific achievements or content from their profile\n- Connect their challenges to our value prop\n- Keep under 150 words\n- Include a specific, easy-to-answer CTA\n- Sound human, not templated",
                        outputVariable: "email"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Personalized Email",
                        outputName: "outreachEmail",
                        value: "{{email.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-analyze" },
                { id: "e2", source: "llm-analyze", target: "llm-email" },
                { id: "e3", source: "llm-email", target: "output-1" }
            ]
        }
    },
    {
        name: "Deal Stage Automation",
        description:
            "Automatically trigger follow-up tasks, Slack notifications, and calendar events when deals move between stages in your CRM.",
        category: "sales",
        tags: ["CRM", "automation", "deal management", "notifications"],
        required_integrations: ["pipedrive", "slack", "google-calendar"],
        featured: false,
        definition: {
            name: "Deal Stage Automation",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Deal Stage Changed",
                        triggerType: "webhook",
                        webhookProvider: "pipedrive"
                    }
                },
                {
                    id: "router-1",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Stage",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "{{trigger-1.data.currentStage}}",
                        routes: [
                            {
                                value: "proposal",
                                label: "Proposal Sent",
                                description: "Deal moved to proposal stage"
                            },
                            {
                                value: "negotiation",
                                label: "Negotiation",
                                description: "Deal moved to negotiation"
                            },
                            {
                                value: "closed-won",
                                label: "Closed Won",
                                description: "Deal was won"
                            },
                            {
                                value: "closed-lost",
                                label: "Closed Lost",
                                description: "Deal was lost"
                            }
                        ],
                        defaultRoute: "other"
                    }
                },
                {
                    id: "llm-proposal",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Follow-up Tasks",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Deal moved to proposal stage:\n\n{{trigger-1.data}}\n\nGenerate follow-up reminder message for the sales rep including: deal value, contact name, and suggested follow-up date.",
                        outputVariable: "followupMessage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify in Slack",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#sales-updates"
                    }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Follow-up",
                        provider: "google-calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Automation Result",
                        outputName: "result",
                        value: "{{followupMessage.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "router-1" },
                { id: "e2", source: "router-1", target: "llm-proposal", sourceHandle: "proposal" },
                {
                    id: "e3",
                    source: "router-1",
                    target: "llm-proposal",
                    sourceHandle: "negotiation"
                },
                { id: "e4", source: "llm-proposal", target: "integration-slack" },
                { id: "e5", source: "integration-slack", target: "integration-calendar" },
                { id: "e6", source: "integration-calendar", target: "output-1" }
            ]
        }
    },
    {
        name: "Competitive Battlecard Generator",
        description:
            "Generate up-to-date competitive battlecards by analyzing competitor websites, extracting positioning, and creating objection handlers.",
        category: "sales",
        tags: ["competitive intelligence", "sales enablement", "battlecards"],
        required_integrations: ["notion"],
        featured: false,
        definition: {
            name: "Competitive Battlecard Generator",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Competitor Info",
                        inputName: "competitor",
                        inputVariable: "competitor",
                        inputType: "json",
                        description:
                            '{"name": "Competitor", "website": "https://...", "productPages": [...]}'
                    }
                },
                {
                    id: "url-1",
                    type: "url",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Website",
                        urlVariable: "competitor.website",
                        outputVariable: "websiteContent"
                    }
                },
                {
                    id: "llm-positioning",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Positioning",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this competitor's positioning:\n\n{{websiteContent.text}}\n\nExtract:\n1. Value proposition\n2. Target audience\n3. Key differentiators\n4. Pricing model (if available)\n5. Strengths and weaknesses",
                        outputVariable: "positioning"
                    }
                },
                {
                    id: "llm-objections",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Objection Handlers",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on this competitor analysis:\n\n{{positioning.text}}\n\nGenerate objection handlers for when prospects mention this competitor:\n1. 5 common objections\n2. Response framework for each\n3. Proof points to reference\n4. Questions to ask back",
                        outputVariable: "objections"
                    }
                },
                {
                    id: "llm-battlecard",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Battlecard",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a sales battlecard in markdown format:\n\nCompetitor: {{competitor.name}}\nPositioning: {{positioning.text}}\nObjection Handlers: {{objections.text}}\n\nFormat with clear sections: Overview, Strengths, Weaknesses, Our Advantages, Objection Responses, Killer Questions",
                        outputVariable: "battlecard"
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
                        databaseId: ""
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Battlecard",
                        outputName: "battlecard",
                        value: "{{battlecard.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "url-1" },
                { id: "e2", source: "url-1", target: "llm-positioning" },
                { id: "e3", source: "llm-positioning", target: "llm-objections" },
                { id: "e4", source: "llm-objections", target: "llm-battlecard" },
                { id: "e5", source: "llm-battlecard", target: "integration-notion" },
                { id: "e6", source: "integration-notion", target: "output-1" }
            ]
        }
    },
    {
        name: "Quote-to-Contract Accelerator",
        description:
            "Automate contract generation from approved quotes, route for approvals, and update CRM when contracts are executed.",
        category: "sales",
        tags: ["contracts", "automation", "approvals", "CPQ"],
        required_integrations: ["salesforce", "google-docs", "slack"],
        featured: false,
        definition: {
            name: "Quote-to-Contract Accelerator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Quote Approved",
                        triggerType: "webhook",
                        webhookProvider: "salesforce"
                    }
                },
                {
                    id: "integration-sf-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Quote Details",
                        provider: "salesforce",
                        operation: "getQuote"
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
                        prompt: "Generate a contract document from this quote:\n\n{{integration-sf-get.data}}\n\nInclude: Parties, Services/Products, Pricing, Payment Terms, Term/Duration, Standard Terms. Format in professional legal style.",
                        outputVariable: "contract"
                    }
                },
                {
                    id: "integration-gdocs",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Contract Doc",
                        provider: "google-docs",
                        operation: "createDocument"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Needs Legal Review?",
                        conditionType: "expression",
                        expression: "integration-sf-get.data.amount > 50000"
                    }
                },
                {
                    id: "integration-slack-legal",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Request Legal Review",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#legal-reviews"
                    }
                },
                {
                    id: "integration-slack-sales",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Sales Rep",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#sales-contracts"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Contract Status",
                        outputName: "status",
                        value: '{"contractUrl": "{{integration-gdocs.url}}", "quote": "{{integration-sf-get.data.quoteNumber}}"}'
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-sf-get" },
                { id: "e2", source: "integration-sf-get", target: "llm-contract" },
                { id: "e3", source: "llm-contract", target: "integration-gdocs" },
                { id: "e4", source: "integration-gdocs", target: "conditional-1" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack-legal",
                    sourceHandle: "true"
                },
                {
                    id: "e6",
                    source: "conditional-1",
                    target: "integration-slack-sales",
                    sourceHandle: "false"
                },
                { id: "e7", source: "integration-slack-legal", target: "output-1" },
                { id: "e8", source: "integration-slack-sales", target: "output-1" }
            ]
        }
    },
    {
        name: "Revenue Intelligence Dashboard",
        description:
            "Aggregate pipeline data from HubSpot, analyze trends with AI, identify at-risk deals, and generate weekly revenue forecasts.",
        category: "sales",
        tags: ["revenue operations", "forecasting", "analytics", "pipeline"],
        required_integrations: ["hubspot", "google-sheets", "slack"],
        featured: true,
        definition: {
            name: "Revenue Intelligence Dashboard",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Weekly Schedule",
                        triggerType: "schedule",
                        schedule: "0 8 * * 1",
                        description: "Runs every Monday at 8am"
                    }
                },
                {
                    id: "integration-hubspot-deals",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Pipeline Data",
                        provider: "hubspot",
                        operation: "getDeals"
                    }
                },
                {
                    id: "integration-hubspot-activities",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Activities",
                        provider: "hubspot",
                        operation: "getActivities"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Pipeline",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this sales pipeline data:\n\nDeals: {{integration-hubspot-deals.data}}\nActivities: {{integration-hubspot-activities.data}}\n\nProvide:\n1. Pipeline health score (1-100)\n2. Deals at risk (low activity, stalled, past close date)\n3. Week-over-week pipeline movement\n4. Rep performance highlights",
                        outputVariable: "analysis"
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
                        prompt: "Based on this pipeline analysis:\n\n{{analysis.text}}\n\nGenerate a revenue forecast:\n1. Commit (90%+ probability)\n2. Best case (60-89%)\n3. Pipeline (30-59%)\n4. Upside (deals that could accelerate)\n5. Risks to the number",
                        outputVariable: "forecast"
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
                        prompt: "Based on analysis and forecast:\n\nAnalysis: {{analysis.text}}\nForecast: {{forecast.text}}\n\nGenerate 5 specific action items for the sales leader, prioritized by revenue impact.",
                        outputVariable: "recommendations"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Dashboard",
                        provider: "google-sheets",
                        operation: "updateRange"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Share Weekly Brief",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#revenue-team"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Intelligence Report",
                        outputName: "report",
                        value: "## Analysis\n{{analysis.text}}\n\n## Forecast\n{{forecast.text}}\n\n## Recommendations\n{{recommendations.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot-deals" },
                { id: "e2", source: "trigger-1", target: "integration-hubspot-activities" },
                { id: "e3", source: "integration-hubspot-deals", target: "llm-analyze" },
                { id: "e4", source: "integration-hubspot-activities", target: "llm-analyze" },
                { id: "e5", source: "llm-analyze", target: "llm-forecast" },
                { id: "e6", source: "llm-forecast", target: "llm-recommendations" },
                { id: "e7", source: "llm-recommendations", target: "integration-sheets" },
                { id: "e8", source: "integration-sheets", target: "integration-slack" },
                { id: "e9", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // OPERATIONS (6 templates)
    // ========================================================================
    {
        name: "Contract Data Extraction to Airtable",
        description:
            "Extract key terms, dates, and obligations from contract PDFs using AI and populate structured records in Airtable.",
        category: "operations",
        tags: ["contracts", "data extraction", "Airtable", "legal"],
        required_integrations: ["airtable"],
        featured: false,
        definition: {
            name: "Contract Data Extraction to Airtable",
            nodes: [
                {
                    id: "files-1",
                    type: "files",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Upload Contract",
                        allowedTypes: ["pdf", "docx"],
                        outputVariable: "contractFile"
                    }
                },
                {
                    id: "vision-1",
                    type: "vision",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Contract Data",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Extract all key information from this contract:\n\nReturn JSON:\n{\n  "contractType": "NDA/MSA/SOW/Employment/Other",\n  "parties": [{"name": "", "role": ""}],\n  "effectiveDate": "",\n  "expirationDate": "",\n  "autoRenewal": true/false,\n  "terminationNoticeDays": 0,\n  "keyTerms": [""],\n  "obligations": [{"party": "", "obligation": "", "deadline": ""}],\n  "paymentTerms": "",\n  "totalValue": 0,\n  "governingLaw": ""\n}',
                        outputVariable: "extracted"
                    }
                },
                {
                    id: "transform-1",
                    type: "transform",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Parse JSON",
                        transformType: "parseJson",
                        outputVariable: "contractData"
                    }
                },
                {
                    id: "integration-1",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Airtable Record",
                        provider: "airtable",
                        operation: "createRecord",
                        baseId: "",
                        tableId: ""
                    }
                }
            ],
            edges: [
                { id: "e1", source: "files-1", target: "vision-1" },
                { id: "e2", source: "vision-1", target: "transform-1" },
                { id: "e3", source: "transform-1", target: "integration-1" }
            ]
        }
    },
    {
        name: "Vendor Invoice Processor",
        description:
            "Process vendor invoices with AI vision, validate against purchase orders, and create structured records in Google Sheets.",
        category: "operations",
        tags: ["invoices", "AP", "automation", "validation"],
        required_integrations: ["google-sheets"],
        featured: true,
        definition: {
            name: "Vendor Invoice Processor",
            nodes: [
                {
                    id: "files-1",
                    type: "files",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Upload Invoice",
                        allowedTypes: ["pdf", "png", "jpg"],
                        outputVariable: "invoiceFile"
                    }
                },
                {
                    id: "vision-1",
                    type: "vision",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Invoice Data",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Extract all data from this invoice:\n\n{\n  "vendorName": "",\n  "vendorAddress": "",\n  "invoiceNumber": "",\n  "invoiceDate": "",\n  "dueDate": "",\n  "poNumber": "",\n  "lineItems": [{"description": "", "quantity": 0, "unitPrice": 0, "total": 0}],\n  "subtotal": 0,\n  "tax": 0,\n  "shipping": 0,\n  "total": 0,\n  "paymentTerms": "",\n  "bankDetails": ""\n}',
                        outputVariable: "invoiceData"
                    }
                },
                {
                    id: "llm-validate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Validate Invoice",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: 'Validate this invoice data:\n\n{{invoiceData.text}}\n\nCheck for:\n1. Math errors (line items vs total)\n2. Missing required fields\n3. Suspicious patterns\n\nReturn JSON: {"isValid": true/false, "issues": [], "confidence": 0-100}',
                        outputVariable: "validation"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Spreadsheet",
                        provider: "google-sheets",
                        operation: "appendRow",
                        spreadsheetId: "",
                        sheetName: "Invoices"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Processing Result",
                        outputName: "result",
                        value: '{"invoice": {{invoiceData.text}}, "validation": {{validation.text}}}'
                    }
                }
            ],
            edges: [
                { id: "e1", source: "files-1", target: "vision-1" },
                { id: "e2", source: "vision-1", target: "llm-validate" },
                { id: "e3", source: "llm-validate", target: "integration-sheets" },
                { id: "e4", source: "integration-sheets", target: "output-1" }
            ]
        }
    },
    {
        name: "Employee Onboarding Orchestrator",
        description:
            "Automate new hire onboarding: create accounts, assign training modules, schedule intro meetings, and track completion in Notion.",
        category: "operations",
        tags: ["HR", "onboarding", "automation", "employee experience"],
        required_integrations: ["slack", "google-calendar", "notion"],
        featured: false,
        definition: {
            name: "Employee Onboarding Orchestrator",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Hire Info",
                        inputName: "newHire",
                        inputVariable: "newHire",
                        inputType: "json",
                        description:
                            '{"name": "", "email": "", "department": "", "manager": "", "startDate": "", "role": ""}'
                    }
                },
                {
                    id: "llm-plan",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Onboarding Plan",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Create a personalized 30-day onboarding plan for:\n\n{{newHire}}\n\nReturn JSON:\n{\n  "week1": [{"day": 1, "tasks": [], "meetings": []}],\n  "week2": [...],\n  "week3": [...],\n  "week4": [...],\n  "trainingModules": [],\n  "keyPeopleToMeet": [],\n  "resourceLinks": []\n}',
                        outputVariable: "onboardingPlan"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Onboarding Page",
                        provider: "notion",
                        operation: "createPage"
                    }
                },
                {
                    id: "integration-slack-welcome",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Welcome Message",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#new-hires"
                    }
                },
                {
                    id: "integration-slack-manager",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Manager",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Schedule Intro Meetings",
                        provider: "google-calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Onboarding Status",
                        outputName: "status",
                        value: '{"employee": "{{newHire.name}}", "notionPage": "{{integration-notion.url}}", "plan": "created"}'
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-plan" },
                { id: "e2", source: "llm-plan", target: "integration-notion" },
                { id: "e3", source: "integration-notion", target: "integration-slack-welcome" },
                {
                    id: "e4",
                    source: "integration-slack-welcome",
                    target: "integration-slack-manager"
                },
                { id: "e5", source: "integration-slack-manager", target: "integration-calendar" },
                { id: "e6", source: "integration-calendar", target: "output-1" }
            ]
        }
    },
    {
        name: "Meeting Action Item Tracker",
        description:
            "Transcribe meetings, extract action items with AI, create tasks in Asana, and send follow-up summaries via Slack.",
        category: "operations",
        tags: ["meetings", "action items", "task management", "productivity"],
        required_integrations: ["asana", "slack"],
        featured: false,
        definition: {
            name: "Meeting Action Item Tracker",
            nodes: [
                {
                    id: "files-1",
                    type: "files",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Upload Recording",
                        allowedTypes: ["mp3", "wav", "m4a", "mp4"],
                        outputVariable: "recording"
                    }
                },
                {
                    id: "transcribe-1",
                    type: "audioTranscription",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Transcribe Meeting",
                        provider: "openai",
                        model: "whisper-1",
                        outputVariable: "transcript"
                    }
                },
                {
                    id: "llm-extract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Action Items",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Extract all action items from this meeting:\n\n{{transcript.text}}\n\nReturn JSON:\n{\n  "meetingSummary": "",\n  "attendees": [],\n  "decisions": [],\n  "actionItems": [\n    {"task": "", "owner": "", "dueDate": "", "priority": "high/medium/low", "context": ""}\n  ],\n  "openQuestions": [],\n  "nextMeeting": ""\n}',
                        outputVariable: "extracted"
                    }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Tasks",
                        collection: "extracted.actionItems",
                        itemVariable: "actionItem"
                    }
                },
                {
                    id: "integration-asana",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Asana Task",
                        provider: "asana",
                        operation: "createTask",
                        projectId: ""
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Share Summary",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#team-meetings"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "files-1", target: "transcribe-1" },
                { id: "e2", source: "transcribe-1", target: "llm-extract" },
                { id: "e3", source: "llm-extract", target: "loop-1" },
                { id: "e4", source: "loop-1", target: "integration-asana" },
                { id: "e5", source: "integration-asana", target: "integration-slack" }
            ]
        }
    },
    {
        name: "Multi-Department Approval Workflow",
        description:
            "Route requests through multi-level approval chains with escalation rules, audit trails, and status tracking in Google Sheets.",
        category: "operations",
        tags: ["approvals", "workflow", "compliance", "automation"],
        required_integrations: ["slack", "google-sheets"],
        featured: true,
        definition: {
            name: "Multi-Department Approval Workflow",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Approval Request",
                        inputName: "request",
                        inputVariable: "request",
                        inputType: "json",
                        description:
                            '{"type": "expense/purchase/travel", "amount": 0, "requestor": "", "department": "", "justification": ""}'
                    }
                },
                {
                    id: "llm-route",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Determine Approval Chain",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: 'Determine the approval chain for this request:\n\n{{request}}\n\nRules:\n- Under $1000: Manager only\n- $1000-$10000: Manager + Finance\n- Over $10000: Manager + Finance + VP\n- Travel: Always requires HR\n\nReturn JSON: {"approvers": [{"name": "", "role": "", "slackId": ""}], "escalationTimeHours": 24}',
                        outputVariable: "approvalChain"
                    }
                },
                {
                    id: "integration-sheets-log",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Request",
                        provider: "google-sheets",
                        operation: "appendRow",
                        spreadsheetId: "",
                        sheetName: "Approval Requests"
                    }
                },
                {
                    id: "integration-slack-1",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Request First Approval",
                        provider: "slack",
                        operation: "sendInteractiveMessage"
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait for Response",
                        duration: 86400,
                        durationUnit: "seconds",
                        waitType: "webhook"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Approved?",
                        conditionType: "expression",
                        expression: "wait-1.response.approved === true"
                    }
                },
                {
                    id: "integration-slack-approved",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Approved",
                        provider: "slack",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "integration-slack-rejected",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Rejected",
                        provider: "slack",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "integration-sheets-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Status",
                        provider: "google-sheets",
                        operation: "updateRow"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-route" },
                { id: "e2", source: "llm-route", target: "integration-sheets-log" },
                { id: "e3", source: "integration-sheets-log", target: "integration-slack-1" },
                { id: "e4", source: "integration-slack-1", target: "wait-1" },
                { id: "e5", source: "wait-1", target: "conditional-1" },
                {
                    id: "e6",
                    source: "conditional-1",
                    target: "integration-slack-approved",
                    sourceHandle: "true"
                },
                {
                    id: "e7",
                    source: "conditional-1",
                    target: "integration-slack-rejected",
                    sourceHandle: "false"
                },
                {
                    id: "e8",
                    source: "integration-slack-approved",
                    target: "integration-sheets-update"
                },
                {
                    id: "e9",
                    source: "integration-slack-rejected",
                    target: "integration-sheets-update"
                }
            ]
        }
    },
    {
        name: "Compliance Document Monitor",
        description:
            "Monitor regulatory websites for policy changes, compare against internal policies, and flag discrepancies for review.",
        category: "operations",
        tags: ["compliance", "regulatory", "monitoring", "risk management"],
        required_integrations: ["slack", "notion"],
        featured: false,
        definition: {
            name: "Compliance Document Monitor",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Schedule",
                        triggerType: "schedule",
                        schedule: "0 6 * * *",
                        description: "Runs daily at 6am"
                    }
                },
                {
                    id: "input-urls",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Regulatory URLs",
                        inputName: "urls",
                        inputVariable: "urls",
                        inputType: "json",
                        description: '["https://sec.gov/...", "https://finra.org/..."]'
                    }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Check Each Source",
                        collection: "urls",
                        itemVariable: "url"
                    }
                },
                {
                    id: "url-1",
                    type: "url",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Page",
                        urlVariable: "url",
                        outputVariable: "pageContent"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze for Changes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this regulatory page for recent updates:\n\n{{pageContent.text}}\n\nIdentify:\n1. New regulations or amendments\n2. Effective dates\n3. Key requirements\n4. Potential impact areas\n\nReturn JSON: {"hasChanges": true/false, "changes": [], "urgency": "high/medium/low"}',
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Changes Found?",
                        conditionType: "expression",
                        expression: "analysis.text.includes('\"hasChanges\": true')"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Compliance DB",
                        provider: "notion",
                        operation: "createPage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Compliance Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#compliance-alerts"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "input-urls" },
                { id: "e2", source: "input-urls", target: "loop-1" },
                { id: "e3", source: "loop-1", target: "url-1" },
                { id: "e4", source: "url-1", target: "llm-analyze" },
                { id: "e5", source: "llm-analyze", target: "conditional-1" },
                {
                    id: "e6",
                    source: "conditional-1",
                    target: "integration-notion",
                    sourceHandle: "true"
                },
                { id: "e7", source: "integration-notion", target: "integration-slack" }
            ]
        }
    },

    // ========================================================================
    // ENGINEERING (5 templates)
    // ========================================================================
    {
        name: "Incident Report Generator",
        description:
            "Generate structured incident reports with root cause analysis, timeline reconstruction, and action items from incident data.",
        category: "engineering",
        tags: ["incidents", "postmortem", "documentation", "SRE"],
        required_integrations: [],
        featured: false,
        definition: {
            name: "Incident Report Generator",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Incident Data",
                        inputName: "incident",
                        inputVariable: "incident",
                        inputType: "text",
                        description: "Paste incident timeline, logs, and notes"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Incident",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze this incident data and create a structured postmortem:\n\n{{incident}}\n\nInclude:\n1. Incident Summary (what happened)\n2. Impact Assessment (users affected, duration, severity)\n3. Timeline (key events with timestamps)\n4. Root Cause Analysis (5 Whys)\n5. Contributing Factors\n6. What Went Well\n7. What Went Wrong",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-actions",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Action Items",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on this incident analysis:\n\n{{analysis.text}}\n\nGenerate concrete action items:\n1. Immediate fixes (prevent recurrence)\n2. Short-term improvements (1-2 weeks)\n3. Long-term systemic changes\n4. Process improvements\n5. Monitoring/alerting additions\n\nFor each, specify: owner role, priority, and success criteria.",
                        outputVariable: "actions"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Incident Report",
                        outputName: "report",
                        value: "# Incident Report\n\n{{analysis.text}}\n\n## Action Items\n\n{{actions.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-analyze" },
                { id: "e2", source: "llm-analyze", target: "llm-actions" },
                { id: "e3", source: "llm-actions", target: "output-1" }
            ]
        }
    },
    {
        name: "Tech Spec to Jira Tickets",
        description:
            "Parse technical specifications and automatically create structured Jira tickets with acceptance criteria and story points.",
        category: "engineering",
        tags: ["Jira", "project management", "specifications", "automation"],
        required_integrations: ["jira"],
        featured: true,
        definition: {
            name: "Tech Spec to Jira Tickets",
            nodes: [
                {
                    id: "files-1",
                    type: "files",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Upload Tech Spec",
                        allowedTypes: ["pdf", "docx", "md", "txt"],
                        outputVariable: "techSpec"
                    }
                },
                {
                    id: "llm-parse",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Parse Requirements",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Parse this technical specification into implementable work items:\n\n{{techSpec.text}}\n\nReturn JSON:\n{\n  "epic": {"title": "", "description": ""},\n  "stories": [\n    {\n      "title": "",\n      "description": "",\n      "acceptanceCriteria": [],\n      "storyPoints": 1-13,\n      "priority": "high/medium/low",\n      "dependencies": [],\n      "technicalNotes": ""\n    }\n  ]\n}',
                        outputVariable: "parsed"
                    }
                },
                {
                    id: "llm-refine",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Refine Acceptance Criteria",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Review and improve these user stories:\n\n{{parsed.text}}\n\nFor each story:\n1. Ensure acceptance criteria are testable (Given/When/Then)\n2. Add edge cases and error scenarios\n3. Validate story point estimates\n4. Identify missing technical considerations\n\nReturn the improved JSON structure.",
                        outputVariable: "refined"
                    }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Each Ticket",
                        collection: "refined.stories",
                        itemVariable: "story"
                    }
                },
                {
                    id: "integration-jira",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Jira Issue",
                        provider: "jira",
                        operation: "createIssue",
                        projectKey: ""
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Created Tickets",
                        outputName: "tickets",
                        value: "{{integration-jira.issues}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "files-1", target: "llm-parse" },
                { id: "e2", source: "llm-parse", target: "llm-refine" },
                { id: "e3", source: "llm-refine", target: "loop-1" },
                { id: "e4", source: "loop-1", target: "integration-jira" },
                { id: "e5", source: "integration-jira", target: "output-1" }
            ]
        }
    },
    {
        name: "Dependency Vulnerability Scanner",
        description:
            "Analyze package dependencies for known vulnerabilities, prioritize by severity, and create security tickets in Linear.",
        category: "engineering",
        tags: ["security", "dependencies", "vulnerabilities", "DevSecOps"],
        required_integrations: ["linear", "slack"],
        featured: false,
        definition: {
            name: "Dependency Vulnerability Scanner",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Package File",
                        inputName: "packages",
                        inputVariable: "packages",
                        inputType: "text",
                        description: "Paste package.json, requirements.txt, or Gemfile content"
                    }
                },
                {
                    id: "llm-parse",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Parse Dependencies",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Parse these dependencies and identify the package manager type:\n\n{{packages}}\n\nReturn JSON:\n{\n  "packageManager": "npm/pip/bundler",\n  "dependencies": [{"name": "", "version": "", "isDev": true/false}]\n}',
                        outputVariable: "parsed"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Vulnerabilities",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze these dependencies for known security vulnerabilities:\n\n{{parsed.text}}\n\nFor each vulnerability found, provide:\n{\n  "vulnerabilities": [\n    {\n      "package": "",\n      "currentVersion": "",\n      "cve": "",\n      "severity": "critical/high/medium/low",\n      "description": "",\n      "fixedVersion": "",\n      "recommendation": ""\n    }\n  ],\n  "summary": {"critical": 0, "high": 0, "medium": 0, "low": 0}\n}',
                        outputVariable: "vulnerabilities"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Critical Found?",
                        conditionType: "expression",
                        expression: 'vulnerabilities.text.includes(\'"severity": "critical"\')'
                    }
                },
                {
                    id: "integration-linear",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Security Ticket",
                        provider: "linear",
                        operation: "createIssue",
                        teamId: ""
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Security Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#security-alerts"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-parse" },
                { id: "e2", source: "llm-parse", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "conditional-1" },
                {
                    id: "e4",
                    source: "conditional-1",
                    target: "integration-linear",
                    sourceHandle: "true"
                },
                { id: "e5", source: "integration-linear", target: "integration-slack" },
                {
                    id: "e6",
                    source: "conditional-1",
                    target: "integration-linear",
                    sourceHandle: "false"
                }
            ]
        }
    },
    {
        name: "On-Call Handoff Automator",
        description:
            "Compile open incidents, ongoing issues, and context from the past shift into a structured handoff document for the next on-call.",
        category: "engineering",
        tags: ["on-call", "handoff", "SRE", "documentation"],
        required_integrations: ["jira", "slack", "notion"],
        featured: false,
        definition: {
            name: "On-Call Handoff Automator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Shift End Schedule",
                        triggerType: "schedule",
                        schedule: "0 9,21 * * *",
                        description: "Runs at 9am and 9pm (shift changes)"
                    }
                },
                {
                    id: "integration-jira",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Open Incidents",
                        provider: "jira",
                        operation: "searchIssues",
                        jql: "project = OPS AND status != Done AND type = Incident"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Slack History",
                        provider: "slack",
                        operation: "getChannelHistory",
                        channel: "#incidents"
                    }
                },
                {
                    id: "llm-compile",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Compile Handoff",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an on-call handoff document:\n\nOpen Incidents:\n{{integration-jira.issues}}\n\nRecent Slack Activity:\n{{integration-slack.messages}}\n\nInclude:\n1. Current Status Summary\n2. Open Incidents (priority ordered)\n3. Ongoing Investigations\n4. Recent Resolutions\n5. Things to Watch\n6. Scheduled Maintenance\n7. Escalation Contacts",
                        outputVariable: "handoff"
                    }
                },
                {
                    id: "llm-priorities",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add Recommendations",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Review this handoff and add:\n\n{{handoff.text}}\n\n1. Top 3 priorities for incoming on-call\n2. Potential risks in next 12 hours\n3. Suggested first actions\n4. Knowledge gaps to address",
                        outputVariable: "enhanced"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Save to Notion",
                        provider: "notion",
                        operation: "createPage"
                    }
                },
                {
                    id: "integration-slack-post",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post Handoff",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#on-call"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-jira" },
                { id: "e2", source: "trigger-1", target: "integration-slack" },
                { id: "e3", source: "integration-jira", target: "llm-compile" },
                { id: "e4", source: "integration-slack", target: "llm-compile" },
                { id: "e5", source: "llm-compile", target: "llm-priorities" },
                { id: "e6", source: "llm-priorities", target: "integration-notion" },
                { id: "e7", source: "integration-notion", target: "integration-slack-post" }
            ]
        }
    },
    {
        name: "Architecture Decision Record Generator",
        description:
            "Document architectural decisions with proper context, alternatives considered, and consequences. Saves to GitHub and Notion.",
        category: "engineering",
        tags: ["ADR", "documentation", "architecture", "decisions"],
        required_integrations: ["github", "notion"],
        featured: false,
        definition: {
            name: "Architecture Decision Record Generator",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Decision Context",
                        inputName: "context",
                        inputVariable: "context",
                        inputType: "text",
                        description: "Describe the architectural decision, problem, and constraints"
                    }
                },
                {
                    id: "llm-research",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Research Alternatives",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Research alternatives for this architectural decision:\n\n{{context}}\n\nFor each alternative, provide:\n1. Description\n2. Pros and cons\n3. Industry examples\n4. Estimated effort\n5. Risk assessment",
                        outputVariable: "alternatives"
                    }
                },
                {
                    id: "llm-adr",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate ADR",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an Architecture Decision Record:\n\nContext:\n{{context}}\n\nAlternatives:\n{{alternatives.text}}\n\nFormat as ADR:\n# ADR-[NUMBER]: [TITLE]\n\n## Status\n[Proposed/Accepted/Deprecated/Superseded]\n\n## Context\n[Problem and constraints]\n\n## Decision\n[The decision made]\n\n## Alternatives Considered\n[Each alternative with analysis]\n\n## Consequences\n[Positive and negative outcomes]\n\n## Related Decisions\n[Links to related ADRs]",
                        outputVariable: "adr"
                    }
                },
                {
                    id: "llm-consequences",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Detail Consequences",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Expand on the consequences section of this ADR:\n\n{{adr.text}}\n\nAdd:\n1. Short-term impacts\n2. Long-term implications\n3. Required follow-up work\n4. Success metrics\n5. Rollback strategy if needed",
                        outputVariable: "enhanced"
                    }
                },
                {
                    id: "integration-github",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create PR with ADR",
                        provider: "github",
                        operation: "createPullRequest",
                        repo: "",
                        baseBranch: "main"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add to ADR Database",
                        provider: "notion",
                        operation: "createPage"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "ADR Document",
                        outputName: "adr",
                        value: "{{enhanced.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-research" },
                { id: "e2", source: "llm-research", target: "llm-adr" },
                { id: "e3", source: "llm-adr", target: "llm-consequences" },
                { id: "e4", source: "llm-consequences", target: "integration-github" },
                { id: "e5", source: "llm-consequences", target: "integration-notion" },
                { id: "e6", source: "integration-github", target: "output-1" },
                { id: "e7", source: "integration-notion", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // SUPPORT (5 templates)
    // ========================================================================
    {
        name: "Ticket Auto-Response Generator",
        description:
            "Search knowledge base for relevant content and draft contextual first responses for support tickets, ready for agent review.",
        category: "support",
        tags: ["tickets", "knowledge base", "automation", "response"],
        required_integrations: ["zendesk"],
        featured: true,
        definition: {
            name: "Ticket Auto-Response Generator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Ticket Created",
                        triggerType: "webhook",
                        webhookProvider: "zendesk"
                    }
                },
                {
                    id: "kb-query",
                    type: "knowledgeBaseQuery",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Search Knowledge Base",
                        knowledgeBaseId: "",
                        queryText: "{{trigger-1.data.subject}} {{trigger-1.data.description}}",
                        topK: 5,
                        outputVariable: "kbResults"
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
                        prompt: "Draft a support response for this ticket:\n\nSubject: {{trigger-1.data.subject}}\nDescription: {{trigger-1.data.description}}\nCustomer: {{trigger-1.data.requesterName}}\n\nRelevant KB Articles:\n{{kbResults.combinedText}}\n\nRequirements:\n- Acknowledge their issue empathetically\n- Provide relevant solution steps from KB\n- Include links to helpful articles\n- Offer escalation path if needed\n- Keep professional but friendly tone",
                        outputVariable: "draftResponse"
                    }
                },
                {
                    id: "integration-zendesk",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add Draft as Internal Note",
                        provider: "zendesk",
                        operation: "addInternalNote",
                        ticketId: "{{trigger-1.data.ticketId}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "kb-query" },
                { id: "e2", source: "kb-query", target: "llm-draft" },
                { id: "e3", source: "llm-draft", target: "integration-zendesk" }
            ]
        }
    },
    {
        name: "Customer Sentiment Dashboard",
        description:
            "Aggregate feedback from surveys, analyze sentiment trends, and generate weekly reports with actionable insights.",
        category: "support",
        tags: ["sentiment", "feedback", "analytics", "reporting"],
        required_integrations: ["typeform", "google-sheets", "slack"],
        featured: false,
        definition: {
            name: "Customer Sentiment Dashboard",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Weekly Schedule",
                        triggerType: "schedule",
                        schedule: "0 9 * * 5",
                        description: "Runs every Friday at 9am"
                    }
                },
                {
                    id: "integration-typeform",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Survey Responses",
                        provider: "typeform",
                        operation: "getResponses",
                        formId: "",
                        since: "7 days ago"
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
                        prompt: 'Analyze sentiment from these survey responses:\n\n{{integration-typeform.responses}}\n\nProvide:\n{\n  "overallSentiment": "positive/neutral/negative",\n  "npsScore": 0-100,\n  "topThemes": [{"theme": "", "sentiment": "", "frequency": 0}],\n  "improvementAreas": [],\n  "positiveFeedback": [],\n  "criticalIssues": [],\n  "weekOverWeekChange": ""\n}',
                        outputVariable: "sentiment"
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
                        prompt: "Create a weekly sentiment report:\n\n{{sentiment.text}}\n\nFormat with:\n1. Executive Summary\n2. Key Metrics (NPS, CSAT, response rate)\n3. Theme Analysis\n4. Verbatim Highlights (good and bad)\n5. Recommended Actions\n6. Trends to Watch",
                        outputVariable: "report"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Dashboard",
                        provider: "google-sheets",
                        operation: "appendRow"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Share Report",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#customer-success"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-typeform" },
                { id: "e2", source: "integration-typeform", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "llm-report" },
                { id: "e4", source: "llm-report", target: "integration-sheets" },
                { id: "e5", source: "integration-sheets", target: "integration-slack" }
            ]
        }
    },
    {
        name: "Churn Risk Alerting System",
        description:
            "Monitor customer health signals from HubSpot, score churn risk with AI, and escalate at-risk accounts with suggested save plays.",
        category: "support",
        tags: ["churn", "customer success", "risk management", "alerts"],
        required_integrations: ["hubspot", "slack"],
        featured: true,
        definition: {
            name: "Churn Risk Alerting System",
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
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Customer Data",
                        provider: "hubspot",
                        operation: "getCompanies"
                    }
                },
                {
                    id: "llm-score",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Score Churn Risk",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze these customers for churn risk:\n\n{{integration-hubspot.companies}}\n\nConsider:\n- Login frequency decline\n- Support ticket volume increase\n- Contract renewal date proximity\n- Feature adoption stagnation\n- NPS/CSAT trends\n- Payment issues\n\nFor each at-risk customer, return:\n{\n  "atRiskCustomers": [\n    {\n      "company": "",\n      "riskScore": 1-100,\n      "riskFactors": [],\n      "renewalDate": "",\n      "mrr": 0,\n      "lastContact": "",\n      "healthTrend": "declining/stable/improving"\n    }\n  ]\n}',
                        outputVariable: "riskScores"
                    }
                },
                {
                    id: "llm-playbook",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Save Plays",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "For each at-risk customer, recommend a save play:\n\n{{riskScores.text}}\n\nConsider:\n- Executive sponsor outreach\n- QBR scheduling\n- Training/enablement sessions\n- Feature discovery calls\n- Contract restructuring\n- Success plan creation\n\nProvide specific, actionable next steps for each.",
                        outputVariable: "savePlays"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "High Risk Found?",
                        conditionType: "expression",
                        expression:
                            "riskScores.text.includes('\"riskScore\": 7') || riskScores.text.includes('\"riskScore\": 8') || riskScores.text.includes('\"riskScore\": 9')"
                    }
                },
                {
                    id: "integration-slack-urgent",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Urgent Alert",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#cs-urgent"
                    }
                },
                {
                    id: "integration-slack-daily",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Digest",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#customer-success"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot" },
                { id: "e2", source: "integration-hubspot", target: "llm-score" },
                { id: "e3", source: "llm-score", target: "llm-playbook" },
                { id: "e4", source: "llm-playbook", target: "conditional-1" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack-urgent",
                    sourceHandle: "true"
                },
                {
                    id: "e6",
                    source: "conditional-1",
                    target: "integration-slack-daily",
                    sourceHandle: "false"
                },
                { id: "e7", source: "integration-slack-urgent", target: "integration-slack-daily" }
            ]
        }
    },
    {
        name: "Multilingual Support Router",
        description:
            "Detect ticket language, translate content, route to appropriate regional team, and respond in the customer's language.",
        category: "support",
        tags: ["multilingual", "translation", "routing", "global support"],
        required_integrations: ["zendesk", "slack"],
        featured: false,
        definition: {
            name: "Multilingual Support Router",
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
                    id: "llm-detect",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Detect Language",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: 'Detect the language of this support ticket:\n\n{{trigger-1.data.description}}\n\nReturn JSON: {"language": "en/es/fr/de/ja/zh/pt/other", "confidence": 0-100, "region": "suggested region"}',
                        outputVariable: "language"
                    }
                },
                {
                    id: "llm-translate",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Translate to English",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Translate this support ticket to English (preserve technical terms):\n\n{{trigger-1.data.description}}\n\nProvide the translation and any cultural context notes for the support agent.",
                        outputVariable: "translation"
                    }
                },
                {
                    id: "router-1",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route to Team",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "{{language.region}}",
                        routes: [
                            {
                                value: "americas",
                                label: "Americas",
                                description: "English, Spanish, Portuguese"
                            },
                            { value: "emea", label: "EMEA", description: "French, German, etc." },
                            { value: "apac", label: "APAC", description: "Japanese, Chinese, etc." }
                        ],
                        defaultRoute: "americas"
                    }
                },
                {
                    id: "integration-zendesk",
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
                        label: "Notify Regional Team",
                        provider: "slack",
                        operation: "sendMessage"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-detect" },
                { id: "e2", source: "llm-detect", target: "llm-translate" },
                { id: "e3", source: "llm-translate", target: "router-1" },
                { id: "e4", source: "router-1", target: "integration-zendesk" },
                { id: "e5", source: "integration-zendesk", target: "integration-slack" }
            ]
        }
    },
    {
        name: "Customer Success Playbook Executor",
        description:
            "Trigger journey milestones based on customer events, execute CS playbooks automatically, and track engagement outcomes.",
        category: "support",
        tags: ["customer success", "playbooks", "automation", "journey"],
        required_integrations: ["hubspot", "gmail", "slack"],
        featured: false,
        definition: {
            name: "Customer Success Playbook Executor",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Customer Event",
                        triggerType: "webhook",
                        description: "Triggered by customer milestone events"
                    }
                },
                {
                    id: "integration-hubspot-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Customer Context",
                        provider: "hubspot",
                        operation: "getCompany"
                    }
                },
                {
                    id: "llm-determine",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Determine Playbook",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Determine the appropriate CS playbook for this event:\n\nEvent: {{trigger-1.data}}\nCustomer: {{integration-hubspot-get.data}}\n\nPlaybooks:\n1. Onboarding (days 0-30)\n2. Adoption (days 31-90)\n3. Value Realization (days 91-180)\n4. Expansion (180+ days, healthy)\n5. At-Risk Save (declining health)\n6. Renewal Prep (60 days before renewal)\n\nReturn JSON: {"playbook": "", "actions": [], "timeline": "", "csm_tasks": []}',
                        outputVariable: "playbook"
                    }
                },
                {
                    id: "llm-personalize",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Personalize Outreach",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create personalized outreach for this playbook:\n\nPlaybook: {{playbook.text}}\nCustomer: {{integration-hubspot-get.data}}\n\nGenerate:\n1. Email to primary contact\n2. Internal Slack update for CSM\n3. Calendar invite description (if QBR needed)",
                        outputVariable: "outreach"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Customer Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-hubspot-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Customer Record",
                        provider: "hubspot",
                        operation: "updateCompany"
                    }
                },
                {
                    id: "integration-hubspot-task",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create CSM Tasks",
                        provider: "hubspot",
                        operation: "createTask"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify CS Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#cs-playbook-alerts"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Execution Summary",
                        outputName: "summary",
                        value: '{"customer": "{{integration-hubspot-get.data.name}}", "playbook": "{{playbook.text}}", "actionsExecuted": "email, tasks, update"}'
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot-get" },
                { id: "e2", source: "integration-hubspot-get", target: "llm-determine" },
                { id: "e3", source: "llm-determine", target: "llm-personalize" },
                { id: "e4", source: "llm-personalize", target: "integration-gmail" },
                { id: "e5", source: "integration-gmail", target: "integration-hubspot-update" },
                {
                    id: "e6",
                    source: "integration-hubspot-update",
                    target: "integration-hubspot-task"
                },
                { id: "e7", source: "integration-hubspot-task", target: "integration-slack" },
                { id: "e8", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // MARKETING - NEW TEMPLATES (7 templates showcasing unused integrations)
    // ========================================================================
    {
        name: "Discord Community Engagement Bot",
        description:
            "Monitor Discord channels for community feedback, use AI to categorize and analyze sentiment, log insights to Notion, and track engagement metrics in Amplitude.",
        category: "marketing",
        tags: ["discord", "community", "feedback", "analytics", "gaming"],
        required_integrations: ["discord", "notion", "amplitude"],
        featured: false,
        definition: {
            name: "Discord Community Engagement Bot",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Discord Message",
                        triggerType: "webhook",
                        webhookProvider: "discord",
                        description: "Triggered on new messages in monitored channels"
                    }
                },
                {
                    id: "llm-categorize",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Categorize Feedback",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this Discord message for community feedback:\n\n{{trigger-1.data.content}}\n\nCategorize as:\n1. Bug Report\n2. Feature Request\n3. Question\n4. Praise\n5. Complaint\n6. General Discussion\n\nReturn JSON: {"category": "", "sentiment": "positive/neutral/negative", "priority": "high/medium/low", "summary": "", "actionRequired": true/false}',
                        outputVariable: "categorization"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Action Required?",
                        conditionType: "expression",
                        expression: "categorization.text.includes('\"actionRequired\": true')"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Notion",
                        provider: "notion",
                        operation: "createPage",
                        databaseId: ""
                    }
                },
                {
                    id: "integration-amplitude",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Track in Amplitude",
                        provider: "amplitude",
                        operation: "trackEvent",
                        eventName: "community_feedback"
                    }
                },
                {
                    id: "integration-discord",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Acknowledgment",
                        provider: "discord",
                        operation: "sendMessage"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-categorize" },
                { id: "e2", source: "llm-categorize", target: "conditional-1" },
                {
                    id: "e3",
                    source: "conditional-1",
                    target: "integration-notion",
                    sourceHandle: "true"
                },
                { id: "e4", source: "integration-notion", target: "integration-amplitude" },
                { id: "e5", source: "integration-amplitude", target: "integration-discord" },
                {
                    id: "e6",
                    source: "conditional-1",
                    target: "integration-amplitude",
                    sourceHandle: "false"
                }
            ]
        }
    },
    {
        name: "TikTok Content Performance Tracker",
        description:
            "Fetch TikTok video metrics daily, use AI to analyze performance trends and identify viral patterns, update tracking spreadsheet, and alert team on top performers.",
        category: "marketing",
        tags: ["tiktok", "social media", "analytics", "viral content", "performance"],
        required_integrations: ["tiktok", "google-sheets", "slack"],
        featured: false,
        definition: {
            name: "TikTok Content Performance Tracker",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Schedule",
                        triggerType: "schedule",
                        schedule: "0 10 * * *",
                        description: "Runs daily at 10am"
                    }
                },
                {
                    id: "integration-tiktok",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Video Metrics",
                        provider: "tiktok",
                        operation: "getVideoMetrics",
                        dateRange: "last_24_hours"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Performance",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze these TikTok video metrics:\n\n{{integration-tiktok.data}}\n\nIdentify:\n1. Top performing videos (by engagement rate)\n2. Viral velocity (views in first 24h)\n3. Content patterns that work\n4. Optimal posting times\n5. Audience retention insights\n\nReturn JSON: {"topVideos": [], "trends": [], "recommendations": [], "alertWorthy": []}',
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Tracker",
                        provider: "google-sheets",
                        operation: "appendRow",
                        spreadsheetId: "",
                        sheetName: "TikTok Performance"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Viral Content?",
                        conditionType: "expression",
                        expression:
                            "analysis.text.includes('\"alertWorthy\"') && !analysis.text.includes('\"alertWorthy\": []')"
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
                        channel: "#social-media"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-tiktok" },
                { id: "e2", source: "integration-tiktok", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "integration-sheets" },
                { id: "e4", source: "integration-sheets", target: "conditional-1" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                }
            ]
        }
    },
    {
        name: "YouTube Video Description Generator",
        description:
            "When a new video is uploaded to Google Drive, AI generates SEO-optimized YouTube descriptions, tags, and timestamps, then updates the video metadata.",
        category: "marketing",
        tags: ["youtube", "seo", "content creation", "video marketing", "automation"],
        required_integrations: ["youtube", "google-drive"],
        featured: false,
        definition: {
            name: "YouTube Video Description Generator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Video Upload",
                        triggerType: "webhook",
                        webhookProvider: "google-drive",
                        description: "Triggered when video uploaded to designated folder"
                    }
                },
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Video Details",
                        inputName: "videoDetails",
                        inputVariable: "videoDetails",
                        inputType: "json",
                        description:
                            '{"title": "", "topic": "", "targetKeywords": [], "transcript": ""}'
                    }
                },
                {
                    id: "llm-description",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Description",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create an SEO-optimized YouTube video description:\n\nVideo: {{videoDetails}}\n\nInclude:\n1. Hook (first 150 chars visible in search)\n2. Video summary with target keywords\n3. Timestamps (if transcript available)\n4. CTAs (subscribe, like, comment)\n5. Related links section\n6. Social media links\n\nOptimize for search while keeping it engaging.",
                        outputVariable: "description"
                    }
                },
                {
                    id: "llm-tags",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Tags",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Generate 15-20 relevant YouTube tags for:\n\n{{videoDetails}}\n\nMix of:\n- Broad category tags\n- Specific topic tags\n- Long-tail keyword tags\n- Trending related tags\n\nReturn as comma-separated list.",
                        outputVariable: "tags"
                    }
                },
                {
                    id: "integration-youtube",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Video Metadata",
                        provider: "youtube",
                        operation: "updateVideo"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generated Content",
                        outputName: "metadata",
                        value: '{"description": "{{description.text}}", "tags": "{{tags.text}}"}'
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "input-1" },
                { id: "e2", source: "input-1", target: "llm-description" },
                { id: "e3", source: "input-1", target: "llm-tags" },
                { id: "e4", source: "llm-description", target: "integration-youtube" },
                { id: "e5", source: "llm-tags", target: "integration-youtube" },
                { id: "e6", source: "integration-youtube", target: "output-1" }
            ]
        }
    },
    {
        name: "Reddit Sentiment Monitor",
        description:
            "Monitor specified subreddits for brand mentions, analyze sentiment with AI, alert on negative trends, and log all mentions to PostHog for analysis.",
        category: "marketing",
        tags: [
            "reddit",
            "brand monitoring",
            "sentiment analysis",
            "reputation",
            "social listening"
        ],
        required_integrations: ["reddit", "slack", "posthog"],
        featured: false,
        definition: {
            name: "Reddit Sentiment Monitor",
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
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Monitor Config",
                        inputName: "config",
                        inputVariable: "config",
                        inputType: "json",
                        description:
                            '{"subreddits": ["technology", "startups"], "keywords": ["brand", "product"], "excludeTerms": []}'
                    }
                },
                {
                    id: "integration-reddit",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Search Reddit",
                        provider: "reddit",
                        operation: "searchPosts"
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
                        prompt: 'Analyze sentiment of these Reddit mentions:\n\n{{integration-reddit.posts}}\n\nFor each post/comment:\n1. Sentiment (positive/neutral/negative)\n2. Key themes\n3. Urgency level\n4. Response recommended?\n\nReturn JSON: {"mentions": [{"title": "", "sentiment": "", "score": -1 to 1, "themes": [], "urgency": "", "link": ""}], "overallSentiment": "", "alertLevel": "none/low/medium/high"}',
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "integration-posthog",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to PostHog",
                        provider: "posthog",
                        operation: "capture",
                        eventName: "reddit_mention"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Needed?",
                        conditionType: "expression",
                        expression:
                            'analysis.text.includes(\'"alertLevel": "high"\') || analysis.text.includes(\'"alertLevel": "medium"\')'
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
                        channel: "#brand-monitoring"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "input-1" },
                { id: "e2", source: "input-1", target: "integration-reddit" },
                { id: "e3", source: "integration-reddit", target: "llm-analyze" },
                { id: "e4", source: "llm-analyze", target: "integration-posthog" },
                { id: "e5", source: "integration-posthog", target: "conditional-1" },
                {
                    id: "e6",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                }
            ]
        }
    },
    {
        name: "Mailchimp Campaign Analyzer",
        description:
            "After email campaigns are sent, fetch open/click rates from Mailchimp, use AI to analyze performance patterns, generate insights report, and alert team.",
        category: "marketing",
        tags: ["mailchimp", "email marketing", "analytics", "campaign optimization"],
        required_integrations: ["mailchimp", "google-sheets", "slack"],
        featured: false,
        definition: {
            name: "Mailchimp Campaign Analyzer",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Campaign Sent",
                        triggerType: "webhook",
                        webhookProvider: "mailchimp",
                        description: "Triggered 24h after campaign send"
                    }
                },
                {
                    id: "integration-mailchimp",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Campaign Stats",
                        provider: "mailchimp",
                        operation: "getCampaignReport"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Performance",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this email campaign performance:\n\n{{integration-mailchimp.data}}\n\nProvide:\n1. Performance vs benchmarks (open rate, CTR, unsubscribes)\n2. Best performing links/content\n3. Audience segments that engaged\n4. A/B test results (if applicable)\n5. Recommendations for next campaign\n\nReturn JSON: {"metrics": {}, "insights": [], "recommendations": [], "score": 1-100}',
                        outputVariable: "analysis"
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
                        sheetName: "Email Performance"
                    }
                },
                {
                    id: "llm-summary",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Slack Report",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format this email campaign analysis as a Slack message with emoji headers:\n\n{{analysis.text}}\n\nInclude campaign name, key metrics, and top 3 actionable insights.",
                        outputVariable: "slackMessage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Share Report",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#email-marketing"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-mailchimp" },
                { id: "e2", source: "integration-mailchimp", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "integration-sheets" },
                { id: "e4", source: "integration-sheets", target: "llm-summary" },
                { id: "e5", source: "llm-summary", target: "integration-slack" }
            ]
        }
    },
    {
        name: "Twilio SMS Lead Follow-up",
        description:
            "When a new lead is created in HubSpot, AI crafts a personalized SMS message and sends it via Twilio, then logs the interaction back to the CRM.",
        category: "marketing",
        tags: ["twilio", "sms", "lead nurturing", "automation", "outreach"],
        required_integrations: ["twilio", "hubspot", "slack"],
        featured: false,
        definition: {
            name: "Twilio SMS Lead Follow-up",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New HubSpot Lead",
                        triggerType: "webhook",
                        webhookProvider: "hubspot",
                        description: "Triggered when lead created with phone number"
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
                    id: "llm-craft",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Craft SMS Message",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Craft a personalized SMS follow-up for this lead:\n\n{{integration-hubspot-get.data}}\n\nRequirements:\n- Max 160 characters\n- Personal but professional\n- Include clear next step\n- Reference their interest/source\n- Avoid spam triggers\n\nReturn just the SMS text.",
                        outputVariable: "smsText"
                    }
                },
                {
                    id: "humanReview-1",
                    type: "humanReview",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review SMS",
                        reviewPrompt: "Review the SMS before sending to lead",
                        outputVariable: "approved"
                    }
                },
                {
                    id: "integration-twilio",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send SMS",
                        provider: "twilio",
                        operation: "sendSMS"
                    }
                },
                {
                    id: "integration-hubspot-log",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Activity",
                        provider: "hubspot",
                        operation: "createNote"
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
                        channel: "#sales-notifications"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot-get" },
                { id: "e2", source: "integration-hubspot-get", target: "llm-craft" },
                { id: "e3", source: "llm-craft", target: "humanReview-1" },
                { id: "e4", source: "humanReview-1", target: "integration-twilio" },
                { id: "e5", source: "integration-twilio", target: "integration-hubspot-log" },
                { id: "e6", source: "integration-hubspot-log", target: "integration-slack" }
            ]
        }
    },
    {
        name: "Calendly Meeting Prep",
        description:
            "When a Calendly meeting is booked, pull attendee information, use AI to create meeting prep notes with research and talking points, and notify before the call.",
        category: "marketing",
        tags: ["calendly", "meeting prep", "automation", "productivity", "sales calls"],
        required_integrations: ["calendly", "google-calendar", "slack"],
        featured: false,
        definition: {
            name: "Calendly Meeting Prep",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Meeting Booked",
                        triggerType: "webhook",
                        webhookProvider: "calendly",
                        description: "Triggered when new meeting scheduled"
                    }
                },
                {
                    id: "integration-calendly",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Event Details",
                        provider: "calendly",
                        operation: "getEvent"
                    }
                },
                {
                    id: "llm-research",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Research Attendee",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Research this meeting attendee and prepare talking points:\n\nAttendee: {{integration-calendly.data.invitee}}\nMeeting Type: {{integration-calendly.data.eventType}}\nAnswers to Scheduling Questions: {{integration-calendly.data.questions}}\n\nProvide:\n1. Background (company, role, likely priorities)\n2. Potential pain points\n3. Conversation starters\n4. Key questions to ask\n5. Relevant case studies to mention",
                        outputVariable: "research"
                    }
                },
                {
                    id: "llm-prep",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Prep Notes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create concise meeting prep notes:\n\n{{research.text}}\n\nFormat as:\n- 30-second attendee brief\n- 3 key talking points\n- 3 questions to ask\n- Potential objections & responses\n- Desired outcome for the call",
                        outputVariable: "prepNotes"
                    }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Add to Calendar Event",
                        provider: "google-calendar",
                        operation: "updateEvent"
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Wait Until 30min Before",
                        duration: 0,
                        durationUnit: "dynamic",
                        waitUntil: "{{integration-calendly.data.startTime - 1800}}"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Prep Reminder",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-calendly" },
                { id: "e2", source: "integration-calendly", target: "llm-research" },
                { id: "e3", source: "llm-research", target: "llm-prep" },
                { id: "e4", source: "llm-prep", target: "integration-calendar" },
                { id: "e5", source: "integration-calendar", target: "wait-1" },
                { id: "e6", source: "wait-1", target: "integration-slack" }
            ]
        }
    },

    // ========================================================================
    // SALES - NEW TEMPLATES (6 templates showcasing unused integrations)
    // ========================================================================
    {
        name: "DocuSign Contract Automation",
        description:
            "When a deal is closed-won in Salesforce, automatically generate a contract, send it for signature via DocuSign, and notify the team when signed.",
        category: "sales",
        tags: ["docusign", "contracts", "salesforce", "e-signature", "automation"],
        required_integrations: ["docusign", "salesforce", "slack"],
        featured: true,
        definition: {
            name: "DocuSign Contract Automation",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Deal Closed Won",
                        triggerType: "webhook",
                        webhookProvider: "salesforce",
                        description: "Triggered when opportunity stage = Closed Won"
                    }
                },
                {
                    id: "integration-salesforce-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Deal Details",
                        provider: "salesforce",
                        operation: "getOpportunity"
                    }
                },
                {
                    id: "llm-contract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Prepare Contract Data",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Prepare contract details from this deal:\n\n{{integration-salesforce-get.data}}\n\nExtract and format:\n{\n  "clientName": "",\n  "clientEmail": "",\n  "contractValue": "",\n  "startDate": "",\n  "endDate": "",\n  "services": [],\n  "paymentTerms": "",\n  "specialTerms": []\n}',
                        outputVariable: "contractData"
                    }
                },
                {
                    id: "integration-docusign-create",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Envelope",
                        provider: "docusign",
                        operation: "createEnvelope",
                        templateId: ""
                    }
                },
                {
                    id: "integration-docusign-send",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send for Signature",
                        provider: "docusign",
                        operation: "sendEnvelope"
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
                        channel: "#sales-contracts"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-salesforce-get" },
                { id: "e2", source: "integration-salesforce-get", target: "llm-contract" },
                { id: "e3", source: "llm-contract", target: "integration-docusign-create" },
                {
                    id: "e4",
                    source: "integration-docusign-create",
                    target: "integration-docusign-send"
                },
                {
                    id: "e5",
                    source: "integration-docusign-send",
                    target: "integration-salesforce-update"
                },
                { id: "e6", source: "integration-salesforce-update", target: "integration-slack" }
            ]
        }
    },
    {
        name: "HelloSign Proposal Workflow",
        description:
            "Create a proposal in Google Docs from HubSpot deal data, send for e-signature via HelloSign, and update deal stage automatically upon signing.",
        category: "sales",
        tags: ["hellosign", "proposals", "hubspot", "e-signature", "documents"],
        required_integrations: ["hellosign", "hubspot", "google-docs"],
        featured: false,
        definition: {
            name: "HelloSign Proposal Workflow",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Deal ID",
                        inputName: "dealId",
                        inputVariable: "dealId",
                        inputType: "text",
                        description: "HubSpot Deal ID to create proposal for"
                    }
                },
                {
                    id: "integration-hubspot-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Deal & Contact",
                        provider: "hubspot",
                        operation: "getDeal"
                    }
                },
                {
                    id: "llm-proposal",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Proposal Content",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Generate a professional proposal document:\n\nDeal: {{integration-hubspot-get.data}}\n\nInclude:\n1. Executive Summary\n2. Scope of Work\n3. Timeline\n4. Investment (pricing)\n5. Terms & Conditions\n6. Signature blocks\n\nFormat for Google Docs with proper headings.",
                        outputVariable: "proposalContent"
                    }
                },
                {
                    id: "integration-docs",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Google Doc",
                        provider: "google-docs",
                        operation: "createDocument"
                    }
                },
                {
                    id: "integration-hellosign",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send for Signature",
                        provider: "hellosign",
                        operation: "sendSignatureRequest"
                    }
                },
                {
                    id: "integration-hubspot-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Deal Stage",
                        provider: "hubspot",
                        operation: "updateDeal",
                        dealStage: "proposal_sent"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Proposal Status",
                        outputName: "status",
                        value: '{"documentUrl": "{{integration-docs.url}}", "signatureRequestId": "{{integration-hellosign.requestId}}"}'
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "integration-hubspot-get" },
                { id: "e2", source: "integration-hubspot-get", target: "llm-proposal" },
                { id: "e3", source: "llm-proposal", target: "integration-docs" },
                { id: "e4", source: "integration-docs", target: "integration-hellosign" },
                { id: "e5", source: "integration-hellosign", target: "integration-hubspot-update" },
                { id: "e6", source: "integration-hubspot-update", target: "output-1" }
            ]
        }
    },
    {
        name: "Close CRM Lead Enrichment",
        description:
            "When a new lead is created in Close CRM, enrich it with Apollo data, use AI to generate a qualification score, and notify the assigned sales rep.",
        category: "sales",
        tags: ["close", "apollo", "lead enrichment", "qualification", "outbound sales"],
        required_integrations: ["close", "apollo", "slack"],
        featured: false,
        definition: {
            name: "Close CRM Lead Enrichment",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Close Lead",
                        triggerType: "webhook",
                        webhookProvider: "close",
                        description: "Triggered when lead created in Close"
                    }
                },
                {
                    id: "integration-apollo",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Enrich with Apollo",
                        provider: "apollo",
                        operation: "enrichPerson"
                    }
                },
                {
                    id: "llm-qualify",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Score & Qualify Lead",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Qualify this lead based on enriched data:\n\nOriginal Lead: {{trigger-1.data}}\nEnriched Data: {{integration-apollo.data}}\n\nScore based on:\n- Company size fit (1-10)\n- Title/seniority fit (1-10)\n- Industry fit (1-10)\n- Tech stack fit (1-10)\n- Timing signals (1-10)\n\nReturn JSON: {"score": 0-100, "tier": "A/B/C/D", "strengths": [], "concerns": [], "recommendedApproach": "", "talkingPoints": []}',
                        outputVariable: "qualification"
                    }
                },
                {
                    id: "integration-close-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Close Lead",
                        provider: "close",
                        operation: "updateLead"
                    }
                },
                {
                    id: "llm-slack",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Notification",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format this lead qualification as a Slack message:\n\n{{qualification.text}}\n\nInclude: Name, company, score badge, key talking points, and recommended action.",
                        outputVariable: "slackMessage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Sales Rep",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-apollo" },
                { id: "e2", source: "integration-apollo", target: "llm-qualify" },
                { id: "e3", source: "llm-qualify", target: "integration-close-update" },
                { id: "e4", source: "integration-close-update", target: "llm-slack" },
                { id: "e5", source: "llm-slack", target: "integration-slack" }
            ]
        }
    },
    {
        name: "Microsoft Teams Sales Standup",
        description:
            "Daily automated sales standup: pull HubSpot pipeline data, AI summarizes key deals and blockers, post to Teams, and log metrics to Excel.",
        category: "sales",
        tags: ["microsoft-teams", "hubspot", "excel", "sales standup", "reporting"],
        required_integrations: ["microsoft-teams", "hubspot", "microsoft-excel"],
        featured: false,
        definition: {
            name: "Microsoft Teams Sales Standup",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily at 8:30am",
                        triggerType: "schedule",
                        schedule: "30 8 * * 1-5",
                        description: "Runs Mon-Fri at 8:30am"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Pipeline Data",
                        provider: "hubspot",
                        operation: "getDeals",
                        filters: "stage:not_closed"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Pipeline",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this sales pipeline for the daily standup:\n\n{{integration-hubspot.data}}\n\nProvide:\n{\n  "pipelineValue": 0,\n  "dealsClosingThisWeek": [],\n  "stuckDeals": [],\n  "newDealsYesterday": [],\n  "topPriorityActions": [],\n  "riskAlerts": [],\n  "winPredictions": []\n}',
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-format",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Standup",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format this pipeline analysis as a Teams standup message:\n\n{{analysis.text}}\n\nUse adaptive cards format with:\n- Pipeline summary header\n- Deals closing this week table\n- Priority actions list\n- Risk alerts section",
                        outputVariable: "teamsMessage"
                    }
                },
                {
                    id: "integration-teams",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Post to Teams",
                        provider: "microsoft-teams",
                        operation: "sendMessage",
                        channel: "Sales Team"
                    }
                },
                {
                    id: "integration-excel",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Excel",
                        provider: "microsoft-excel",
                        operation: "appendRow",
                        workbookId: "",
                        sheetName: "Daily Pipeline Metrics"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot" },
                { id: "e2", source: "integration-hubspot", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "llm-format" },
                { id: "e4", source: "llm-format", target: "integration-teams" },
                { id: "e5", source: "integration-teams", target: "integration-excel" }
            ]
        }
    },
    {
        name: "Stripe Payment Reconciliation",
        description:
            "Daily fetch of Stripe transactions, AI categorizes and detects anomalies, updates tracking spreadsheet, and alerts finance team on issues.",
        category: "sales",
        tags: ["stripe", "payments", "finance", "reconciliation", "automation"],
        required_integrations: ["stripe", "google-sheets", "slack"],
        featured: false,
        definition: {
            name: "Stripe Payment Reconciliation",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily at 6am",
                        triggerType: "schedule",
                        schedule: "0 6 * * *",
                        description: "Runs daily at 6am"
                    }
                },
                {
                    id: "integration-stripe",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Transactions",
                        provider: "stripe",
                        operation: "listCharges",
                        dateRange: "last_24_hours"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze & Categorize",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze these Stripe transactions:\n\n{{integration-stripe.data}}\n\nProvide:\n{\n  "totalVolume": 0,\n  "transactionCount": 0,\n  "byCategory": {"subscriptions": 0, "oneTime": 0, "refunds": 0},\n  "anomalies": [{"type": "", "description": "", "amount": 0, "severity": ""}],\n  "failedPayments": [],\n  "largeTransactions": [],\n  "refundRate": 0\n}',
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Tracker",
                        provider: "google-sheets",
                        operation: "appendRow",
                        spreadsheetId: "",
                        sheetName: "Payment Reconciliation"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Anomalies Found?",
                        conditionType: "expression",
                        expression: "!analysis.text.includes('\"anomalies\": []')"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Finance Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#finance-alerts"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily Summary",
                        outputName: "summary",
                        value: "{{analysis.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-stripe" },
                { id: "e2", source: "integration-stripe", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "integration-sheets" },
                { id: "e4", source: "integration-sheets", target: "conditional-1" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                },
                { id: "e6", source: "conditional-1", target: "output-1", sourceHandle: "false" },
                { id: "e7", source: "integration-slack", target: "output-1" }
            ]
        }
    },
    {
        name: "Zoom Meeting Summarizer",
        description:
            "After a Zoom meeting ends, fetch the recording, AI transcribes and generates a summary with action items, saves to Notion, and shares with attendees.",
        category: "sales",
        tags: ["zoom", "meeting notes", "transcription", "notion", "automation"],
        required_integrations: ["zoom", "notion", "slack"],
        featured: false,
        definition: {
            name: "Zoom Meeting Summarizer",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Recording Ready",
                        triggerType: "webhook",
                        webhookProvider: "zoom",
                        description: "Triggered when Zoom recording is available"
                    }
                },
                {
                    id: "integration-zoom",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Recording",
                        provider: "zoom",
                        operation: "getRecording"
                    }
                },
                {
                    id: "transcribe-1",
                    type: "audioTranscription",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Transcribe Recording",
                        provider: "openai",
                        model: "whisper-1",
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
                        prompt: 'Create comprehensive meeting notes from this transcript:\n\n{{transcript.text}}\n\nInclude:\n1. Meeting Overview (attendees, duration, topic)\n2. Key Discussion Points\n3. Decisions Made\n4. Action Items with owners\n5. Follow-up Questions\n6. Next Steps\n\nReturn JSON: {"summary": "", "decisions": [], "actionItems": [{"task": "", "owner": "", "dueDate": ""}], "nextSteps": []}',
                        outputVariable: "summary"
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
                        databaseId: ""
                    }
                },
                {
                    id: "llm-format",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format for Slack",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Format this meeting summary for Slack:\n\n{{summary.text}}\n\nKeep it concise with emoji headers, link to Notion page, and highlight action items with owners.",
                        outputVariable: "slackMessage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Share with Attendees",
                        provider: "slack",
                        operation: "sendMessage"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-zoom" },
                { id: "e2", source: "integration-zoom", target: "transcribe-1" },
                { id: "e3", source: "transcribe-1", target: "llm-summarize" },
                { id: "e4", source: "llm-summarize", target: "integration-notion" },
                { id: "e5", source: "integration-notion", target: "llm-format" },
                { id: "e6", source: "llm-format", target: "integration-slack" }
            ]
        }
    },

    // ========================================================================
    // OPERATIONS - NEW TEMPLATES (4 templates showcasing unused integrations)
    // ========================================================================
    {
        name: "Trello to Database Sync",
        description:
            "When Trello cards move between lists, sync the status to PostgreSQL database, AI generates status reports, and updates team in Slack.",
        category: "operations",
        tags: ["trello", "postgresql", "database sync", "project tracking", "automation"],
        required_integrations: ["trello", "postgresql", "slack"],
        featured: false,
        definition: {
            name: "Trello to Database Sync",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Card Moved",
                        triggerType: "webhook",
                        webhookProvider: "trello",
                        description: "Triggered when card moves between lists"
                    }
                },
                {
                    id: "integration-trello",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Card Details",
                        provider: "trello",
                        operation: "getCard"
                    }
                },
                {
                    id: "llm-transform",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Transform for Database",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: 'Transform this Trello card data for database insert:\n\n{{integration-trello.data}}\n\nReturn JSON: {"id": "", "title": "", "status": "", "assignee": "", "due_date": "", "labels": [], "last_activity": "", "metadata": {}}',
                        outputVariable: "dbRecord"
                    }
                },
                {
                    id: "integration-postgresql",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Upsert to Database",
                        provider: "postgresql",
                        operation: "upsert",
                        table: "project_tasks"
                    }
                },
                {
                    id: "llm-report",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Status Update",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Generate a brief status update for Slack:\n\nCard: {{integration-trello.data.name}}\nMoved to: {{trigger-1.data.listAfter}}\nFrom: {{trigger-1.data.listBefore}}\n\nKeep it to 1-2 lines with relevant emoji.",
                        outputVariable: "statusUpdate"
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
                        channel: "#project-updates"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-trello" },
                { id: "e2", source: "integration-trello", target: "llm-transform" },
                { id: "e3", source: "llm-transform", target: "integration-postgresql" },
                { id: "e4", source: "integration-postgresql", target: "llm-report" },
                { id: "e5", source: "llm-report", target: "integration-slack" }
            ]
        }
    },
    {
        name: "Monday.com Project Reporter",
        description:
            "Weekly pull of Monday.com board data, AI creates executive summary with progress metrics, exports to Google Sheets, and emails stakeholders.",
        category: "operations",
        tags: ["monday", "reporting", "project management", "executive summary", "automation"],
        required_integrations: ["monday", "google-sheets", "gmail"],
        featured: false,
        definition: {
            name: "Monday.com Project Reporter",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Weekly Friday 4pm",
                        triggerType: "schedule",
                        schedule: "0 16 * * 5",
                        description: "Runs every Friday at 4pm"
                    }
                },
                {
                    id: "integration-monday",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Board Data",
                        provider: "monday",
                        operation: "getBoard"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Progress",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this Monday.com board data for weekly report:\n\n{{integration-monday.data}}\n\nCalculate and provide:\n{\n  "completedThisWeek": [],\n  "inProgress": [],\n  "blocked": [],\n  "upcomingDeadlines": [],\n  "velocityMetrics": {},\n  "riskItems": [],\n  "highlights": [],\n  "needsAttention": []\n}',
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-summary",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Executive Summary",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a 1-page executive summary from this analysis:\n\n{{analysis.text}}\n\nFormat for busy executives:\n- Traffic light status (Green/Yellow/Red)\n- 3 key accomplishments\n- 3 items needing attention\n- Next week's priorities\n- Resource/budget notes",
                        outputVariable: "execSummary"
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
                        sheetName: "Weekly Reports"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Email Stakeholders",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-monday" },
                { id: "e2", source: "integration-monday", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "llm-summary" },
                { id: "e4", source: "llm-summary", target: "integration-sheets" },
                { id: "e5", source: "integration-sheets", target: "integration-gmail" }
            ]
        }
    },
    {
        name: "Dropbox Document Processor",
        description:
            "When new files are added to Dropbox, AI extracts metadata and classifies content, creates Airtable records for tracking, and notifies the team.",
        category: "operations",
        tags: ["dropbox", "airtable", "document management", "classification", "automation"],
        required_integrations: ["dropbox", "airtable", "slack"],
        featured: false,
        definition: {
            name: "Dropbox Document Processor",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New File Upload",
                        triggerType: "webhook",
                        webhookProvider: "dropbox",
                        description: "Triggered when file added to monitored folder"
                    }
                },
                {
                    id: "integration-dropbox",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get File Content",
                        provider: "dropbox",
                        operation: "downloadFile"
                    }
                },
                {
                    id: "llm-extract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract & Classify",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this document and extract metadata:\n\n{{integration-dropbox.data}}\n\nReturn JSON:\n{\n  "documentType": "contract/invoice/report/memo/other",\n  "title": "",\n  "date": "",\n  "parties": [],\n  "keyTerms": [],\n  "summary": "",\n  "tags": [],\n  "confidentiality": "public/internal/confidential/restricted",\n  "actionRequired": true/false,\n  "expirationDate": ""\n}',
                        outputVariable: "metadata"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Record",
                        provider: "airtable",
                        operation: "createRecord",
                        baseId: "",
                        tableId: ""
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Action Required?",
                        conditionType: "expression",
                        expression: "metadata.text.includes('\"actionRequired\": true')"
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
                        channel: "#document-processing"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-dropbox" },
                { id: "e2", source: "integration-dropbox", target: "llm-extract" },
                { id: "e3", source: "llm-extract", target: "integration-airtable" },
                { id: "e4", source: "integration-airtable", target: "conditional-1" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                }
            ]
        }
    },
    {
        name: "Box Legal Document Review",
        description:
            "Upload contracts to Box for AI-powered compliance review, log findings to Notion, and alert legal team on Microsoft Teams for high-risk items.",
        category: "operations",
        tags: ["box", "legal", "compliance", "document review", "risk management"],
        required_integrations: ["box", "notion", "microsoft-teams"],
        featured: false,
        definition: {
            name: "Box Legal Document Review",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Document Uploaded",
                        triggerType: "webhook",
                        webhookProvider: "box",
                        description: "Triggered when document added to Legal Review folder"
                    }
                },
                {
                    id: "integration-box",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Download Document",
                        provider: "box",
                        operation: "downloadFile"
                    }
                },
                {
                    id: "llm-review",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review for Compliance",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Review this legal document for compliance issues:\n\n{{integration-box.data}}\n\nCheck for:\n1. Non-standard terms\n2. Liability concerns\n3. IP/confidentiality issues\n4. Payment terms risks\n5. Termination clause concerns\n6. Regulatory compliance\n\nReturn JSON:\n{\n  "documentType": "",\n  "parties": [],\n  "riskLevel": "low/medium/high/critical",\n  "findings": [{"issue": "", "severity": "", "clause": "", "recommendation": ""}],\n  "standardTermsDeviation": [],\n  "requiredApprovals": [],\n  "summary": ""\n}',
                        outputVariable: "review"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Notion",
                        provider: "notion",
                        operation: "createPage",
                        databaseId: ""
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "High Risk?",
                        conditionType: "expression",
                        expression:
                            'review.text.includes(\'"riskLevel": "high"\') || review.text.includes(\'"riskLevel": "critical"\')'
                    }
                },
                {
                    id: "integration-teams",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Legal Team",
                        provider: "microsoft-teams",
                        operation: "sendMessage",
                        channel: "Legal Alerts"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Review Results",
                        outputName: "results",
                        value: "{{review.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-box" },
                { id: "e2", source: "integration-box", target: "llm-review" },
                { id: "e3", source: "llm-review", target: "integration-notion" },
                { id: "e4", source: "integration-notion", target: "conditional-1" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-teams",
                    sourceHandle: "true"
                },
                { id: "e6", source: "conditional-1", target: "output-1", sourceHandle: "false" },
                { id: "e7", source: "integration-teams", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // ENGINEERING - NEW TEMPLATES (4 templates showcasing unused integrations)
    // ========================================================================
    {
        name: "Figma Design Handoff",
        description:
            "When Figma files are updated, AI extracts component specifications, creates Jira tickets for implementation, and notifies developers on Slack.",
        category: "engineering",
        tags: ["figma", "jira", "design handoff", "components", "design systems"],
        required_integrations: ["figma", "jira", "slack"],
        featured: false,
        definition: {
            name: "Figma Design Handoff",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Figma File Updated",
                        triggerType: "webhook",
                        webhookProvider: "figma",
                        description: "Triggered when design file is published"
                    }
                },
                {
                    id: "integration-figma",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get File Details",
                        provider: "figma",
                        operation: "getFile"
                    }
                },
                {
                    id: "llm-extract",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Components",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this Figma file data and extract implementation specs:\n\n{{integration-figma.data}}\n\nFor each new/updated component, provide:\n{\n  "components": [\n    {\n      "name": "",\n      "type": "new/update",\n      "specs": {"dimensions": "", "colors": [], "typography": {}, "spacing": {}},\n      "states": [],\n      "interactions": [],\n      "responsiveBehavior": "",\n      "accessibilityNotes": "",\n      "implementationNotes": ""\n    }\n  ],\n  "designTokenChanges": [],\n  "breakingChanges": []\n}',
                        outputVariable: "specs"
                    }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Tickets",
                        collection: "specs.components",
                        itemVariable: "component"
                    }
                },
                {
                    id: "integration-jira",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Jira Ticket",
                        provider: "jira",
                        operation: "createIssue",
                        projectKey: "",
                        issueType: "Task"
                    }
                },
                {
                    id: "llm-slack",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Handoff Message",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Create a design handoff announcement for Slack:\n\nSpecs: {{specs.text}}\n\nInclude: File name, component count, breaking changes warning, and Figma link.",
                        outputVariable: "slackMessage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Notify Developers",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#design-engineering"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-figma" },
                { id: "e2", source: "integration-figma", target: "llm-extract" },
                { id: "e3", source: "llm-extract", target: "loop-1" },
                { id: "e4", source: "loop-1", target: "integration-jira" },
                { id: "e5", source: "integration-jira", target: "llm-slack" },
                { id: "e6", source: "llm-slack", target: "integration-slack" }
            ]
        }
    },
    {
        name: "MongoDB Data Pipeline Monitor",
        description:
            "Query MongoDB for pipeline metrics, AI detects anomalies and performance issues, alerts on problems, and logs metrics to Mixpanel.",
        category: "engineering",
        tags: ["mongodb", "data pipeline", "monitoring", "anomaly detection", "mixpanel"],
        required_integrations: ["mongodb", "slack", "mixpanel"],
        featured: false,
        definition: {
            name: "MongoDB Data Pipeline Monitor",
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
                    id: "integration-mongodb",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Query Pipeline Metrics",
                        provider: "mongodb",
                        operation: "aggregate",
                        collection: "pipeline_metrics"
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
                        prompt: 'Analyze these data pipeline metrics for anomalies:\n\n{{integration-mongodb.data}}\n\nCheck for:\n1. Throughput deviations (>2 std dev)\n2. Latency spikes\n3. Error rate increases\n4. Queue buildup\n5. Resource exhaustion patterns\n\nReturn JSON:\n{\n  "status": "healthy/warning/critical",\n  "anomalies": [{"metric": "", "current": 0, "baseline": 0, "deviation": "", "severity": ""}],\n  "trends": [],\n  "recommendations": [],\n  "alertRequired": true/false\n}',
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "integration-mixpanel",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to Mixpanel",
                        provider: "mixpanel",
                        operation: "track",
                        eventName: "pipeline_health_check"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Needed?",
                        conditionType: "expression",
                        expression: "analysis.text.includes('\"alertRequired\": true')"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Engineering",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#data-engineering-alerts"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-mongodb" },
                { id: "e2", source: "integration-mongodb", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "integration-mixpanel" },
                { id: "e4", source: "integration-mixpanel", target: "conditional-1" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                }
            ]
        }
    },
    {
        name: "PostgreSQL Report Generator",
        description:
            "Run scheduled SQL queries on PostgreSQL, AI formats results into executive reports, exports to Google Sheets, and emails stakeholders.",
        category: "engineering",
        tags: ["postgresql", "reporting", "analytics", "automation", "business intelligence"],
        required_integrations: ["postgresql", "google-sheets", "gmail"],
        featured: false,
        definition: {
            name: "PostgreSQL Report Generator",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Daily at 7am",
                        triggerType: "schedule",
                        schedule: "0 7 * * *",
                        description: "Runs daily at 7am"
                    }
                },
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Report Config",
                        inputName: "config",
                        inputVariable: "config",
                        inputType: "json",
                        description:
                            '{"reportName": "", "queries": [{"name": "", "sql": ""}], "recipients": []}'
                    }
                },
                {
                    id: "integration-postgresql",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Execute Queries",
                        provider: "postgresql",
                        operation: "query"
                    }
                },
                {
                    id: "llm-format",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Format Report",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Format these SQL query results into an executive report:\n\n{{integration-postgresql.data}}\n\nInclude:\n1. Executive Summary (key metrics at a glance)\n2. Trend Analysis (week-over-week, month-over-month)\n3. Notable Changes (significant increases/decreases)\n4. Data Tables (formatted for readability)\n5. Recommended Actions\n\nFormat for both email and spreadsheet export.",
                        outputVariable: "report"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Export to Sheets",
                        provider: "google-sheets",
                        operation: "updateRange",
                        spreadsheetId: ""
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
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "input-1" },
                { id: "e2", source: "input-1", target: "integration-postgresql" },
                { id: "e3", source: "integration-postgresql", target: "llm-format" },
                { id: "e4", source: "llm-format", target: "integration-sheets" },
                { id: "e5", source: "integration-sheets", target: "integration-gmail" }
            ]
        }
    },
    {
        name: "Heap User Journey Analyzer",
        description:
            "Pull Heap session data, AI identifies friction points and drop-off patterns, documents findings in Notion, and alerts product team.",
        category: "engineering",
        tags: ["heap", "user analytics", "product", "friction analysis", "notion"],
        required_integrations: ["heap", "notion", "slack"],
        featured: false,
        definition: {
            name: "Heap User Journey Analyzer",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Weekly Analysis",
                        triggerType: "schedule",
                        schedule: "0 9 * * 1",
                        description: "Runs every Monday at 9am"
                    }
                },
                {
                    id: "integration-heap",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Session Data",
                        provider: "heap",
                        operation: "query",
                        dateRange: "last_7_days"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze User Journeys",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this Heap session data for UX insights:\n\n{{integration-heap.data}}\n\nIdentify:\n{\n  "funnelAnalysis": {"steps": [], "dropOffPoints": []},\n  "frictionPoints": [{"location": "", "symptom": "", "impact": "", "hypothesis": ""}],\n  "rageClicks": [],\n  "deadClicks": [],\n  "errorCorrelations": [],\n  "segmentInsights": [],\n  "recommendations": [{"priority": "", "issue": "", "suggestedFix": "", "expectedImpact": ""}]\n}',
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-document",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Research Doc",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Format this UX analysis as a Notion research document:\n\n{{analysis.text}}\n\nStructure:\n- Executive Summary\n- Key Findings (with severity ratings)\n- User Journey Maps\n- Friction Point Details\n- Recommended Experiments\n- Success Metrics",
                        outputVariable: "document"
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
                        databaseId: ""
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Product Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#product-insights"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-heap" },
                { id: "e2", source: "integration-heap", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "llm-document" },
                { id: "e4", source: "llm-document", target: "integration-notion" },
                { id: "e5", source: "integration-notion", target: "integration-slack" }
            ]
        }
    },

    // ========================================================================
    // SUPPORT - NEW TEMPLATES (7 templates showcasing unused integrations)
    // ========================================================================
    {
        name: "WhatsApp Customer Support Bot",
        description:
            "Receive WhatsApp messages, AI drafts contextual responses, creates Zendesk tickets for complex issues, and updates HubSpot contact records.",
        category: "support",
        tags: ["whatsapp", "customer support", "zendesk", "chatbot", "automation"],
        required_integrations: ["whatsapp", "zendesk", "hubspot"],
        featured: true,
        definition: {
            name: "WhatsApp Customer Support Bot",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "WhatsApp Message",
                        triggerType: "webhook",
                        webhookProvider: "whatsapp",
                        description: "Triggered on incoming WhatsApp message"
                    }
                },
                {
                    id: "integration-hubspot-get",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Customer Context",
                        provider: "hubspot",
                        operation: "getContactByPhone"
                    }
                },
                {
                    id: "llm-classify",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Classify & Respond",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this WhatsApp support message:\n\nMessage: {{trigger-1.data.message}}\nCustomer History: {{integration-hubspot-get.data}}\n\nClassify and respond:\n{\n  "intent": "question/complaint/request/feedback/other",\n  "complexity": "simple/medium/complex",\n  "sentiment": "positive/neutral/negative",\n  "suggestedResponse": "",\n  "requiresHumanHandoff": true/false,\n  "suggestedTicketPriority": "low/medium/high/urgent",\n  "relevantKBArticles": []\n}',
                        outputVariable: "classification"
                    }
                },
                {
                    id: "router-1",
                    type: "router",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Route by Complexity",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "{{classification.complexity}}",
                        routes: [
                            { value: "simple", label: "Simple", description: "Auto-respond" },
                            { value: "medium", label: "Medium", description: "Respond + log" },
                            { value: "complex", label: "Complex", description: "Create ticket" }
                        ],
                        defaultRoute: "medium"
                    }
                },
                {
                    id: "integration-whatsapp",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Response",
                        provider: "whatsapp",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "integration-zendesk",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Create Ticket",
                        provider: "zendesk",
                        operation: "createTicket"
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
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot-get" },
                { id: "e2", source: "integration-hubspot-get", target: "llm-classify" },
                { id: "e3", source: "llm-classify", target: "router-1" },
                {
                    id: "e4",
                    source: "router-1",
                    target: "integration-whatsapp",
                    sourceHandle: "simple"
                },
                {
                    id: "e5",
                    source: "router-1",
                    target: "integration-whatsapp",
                    sourceHandle: "medium"
                },
                {
                    id: "e6",
                    source: "router-1",
                    target: "integration-zendesk",
                    sourceHandle: "complex"
                },
                { id: "e7", source: "integration-zendesk", target: "integration-whatsapp" },
                { id: "e8", source: "integration-whatsapp", target: "integration-hubspot-update" }
            ]
        }
    },
    {
        name: "Telegram Support Channel",
        description:
            "Monitor Telegram support channels, AI categorizes messages, logs to Notion knowledge base, and escalates complex issues to Slack.",
        category: "support",
        tags: ["telegram", "community support", "knowledge base", "escalation", "automation"],
        required_integrations: ["telegram", "notion", "slack"],
        featured: false,
        definition: {
            name: "Telegram Support Channel",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Telegram Message",
                        triggerType: "webhook",
                        webhookProvider: "telegram",
                        description: "Triggered on new message in support group"
                    }
                },
                {
                    id: "llm-categorize",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Categorize Message",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Categorize this Telegram support message:\n\n{{trigger-1.data.message}}\n\nProvide:\n{\n  "category": "bug/feature-request/how-to/account/billing/other",\n  "topic": "",\n  "sentiment": "positive/neutral/negative/frustrated",\n  "isQuestion": true/false,\n  "kbSearchTerms": [],\n  "suggestedAnswer": "",\n  "needsEscalation": true/false,\n  "escalationReason": ""\n}',
                        outputVariable: "categorization"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log to KB",
                        provider: "notion",
                        operation: "createPage",
                        databaseId: ""
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Needs Escalation?",
                        conditionType: "expression",
                        expression: "categorization.text.includes('\"needsEscalation\": true')"
                    }
                },
                {
                    id: "integration-telegram",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Reply in Telegram",
                        provider: "telegram",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Escalate to Slack",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#support-escalations"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-categorize" },
                { id: "e2", source: "llm-categorize", target: "integration-notion" },
                { id: "e3", source: "integration-notion", target: "conditional-1" },
                {
                    id: "e4",
                    source: "conditional-1",
                    target: "integration-telegram",
                    sourceHandle: "false"
                },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                },
                { id: "e6", source: "integration-slack", target: "integration-telegram" }
            ]
        }
    },
    {
        name: "Facebook Messenger Auto-Responder",
        description:
            "Receive Facebook Messenger inquiries, AI generates contextual responses, updates HubSpot contacts, and alerts support for complex issues.",
        category: "support",
        tags: ["facebook", "messenger", "auto-response", "e-commerce", "customer service"],
        required_integrations: ["facebook", "hubspot", "slack"],
        featured: false,
        definition: {
            name: "Facebook Messenger Auto-Responder",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "FB Message Received",
                        triggerType: "webhook",
                        webhookProvider: "facebook",
                        description: "Triggered on new Messenger message"
                    }
                },
                {
                    id: "integration-hubspot-search",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Find Customer",
                        provider: "hubspot",
                        operation: "searchContacts"
                    }
                },
                {
                    id: "llm-respond",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Generate Response",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Generate a helpful response for this Facebook Messenger inquiry:\n\nMessage: {{trigger-1.data.message}}\nCustomer Data: {{integration-hubspot-search.data}}\n\nProvide:\n{\n  "response": "",\n  "intent": "product-inquiry/order-status/complaint/general",\n  "confidence": 0-100,\n  "needsHuman": true/false,\n  "suggestedActions": [],\n  "orderLookupNeeded": true/false\n}',
                        outputVariable: "aiResponse"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Needs Human?",
                        conditionType: "expression",
                        expression: "aiResponse.text.includes('\"needsHuman\": true')"
                    }
                },
                {
                    id: "integration-facebook",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Send Response",
                        provider: "facebook",
                        operation: "sendMessage"
                    }
                },
                {
                    id: "integration-hubspot-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Interaction",
                        provider: "hubspot",
                        operation: "createNote"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Support",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#facebook-support"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-hubspot-search" },
                { id: "e2", source: "integration-hubspot-search", target: "llm-respond" },
                { id: "e3", source: "llm-respond", target: "conditional-1" },
                {
                    id: "e4",
                    source: "conditional-1",
                    target: "integration-facebook",
                    sourceHandle: "false"
                },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                },
                { id: "e6", source: "integration-slack", target: "integration-facebook" },
                { id: "e7", source: "integration-facebook", target: "integration-hubspot-update" }
            ]
        }
    },
    {
        name: "SurveyMonkey NPS Processor",
        description:
            "Process NPS survey responses from SurveyMonkey, AI analyzes sentiment and categorizes feedback, alerts on detractors, and logs to tracking sheet.",
        category: "support",
        tags: ["surveymonkey", "nps", "customer feedback", "sentiment analysis", "automation"],
        required_integrations: ["surveymonkey", "slack", "google-sheets"],
        featured: false,
        definition: {
            name: "SurveyMonkey NPS Processor",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Survey Response",
                        triggerType: "webhook",
                        webhookProvider: "surveymonkey",
                        description: "Triggered on new NPS survey response"
                    }
                },
                {
                    id: "integration-surveymonkey",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Full Response",
                        provider: "surveymonkey",
                        operation: "getResponse"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Response",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this NPS survey response:\n\n{{integration-surveymonkey.data}}\n\nProvide:\n{\n  "npsScore": 0-10,\n  "category": "promoter/passive/detractor",\n  "sentiment": "positive/neutral/negative",\n  "themes": [],\n  "keyFeedback": "",\n  "actionable": true/false,\n  "suggestedFollowUp": "",\n  "urgency": "low/medium/high",\n  "department": "product/support/sales/other"\n}',
                        outputVariable: "analysis"
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
                        sheetName: "NPS Responses"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Is Detractor?",
                        conditionType: "expression",
                        expression: 'analysis.text.includes(\'"category": "detractor"\')'
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert on Detractor",
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
                        label: "Analysis Result",
                        outputName: "result",
                        value: "{{analysis.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-surveymonkey" },
                { id: "e2", source: "integration-surveymonkey", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "integration-sheets" },
                { id: "e4", source: "integration-sheets", target: "conditional-1" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                },
                { id: "e6", source: "conditional-1", target: "output-1", sourceHandle: "false" },
                { id: "e7", source: "integration-slack", target: "output-1" }
            ]
        }
    },
    {
        name: "Intercom Conversation Analyzer",
        description:
            "When Intercom conversations close, AI extracts insights and identifies patterns, logs to Google Sheets, and alerts on escalation patterns.",
        category: "support",
        tags: ["intercom", "conversation analytics", "insights", "patterns", "automation"],
        required_integrations: ["intercom", "slack", "google-sheets"],
        featured: false,
        definition: {
            name: "Intercom Conversation Analyzer",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Conversation Closed",
                        triggerType: "webhook",
                        webhookProvider: "intercom",
                        description: "Triggered when conversation is closed"
                    }
                },
                {
                    id: "integration-intercom",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Get Conversation",
                        provider: "intercom",
                        operation: "getConversation"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Extract Insights",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this Intercom conversation:\n\n{{integration-intercom.data}}\n\nExtract:\n{\n  "topic": "",\n  "resolution": "resolved/unresolved/escalated",\n  "responseTime": "",\n  "customerSentiment": "satisfied/neutral/frustrated",\n  "agentPerformance": {"helpful": true/false, "professional": true/false},\n  "rootCause": "",\n  "productFeedback": "",\n  "processImprovement": "",\n  "escalationRisk": "low/medium/high",\n  "tags": []\n}',
                        outputVariable: "insights"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Insights",
                        provider: "google-sheets",
                        operation: "appendRow",
                        spreadsheetId: "",
                        sheetName: "Conversation Analytics"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "High Risk?",
                        conditionType: "expression",
                        expression:
                            'insights.text.includes(\'"escalationRisk": "high"\') || insights.text.includes(\'"resolution": "unresolved"\')'
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
                        channel: "#support-insights"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-intercom" },
                { id: "e2", source: "integration-intercom", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "integration-sheets" },
                { id: "e4", source: "integration-sheets", target: "conditional-1" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                }
            ]
        }
    },
    {
        name: "Freshdesk Ticket Classifier",
        description:
            "Automatically classify incoming Freshdesk tickets with AI, route to appropriate team, log patterns to Notion, and alert on priority items.",
        category: "support",
        tags: ["freshdesk", "ticket classification", "routing", "automation", "ai triage"],
        required_integrations: ["freshdesk", "slack", "notion"],
        featured: false,
        definition: {
            name: "Freshdesk Ticket Classifier",
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "New Ticket",
                        triggerType: "webhook",
                        webhookProvider: "freshdesk",
                        description: "Triggered on new Freshdesk ticket"
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
                        prompt: 'Classify this support ticket:\n\nSubject: {{trigger-1.data.subject}}\nDescription: {{trigger-1.data.description}}\n\nProvide:\n{\n  "category": "technical/billing/account/feature-request/bug/other",\n  "subcategory": "",\n  "priority": "low/medium/high/urgent",\n  "sentiment": "positive/neutral/negative/angry",\n  "complexity": "simple/medium/complex",\n  "suggestedTeam": "tier1/tier2/engineering/billing/product",\n  "estimatedResolutionTime": "",\n  "suggestedResponse": "",\n  "relatedArticles": [],\n  "escalationNeeded": true/false\n}',
                        outputVariable: "classification"
                    }
                },
                {
                    id: "integration-freshdesk-update",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Update Ticket",
                        provider: "freshdesk",
                        operation: "updateTicket"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Pattern",
                        provider: "notion",
                        operation: "createPage",
                        databaseId: ""
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Urgent?",
                        conditionType: "expression",
                        expression:
                            'classification.text.includes(\'"priority": "urgent"\') || classification.text.includes(\'"escalationNeeded": true\')'
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
                        channel: "#support-urgent"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "llm-classify" },
                { id: "e2", source: "llm-classify", target: "integration-freshdesk-update" },
                { id: "e3", source: "integration-freshdesk-update", target: "integration-notion" },
                { id: "e4", source: "integration-notion", target: "conditional-1" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                }
            ]
        }
    },
    {
        name: "SendGrid Email Deliverability Monitor",
        description:
            "Monitor SendGrid bounce rates and deliverability metrics hourly, AI analyzes trends and detects issues, alerts on problems, and logs to tracking sheet.",
        category: "support",
        tags: ["sendgrid", "email deliverability", "monitoring", "alerts", "automation"],
        required_integrations: ["sendgrid", "slack", "google-sheets"],
        featured: false,
        definition: {
            name: "SendGrid Email Deliverability Monitor",
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
                    id: "integration-sendgrid",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Fetch Stats",
                        provider: "sendgrid",
                        operation: "getStats",
                        dateRange: "last_24_hours"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Analyze Deliverability",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze these SendGrid email stats:\n\n{{integration-sendgrid.data}}\n\nCheck for:\n1. Bounce rate (normal <2%)\n2. Spam complaint rate (normal <0.1%)\n3. Delivery rate trends\n4. Open rate anomalies\n5. Block/drop patterns\n\nReturn JSON:\n{\n  "deliveryRate": 0,\n  "bounceRate": 0,\n  "spamRate": 0,\n  "status": "healthy/warning/critical",\n  "issues": [{"type": "", "severity": "", "description": "", "recommendation": ""}],\n  "trends": [],\n  "alertRequired": true/false\n}',
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Log Metrics",
                        provider: "google-sheets",
                        operation: "appendRow",
                        spreadsheetId: "",
                        sheetName: "Email Deliverability"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Alert Needed?",
                        conditionType: "expression",
                        expression: "analysis.text.includes('\"alertRequired\": true')"
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
                        channel: "#email-ops"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 0, y: 0 },
                    data: {
                        label: "Health Status",
                        outputName: "status",
                        value: "{{analysis.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "integration-sendgrid" },
                { id: "e2", source: "integration-sendgrid", target: "llm-analyze" },
                { id: "e3", source: "llm-analyze", target: "integration-sheets" },
                { id: "e4", source: "integration-sheets", target: "conditional-1" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                },
                { id: "e6", source: "conditional-1", target: "output-1", sourceHandle: "false" },
                { id: "e7", source: "integration-slack", target: "output-1" }
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
