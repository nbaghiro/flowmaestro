import type { WorkflowPattern } from "./workflowPatterns";

// Advanced Pattern 1: Slack Support Bot
// Trigger (Slack message) → Router (classify intent) → [Tech/Sales/General LLM] → Action (Slack reply)
const slackSupportBotPattern: WorkflowPattern = {
    id: "slack-support-bot",
    name: "Slack Support Bot",
    description:
        "Auto-respond to Slack messages by classifying intent and routing to specialized handlers",
    useCase: "Customer support automation",
    icon: "MessageCircle",
    nodeCount: 6,
    category: "advanced",
    integrations: ["Slack"],
    definition: {
        name: "Slack Support Bot",
        nodes: {
            "trigger-1": {
                type: "trigger",
                name: "Slack Message",
                config: {
                    triggerType: "webhook",
                    provider: "slack",
                    event: "message",
                    outputVariable: "slackMessage",
                    description: "Triggered when a message is received in Slack"
                },
                position: { x: 100, y: 350 }
            },
            "router-1": {
                type: "router",
                name: "Intent Router",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    systemPrompt:
                        "You are a customer support classifier. Analyze the message and classify it into exactly one category based on the primary intent.",
                    prompt: "{{slackMessage.text}}",
                    temperature: 0.1,
                    routes: [
                        {
                            value: "tech_support",
                            label: "Technical Support",
                            description:
                                "Technical issues, bugs, errors, how-to questions, troubleshooting"
                        },
                        {
                            value: "sales",
                            label: "Sales Inquiry",
                            description: "Pricing, purchasing, upgrades, billing, subscriptions"
                        },
                        {
                            value: "general",
                            label: "General Inquiry",
                            description: "General questions, feedback, other inquiries"
                        }
                    ],
                    defaultRoute: "general",
                    outputVariable: "routeResult"
                },
                position: { x: 400, y: 350 }
            },
            "llm-tech": {
                type: "llm",
                name: "Tech Support",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a technical support specialist. Provide clear, step-by-step solutions. Be concise since this will be sent as a Slack message.",
                    prompt: "User's technical issue:\n\n{{slackMessage.text}}\n\nProvide a helpful response.",
                    temperature: 0.3,
                    maxTokens: 1000,
                    outputVariable: "techResponse"
                },
                position: { x: 750, y: 100 }
            },
            "llm-sales": {
                type: "llm",
                name: "Sales Handler",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a sales assistant. Help with pricing and purchasing questions. Be helpful and professional without being pushy. Be concise for Slack.",
                    prompt: "User's sales inquiry:\n\n{{slackMessage.text}}\n\nProvide helpful information.",
                    temperature: 0.5,
                    maxTokens: 1000,
                    outputVariable: "salesResponse"
                },
                position: { x: 750, y: 350 }
            },
            "llm-general": {
                type: "llm",
                name: "General Handler",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a helpful customer service representative. Assist with general inquiries in a friendly manner. Be concise for Slack.",
                    prompt: "User's inquiry:\n\n{{slackMessage.text}}\n\nProvide a helpful response.",
                    temperature: 0.7,
                    maxTokens: 1000,
                    outputVariable: "generalResponse"
                },
                position: { x: 750, y: 600 }
            },
            "action-reply": {
                type: "action",
                name: "Reply to Slack",
                config: {
                    provider: "slack",
                    action: "postMessage",
                    channel: "{{slackMessage.channel}}",
                    text: "{{techResponse.text || salesResponse.text || generalResponse.text}}",
                    threadTs: "{{slackMessage.ts}}",
                    outputVariable: "slackReply"
                },
                position: { x: 1100, y: 350 }
            }
        },
        edges: [
            { id: "edge-1", source: "trigger-1", target: "router-1" },
            { id: "edge-2", source: "router-1", target: "llm-tech", sourceHandle: "tech_support" },
            { id: "edge-3", source: "router-1", target: "llm-sales", sourceHandle: "sales" },
            { id: "edge-4", source: "router-1", target: "llm-general", sourceHandle: "general" },
            { id: "edge-5", source: "llm-tech", target: "action-reply" },
            { id: "edge-6", source: "llm-sales", target: "action-reply" },
            { id: "edge-7", source: "llm-general", target: "action-reply" }
        ],
        entryPoint: "trigger-1"
    }
};

// Advanced Pattern 2: GitHub PR Reviewer
// Input (PR data) → LLM (code review) → LLM (generate comment) → Action (post GitHub comment)
const githubPrReviewerPattern: WorkflowPattern = {
    id: "github-pr-reviewer",
    name: "GitHub PR Reviewer",
    description: "Automated code review that analyzes PRs and posts review comments",
    useCase: "Code review automation",
    icon: "GitPullRequest",
    nodeCount: 5,
    category: "advanced",
    integrations: ["GitHub"],
    definition: {
        name: "GitHub PR Reviewer",
        nodes: {
            "input-1": {
                type: "input",
                name: "PR Data",
                config: {
                    inputName: "prData",
                    inputVariable: "prData",
                    inputType: "json",
                    required: true,
                    description: "Pull request data including title, description, and diff",
                    defaultValue:
                        '{"title": "", "description": "", "diff": "", "repo": "", "pr_number": 0}'
                },
                position: { x: 100, y: 150 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Analyze Code",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are an expert code reviewer. Analyze the code changes for:\n- Bugs and logic errors\n- Security vulnerabilities\n- Performance issues\n- Code style and best practices\n- Missing tests or documentation\n\nBe thorough but constructive.",
                    prompt: "PR Title: {{prData.title}}\n\nDescription:\n{{prData.description}}\n\nCode Diff:\n```\n{{prData.diff}}\n```\n\nAnalyze these changes and identify any issues or improvements.",
                    temperature: 0.2,
                    maxTokens: 3000,
                    outputVariable: "analysis"
                },
                position: { x: 400, y: 320 }
            },
            "llm-comment": {
                type: "llm",
                name: "Generate Review",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a code reviewer. Format your analysis into a professional GitHub PR review comment. Use markdown formatting. Be constructive and specific with line references where possible.",
                    prompt: "Based on this analysis:\n\n{{analysis.text}}\n\nGenerate a GitHub PR review comment that:\n1. Summarizes the changes\n2. Lists any issues found with severity (critical/warning/suggestion)\n3. Provides specific recommendations\n4. Ends with an overall assessment (approve/request changes/comment)",
                    temperature: 0.3,
                    maxTokens: 2000,
                    outputVariable: "reviewComment"
                },
                position: { x: 700, y: 150 }
            },
            "action-github": {
                type: "action",
                name: "Post Review",
                config: {
                    provider: "github",
                    action: "createReview",
                    repo: "{{prData.repo}}",
                    pullNumber: "{{prData.pr_number}}",
                    body: "{{reviewComment.text}}",
                    event: "COMMENT",
                    outputVariable: "githubReview"
                },
                position: { x: 1000, y: 320 }
            },
            "output-1": {
                type: "output",
                name: "Review Result",
                config: {
                    outputName: "result",
                    value: '{"analysis": "{{analysis.text}}", "review": "{{reviewComment.text}}", "posted": true}',
                    format: "json",
                    description: "Code review result"
                },
                position: { x: 1300, y: 150 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-analyze" },
            { id: "edge-2", source: "llm-analyze", target: "llm-comment" },
            { id: "edge-3", source: "llm-comment", target: "action-github" },
            { id: "edge-4", source: "action-github", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Advanced Pattern 3: Lead Enrichment Pipeline
// Input (lead email/company) → HTTP (enrichment API) → LLM (summarize & qualify) → Conditional (score) → Action (CRM) / Output
const leadEnrichmentPattern: WorkflowPattern = {
    id: "lead-enrichment",
    name: "Lead Enrichment Pipeline",
    description: "Enrich new leads with external data, qualify them with AI, and update CRM",
    useCase: "Sales lead qualification",
    icon: "UserPlus",
    nodeCount: 6,
    category: "advanced",
    integrations: ["HubSpot", "HTTP"],
    definition: {
        name: "Lead Enrichment Pipeline",
        nodes: {
            "input-1": {
                type: "input",
                name: "Lead Data",
                config: {
                    inputName: "leadData",
                    inputVariable: "leadData",
                    inputType: "json",
                    required: true,
                    description: "New lead information",
                    defaultValue: '{"email": "", "company": "", "name": "", "source": ""}'
                },
                position: { x: 100, y: 150 }
            },
            "http-enrich": {
                type: "http",
                name: "Enrich Lead",
                config: {
                    method: "POST",
                    url: "https://api.clearbit.com/v2/companies/find",
                    headers: {
                        Authorization: "Bearer {{env.CLEARBIT_API_KEY}}",
                        "Content-Type": "application/json"
                    },
                    body: '{"domain": "{{leadData.company}}"}',
                    outputVariable: "enrichedData",
                    timeout: 30000
                },
                position: { x: 350, y: 320 }
            },
            "llm-qualify": {
                type: "llm",
                name: "Qualify Lead",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a sales qualification expert. Analyze lead data and provide a qualification score (1-100) and reasoning. Consider company size, industry, funding, and fit with our ideal customer profile.",
                    prompt: 'Lead Info:\n- Name: {{leadData.name}}\n- Email: {{leadData.email}}\n- Company: {{leadData.company}}\n- Source: {{leadData.source}}\n\nEnriched Company Data:\n{{enrichedData.body}}\n\nProvide qualification in JSON:\n{"score": 0-100, "tier": "hot/warm/cold", "reasoning": "...", "nextStep": "..."}',
                    temperature: 0.2,
                    maxTokens: 1000,
                    outputVariable: "qualification"
                },
                position: { x: 600, y: 150 }
            },
            "conditional-score": {
                type: "conditional",
                name: "Score Check",
                config: {
                    conditionType: "expression",
                    expression:
                        'qualification.text.includes(\'"tier": "hot"\') || qualification.text.includes(\'"tier": "warm"\')',
                    outputVariable: "isQualified"
                },
                position: { x: 850, y: 300 }
            },
            "action-crm": {
                type: "action",
                name: "Update HubSpot",
                config: {
                    provider: "hubspot",
                    action: "updateContact",
                    email: "{{leadData.email}}",
                    properties: {
                        lead_score: "{{qualification.score}}",
                        lead_tier: "{{qualification.tier}}",
                        enriched_data: "{{enrichedData.body}}"
                    },
                    outputVariable: "crmUpdate"
                },
                position: { x: 1100, y: 150 }
            },
            "output-1": {
                type: "output",
                name: "Pipeline Result",
                config: {
                    outputName: "result",
                    value: '{"lead": "{{leadData.email}}", "qualification": {{qualification.text}}, "enriched": true, "crmUpdated": true}',
                    format: "json",
                    description: "Lead enrichment result"
                },
                position: { x: 1350, y: 320 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "http-enrich" },
            { id: "edge-2", source: "http-enrich", target: "llm-qualify" },
            { id: "edge-3", source: "llm-qualify", target: "conditional-score" },
            {
                id: "edge-4",
                source: "conditional-score",
                target: "action-crm",
                sourceHandle: "true"
            },
            {
                id: "edge-5",
                source: "conditional-score",
                target: "output-1",
                sourceHandle: "false"
            },
            { id: "edge-6", source: "action-crm", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Advanced Pattern 4: Email Autoresponder
// Input (email) → Router (classify) → LLM (draft response) → Wait for User (review) → HTTP (send email)
const emailAutoresponderPattern: WorkflowPattern = {
    id: "email-autoresponder",
    name: "Email Autoresponder",
    description: "Classify incoming emails, draft AI responses, and send after human review",
    useCase: "Email automation with approval",
    icon: "Mail",
    nodeCount: 7,
    category: "advanced",
    integrations: ["Email", "HTTP"],
    definition: {
        name: "Email Autoresponder",
        nodes: {
            "input-1": {
                type: "input",
                name: "Email Input",
                config: {
                    inputName: "emailData",
                    inputVariable: "emailData",
                    inputType: "json",
                    required: true,
                    description: "Incoming email data",
                    defaultValue: '{"from": "", "subject": "", "body": "", "replyTo": ""}'
                },
                position: { x: 100, y: 150 }
            },
            "router-1": {
                type: "router",
                name: "Email Classifier",
                config: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    systemPrompt:
                        "You are an email classifier. Categorize the email into exactly one category based on its content and intent.",
                    prompt: "Subject: {{emailData.subject}}\n\nBody:\n{{emailData.body}}",
                    temperature: 0.1,
                    routes: [
                        {
                            value: "support",
                            label: "Support Request",
                            description: "Technical support, product issues, how-to questions"
                        },
                        {
                            value: "sales",
                            label: "Sales Inquiry",
                            description: "Pricing, demos, purchasing questions"
                        },
                        {
                            value: "info",
                            label: "Information Request",
                            description: "General information, company questions"
                        },
                        {
                            value: "spam",
                            label: "Spam/Unsubscribe",
                            description: "Spam, marketing, unsubscribe requests"
                        }
                    ],
                    defaultRoute: "info",
                    outputVariable: "emailCategory"
                },
                position: { x: 350, y: 320 }
            },
            "llm-draft": {
                type: "llm",
                name: "Draft Response",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a professional email assistant. Draft appropriate email responses based on the category. Be professional, helpful, and concise. Include a greeting and sign-off.",
                    prompt: "Category: {{emailCategory.selectedRoute}}\n\nOriginal Email:\nFrom: {{emailData.from}}\nSubject: {{emailData.subject}}\nBody: {{emailData.body}}\n\nDraft a professional response email.",
                    temperature: 0.5,
                    maxTokens: 1500,
                    outputVariable: "draftResponse"
                },
                position: { x: 600, y: 150 }
            },
            "wait-review": {
                type: "wait-for-user",
                name: "Review Draft",
                config: {
                    prompt: "Please review and edit the draft email response before sending.",
                    description: "Review the AI-generated response. Edit if needed.",
                    variableName: "approvedResponse",
                    inputType: "text",
                    required: true,
                    placeholder: "Edit the response here...",
                    prefillValue: "{{draftResponse.text}}"
                },
                position: { x: 850, y: 320 }
            },
            "conditional-send": {
                type: "conditional",
                name: "Send Check",
                config: {
                    conditionType: "expression",
                    expression:
                        "emailCategory.selectedRoute !== 'spam' && approvedResponse.trim().length > 0",
                    outputVariable: "shouldSend"
                },
                position: { x: 1100, y: 150 }
            },
            "http-send": {
                type: "http",
                name: "Send Email",
                config: {
                    method: "POST",
                    url: "https://api.resend.com/emails",
                    headers: {
                        Authorization: "Bearer {{env.RESEND_API_KEY}}",
                        "Content-Type": "application/json"
                    },
                    body: '{"from": "support@company.com", "to": "{{emailData.from}}", "subject": "Re: {{emailData.subject}}", "text": "{{approvedResponse}}"}',
                    outputVariable: "sendResult",
                    timeout: 30000
                },
                position: { x: 1350, y: 100 }
            },
            "output-1": {
                type: "output",
                name: "Result",
                config: {
                    outputName: "result",
                    value: '{"category": "{{emailCategory.selectedRoute}}", "draft": "{{draftResponse.text}}", "sent": true, "to": "{{emailData.from}}"}',
                    format: "json",
                    description: "Email processing result"
                },
                position: { x: 1600, y: 320 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "router-1" },
            { id: "edge-2", source: "router-1", target: "llm-draft" },
            { id: "edge-3", source: "llm-draft", target: "wait-review" },
            { id: "edge-4", source: "wait-review", target: "conditional-send" },
            { id: "edge-5", source: "conditional-send", target: "http-send", sourceHandle: "true" },
            { id: "edge-6", source: "conditional-send", target: "output-1", sourceHandle: "false" },
            { id: "edge-7", source: "http-send", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Advanced Pattern 5: Jira Bug Triage
// Input (bug report) → LLM (analyze severity) → Transform (structured data) → Action (Jira) → Output
const jiraBugTriagePattern: WorkflowPattern = {
    id: "jira-bug-triage",
    name: "Jira Bug Triage",
    description:
        "Auto-analyze bug reports, determine priority and component, and create Jira issues",
    useCase: "Bug management automation",
    icon: "Bug",
    nodeCount: 5,
    category: "advanced",
    integrations: ["Jira"],
    definition: {
        name: "Jira Bug Triage",
        nodes: {
            "input-1": {
                type: "input",
                name: "Bug Report",
                config: {
                    inputName: "bugReport",
                    inputVariable: "bugReport",
                    inputType: "json",
                    required: true,
                    description: "Bug report from user or system",
                    defaultValue:
                        '{"title": "", "description": "", "steps": "", "expected": "", "actual": "", "reporter": ""}'
                },
                position: { x: 100, y: 150 }
            },
            "llm-analyze": {
                type: "llm",
                name: "Analyze Bug",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a bug triage specialist. Analyze bug reports and determine:\n- Severity (critical/high/medium/low)\n- Component (frontend/backend/database/api/auth/other)\n- Priority (P1/P2/P3/P4)\n- Estimated effort (hours)\n\nBase severity on user impact and system stability risks.",
                    prompt: 'Bug Report:\nTitle: {{bugReport.title}}\nDescription: {{bugReport.description}}\nSteps to Reproduce: {{bugReport.steps}}\nExpected: {{bugReport.expected}}\nActual: {{bugReport.actual}}\n\nAnalyze and respond with JSON:\n{"severity": "...", "component": "...", "priority": "...", "effort": "...", "summary": "...", "suggestedLabels": [...]}',
                    temperature: 0.2,
                    maxTokens: 1000,
                    outputVariable: "analysis"
                },
                position: { x: 400, y: 320 }
            },
            "transform-1": {
                type: "transform",
                name: "Format for Jira",
                config: {
                    operations: [
                        {
                            type: "parseJson",
                            input: "{{analysis.text}}",
                            output: "parsedAnalysis"
                        },
                        {
                            type: "template",
                            template:
                                "h2. Summary\n{{parsedAnalysis.summary}}\n\nh2. Reproduction Steps\n{{bugReport.steps}}\n\nh2. Expected vs Actual\n*Expected:* {{bugReport.expected}}\n*Actual:* {{bugReport.actual}}\n\nh2. Analysis\n*Severity:* {{parsedAnalysis.severity}}\n*Component:* {{parsedAnalysis.component}}\n*Estimated Effort:* {{parsedAnalysis.effort}} hours",
                            output: "jiraDescription"
                        }
                    ],
                    outputVariable: "formatted"
                },
                position: { x: 700, y: 150 }
            },
            "action-jira": {
                type: "action",
                name: "Create Jira Issue",
                config: {
                    provider: "jira",
                    action: "createIssue",
                    project: "{{env.JIRA_PROJECT_KEY}}",
                    issueType: "Bug",
                    summary: "[{{parsedAnalysis.priority}}] {{bugReport.title}}",
                    description: "{{formatted.jiraDescription}}",
                    priority: "{{parsedAnalysis.priority}}",
                    labels: "{{parsedAnalysis.suggestedLabels}}",
                    components: ["{{parsedAnalysis.component}}"],
                    outputVariable: "jiraIssue"
                },
                position: { x: 1000, y: 320 }
            },
            "output-1": {
                type: "output",
                name: "Triage Result",
                config: {
                    outputName: "result",
                    value: '{"issueKey": "{{jiraIssue.key}}", "analysis": {{analysis.text}}, "url": "{{jiraIssue.url}}"}',
                    format: "json",
                    description: "Bug triage result with Jira link"
                },
                position: { x: 1300, y: 150 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-analyze" },
            { id: "edge-2", source: "llm-analyze", target: "transform-1" },
            { id: "edge-3", source: "transform-1", target: "action-jira" },
            { id: "edge-4", source: "action-jira", target: "output-1" }
        ],
        entryPoint: "input-1"
    }
};

// Advanced Pattern 6: Content to Social Posts
// Input (blog content) → LLM (Twitter) → LLM (LinkedIn) [parallel] → LLM (Summary) [parallel] → Template Output
const contentToSocialPattern: WorkflowPattern = {
    id: "content-to-social",
    name: "Content to Social Posts",
    description: "Generate platform-specific social media posts from blog content or announcements",
    useCase: "Content repurposing",
    icon: "Share2",
    nodeCount: 5,
    category: "advanced",
    integrations: [],
    definition: {
        name: "Content to Social Posts",
        nodes: {
            "input-1": {
                type: "input",
                name: "Content Input",
                config: {
                    inputName: "content",
                    inputVariable: "content",
                    inputType: "json",
                    required: true,
                    description: "Blog post or announcement content",
                    defaultValue: '{"title": "", "body": "", "url": "", "tags": []}'
                },
                position: { x: 100, y: 350 }
            },
            "llm-twitter": {
                type: "llm",
                name: "Twitter Post",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a social media expert. Create engaging Twitter/X posts. Stay under 280 characters. Use relevant hashtags (2-3 max). Be punchy and attention-grabbing. Include a call to action.",
                    prompt: "Create a Twitter post for this content:\n\nTitle: {{content.title}}\n\nContent:\n{{content.body}}\n\nURL: {{content.url}}\n\nTags: {{content.tags}}",
                    temperature: 0.7,
                    maxTokens: 200,
                    outputVariable: "twitterPost"
                },
                position: { x: 500, y: 100 }
            },
            "llm-linkedin": {
                type: "llm",
                name: "LinkedIn Post",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a LinkedIn content expert. Create professional posts that drive engagement. Use line breaks for readability. Include 3-5 relevant hashtags at the end. Posts should be 100-200 words for optimal engagement.",
                    prompt: "Create a LinkedIn post for this content:\n\nTitle: {{content.title}}\n\nContent:\n{{content.body}}\n\nURL: {{content.url}}\n\nTags: {{content.tags}}",
                    temperature: 0.6,
                    maxTokens: 500,
                    outputVariable: "linkedinPost"
                },
                position: { x: 500, y: 350 }
            },
            "llm-summary": {
                type: "llm",
                name: "Short Summary",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    systemPrompt:
                        "You are a content summarizer. Create a 1-2 sentence summary suitable for email newsletters, Slack announcements, or meta descriptions.",
                    prompt: "Create a brief 1-2 sentence summary of this content:\n\nTitle: {{content.title}}\n\nContent:\n{{content.body}}",
                    temperature: 0.4,
                    maxTokens: 150,
                    outputVariable: "summary"
                },
                position: { x: 500, y: 600 }
            },
            "template-output": {
                type: "templateOutput",
                name: "Combined Output",
                config: {
                    template: {
                        title: "{{content.title}}",
                        url: "{{content.url}}",
                        platforms: {
                            twitter: "{{twitterPost.text}}",
                            linkedin: "{{linkedinPost.text}}"
                        },
                        summary: "{{summary.text}}",
                        generatedAt: "{{$now}}"
                    },
                    outputVariable: "socialPosts"
                },
                position: { x: 900, y: 350 }
            }
        },
        edges: [
            { id: "edge-1", source: "input-1", target: "llm-twitter" },
            { id: "edge-2", source: "input-1", target: "llm-linkedin" },
            { id: "edge-3", source: "input-1", target: "llm-summary" },
            { id: "edge-4", source: "llm-twitter", target: "template-output" },
            { id: "edge-5", source: "llm-linkedin", target: "template-output" },
            { id: "edge-6", source: "llm-summary", target: "template-output" }
        ],
        entryPoint: "input-1"
    }
};

// Export all advanced patterns
export const ADVANCED_WORKFLOW_PATTERNS: WorkflowPattern[] = [
    slackSupportBotPattern,
    githubPrReviewerPattern,
    leadEnrichmentPattern,
    emailAutoresponderPattern,
    jiraBugTriagePattern,
    contentToSocialPattern
];

// Get all advanced patterns
export function getAdvancedPatterns(): WorkflowPattern[] {
    return ADVANCED_WORKFLOW_PATTERNS;
}

// Find advanced pattern by ID
export function getAdvancedPatternById(id: string): WorkflowPattern | undefined {
    return ADVANCED_WORKFLOW_PATTERNS.find((p) => p.id === id);
}
