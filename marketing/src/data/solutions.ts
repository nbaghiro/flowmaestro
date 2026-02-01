import { TrendingUp, Megaphone, Settings, Headphones, Code, LayoutGrid } from "lucide-react";
import type { Provider } from "@flowmaestro/shared";
import type { LucideIcon } from "lucide-react";

// Pain point and solution interfaces
export interface PainPoint {
    text: string;
}

export interface SolutionPoint {
    text: string;
}

export interface WorkflowExample {
    title: string;
    description: string;
    integrations: string[]; // Provider slugs to show icons
    screenshotBase?: string; // Base name for screenshot (e.g., "workflow-sales-meeting-prep")
}

// Solution category type
export interface SolutionCategory {
    slug: string;
    name: string;
    tagline: string;
    headline: string;
    description: string;
    icon: LucideIcon;
    color: string;
    providerCategories: string[];
    painPoints: PainPoint[];
    solutions: SolutionPoint[];
    workflowExamples: WorkflowExample[];
    ctaHeadline: string;
    ctaDescription: string;
}

// Mapping from solution categories to provider categories
export const SOLUTION_CATEGORY_MAPPINGS: Record<string, string[]> = {
    sales: ["CRM & Sales", "Payment Processing"],
    marketing: ["Marketing", "Social Media", "Analytics"],
    operations: ["Productivity", "Project Management", "HR", "ERP", "Scheduling", "File Storage"],
    support: ["Customer Support", "Communication"],
    engineering: [
        "Developer Tools",
        "Databases",
        "Monitoring & Logging",
        "Security & Authentication"
    ],
    other: [
        "Accounting",
        "E-commerce",
        "Legal & Contracts",
        "AI & ML",
        "Design",
        "Knowledge Base",
        "Video & Webinar",
        "Forms & Surveys",
        "Business Intelligence",
        "Content Management",
        "Invoicing & Billing",
        "Notifications",
        "Cloud Storage",
        "Call Center",
        "SMS & Messaging",
        "AB Testing & Optimization",
        "Cryptocurrency"
    ]
};

// Complete solution definitions
export const SOLUTIONS: SolutionCategory[] = [
    {
        slug: "sales",
        name: "Sales",
        tagline: "Automate Your Sales Pipeline",
        headline: "Close More Deals, Faster",
        description:
            "Stop wasting time on manual data entry and follow-ups. FlowMaestro automates lead enrichment, CRM updates, and outreach sequences so your team can focus on what they do best: selling.",
        icon: TrendingUp,
        color: "blue",
        providerCategories: ["CRM & Sales", "Payment Processing"],
        painPoints: [
            { text: "Prepping for calls takes too long and still misses key info" },
            { text: "CRM notes are messy, incomplete, or totally missing" },
            { text: "Reps waste time digging through dashboards for pipeline updates" },
            { text: "Tool-switching between CRM, email, and docs kills momentum" },
            { text: "Most tools force reps into rigid workflows, limiting creativity" },
            { text: "Top reps succeed with invisible habits no one else can replicate" }
        ],
        solutions: [
            {
                text: "Auto-generate call briefs with lead context, past activity, and notes pulled from your CRM"
            },
            {
                text: "Summarize meetings into structured notes and auto-log them in Salesforce or HubSpot"
            },
            {
                text: "Send weekly pipeline summaries or deal movement alerts straight to Slack or email"
            },
            {
                text: "Connect Salesforce, Gmail, Slack, and Docs in one seamless workflow hub"
            },
            {
                text: "Give every rep the ability to build personalized, AI-powered workflows using their pipeline context"
            },
            {
                text: "Turn top performer best practices into workflows the whole team can run and learn from"
            }
        ],
        workflowExamples: [
            {
                title: "Automated Meeting Preparation",
                description:
                    "AI pulls the context you need - internal notes, reports, and relevant news - and delivers it as a clean one-pager tailored to your agenda.",
                integrations: ["salesforce", "google-calendar", "openai", "gmail"]
            },
            {
                title: "Sales Roundup Report",
                description:
                    "No more digging through CRMs: AI pulls the latest shifts in your accounts and flags the deals that need attention.",
                integrations: ["salesforce", "openai", "slack"]
            },
            {
                title: "Intelligent Lead Routing",
                description:
                    "Enrich, score, and route every lead so the right person gets the right opportunity at the right time.",
                integrations: ["hubspot", "openai", "slack"]
            }
        ],
        ctaHeadline: "Spend more time actually selling",
        ctaDescription:
            "FlowMaestro helps sales teams automate all operations like lead research, meeting notes, CRM updates, and follow-ups - using your current tools like Salesforce, Gmail, and Google Docs."
    },
    {
        slug: "marketing",
        name: "Marketing",
        tagline: "Scale Your Marketing Operations",
        headline: "Create More, Manage Less",
        description:
            "From content creation to campaign analytics, automate the repetitive work that slows your marketing team down. Focus on strategy while FlowMaestro handles the execution.",
        icon: Megaphone,
        color: "purple",
        providerCategories: ["Marketing", "Social Media", "Analytics"],
        painPoints: [
            { text: "Content creation takes forever with constant back-and-forth between tools" },
            { text: "Campaign performance data is scattered across multiple platforms" },
            { text: "Social media scheduling requires manual posting across channels" },
            { text: "Lead nurturing sequences are rigid and hard to personalize at scale" },
            { text: "Reporting takes hours of copying data between spreadsheets" },
            { text: "A/B testing insights get lost and rarely inform future campaigns" }
        ],
        solutions: [
            {
                text: "Generate blog posts, social copy, and email content from a single brief using AI"
            },
            {
                text: "Automatically aggregate campaign metrics from all channels into one dashboard"
            },
            {
                text: "Schedule and publish content across Twitter, LinkedIn, and Instagram in one workflow"
            },
            {
                text: "Build dynamic nurture sequences that adapt based on prospect behavior and engagement"
            },
            {
                text: "Auto-generate weekly or monthly marketing reports sent directly to stakeholders"
            },
            {
                text: "Capture and distribute A/B test learnings to improve future campaign performance"
            }
        ],
        workflowExamples: [
            {
                title: "Content Repurposing Pipeline",
                description:
                    "Turn one blog post into a Twitter thread, LinkedIn post, email newsletter, and Instagram carousel automatically.",
                integrations: ["notion", "openai", "twitter", "linkedin"]
            },
            {
                title: "Campaign Performance Digest",
                description:
                    "Pull metrics from Google Analytics, social platforms, and email tools into a weekly summary delivered to your inbox.",
                integrations: ["google-analytics", "mailchimp", "openai", "slack"]
            },
            {
                title: "Lead Scoring & Segmentation",
                description:
                    "Automatically score leads based on engagement signals and segment them for targeted nurture campaigns.",
                integrations: ["hubspot", "openai", "mailchimp"]
            }
        ],
        ctaHeadline: "Scale your marketing without scaling your team",
        ctaDescription:
            "FlowMaestro helps marketing teams automate content creation, campaign management, and analytics reporting - so you can focus on strategy that moves the needle."
    },
    {
        slug: "operations",
        name: "Operations",
        tagline: "Streamline Your Operations",
        headline: "Run Smarter, Not Harder",
        description:
            "Eliminate manual processes that bog down your operations team. FlowMaestro connects your tools, automates handoffs, and keeps everything running smoothly.",
        icon: Settings,
        color: "green",
        providerCategories: [
            "Productivity",
            "Project Management",
            "HR",
            "ERP",
            "Scheduling",
            "File Storage"
        ],
        painPoints: [
            { text: "Employee onboarding requires manual setup across 10+ systems" },
            { text: "Project status updates require chasing people down across teams" },
            { text: "Document approvals sit in inboxes for days waiting for action" },
            { text: "Data entry between systems creates errors and duplicate work" },
            { text: "Meeting scheduling ping-pong wastes hours every week" },
            { text: "Compliance documentation is scattered and hard to track" }
        ],
        solutions: [
            {
                text: "Automate new hire setup across Slack, Google Workspace, and project management tools"
            },
            {
                text: "Pull project status from Jira, Asana, or Monday.com into automated weekly summaries"
            },
            {
                text: "Route documents for approval with automatic reminders and escalation paths"
            },
            {
                text: "Sync data between systems automatically to eliminate manual entry and reduce errors"
            },
            {
                text: "Let AI find optimal meeting times across calendars and send invites automatically"
            },
            {
                text: "Centralize compliance docs and automate audit trails with version tracking"
            }
        ],
        workflowExamples: [
            {
                title: "Employee Onboarding Automation",
                description:
                    "When HR marks a new hire in the system, automatically create accounts, add to channels, and send welcome materials.",
                integrations: ["google-drive", "slack", "notion", "gmail"]
            },
            {
                title: "Cross-Team Status Sync",
                description:
                    "Aggregate project updates from multiple teams into a single executive summary delivered every Monday.",
                integrations: ["jira", "asana", "openai", "slack"]
            },
            {
                title: "Document Approval Workflow",
                description:
                    "Route contracts and documents through approval chains with automatic reminders and completion tracking.",
                integrations: ["google-drive", "slack", "gmail"]
            }
        ],
        ctaHeadline: "Free your ops team from busywork",
        ctaDescription:
            "FlowMaestro helps operations teams automate onboarding, document workflows, and cross-system data sync - so you can focus on strategic initiatives."
    },
    {
        slug: "support",
        name: "Support",
        tagline: "Elevate Your Customer Experience",
        headline: "Faster Resolution, Happier Customers",
        description:
            "Empower your support team to resolve issues faster with AI-powered ticket routing, automated responses, and seamless escalation workflows.",
        icon: Headphones,
        color: "orange",
        providerCategories: ["Customer Support", "Communication"],
        painPoints: [
            { text: "Tickets pile up with no clear prioritization or routing logic" },
            { text: "Agents spend time on repetitive questions that could be automated" },
            { text: "Customer context is scattered across multiple tools and platforms" },
            { text: "Escalations get lost or delayed without clear ownership" },
            { text: "Response quality varies wildly between agents" },
            { text: "No easy way to identify trends in customer issues" }
        ],
        solutions: [
            {
                text: "Auto-categorize and route tickets to the right team based on content and urgency"
            },
            {
                text: "Generate AI-drafted responses for common questions that agents can review and send"
            },
            {
                text: "Pull customer history, orders, and past tickets into a single view for every conversation"
            },
            {
                text: "Automate escalation workflows with notifications and SLA tracking"
            },
            {
                text: "Provide agents with AI-suggested responses based on your knowledge base"
            },
            {
                text: "Analyze ticket patterns to surface emerging issues before they become crises"
            }
        ],
        workflowExamples: [
            {
                title: "Smart Ticket Routing",
                description:
                    "Automatically categorize incoming tickets by topic and urgency, then route to specialized agents.",
                integrations: ["zendesk", "openai", "slack"]
            },
            {
                title: "Customer Context Builder",
                description:
                    "When a ticket comes in, pull the customer's purchase history, past conversations, and account status into one view.",
                integrations: ["zendesk", "shopify", "openai"]
            },
            {
                title: "Escalation Automation",
                description:
                    "Automatically escalate tickets that breach SLA thresholds with full context sent to managers.",
                integrations: ["zendesk", "slack", "gmail"]
            }
        ],
        ctaHeadline: "Turn support into a competitive advantage",
        ctaDescription:
            "FlowMaestro helps support teams automate ticket routing, response drafting, and escalations - so agents can focus on delivering exceptional customer experiences."
    },
    {
        slug: "engineering",
        name: "Engineering",
        tagline: "Accelerate Your Development Workflow",
        headline: "Ship Faster, Break Less",
        description:
            "Automate the toil that slows down engineering teams. From PR reviews to incident response, FlowMaestro keeps your team focused on building great products.",
        icon: Code,
        color: "cyan",
        providerCategories: [
            "Developer Tools",
            "Databases",
            "Monitoring & Logging",
            "Security & Authentication"
        ],
        painPoints: [
            { text: "PR reviews get stuck waiting for the right reviewers" },
            { text: "Incident response is chaotic with unclear ownership and communication" },
            { text: "Release notes and changelogs are tedious to compile manually" },
            { text: "On-call rotations and handoffs create gaps in coverage" },
            { text: "Security alerts pile up without clear prioritization" },
            { text: "Documentation gets stale because updating it is a chore" }
        ],
        solutions: [
            {
                text: "Auto-assign PR reviewers based on code ownership and availability"
            },
            {
                text: "Orchestrate incident response with automated runbooks, notifications, and postmortem creation"
            },
            {
                text: "Generate release notes from merged PRs and commit messages automatically"
            },
            {
                text: "Automate on-call scheduling with calendar sync and handoff summaries"
            },
            {
                text: "Triage security alerts by severity and auto-create tickets for critical issues"
            },
            {
                text: "Keep docs in sync with code changes using automated update workflows"
            }
        ],
        workflowExamples: [
            {
                title: "Automated PR Review Assignment",
                description:
                    "When a PR is opened, analyze changed files and automatically assign reviewers based on code ownership.",
                integrations: ["github", "openai", "slack"]
            },
            {
                title: "Incident Response Orchestration",
                description:
                    "When an alert fires, create an incident channel, page on-call, and run diagnostic playbooks automatically.",
                integrations: ["pagerduty", "slack", "github"]
            },
            {
                title: "Release Notes Generator",
                description:
                    "Compile merged PRs into formatted release notes and post them to your changelog and Slack.",
                integrations: ["github", "openai", "notion", "slack"]
            }
        ],
        ctaHeadline: "Let your engineers focus on engineering",
        ctaDescription:
            "FlowMaestro helps engineering teams automate code review workflows, incident response, and release management - so you can ship faster with confidence."
    },
    {
        slug: "other",
        name: "Other",
        tagline: "Automate Any Workflow",
        headline: "If You Can Describe It, You Can Automate It",
        description:
            "From finance to legal to research, FlowMaestro adapts to your unique workflows. Connect any tools and build automations that fit your specific needs.",
        icon: LayoutGrid,
        color: "gray",
        providerCategories: [
            "Accounting",
            "E-commerce",
            "Legal & Contracts",
            "AI & ML",
            "Design",
            "Knowledge Base",
            "Video & Webinar",
            "Forms & Surveys",
            "Business Intelligence",
            "Content Management",
            "Invoicing & Billing",
            "Notifications",
            "Cloud Storage",
            "Call Center",
            "SMS & Messaging",
            "AB Testing & Optimization",
            "Cryptocurrency"
        ],
        painPoints: [
            { text: "Invoice processing requires manual data entry and approval chasing" },
            { text: "Contract reviews are bottlenecked by legal team capacity" },
            { text: "Research involves tedious data gathering from multiple sources" },
            { text: "Expense reports pile up with slow reimbursement cycles" },
            { text: "Inventory updates across channels are manual and error-prone" },
            { text: "Data analysis requires pulling from multiple systems manually" }
        ],
        solutions: [
            {
                text: "Extract invoice data automatically and route for approval based on amount thresholds"
            },
            {
                text: "Use AI to flag contract clauses that need attention and summarize key terms"
            },
            {
                text: "Build research workflows that gather, synthesize, and summarize information automatically"
            },
            {
                text: "Automate expense submission, approval, and reimbursement tracking"
            },
            {
                text: "Sync inventory levels across Shopify, Amazon, and your warehouse in real-time"
            },
            {
                text: "Create custom dashboards that pull live data from all your business tools"
            }
        ],
        workflowExamples: [
            {
                title: "Invoice Processing Automation",
                description:
                    "Extract data from incoming invoices, match to POs, and route for approval based on amount and vendor.",
                integrations: ["gmail", "google-sheets", "openai", "slack"]
            },
            {
                title: "Contract Summary Generator",
                description:
                    "When a contract is uploaded, AI extracts key terms, flags risky clauses, and creates a summary for review.",
                integrations: ["google-drive", "openai", "notion"]
            },
            {
                title: "Multi-Source Research Assistant",
                description:
                    "Define a research topic and let AI gather information from the web, documents, and databases into a structured report.",
                integrations: ["openai", "google-drive", "notion"]
            }
        ],
        ctaHeadline: "Build the workflow you've been dreaming about",
        ctaDescription:
            "FlowMaestro adapts to any use case. Connect your tools, describe your process, and let AI handle the rest - no matter what department you're in."
    }
];

// Helper function to get providers for a solution category
export function getProvidersForSolution(slug: string, allProviders: Provider[]): Provider[] {
    const categories = SOLUTION_CATEGORY_MAPPINGS[slug];
    if (!categories) return [];

    return allProviders.filter((p) => categories.includes(p.category));
}

// Helper to get a solution by slug
export function getSolutionBySlug(slug: string): SolutionCategory | undefined {
    return SOLUTIONS.find((s) => s.slug === slug);
}

// Get all solution slugs for routing validation
export function getAllSolutionSlugs(): string[] {
    return SOLUTIONS.map((s) => s.slug);
}

// Navigation items for the Solutions dropdown
export const SOLUTION_NAV_ITEMS = SOLUTIONS.map((solution) => ({
    label: solution.name,
    href: `/solutions/${solution.slug}`,
    icon: solution.icon,
    description: solution.tagline
}));
