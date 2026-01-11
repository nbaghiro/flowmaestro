/**
 * Seed Script for Workflow Templates
 *
 * Populates the workflow_templates table with 20 pre-built templates
 * across 5 categories: marketing, sales, operations, engineering, support
 *
 * Each template has proper left-to-right flow positioning for good visual display.
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

/**
 * Apply a wave effect to node positions to make linear layouts more visually interesting
 */
function applyWaveToNodes(nodes: TemplateNode[]): void {
    const WAVE_AMPLITUDE = 35;
    const WAVE_THRESHOLD = 30;

    if (nodes.length < 3) return;

    // Group nodes by Y position (horizontal lines)
    const yGroups = new Map<number, Array<{ index: number; x: number; y: number }>>();
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const yKey = Math.round(node.position.y / WAVE_THRESHOLD) * WAVE_THRESHOLD;
        const group = yGroups.get(yKey) || [];
        group.push({ index: i, x: node.position.x, y: node.position.y });
        yGroups.set(yKey, group);
    }

    // Apply wave to horizontal groups with 3+ nodes
    for (const group of yGroups.values()) {
        if (group.length >= 3) {
            // Sort by x position
            group.sort((a, b) => a.x - b.x);
            for (let i = 0; i < group.length; i++) {
                const waveOffset = Math.sin((i * Math.PI) / 2.5) * WAVE_AMPLITUDE;
                nodes[group[i].index].position.y += waveOffset;
            }
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
    // MARKETING (4 templates)
    // ========================================================================
    {
        name: "Blog Post Generator",
        description:
            "Generate complete blog posts from a topic. Creates an outline first, then expands into a full article with proper structure.",
        category: "marketing",
        tags: ["content", "blog", "writing", "AI"],
        required_integrations: [],
        featured: true,
        definition: {
            name: "Blog Post Generator",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Topic Input",
                        inputName: "topic",
                        inputVariable: "topic",
                        inputType: "text",
                        description: "Enter the blog topic"
                    }
                },
                {
                    id: "llm-outline",
                    type: "llm",
                    position: { x: 400, y: 200 },
                    data: {
                        label: "Create Outline",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a detailed outline for a blog post about: {{topic}}\n\nInclude:\n- Engaging title\n- 5-7 main sections with subpoints\n- Key takeaways",
                        outputVariable: "outline"
                    }
                },
                {
                    id: "llm-write",
                    type: "llm",
                    position: { x: 700, y: 200 },
                    data: {
                        label: "Write Article",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write a complete blog post based on this outline:\n\n{{outline.text}}\n\nMake it engaging, informative, and approximately 1500 words.",
                        outputVariable: "article"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 200 },
                    data: {
                        label: "Blog Post",
                        outputName: "blogPost",
                        value: "{{article.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-outline" },
                { id: "e2", source: "llm-outline", target: "llm-write" },
                { id: "e3", source: "llm-write", target: "output-1" }
            ]
        }
    },
    {
        name: "Social Listening Alert",
        description:
            "Monitor social mentions and automatically alert your team based on sentiment. Positive mentions notify sales, negative ones alert support.",
        category: "marketing",
        tags: ["social media", "sentiment", "alerts", "automation"],
        required_integrations: ["slack"],
        definition: {
            name: "Social Listening Alert",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 250 },
                    data: {
                        label: "Mention Data",
                        inputName: "mention",
                        inputVariable: "mention",
                        inputType: "json",
                        description: "Social mention webhook data"
                    }
                },
                {
                    id: "llm-sentiment",
                    type: "llm",
                    position: { x: 400, y: 250 },
                    data: {
                        label: "Analyze Sentiment",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: 'Analyze sentiment of this social mention:\n\n{{mention.text}}\n\nReturn JSON: {"sentiment": "positive" | "negative" | "neutral", "summary": "brief summary"}',
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 700, y: 250 },
                    data: {
                        label: "Check Sentiment",
                        conditionType: "expression",
                        expression: 'analysis.text.includes(\'"sentiment": "positive"\')'
                    }
                },
                {
                    id: "integration-sales",
                    type: "integration",
                    position: { x: 1000, y: 100 },
                    data: {
                        label: "Notify Sales",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#sales-leads"
                    }
                },
                {
                    id: "integration-support",
                    type: "integration",
                    position: { x: 1000, y: 400 },
                    data: {
                        label: "Alert Support",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#support"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-sentiment" },
                { id: "e2", source: "llm-sentiment", target: "conditional-1" },
                {
                    id: "e3",
                    source: "conditional-1",
                    target: "integration-sales",
                    sourceHandle: "true"
                },
                {
                    id: "e4",
                    source: "conditional-1",
                    target: "integration-support",
                    sourceHandle: "false"
                }
            ]
        }
    },
    {
        name: "Email Newsletter Writer",
        description:
            "Create polished email newsletters from a topic or key points. Generates a draft and then refines it for engagement.",
        category: "marketing",
        tags: ["email", "newsletter", "content", "AI"],
        required_integrations: [],
        definition: {
            name: "Email Newsletter Writer",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Newsletter Topic",
                        inputName: "topic",
                        inputVariable: "topic",
                        inputType: "text",
                        description: "Topic and key points for the newsletter"
                    }
                },
                {
                    id: "llm-draft",
                    type: "llm",
                    position: { x: 400, y: 200 },
                    data: {
                        label: "Draft Newsletter",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write an email newsletter about:\n\n{{topic}}\n\nInclude a compelling subject line, engaging intro, 2-3 main points, and a clear CTA.",
                        outputVariable: "draft"
                    }
                },
                {
                    id: "llm-polish",
                    type: "llm",
                    position: { x: 700, y: 200 },
                    data: {
                        label: "Polish & Optimize",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Improve this email newsletter for better engagement:\n\n{{draft.text}}\n\nOptimize the subject line, tighten the copy, and ensure the CTA is compelling.",
                        outputVariable: "polished"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 200 },
                    data: {
                        label: "Final Newsletter",
                        outputName: "newsletter",
                        value: "{{polished.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-draft" },
                { id: "e2", source: "llm-draft", target: "llm-polish" },
                { id: "e3", source: "llm-polish", target: "output-1" }
            ]
        }
    },
    {
        name: "Ad Copy Variations",
        description:
            "Generate multiple ad copy variations in different styles from a single brief. Creates formal, casual, and urgent versions.",
        category: "marketing",
        tags: ["advertising", "copywriting", "A/B testing", "creative"],
        required_integrations: [],
        definition: {
            name: "Ad Copy Variations",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 300 },
                    data: {
                        label: "Ad Brief",
                        inputName: "brief",
                        inputVariable: "brief",
                        inputType: "text",
                        description: "Product/service and target audience"
                    }
                },
                {
                    id: "llm-formal",
                    type: "llm",
                    position: { x: 450, y: 100 },
                    data: {
                        label: "Professional Style",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write professional, trust-building ad copy for:\n\n{{brief}}\n\nHeadline + 2 body copy variations.",
                        outputVariable: "formal"
                    }
                },
                {
                    id: "llm-casual",
                    type: "llm",
                    position: { x: 450, y: 300 },
                    data: {
                        label: "Casual Style",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write friendly, conversational ad copy for:\n\n{{brief}}\n\nHeadline + 2 body copy variations.",
                        outputVariable: "casual"
                    }
                },
                {
                    id: "llm-urgent",
                    type: "llm",
                    position: { x: 450, y: 500 },
                    data: {
                        label: "Urgent Style",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write urgency-driven ad copy with FOMO for:\n\n{{brief}}\n\nHeadline + 2 body copy variations.",
                        outputVariable: "urgent"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 800, y: 300 },
                    data: {
                        label: "All Variations",
                        outputName: "adCopy",
                        value: '{"professional": "{{formal.text}}", "casual": "{{casual.text}}", "urgent": "{{urgent.text}}"}'
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-formal" },
                { id: "e2", source: "input-1", target: "llm-casual" },
                { id: "e3", source: "input-1", target: "llm-urgent" },
                { id: "e4", source: "llm-formal", target: "output-1" },
                { id: "e5", source: "llm-casual", target: "output-1" },
                { id: "e6", source: "llm-urgent", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // SALES (4 templates)
    // ========================================================================
    {
        name: "Meeting Summary to CRM",
        description:
            "Extract key information from meeting transcripts and automatically update your CRM with action items and notes.",
        category: "sales",
        tags: ["meetings", "CRM", "automation", "notes"],
        required_integrations: ["hubspot"],
        featured: true,
        definition: {
            name: "Meeting Summary to CRM",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Meeting Transcript",
                        inputName: "transcript",
                        inputVariable: "transcript",
                        inputType: "text",
                        description: "Paste the meeting transcript"
                    }
                },
                {
                    id: "llm-extract",
                    type: "llm",
                    position: { x: 400, y: 200 },
                    data: {
                        label: "Extract Key Info",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Extract from this meeting:\n\n{{transcript}}\n\nReturn JSON:\n{\n  "summary": "2-3 sentence summary",\n  "actionItems": ["item1", "item2"],\n  "nextSteps": "agreed next steps",\n  "dealStage": "discovery/proposal/negotiation/closed"\n}',
                        outputVariable: "extracted"
                    }
                },
                {
                    id: "integration-crm",
                    type: "integration",
                    position: { x: 700, y: 200 },
                    data: {
                        label: "Update HubSpot",
                        provider: "hubspot",
                        operation: "createNote"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 200 },
                    data: {
                        label: "Summary",
                        outputName: "result",
                        value: "{{extracted.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-extract" },
                { id: "e2", source: "llm-extract", target: "integration-crm" },
                { id: "e3", source: "integration-crm", target: "output-1" }
            ]
        }
    },
    {
        name: "Proposal Generator",
        description:
            "Create professional sales proposals from requirements. Generates a structured draft and formats it professionally.",
        category: "sales",
        tags: ["proposals", "documents", "sales", "AI"],
        required_integrations: [],
        definition: {
            name: "Proposal Generator",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Requirements",
                        inputName: "requirements",
                        inputVariable: "requirements",
                        inputType: "text",
                        description: "Client name, needs, budget, timeline"
                    }
                },
                {
                    id: "llm-draft",
                    type: "llm",
                    position: { x: 400, y: 200 },
                    data: {
                        label: "Draft Proposal",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create a sales proposal for:\n\n{{requirements}}\n\nInclude: Executive summary, Solution overview, Pricing, Timeline, Terms.",
                        outputVariable: "draft"
                    }
                },
                {
                    id: "llm-format",
                    type: "llm",
                    position: { x: 700, y: 200 },
                    data: {
                        label: "Format Document",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Format this proposal professionally with proper headers, bullet points, and clear sections:\n\n{{draft.text}}",
                        outputVariable: "formatted"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 200 },
                    data: {
                        label: "Final Proposal",
                        outputName: "proposal",
                        value: "{{formatted.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-draft" },
                { id: "e2", source: "llm-draft", target: "llm-format" },
                { id: "e3", source: "llm-format", target: "output-1" }
            ]
        }
    },
    {
        name: "Cold Email Personalizer",
        description:
            "Transform generic outreach into personalized cold emails using prospect information and AI customization.",
        category: "sales",
        tags: ["email", "outreach", "personalization", "prospecting"],
        required_integrations: [],
        definition: {
            name: "Cold Email Personalizer",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Prospect Data",
                        inputName: "prospect",
                        inputVariable: "prospect",
                        inputType: "json",
                        description: '{"name", "company", "role", "linkedin_summary"}'
                    }
                },
                {
                    id: "llm-personalize",
                    type: "llm",
                    position: { x: 450, y: 200 },
                    data: {
                        label: "Personalize Email",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write a personalized cold email for:\n\nName: {{prospect.name}}\nCompany: {{prospect.company}}\nRole: {{prospect.role}}\nBackground: {{prospect.linkedin_summary}}\n\nMake it personal, relevant, and include a specific value prop. Keep under 150 words.",
                        outputVariable: "email"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 800, y: 200 },
                    data: {
                        label: "Personalized Email",
                        outputName: "coldEmail",
                        value: "{{email.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-personalize" },
                { id: "e2", source: "llm-personalize", target: "output-1" }
            ]
        }
    },
    {
        name: "Deal Risk Analyzer",
        description:
            "Analyze deal information to identify risks and alert the team when deals need attention.",
        category: "sales",
        tags: ["deals", "risk analysis", "alerts", "pipeline"],
        required_integrations: ["slack"],
        definition: {
            name: "Deal Risk Analyzer",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 250 },
                    data: {
                        label: "Deal Data",
                        inputName: "deal",
                        inputVariable: "deal",
                        inputType: "json",
                        description: "Deal details from CRM"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 400, y: 250 },
                    data: {
                        label: "Analyze Risk",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Analyze this deal for risks:\n\n{{deal}}\n\nReturn JSON:\n{\n  "riskLevel": "low" | "medium" | "high",\n  "risks": ["risk1", "risk2"],\n  "recommendations": ["action1", "action2"]\n}',
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 700, y: 250 },
                    data: {
                        label: "High Risk?",
                        conditionType: "expression",
                        expression: 'analysis.text.includes(\'"riskLevel": "high"\')'
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 1000, y: 100 },
                    data: {
                        label: "Alert Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#sales-alerts"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 400 },
                    data: {
                        label: "Analysis",
                        outputName: "riskAnalysis",
                        value: "{{analysis.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-analyze" },
                { id: "e2", source: "llm-analyze", target: "conditional-1" },
                {
                    id: "e3",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                },
                { id: "e4", source: "conditional-1", target: "output-1", sourceHandle: "false" },
                { id: "e5", source: "integration-slack", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // OPERATIONS (4 templates)
    // ========================================================================
    {
        name: "Invoice Data Extractor",
        description:
            "Extract structured data from invoice PDFs using AI vision. Pulls vendor, amounts, line items, and dates.",
        category: "operations",
        tags: ["invoices", "OCR", "data extraction", "automation"],
        required_integrations: [],
        featured: true,
        definition: {
            name: "Invoice Data Extractor",
            nodes: [
                {
                    id: "files-1",
                    type: "files",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Upload Invoice",
                        allowedTypes: ["pdf", "png", "jpg"],
                        outputVariable: "invoiceFile"
                    }
                },
                {
                    id: "vision-1",
                    type: "vision",
                    position: { x: 400, y: 200 },
                    data: {
                        label: "Extract Data",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Extract all data from this invoice. Return JSON:\n{\n  "vendor": "name",\n  "invoiceNumber": "number",\n  "date": "date",\n  "dueDate": "date",\n  "lineItems": [{"description": "", "quantity": 0, "unitPrice": 0, "total": 0}],\n  "subtotal": 0,\n  "tax": 0,\n  "total": 0\n}',
                        outputVariable: "extracted"
                    }
                },
                {
                    id: "transform-1",
                    type: "transform",
                    position: { x: 700, y: 200 },
                    data: {
                        label: "Format Data",
                        transformType: "parseJson",
                        outputVariable: "formatted"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 200 },
                    data: {
                        label: "Invoice Data",
                        outputName: "invoiceData",
                        value: "{{formatted}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "files-1", target: "vision-1" },
                { id: "e2", source: "vision-1", target: "transform-1" },
                { id: "e3", source: "transform-1", target: "output-1" }
            ]
        }
    },
    {
        name: "Meeting Notes Formatter",
        description:
            "Transform raw meeting notes into structured summaries with clear action items and owners.",
        category: "operations",
        tags: ["meetings", "notes", "action items", "productivity"],
        required_integrations: [],
        definition: {
            name: "Meeting Notes Formatter",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Raw Notes",
                        inputName: "notes",
                        inputVariable: "notes",
                        inputType: "text",
                        description: "Paste raw meeting notes"
                    }
                },
                {
                    id: "llm-format",
                    type: "llm",
                    position: { x: 400, y: 200 },
                    data: {
                        label: "Format Notes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Format these meeting notes into a clear structure:\n\n{{notes}}\n\nInclude:\n- Meeting summary (2-3 sentences)\n- Key discussion points\n- Decisions made",
                        outputVariable: "formatted"
                    }
                },
                {
                    id: "llm-actions",
                    type: "llm",
                    position: { x: 700, y: 200 },
                    data: {
                        label: "Extract Actions",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "From these formatted notes:\n\n{{formatted.text}}\n\nExtract action items with owners and due dates. Format as a checklist.",
                        outputVariable: "actions"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 200 },
                    data: {
                        label: "Final Notes",
                        outputName: "meetingNotes",
                        value: "## Summary\n{{formatted.text}}\n\n## Action Items\n{{actions.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-format" },
                { id: "e2", source: "llm-format", target: "llm-actions" },
                { id: "e3", source: "llm-actions", target: "output-1" }
            ]
        }
    },
    {
        name: "Document Classifier",
        description:
            "Automatically classify documents into categories using AI routing. Routes contracts, invoices, and reports differently.",
        category: "operations",
        tags: ["documents", "classification", "routing", "automation"],
        required_integrations: [],
        definition: {
            name: "Document Classifier",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 300 },
                    data: {
                        label: "Document Text",
                        inputName: "document",
                        inputVariable: "document",
                        inputType: "text",
                        description: "Document content to classify"
                    }
                },
                {
                    id: "router-1",
                    type: "router",
                    position: { x: 400, y: 300 },
                    data: {
                        label: "Classify Document",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "{{document}}",
                        routes: [
                            {
                                value: "contract",
                                label: "Contract",
                                description: "Legal agreements, terms, contracts"
                            },
                            {
                                value: "invoice",
                                label: "Invoice",
                                description: "Bills, invoices, payment requests"
                            },
                            {
                                value: "report",
                                label: "Report",
                                description: "Reports, analyses, summaries"
                            }
                        ],
                        defaultRoute: "other"
                    }
                },
                {
                    id: "output-contract",
                    type: "output",
                    position: { x: 750, y: 100 },
                    data: {
                        label: "Contract",
                        outputName: "result",
                        value: '{"type": "contract", "document": "{{document}}"}'
                    }
                },
                {
                    id: "output-invoice",
                    type: "output",
                    position: { x: 750, y: 300 },
                    data: {
                        label: "Invoice",
                        outputName: "result",
                        value: '{"type": "invoice", "document": "{{document}}"}'
                    }
                },
                {
                    id: "output-report",
                    type: "output",
                    position: { x: 750, y: 500 },
                    data: {
                        label: "Report",
                        outputName: "result",
                        value: '{"type": "report", "document": "{{document}}"}'
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "router-1" },
                {
                    id: "e2",
                    source: "router-1",
                    target: "output-contract",
                    sourceHandle: "contract"
                },
                { id: "e3", source: "router-1", target: "output-invoice", sourceHandle: "invoice" },
                { id: "e4", source: "router-1", target: "output-report", sourceHandle: "report" }
            ]
        }
    },
    {
        name: "Expense Report Processor",
        description:
            "Process expense receipts using vision AI. Extracts amounts, categories, and validates against policy.",
        category: "operations",
        tags: ["expenses", "receipts", "OCR", "finance"],
        required_integrations: [],
        definition: {
            name: "Expense Report Processor",
            nodes: [
                {
                    id: "files-1",
                    type: "files",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Upload Receipt",
                        allowedTypes: ["pdf", "png", "jpg"],
                        outputVariable: "receiptFile"
                    }
                },
                {
                    id: "vision-1",
                    type: "vision",
                    position: { x: 400, y: 200 },
                    data: {
                        label: "Extract Receipt Data",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: 'Extract from this receipt:\n{\n  "vendor": "name",\n  "date": "date",\n  "items": [{"description": "", "amount": 0}],\n  "total": 0,\n  "category": "meals/travel/supplies/other"\n}',
                        outputVariable: "extracted"
                    }
                },
                {
                    id: "llm-validate",
                    type: "llm",
                    position: { x: 700, y: 200 },
                    data: {
                        label: "Validate & Categorize",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Review this expense:\n\n{{extracted.text}}\n\nValidate it meets policy (max $100 for meals, $500 for travel). Return JSON with isValid, category, and any notes.",
                        outputVariable: "validated"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 200 },
                    data: {
                        label: "Processed Expense",
                        outputName: "expense",
                        value: "{{validated.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "files-1", target: "vision-1" },
                { id: "e2", source: "vision-1", target: "llm-validate" },
                { id: "e3", source: "llm-validate", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // ENGINEERING (4 templates)
    // ========================================================================
    {
        name: "API Documentation Generator",
        description:
            "Generate comprehensive API documentation from endpoint specifications. Creates descriptions and usage examples.",
        category: "engineering",
        tags: ["API", "documentation", "developer", "reference"],
        required_integrations: [],
        featured: true,
        definition: {
            name: "API Documentation Generator",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "API Endpoint",
                        inputName: "endpoint",
                        inputVariable: "endpoint",
                        inputType: "json",
                        description: '{"method": "POST", "path": "/users", "params": {...}}'
                    }
                },
                {
                    id: "llm-describe",
                    type: "llm",
                    position: { x: 400, y: 200 },
                    data: {
                        label: "Write Description",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Write clear API documentation for:\n\n{{endpoint}}\n\nInclude:\n- Description\n- Parameters (with types and required flags)\n- Response format\n- Error codes",
                        outputVariable: "description"
                    }
                },
                {
                    id: "llm-examples",
                    type: "llm",
                    position: { x: 700, y: 200 },
                    data: {
                        label: "Generate Examples",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create code examples for this API:\n\n{{description.text}}\n\nInclude:\n- cURL example\n- JavaScript/fetch example\n- Python requests example",
                        outputVariable: "examples"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 200 },
                    data: {
                        label: "API Docs",
                        outputName: "documentation",
                        value: "{{description.text}}\n\n## Examples\n{{examples.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-describe" },
                { id: "e2", source: "llm-describe", target: "llm-examples" },
                { id: "e3", source: "llm-examples", target: "output-1" }
            ]
        }
    },
    {
        name: "Error Log Analyzer",
        description:
            "Analyze error logs to identify patterns, root causes, and suggest fixes. Great for debugging production issues.",
        category: "engineering",
        tags: ["debugging", "logs", "errors", "troubleshooting"],
        required_integrations: [],
        definition: {
            name: "Error Log Analyzer",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Error Logs",
                        inputName: "logs",
                        inputVariable: "logs",
                        inputType: "text",
                        description: "Paste error logs or stack traces"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 400, y: 200 },
                    data: {
                        label: "Analyze Errors",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze these error logs:\n\n{{logs}}\n\nIdentify:\n- Error type and frequency\n- Root cause analysis\n- Affected components\n- Pattern recognition",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-fix",
                    type: "llm",
                    position: { x: 700, y: 200 },
                    data: {
                        label: "Suggest Fixes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Based on this analysis:\n\n{{analysis.text}}\n\nProvide:\n- Recommended fixes with code examples\n- Prevention strategies\n- Monitoring suggestions",
                        outputVariable: "fixes"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 200 },
                    data: {
                        label: "Analysis & Fixes",
                        outputName: "result",
                        value: "## Analysis\n{{analysis.text}}\n\n## Recommended Fixes\n{{fixes.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-analyze" },
                { id: "e2", source: "llm-analyze", target: "llm-fix" },
                { id: "e3", source: "llm-fix", target: "output-1" }
            ]
        }
    },
    {
        name: "Code Comment Generator",
        description:
            "Add comprehensive comments and documentation to code. Explains logic, parameters, and return values.",
        category: "engineering",
        tags: ["code", "comments", "documentation", "developer"],
        required_integrations: [],
        definition: {
            name: "Code Comment Generator",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Code Input",
                        inputName: "code",
                        inputVariable: "code",
                        inputType: "text",
                        description: "Paste code to document"
                    }
                },
                {
                    id: "llm-document",
                    type: "llm",
                    position: { x: 450, y: 200 },
                    data: {
                        label: "Add Comments",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Add comprehensive documentation to this code:\n\n{{code}}\n\nInclude:\n- JSDoc/docstring comments for functions\n- Inline comments for complex logic\n- Type annotations where helpful\n- Return the fully commented code.",
                        outputVariable: "documented"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 800, y: 200 },
                    data: {
                        label: "Documented Code",
                        outputName: "documentedCode",
                        value: "{{documented.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-document" },
                { id: "e2", source: "llm-document", target: "output-1" }
            ]
        }
    },
    {
        name: "Release Notes Writer",
        description:
            "Generate professional release notes from commit messages or changelog. Creates user-friendly summaries.",
        category: "engineering",
        tags: ["releases", "changelog", "documentation", "git"],
        required_integrations: [],
        definition: {
            name: "Release Notes Writer",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Commits/Changes",
                        inputName: "commits",
                        inputVariable: "commits",
                        inputType: "text",
                        description: "List of commits or changes"
                    }
                },
                {
                    id: "llm-summarize",
                    type: "llm",
                    position: { x: 400, y: 200 },
                    data: {
                        label: "Summarize Changes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Analyze these commits and categorize them:\n\n{{commits}}\n\nGroup into: Features, Bug Fixes, Improvements, Breaking Changes.",
                        outputVariable: "categorized"
                    }
                },
                {
                    id: "llm-format",
                    type: "llm",
                    position: { x: 700, y: 200 },
                    data: {
                        label: "Write Release Notes",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Create professional release notes from:\n\n{{categorized.text}}\n\nFormat for users (not developers). Include a TL;DR at the top.",
                        outputVariable: "releaseNotes"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 200 },
                    data: {
                        label: "Release Notes",
                        outputName: "notes",
                        value: "{{releaseNotes.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-summarize" },
                { id: "e2", source: "llm-summarize", target: "llm-format" },
                { id: "e3", source: "llm-format", target: "output-1" }
            ]
        }
    },

    // ========================================================================
    // SUPPORT (4 templates)
    // ========================================================================
    {
        name: "FAQ Answer Bot",
        description:
            "Answer customer questions using your knowledge base. Searches for relevant content and generates helpful responses.",
        category: "support",
        tags: ["FAQ", "knowledge base", "customer support", "RAG"],
        required_integrations: [],
        featured: true,
        definition: {
            name: "FAQ Answer Bot",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Customer Question",
                        inputName: "question",
                        inputVariable: "question",
                        inputType: "text",
                        description: "Customer's question"
                    }
                },
                {
                    id: "kb-query",
                    type: "knowledgeBaseQuery",
                    position: { x: 400, y: 200 },
                    data: {
                        label: "Search FAQ",
                        knowledgeBaseId: "",
                        queryText: "{{question}}",
                        topK: 3,
                        outputVariable: "kbResults"
                    }
                },
                {
                    id: "llm-answer",
                    type: "llm",
                    position: { x: 700, y: 200 },
                    data: {
                        label: "Generate Answer",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Answer this customer question:\n\n{{question}}\n\nUsing this context from our FAQ:\n{{kbResults.combinedText}}\n\nBe helpful, accurate, and friendly. If the answer isn't in the context, say so.",
                        outputVariable: "answer"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 200 },
                    data: {
                        label: "Answer",
                        outputName: "response",
                        value: "{{answer.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "kb-query" },
                { id: "e2", source: "kb-query", target: "llm-answer" },
                { id: "e3", source: "llm-answer", target: "output-1" }
            ]
        }
    },
    {
        name: "Ticket Summarizer",
        description:
            "Quickly summarize support tickets to understand the issue at a glance. Extracts key details and sentiment.",
        category: "support",
        tags: ["tickets", "summary", "triage", "efficiency"],
        required_integrations: [],
        definition: {
            name: "Ticket Summarizer",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Support Ticket",
                        inputName: "ticket",
                        inputVariable: "ticket",
                        inputType: "text",
                        description: "Full ticket content"
                    }
                },
                {
                    id: "llm-summarize",
                    type: "llm",
                    position: { x: 450, y: 200 },
                    data: {
                        label: "Summarize Ticket",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Summarize this support ticket:\n\n{{ticket}}\n\nProvide:\n- One-line summary\n- Customer sentiment (frustrated/neutral/positive)\n- Issue category\n- Priority suggestion (P1/P2/P3)\n- Key details for agent",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 800, y: 200 },
                    data: {
                        label: "Ticket Summary",
                        outputName: "summary",
                        value: "{{summary.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-summarize" },
                { id: "e2", source: "llm-summarize", target: "output-1" }
            ]
        }
    },
    {
        name: "Response Tone Adjuster",
        description:
            "Analyze and adjust the tone of support responses. Makes messages more empathetic and professional.",
        category: "support",
        tags: ["tone", "communication", "empathy", "quality"],
        required_integrations: [],
        definition: {
            name: "Response Tone Adjuster",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 200 },
                    data: {
                        label: "Draft Response",
                        inputName: "draft",
                        inputVariable: "draft",
                        inputType: "text",
                        description: "Your draft response"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 400, y: 200 },
                    data: {
                        label: "Analyze Tone",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: "Analyze the tone of this support response:\n\n{{draft}}\n\nRate 1-10 for: Empathy, Clarity, Professionalism. Note any issues.",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "llm-adjust",
                    type: "llm",
                    position: { x: 700, y: 200 },
                    data: {
                        label: "Improve Response",
                        provider: "openai",
                        model: "gpt-4o",
                        prompt: "Improve this response based on the analysis:\n\nOriginal:\n{{draft}}\n\nAnalysis:\n{{analysis.text}}\n\nMake it more empathetic and clear while maintaining professionalism.",
                        outputVariable: "improved"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 200 },
                    data: {
                        label: "Improved Response",
                        outputName: "response",
                        value: "{{improved.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-analyze" },
                { id: "e2", source: "llm-analyze", target: "llm-adjust" },
                { id: "e3", source: "llm-adjust", target: "output-1" }
            ]
        }
    },
    {
        name: "Escalation Detector",
        description:
            "Analyze customer messages for escalation signals. Alerts the team when immediate attention is needed.",
        category: "support",
        tags: ["escalation", "alerts", "priority", "SLA"],
        required_integrations: ["slack"],
        definition: {
            name: "Escalation Detector",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: { x: 100, y: 250 },
                    data: {
                        label: "Customer Message",
                        inputName: "message",
                        inputVariable: "message",
                        inputType: "text",
                        description: "Customer communication"
                    }
                },
                {
                    id: "llm-analyze",
                    type: "llm",
                    position: { x: 400, y: 250 },
                    data: {
                        label: "Detect Escalation",
                        provider: "openai",
                        model: "gpt-4o-mini",
                        prompt: 'Analyze for escalation signals:\n\n{{message}}\n\nReturn JSON:\n{\n  "needsEscalation": true/false,\n  "signals": ["legal threat", "churn risk", etc],\n  "urgency": "immediate/high/normal",\n  "suggestedAction": "what to do"\n}',
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: { x: 700, y: 250 },
                    data: {
                        label: "Needs Escalation?",
                        conditionType: "expression",
                        expression: "analysis.text.includes('\"needsEscalation\": true')"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: { x: 1000, y: 100 },
                    data: {
                        label: "Alert Team",
                        provider: "slack",
                        operation: "sendMessage",
                        channel: "#support-escalations"
                    }
                },
                {
                    id: "output-1",
                    type: "output",
                    position: { x: 1000, y: 400 },
                    data: {
                        label: "Analysis",
                        outputName: "result",
                        value: "{{analysis.text}}"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-analyze" },
                { id: "e2", source: "llm-analyze", target: "conditional-1" },
                {
                    id: "e3",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                },
                { id: "e4", source: "conditional-1", target: "output-1", sourceHandle: "false" },
                { id: "e5", source: "integration-slack", target: "output-1" }
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
        password: process.env.POSTGRES_PASSWORD || "flowmaestro_dev_password"
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

                // Apply wave effect to make linear layouts more visually interesting
                applyWaveToNodes(definition.nodes);

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
    } catch (error) {
        console.error("Seed failed:", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the seed
seedTemplates();
